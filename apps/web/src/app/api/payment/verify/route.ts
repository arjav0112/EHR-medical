import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/logger';

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const body     = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');

  // timingSafeEqual prevents timing-attack leaks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false; // mismatched lengths → invalid
  }
}

const PLAN_NAMES: Record<string, string> = {
  pro:    'Pro',
  clinic: 'Clinic',
};

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json() as {
      razorpay_order_id?:   string;
      razorpay_payment_id?: string;
      razorpay_signature?:  string;
      uid?:                 string;
      planId?:              string;
      billingCycle?:        string;
    };

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      uid,
      planId,
      billingCycle,
    } = body;

    // Validate all required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !uid || !planId || !billingCycle) {
      logger.warn('verify-payment: missing fields', {
        hasOrderId:   !!razorpay_order_id,
        hasPaymentId: !!razorpay_payment_id,
        hasSignature: !!razorpay_signature,
        hasUid:       !!uid,
        planId,
        billingCycle,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify HMAC signature
    const valid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      logger.warn('verify-payment: invalid signature', {
        orderId: razorpay_order_id,
        uid,
        planId,
      });
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    logger.info('verify-payment: signature valid, updating plan', {
      orderId:   razorpay_order_id,
      paymentId: razorpay_payment_id,
      uid,
      planId,
      billingCycle,
    });

    // 2. Calculate plan expiry
    const now       = new Date();
    const expiresAt = new Date(now);
    if (billingCycle === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    // 3. Update Firestore
    await setDoc(doc(db, 'users', uid), {
      plan:              planId,
      planName:          PLAN_NAMES[planId] ?? planId,
      billingCycle,
      planStartedAt:     serverTimestamp(),
      planExpiresAt:     expiresAt.toISOString(),
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      updatedAt:         serverTimestamp(),
    }, { merge: true });

    logger.info('verify-payment: plan updated in Firestore', {
      uid,
      planId,
      billingCycle,
      expiresAt: expiresAt.toISOString(),
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, plan: planId });

  } catch (err) {
    logger.error('verify-payment: failed', err, { durationMs: Date.now() - start });

    return NextResponse.json(
      { error: 'Payment verification failed. Contact support if payment was deducted.' },
      { status: 500 },
    );
  }
}

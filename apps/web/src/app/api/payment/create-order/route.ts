'use server';

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { logger } from '@/lib/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Amounts in paise (INR x 100)
const PLAN_AMOUNTS: Record<string, number> = {
  pro_monthly: 299900,
  pro_annual: 2160000,
  clinic_monthly: 749900,
  clinic_annual: 5998800,
};

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json() as {
      planId?: string;
      billingCycle?: string;
      uid?: string;
    };
    const { planId, billingCycle, uid } = body;

    if (!planId || !billingCycle || !uid) {
      logger.warn('create-order: missing required fields', { planId, billingCycle, hasUid: !!uid });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const key = `${planId}_${billingCycle}`;
    const amount = PLAN_AMOUNTS[key];

    if (!amount) {
      logger.warn('create-order: invalid plan key', { key, uid });
      return NextResponse.json({ error: `Invalid plan: ${key}` }, { status: 400 });
    }

    logger.info('create-order: creating Razorpay order', { planId, billingCycle, amount, uid });

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${uid.slice(0, 8)}_${Date.now()}`,
      notes: { planId, billingCycle, uid },
    });

    logger.info('create-order: order created', {
      orderId: order.id,
      planId,
      billingCycle,
      uid,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID!,
    });
  } catch (err) {
    logger.error('create-order: failed to create Razorpay order', err, {
      durationMs: Date.now() - start,
    });
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 },
    );
  }
}

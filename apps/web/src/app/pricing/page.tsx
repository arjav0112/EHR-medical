'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HomeNavbar from '@/components/HomeNavbar';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';

// ─── Razorpay global type ──────────────────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type BillingCycle = 'monthly' | 'annual';

// ─── Pricing data (INR) ────────────────────────────────────────────────────────
const plans = [
  {
    id:        'starter',
    name:      'Starter',
    tagline:   'For solo clinicians getting started',
    price:     { monthly: 0, annual: 0 },
    cta:       'Get Started Free',
    ctaHref:   '/session/new',
    paid:      false,
    highlight: false,
    badge:     null,
    features: [
      { label: '5 sessions per month',  included: true  },
      { label: 'SOAP note generation',  included: true  },
      { label: 'DSM-5 assessment',      included: true  },
      { label: 'PDF export',            included: true  },
      { label: 'Risk score',            included: true  },
      { label: 'Priority support',      included: false },
      { label: 'Custom templates',      included: false },
      { label: 'Team workspace',        included: false },
      { label: 'API access',            included: false },
      { label: 'Audit logs',            included: false },
    ],
  },
  {
    id:        'pro',
    name:      'Pro',
    tagline:   'For busy clinicians in practice',
    price:     { monthly: 2999, annual: 2399 },
    cta:       'Start 14-day Free Trial',
    ctaHref:   null,
    paid:      true,
    highlight: true,
    badge:     'Most Popular',
    features: [
      { label: 'Unlimited sessions',    included: true  },
      { label: 'SOAP note generation',  included: true  },
      { label: 'DSM-5 assessment',      included: true  },
      { label: 'PDF export',            included: true  },
      { label: 'Risk score',            included: true  },
      { label: 'Priority support',      included: true  },
      { label: 'Custom templates',      included: true  },
      { label: 'Team workspace',        included: false },
      { label: 'API access',            included: false },
      { label: 'Audit logs',            included: false },
    ],
  },
  {
    id:        'clinic',
    name:      'Clinic',
    tagline:   'For teams and multi-clinician practices',
    price:     { monthly: 7499, annual: 5999 },
    cta:       'Start 14-day Free Trial',
    ctaHref:   null,
    paid:      true,
    highlight: false,
    badge:     'Team',
    features: [
      { label: 'Unlimited sessions',          included: true },
      { label: 'SOAP note generation',        included: true },
      { label: 'DSM-5 assessment',            included: true },
      { label: 'PDF export',                  included: true },
      { label: 'Risk score',                  included: true },
      { label: 'Priority support',            included: true },
      { label: 'Custom templates',            included: true },
      { label: 'Team workspace (up to 10)',   included: true },
      { label: 'API access',                  included: true },
      { label: 'Audit logs',                  included: true },
    ],
  },
];

const comparisonFeatures = [
  {
    category: 'Core', features: [
      { name: 'AI SOAP note generation',    starter: true,  pro: true,        clinic: true  },
      { name: 'DSM-5 / ICD-10 assessment', starter: true,  pro: true,        clinic: true  },
      { name: 'Risk stratification score',  starter: true,  pro: true,        clinic: true  },
      { name: 'PDF export with branding',   starter: true,  pro: true,        clinic: true  },
      { name: 'Section-level AI revision',  starter: false, pro: true,        clinic: true  },
      { name: 'Custom note templates',      starter: false, pro: true,        clinic: true  },
    ]
  },
  {
    category: 'Sessions & Limits', features: [
      { name: 'Monthly sessions',            starter: '5 / mo', pro: 'Unlimited', clinic: 'Unlimited' },
      { name: 'Transcript size limit',       starter: '32 KB',  pro: '64 KB',     clinic: '128 KB'    },
      { name: 'Revision rounds per session', starter: '0',      pro: '3',         clinic: 'Unlimited' },
    ]
  },
  {
    category: 'Team & Admin', features: [
      { name: 'Team workspace',        starter: false, pro: false, clinic: true         },
      { name: 'Clinician seats',       starter: '1',   pro: '1',   clinic: 'Up to 10'  },
      { name: 'Audit logs (90-day)',   starter: false, pro: false, clinic: true         },
      { name: 'API access',            starter: false, pro: false, clinic: true         },
      { name: 'SSO / SAML (coming)',   starter: false, pro: false, clinic: 'Enterprise' },
    ]
  },
  {
    category: 'Compliance', features: [
      { name: 'HIPAA-compliant storage',  starter: true,  pro: true,  clinic: true },
      { name: 'Data encryption at rest',  starter: true,  pro: true,  clinic: true },
      { name: 'PII anonymization guard',  starter: true,  pro: true,  clinic: true },
      { name: 'BAA on request',           starter: false, pro: true,  clinic: true },
    ]
  },
  {
    category: 'Support', features: [
      { name: 'Community forum',          starter: true,  pro: true,  clinic: true         },
      { name: 'Email support',            starter: false, pro: true,  clinic: true         },
      { name: 'Priority (< 4hr SLA)',     starter: false, pro: false, clinic: true         },
      { name: 'Dedicated success manager',starter: false, pro: false, clinic: 'Enterprise' },
    ]
  },
];

const faqs = [
  {
    q: 'Is my patient data safe?',
    a: 'Yes. EHR Copilot is HIPAA-compliant. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We never train our models on your clinical data. A BAA is available to Pro and Clinic subscribers.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel at any time from your settings. If you cancel a paid plan, you retain access until the end of your current billing period. No questions asked.',
  },
  {
    q: 'What happens when I hit the session limit on Starter?',
    a: "Starter accounts are limited to 5 sessions per month. Once you reach the limit, you'll be prompted to upgrade to Pro for unlimited sessions.",
  },
  {
    q: 'Do you offer discounts for students or nonprofits?',
    a: 'Yes. We offer a 40% discount for verified students and nonprofit mental health organizations. Contact us at support@ehrcopilot.ai with your credentials.',
  },
  {
    q: 'What counts as a session?',
    a: 'Each time you submit a transcript to generate a SOAP note, that counts as one session. Revising sections of an already-generated note does not count as a new session.',
  },
  {
    q: 'Which payment methods are accepted?',
    a: 'We accept all major UPI apps (Google Pay, PhonePe, Paytm), credit/debit cards (Visa, Mastercard, RuPay), and net banking from 50+ banks via Razorpay — India\'s most trusted payment gateway.',
  },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────
function CheckIcon({ className = 'w-4 h-4 text-green-600' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)  return <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />;
  if (value === false) return <XIcon />;
  return <span className="text-[13px] font-medium text-gray-700">{value}</span>;
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title: 'Product', links: ['Features', 'How it Works', 'Pricing', 'Demo'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
    { title: 'Legal',   links: ['Privacy Policy', 'Terms of Service', 'HIPAA', 'Security'] },
    { title: 'Support', links: ['Help Center', 'Documentation', 'Status', 'Contact'] },
  ];
  return (
    <footer className="relative overflow-hidden bg-white border-t border-gray-100 mt-auto">
      <div className="relative z-10 max-w-[1200px] mx-auto px-8 pt-10 pb-0">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 pb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              <span className="text-[17px] font-bold text-gray-900">EHR Copilot</span>
            </Link>
            <p className="text-[13px] leading-relaxed max-w-[260px] mb-7 text-gray-500">
              AI-driven clinical documentation platform that helps clinicians document accurately and efficiently.
            </p>
          </div>
          {cols.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-[14px] font-semibold text-gray-900 mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors duration-200 cursor-pointer">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="py-5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[12px] text-gray-400">© 2026 EHR Copilot Inc. All rights reserved.</p>
          <div className="flex items-center gap-5 text-[12px] text-gray-400">
            <a href="#" className="hover:text-gray-700 transition-colors cursor-pointer">Privacy</a>
            <a href="#" className="hover:text-gray-700 transition-colors cursor-pointer">Terms</a>
            <a href="#" className="hover:text-gray-700 transition-colors cursor-pointer">HIPAA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── FAQ accordion ─────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const anyOpen = open !== null;
  return (
    <section
      className="mx-auto px-8 py-20"
      style={{
        maxWidth:   anyOpen ? '860px' : '720px',
        transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm mb-5">
          <span className="text-[13px] font-bold text-gray-800">✦</span>
          <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">FAQ</span>
        </div>
        <h2 className="text-[34px] font-bold text-gray-900 tracking-[-0.02em]">Frequently asked questions</h2>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className={`border rounded-2xl transition-all duration-200 overflow-hidden cursor-pointer ${open === i ? 'border-gray-200 shadow-sm bg-white' : 'border-gray-100 bg-gray-50/60 hover:border-gray-200'}`}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="flex items-center justify-between px-6 py-4 gap-4">
              <span className="text-[15px] font-semibold text-gray-900 leading-snug">{faq.q}</span>
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 ${open === i ? 'bg-gray-900 border-gray-900' : 'border-gray-200 bg-white'}`}>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open === i ? 'rotate-45 text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </div>
            <div
              style={{
                maxHeight:  open === i ? '400px' : '0px',
                opacity:    open === i ? 1 : 0,
                transition: 'max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
                overflow:   'hidden',
              }}
            >
              <div className="px-6 pb-5">
                <p className="text-[14px] text-gray-500 leading-[1.7]">{faq.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Payment badge strip ───────────────────────────────────────────────────────
function PaymentBadges() {
  const methods = [
    { label: 'UPI',         icon: '⚡' },
    { label: 'Google Pay',  icon: '🟢' },
    { label: 'PhonePe',     icon: '💜' },
    { label: 'Paytm',       icon: '🔵' },
    { label: 'Cards',       icon: '💳' },
    { label: 'Net Banking', icon: '🏦' },
  ];
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mr-2">Accepted payments</span>
        {methods.map(m => (
          <span key={m.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 text-[12px] font-medium text-gray-600">
            <span>{m.icon}</span>{m.label}
          </span>
        ))}
        <span className="text-[11px] text-gray-400 ml-1">via Razorpay</span>
      </div>
    </div>
  );
}

// ─── Pricing Page ──────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [billing,       setBilling]       = useState<BillingCycle>('annual');
  const [showAuth,      setShowAuth]      = useState(false);
  const [payingPlanId,  setPayingPlanId]  = useState<string | null>(null);
  const [toast,         setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { user } = useAuth();
  const router   = useRouter();

  // Load Razorpay checkout script once
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return;
    const script  = document.createElement('script');
    script.id     = 'razorpay-script';
    script.src    = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async  = true;
    document.body.appendChild(script);
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handlePay = useCallback(async (planId: string) => {
    // If not logged in, show auth modal first
    if (!user) {
      setShowAuth(true);
      return;
    }

    setPayingPlanId(planId);
    try {
      // 1. Create Razorpay order on server
      const res  = await fetch('/api/payment/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planId, billingCycle: billing, uid: user.uid }),
      });
      const data = await res.json() as {
        orderId: string; amount: number; currency: string; key: string; error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? 'Order creation failed');

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         data.key,
        order_id:    data.orderId,
        amount:      data.amount,
        currency:    data.currency,
        name:        'EHR Copilot',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — ${billing}`,
        image:       '/ehr-icon.png',
        prefill: {
          name:  user.displayName  ?? '',
          email: user.email        ?? '',
        },
        theme:   { color: '#16a34a' },
        modal:   { ondismiss: () => setPayingPlanId(null) },

        handler: async (response: {
          razorpay_order_id:   string;
          razorpay_payment_id: string;
          razorpay_signature:  string;
        }) => {
          // 3. Verify payment on server → update Firestore plan
          const vRes  = await fetch('/api/payment/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              ...response,
              uid:          user.uid,
              planId,
              billingCycle: billing,
            }),
          });
          const vData = await vRes.json() as { success?: boolean; error?: string };

          if (!vRes.ok || !vData.success) throw new Error(vData.error ?? 'Verification failed');

          showToast('success', `🎉 Welcome to ${planId.charAt(0).toUpperCase() + planId.slice(1)}! Redirecting to dashboard…`);
          setTimeout(() => router.push('/dashboard'), 2200);
        },
      });

      rzp.open();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setPayingPlanId(null);
    }
  }, [user, billing, router]);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <HomeNavbar onLoginClick={() => setShowAuth(true)} />

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-[14px] font-semibold transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-8 px-8 overflow-hidden bg-white">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(134,239,172,0.22) 0%, rgba(255,255,255,0) 65%)' }}
        />
        <div className="relative z-10 max-w-[680px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm mb-7">
            <span className="text-[13px] font-bold text-gray-800">✦</span>
            <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">Simple, Transparent Pricing</span>
          </div>

          <h1 className="text-[52px] md:text-[60px] font-bold text-gray-900 leading-[1.06] tracking-[-0.028em] mb-5">
            Start free,{' '}
            <span style={{ color: '#16a34a', background: 'linear-gradient(90deg, rgba(22,163,106,0.10) 0%, rgba(22,163,106,0.04) 100%)', padding: '2px 10px', borderRadius: '8px' }}>
              scale
            </span>{' '}
            as you grow
          </h1>

          <p className="text-[16px] text-gray-500 leading-[1.7] mb-10 max-w-[480px] mx-auto">
            No hidden fees, no contracts. Cancel anytime. Every plan includes HIPAA-compliant storage and PII anonymization.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-full mb-2">
            {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer capitalize ${billing === cycle ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {cycle === 'annual' ? 'Annual' : 'Monthly'}
              </button>
            ))}
          </div>
          {billing === 'annual' && (
            <p className="text-[12px] text-green-600 font-semibold mb-0">Save up to 20% with annual billing</p>
          )}
        </div>
      </section>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="relative px-8 pt-8 pb-4 overflow-hidden">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border transition-all duration-200 overflow-hidden ${plan.highlight
                  ? 'border-gray-900 shadow-[0_8px_40px_rgba(0,0,0,0.15)] bg-gray-900 md:-mt-3 md:mb-3'
                  : 'border-gray-200 shadow-sm bg-white hover:shadow-md'
                }`}
            >
              {plan.badge && (
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] ${plan.highlight ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {plan.badge}
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                <p className={`text-[12px] font-bold uppercase tracking-[0.1em] mb-1.5 ${plan.highlight ? 'text-green-400' : 'text-green-600'}`}>{plan.name}</p>
                <p className={`text-[13px] mb-6 leading-snug ${plan.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{plan.tagline}</p>

                {/* Price */}
                <div className="mb-7" style={{ minHeight: '72px' }}>
                  {plan.price.monthly === 0 ? (
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-[48px] font-bold leading-none tracking-[-0.03em] ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>Free</span>
                      <span className={`text-[13px] ml-1.5 ${plan.highlight ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-[22px] font-semibold ${plan.highlight ? 'text-gray-300' : 'text-gray-500'}`}>₹</span>
                      <span className={`text-[48px] font-bold leading-none tracking-[-0.03em] ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                        {billing === 'annual' ? plan.price.annual.toLocaleString('en-IN') : plan.price.monthly.toLocaleString('en-IN')}
                      </span>
                      <span className={`text-[13px] ml-0.5 ${plan.highlight ? 'text-gray-400' : 'text-gray-400'}`}>/mo</span>
                    </div>
                  )}
                  {billing === 'annual' && plan.price.monthly > 0 && (
                    <p className={`text-[12px] mt-1 ${plan.highlight ? 'text-gray-400' : 'text-gray-400'}`}>
                      Billed ₹{(plan.price.annual * 12).toLocaleString('en-IN')}/yr — save ₹{((plan.price.monthly - plan.price.annual) * 12).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>

                {/* CTA */}
                {plan.paid ? (
                  <button
                    id={`pay-${plan.id}`}
                    onClick={() => handlePay(plan.id)}
                    disabled={payingPlanId === plan.id}
                    className={`block w-full text-center py-3 rounded-full text-[14px] font-semibold transition-all duration-200 cursor-pointer mb-7 disabled:opacity-60 disabled:cursor-not-allowed ${plan.highlight
                        ? 'bg-green-500 text-white hover:bg-green-400'
                        : 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                      }`}
                  >
                    {payingPlanId === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Opening checkout…
                      </span>
                    ) : plan.cta}
                  </button>
                ) : (
                  <Link
                    href={plan.ctaHref ?? '/session/new'}
                    className="block text-center py-3 rounded-full text-[14px] font-semibold transition-all duration-200 cursor-pointer mb-7 bg-gray-900 text-white hover:bg-gray-800"
                  >
                    {plan.cta}
                  </Link>
                )}

                <div className={`h-px mb-6 ${plan.highlight ? 'bg-white/10' : 'bg-gray-100'}`} />

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2.5">
                      {f.included
                        ? <CheckIcon className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-green-400' : 'text-green-600'}`} />
                        : <XIcon />}
                      <span className={`text-[13px] leading-snug ${f.included ? (plan.highlight ? 'text-gray-200' : 'text-gray-700') : (plan.highlight ? 'text-gray-600' : 'text-gray-400')}`}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise callout */}
        <div className="max-w-[1100px] mx-auto mt-5">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <div>
                <p className="text-[15px] font-bold text-gray-900">Enterprise & Health Systems</p>
                <p className="text-[13px] text-gray-500">Custom seats, SSO, dedicated infrastructure, on-prem options, custom SLA</p>
              </div>
            </div>
            <a
              href="mailto:enterprise@ehrcopilot.ai"
              className="flex-shrink-0 bg-gray-900 text-white text-[13px] font-semibold px-6 py-3 rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* ── Payment methods strip ──────────────────────────────────────────── */}
      <PaymentBadges />

      {/* ── Trust signals ─────────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'HIPAA Compliant',     sub: 'BAA available'          },
            { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',                                                                                                                            label: 'AES-256 Encryption', sub: 'Data at rest & transit' },
            { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',                                                                                                                                          label: 'No credit card',     sub: 'Trial starts free'      },
            { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',                                                                                                       label: 'Cancel anytime',     sub: 'No lock-in contracts'   },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-gray-900 mb-0.5">{item.label}</p>
              <p className="text-[12px] text-gray-400">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature comparison table ──────────────────────────────────────── */}
      <section className="px-8 py-10 bg-gray-50/40 border-t border-b border-gray-100">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white shadow-sm mb-5">
              <span className="text-[13px] font-bold text-gray-800">✦</span>
              <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-[0.1em]">Compare Plans</span>
            </div>
            <h2 className="text-[34px] font-bold text-gray-900 tracking-[-0.02em]">Everything, side by side</h2>
          </div>

          <div className="rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="grid grid-cols-4 border-b border-gray-100">
              <div className="p-5" />
              {['Starter', 'Pro', 'Clinic'].map((name, i) => (
                <div key={name} className={`p-5 text-center border-l border-gray-100 ${i === 1 ? 'bg-gray-900' : ''}`}>
                  <p className={`text-[14px] font-bold ${i === 1 ? 'text-white' : 'text-gray-900'}`}>{name}</p>
                  <p className={`text-[12px] mt-0.5 ${i === 1 ? 'text-gray-400' : 'text-gray-400'}`}>
                    {i === 0 ? 'Free' : i === 1
                      ? `₹${billing === 'annual' ? '2,399' : '2,999'}/mo`
                      : `₹${billing === 'annual' ? '5,999' : '7,499'}/mo`}
                  </p>
                </div>
              ))}
            </div>

            {comparisonFeatures.map((group, gi) => (
              <div key={group.category}>
                <div className="grid grid-cols-4 bg-gray-50/70">
                  <div className="px-5 py-3 col-span-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">{group.category}</span>
                  </div>
                </div>
                {group.features.map((feat, fi) => (
                  <div
                    key={feat.name}
                    className={`grid grid-cols-4 items-center ${fi !== group.features.length - 1 || gi !== comparisonFeatures.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="px-5 py-3.5">
                      <span className="text-[13px] text-gray-700">{feat.name}</span>
                    </div>
                    {(['starter', 'pro', 'clinic'] as const).map((planKey, pi) => (
                      <div
                        key={planKey}
                        className={`px-5 py-3.5 flex items-center justify-center border-l border-gray-50 ${pi === 1 ? 'bg-gray-900/[0.02]' : ''}`}
                      >
                        <CellValue value={feat[planKey] as boolean | string} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <FAQ />

      <Footer />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}

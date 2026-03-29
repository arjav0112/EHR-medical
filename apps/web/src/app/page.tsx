import Link from 'next/link';

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E8E8E8]">
      <div className="max-w-[1200px] mx-auto px-8 h-[60px] flex items-center justify-between">
        <Link href="/" className="text-[17px] font-bold text-[#1A1A1A] tracking-tight">
          EHR Copilot
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {['How it works', 'For Clinicians', 'Security', 'FAQ'].map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[14px] text-[#4A4A4A] hover:text-[#1A1A1A] transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <Link href="/session/new"
          className="bg-[#1A1A1A] text-white text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-black transition-colors">
          Get Started
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-28 pb-20 px-8 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 bg-[#EBD9FF] text-[#6c63ff] text-[12px] font-medium px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#6c63ff] rounded-full" />
            AI-Powered Clinical Documentation
          </div>
          <h1 className="text-[52px] font-extrabold text-[#1A1A1A] leading-[1.1] tracking-[-0.02em] mb-5">
            Reclaim 2 hours<br />of your day.<br />Every day.
          </h1>
          <p className="text-[17px] text-[#4A4A4A] leading-[1.6] mb-8 max-w-[440px]">
            Documentation shouldn&apos;t be your full-time job. EHR Copilot helps you chart faster,
            focus on patients, and get home on time.
          </p>
          <div className="flex items-center gap-3 mb-5">
            <Link href="/session/new"
              className="bg-[#1A1A1A] text-white text-[15px] font-medium px-7 py-3.5 rounded-full hover:bg-black transition-colors">
              Start Free Trial
            </Link>
            <Link href="#how-it-works"
              className="border border-[#1A1A1A] text-[#1A1A1A] text-[15px] font-medium px-7 py-3.5 rounded-full hover:bg-[#F5F5F5] transition-colors">
              Book a Demo
            </Link>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#D1FAE5] rounded-full flex items-center justify-center text-[#059669] text-[10px] font-bold">✓</span>
              HIPAA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#D1FAE5] rounded-full flex items-center justify-center text-[#059669] text-[10px] font-bold">✓</span>
              Secure &amp; Private
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#D1FAE5] rounded-full flex items-center justify-center text-[#059669] text-[10px] font-bold">✓</span>
              No credit card
            </span>
          </div>
        </div>

        {/* Right — Office image placeholder */}
        <div className="relative">
          <div className="bg-[#F0EDE8] rounded-[20px] aspect-[4/3] overflow-hidden flex items-center justify-center">
            {/* Clean office illustration */}
            <svg viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect width="480" height="360" fill="#F0EDE8"/>
              {/* Floor */}
              <rect x="0" y="240" width="480" height="120" fill="#E4DDD5"/>
              {/* Wall */}
              <rect x="0" y="0" width="480" height="245" fill="#F7F4F0"/>
              {/* Window */}
              <rect x="280" y="40" width="160" height="180" rx="8" fill="#D4E8F2" opacity="0.6"/>
              <rect x="280" y="40" width="160" height="180" rx="8" stroke="#C8BFAF" strokeWidth="2" fill="none"/>
              <line x1="360" y1="40" x2="360" y2="220" stroke="#C8BFAF" strokeWidth="1.5"/>
              <line x1="280" y1="130" x2="440" y2="130" stroke="#C8BFAF" strokeWidth="1.5"/>
              {/* Plant */}
              <ellipse cx="430" cy="200" rx="18" ry="40" fill="#8FBC8B" opacity="0.75"/>
              <rect x="423" y="226" width="14" height="20" rx="3" fill="#7A6A5A"/>
              {/* Desk */}
              <rect x="40" y="200" width="240" height="10" rx="4" fill="#A08060"/>
              <rect x="50" y="210" width="10" height="36" rx="2" fill="#806040"/>
              <rect x="260" y="210" width="10" height="36" rx="2" fill="#806040"/>
              {/* Chair */}
              <ellipse cx="155" cy="196" rx="50" ry="12" fill="#C0B090" opacity="0.6"/>
              <rect x="130" y="175" width="50" height="24" rx="8" fill="#B0A080"/>
              <rect x="140" y="199" width="30" height="6" rx="2" fill="#906040"/>
              <rect x="143" y="205" width="8" height="38" rx="3" fill="#906040"/>
              <rect x="163" y="205" width="8" height="38" rx="3" fill="#906040"/>
              <ellipse cx="147" cy="243" rx="8" ry="4" fill="#806030"/>
              <ellipse cx="167" cy="243" rx="8" ry="4" fill="#806030"/>
              {/* Monitor */}
              <rect x="170" y="155" width="80" height="48" rx="6" fill="#2A2A2A"/>
              <rect x="174" y="159" width="72" height="40" rx="4" fill="#1A6BB5"/>
              <rect x="205" y="203" width="10" height="5" rx="1" fill="#2A2A2A"/>
              <rect x="196" y="208" width="28" height="4" rx="2" fill="#2A2A2A"/>
              {/* Notebook */}
              <rect x="60" y="192" width="60" height="8" rx="2" fill="#F0E8D8"/>
              {/* Coffee mug */}
              <rect x="250" y="188" width="18" height="20" rx="4" fill="#D4D4D4"/>
              <path d="M268 195 Q275 197 268 200" stroke="#D4D4D4" strokeWidth="2" fill="none"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Problem Section ───────────────────────────────────────────────────────────
function ProblemSection() {
  const problems = [
    {
      icon: '⏱',
      title: 'Hours of post-session charting',
      desc: 'Struggling to remember specific patient quotes and subtle markers hours later.',
    },
    {
      icon: '😔',
      title: 'Burnout & administrative fatigue',
      desc: 'Administrative burden is the #1 cause of clinician burnout in modern practice.',
    },
    {
      icon: '⚠️',
      title: 'Compliance anxiety',
      desc: 'Constant worry about audit-readiness and missing critical risk markers.',
    },
  ];

  const solutions = [
    {
      icon: '⚡',
      title: 'Real-time transcription & drafting',
      desc: 'Full SOAP notes drafted the moment your session ends. Accuracy driven by clinical LLMs.',
    },
    {
      icon: '🧘',
      title: 'Focus on the human connection',
      desc: "Engage fully with your patient, knowing the \"paperwork\" is already being handled.",
    },
    {
      icon: '✅',
      title: 'Audit-ready, every time',
      desc: 'Standardized formatting with direct transcript citations for bulletproof documentation.',
    },
  ];

  return (
    <section className="bg-[#F5F5F5] py-20 px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[36px] font-bold text-[#1A1A1A] tracking-tight mb-3">
            Documentation shouldn&apos;t be your full-time job.
          </h2>
          <p className="text-[16px] text-[#4A4A4A]">See the difference 30 seconds makes.</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Problems */}
          <div className="bg-white rounded-[16px] p-8 border border-[#EBEBEB]">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#EF4444] mb-5">
              Without EHR Copilot
            </p>
            <div className="space-y-5">
              {problems.map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#FEE2E2] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#1A1A1A] mb-0.5">{title}</p>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="bg-[#1A1A1A] rounded-[16px] p-8">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#10B981] mb-5">
              With EHR Copilot
            </p>
            <div className="space-y-5">
              {solutions.map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#EBD9FF] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-white mb-0.5">{title}</p>
                    <p className="text-[13px] text-[#9CA3AF] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '1',
      title: 'Record or Upload',
      desc: 'Securely record the session in our mobile-friendly interface or upload a transcript. Our HIPAA-compliant engine processes audio in real-time.',
    },
    {
      num: '2',
      title: 'Review & Refine',
      desc: 'Instantly get a structured note. Review risk flags, check citations, and use natural language to make quick adjustments.',
    },
    {
      num: '3',
      title: 'Export to EHR',
      desc: 'One-click sync your completed note directly to your EHR platform (Epic, Elation, SimplePractice, and more) or copy to clipboard.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-8 max-w-[1200px] mx-auto">
      <div className="text-center mb-4">
        <p className="text-[13px] font-medium text-[#6c63ff] uppercase tracking-wider mb-3">Process</p>
        <h2 className="text-[36px] font-bold text-[#1A1A1A] tracking-tight mb-3">
          Simple. Sophisticated. Seamless.
        </h2>
        <p className="text-[16px] text-[#4A4A4A] max-w-[480px] mx-auto">
          We've designed the workflow to mirror your existing clinical process, just 10× faster.
        </p>
      </div>

      {/* 3-step grid */}
      <div className="grid grid-cols-3 gap-6 mt-14">
        {steps.map(({ num, title, desc }, i) => (
          <div key={num} className="relative">
            {i < 2 && (
              <div className="hidden md:block absolute top-5 left-[calc(100%+12px)] w-[calc(100%-24px)] h-px bg-[#E8E8E8] z-0" />
            )}
            <div className="bg-[#EBD9FF] w-10 h-10 rounded-xl flex items-center justify-center text-[#6c63ff] font-bold text-[16px] mb-4">
              {num}
            </div>
            <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">{title}</h3>
            <p className="text-[14px] text-[#6B7280] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* UI mockup card */}
      <div className="mt-12 bg-white border border-[#E8E8E8] rounded-[16px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Fake browser chrome */}
        <div className="bg-[#F5F5F5] border-b border-[#E8E8E8] px-5 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FC5C5C]" />
          <div className="w-3 h-3 rounded-full bg-[#FDBC3C]" />
          <div className="w-3 h-3 rounded-full bg-[#34C84A]" />
          <div className="ml-4 flex-1 bg-white rounded-md px-3 py-1 text-[12px] text-[#9CA3AF] border border-[#E8E8E8]">
            app.ehrcopilot.com/session/review
          </div>
        </div>
        <div className="p-8 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Transcript quote */}
            <div className="bg-[#F9F9F9] border-l-4 border-[#6c63ff] rounded-r-xl p-4">
              <p className="text-[13px] text-[#1A1A1A] font-medium mb-1">Session transcript · lines 41–42</p>
              <p className="text-[14px] text-[#4A4A4A] italic">
                &quot;I&apos;ve been feeling like I&apos;m just going through the motions, not sure if it matters anymore...&quot;
              </p>
            </div>
            {/* SOAP draft */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[13px] font-semibold text-[#1A1A1A]">SOAP Draft</span>
                <span className="bg-[#EBD9FF] text-[#6c63ff] text-[11px] font-medium px-2 py-0.5 rounded-full">
                  AI Generated
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'S', text: 'Patient reports persistent lethargy and low motivation. Noted improvement in sleep hygiene (6.5 hrs/avg). Expressed frustration with workplace interpersonal conflict.' },
                  { label: 'O', text: 'Flat affect observed. Eye contact maintained. Speech pace normal. No psychomotor disturbance noted.' },
                ].map(({ label, text }) => (
                  <div key={label} className="flex gap-3 text-[13px]">
                    <span className="font-bold text-[#6c63ff] w-4 flex-shrink-0">{label}</span>
                    <span className="text-[#4A4A4A] leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right mini panel */}
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-3">Status</p>
            {[
              { label: 'Risk Flags', status: '✓', color: '#10B981' },
              { label: 'Subjective', status: '✓', color: '#10B981' },
              { label: 'Objective', status: '…', color: '#F59E0B' },
              { label: 'Assessment', status: '🔒', color: '#9CA3AF' },
            ].map(({ label, status, color }) => (
              <div key={label} className="flex justify-between items-center text-[12px] py-1.5">
                <span className="text-[#4A4A4A]">{label}</span>
                <span style={{ color }}>{status}</span>
              </div>
            ))}
            <Link href="/session/new"
              className="mt-4 block w-full bg-[#6c63ff] text-white text-[13px] font-medium py-2 rounded-lg text-center hover:bg-[#5a52d5] transition-colors">
              Try it →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Specialties ───────────────────────────────────────────────────────────────
function Specialties() {
  const specialties = [
    {
      icon: '🧠',
      title: 'Therapists',
      desc: 'Support for DAP, BIRP, and SOAP. Captures therapeutic themes, patient affect, and intervention efficacy without the typing.',
      tags: ['CBT', 'DBT', 'EMDR'],
    },
    {
      icon: '💊',
      title: 'Psychiatrists',
      desc: 'Deep focus on medication management, MSE (Mental Status Exams), and longitudinal risk tracking across sessions.',
      tags: ['MSE', 'Med Management', 'Risk Assessment'],
    },
    {
      icon: '🏥',
      title: 'Primary Care',
      desc: 'High-volume clinical throughput support. Summarizes complex medical history and multi-issue visits into concise, billable notes.',
      tags: ['ICD-10', 'CPT Codes', 'HCC'],
    },
  ];

  return (
    <section id="for-clinicians" className="bg-[#F5F5F5] py-24 px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-14">
          <p className="text-[13px] font-medium text-[#6c63ff] uppercase tracking-wider mb-3">Specialties</p>
          <h2 className="text-[36px] font-bold text-[#1A1A1A] tracking-tight mb-3">
            Tailored for every specialty.
          </h2>
          <p className="text-[16px] text-[#4A4A4A] max-w-[480px] mx-auto">
            Whether you&apos;re in behavioral health or family medicine, EHR Copilot adapts to your
            specific documentation style.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {specialties.map(({ icon, title, desc, tags }) => (
            <div key={title} className="bg-white rounded-[16px] p-6 border border-[#EBEBEB] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow">
              <div className="w-12 h-12 bg-[#EBD9FF] rounded-xl flex items-center justify-center text-2xl mb-4">
                {icon}
              </div>
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">{title}</h3>
              <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">{desc}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="bg-[#F5F5F5] text-[#4A4A4A] text-[11px] font-medium px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Security Section ──────────────────────────────────────────────────────────
function Security() {
  const features = [
    {
      title: 'Encryption at rest & in transit',
      desc: 'AES-256 and TLS 1.3 standards used across all data storage and communications.',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
    },
    {
      title: 'Zero-training policy',
      desc: 'Your clinical data is never used to train global AI models. Your data stays yours.',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      ),
    },
    {
      title: 'Data Residency',
      desc: 'All clinical data is stored in the US on dedicated, secure medical-grade infrastructure.',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
    },
  ];

  return (
    <section id="security" className="py-6 px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Rounded dark card — the whole section is the card */}
        <div className="bg-[#1A1A1A] rounded-[24px] px-14 py-14">
          <div className="grid grid-cols-2 gap-16 items-start">

            {/* ── LEFT ── */}
            <div className="flex flex-col h-full">
              <div className="flex-1">
                {/* Label */}
                <p className="text-[#10B981] text-[11px] font-bold uppercase tracking-[0.14em] mb-6">
                  Trust &amp; Safety
                </p>
                {/* Headline */}
                <h2 className="text-[44px] font-extrabold text-white leading-[1.08] tracking-[-0.01em] mb-5">
                  Clinical-grade<br />security. Zero<br />compromise.
                </h2>
                {/* Body */}
                <p className="text-[15px] text-[#9CA3AF] leading-[1.7] max-w-[380px]">
                  Your data privacy and HIPAA compliance are our foundational priorities.
                  We don&apos;t just &quot;support&quot; privacy; we build it into every line of code.
                </p>
              </div>

              {/* Bottom 2-col trust badges */}
              <div className="grid grid-cols-2 gap-7 mt-12 pt-10 border-t border-[#2A2A2A]">
                <div>
                  <p className="text-[#10B981] text-[13px] font-bold mb-1.5 tracking-wide">
                    HIPAA Compliant
                  </p>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">
                    BAA available for all clinical accounts instantly.
                  </p>
                </div>
                <div>
                  <p className="text-[#10B981] text-[13px] font-bold mb-1.5 tracking-wide">
                    SOC2 Type II
                  </p>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">
                    Annual third-party audits for security &amp; privacy.
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT — 3 stacked feature cards ── */}
            <div className="flex flex-col gap-3 justify-center">
              {features.map(({ title, desc, icon }) => (
                <div
                  key={title}
                  className="bg-[#222222] border border-[#2C2C2C] rounded-[14px] px-5 py-4 flex items-start gap-4 hover:border-[#363636] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#182820] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white mb-1 leading-snug">{title}</p>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}


// ─── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const questions = [
    {
      q: 'How does EHR Copilot ensure HIPAA compliance?',
      a: "We are fully HIPAA compliant. We sign BAAs with all clinical accounts, store data on HIPAA-eligible infrastructure, encrypt all data at rest (AES-256) and in transit (TLS 1.3), and conduct annual third-party security audits. Your PHI never leaves our secure environment.",
    },
    {
      q: 'Does it integrate with my existing EHR?',
      a: 'Yes. We provide direct integrations with Epic, Elation, SimplePractice, Kareo, and others via FHIR R4 API. You can also copy-paste or download a formatted PDF. Our API is open for custom integrations.',
    },
    {
      q: 'How fast does it generate a note?',
      a: 'Notes are typically generated within 15–30 seconds of session completion. The AI runs in real-time alongside your session, so by the time you click "finalize," your SOAP note is already drafted and waiting for review.',
    },
    {
      q: "What if the AI gets something wrong?",
      a: "Every AI-generated section links back to the exact transcript line it was derived from. You review and approve each section individually, with the ability to edit inline or ask the AI to revise based on your feedback. You always have the final say.",
    },
  ];

  return (
    <section id="faq" className="py-24 px-8 max-w-[1200px] mx-auto">
      <div className="text-center mb-14">
        <p className="text-[13px] font-medium text-[#6c63ff] uppercase tracking-wider mb-3">FAQ</p>
        <h2 className="text-[36px] font-bold text-[#1A1A1A] tracking-tight mb-3">Common Questions</h2>
        <p className="text-[16px] text-[#4A4A4A]">Everything you need to know about EHR Copilot.</p>
      </div>
      <div className="max-w-[720px] mx-auto divide-y divide-[#E8E8E8]">
        {questions.map(({ q, a }) => (
          <details key={q} className="py-5 group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="text-[16px] font-semibold text-[#1A1A1A] pr-4">{q}</span>
              <span className="text-[20px] text-[#9CA3AF] flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-[15px] text-[#4A4A4A] leading-[1.65]">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA Section ─────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="px-8 py-6 max-w-[1200px] mx-auto">
      {/* Flat soft periwinkle card — no gradient, no label */}
      <div className="bg-[#ECEDF8] rounded-[24px] px-12 py-20 text-center">
        <h2 className="text-[48px] font-extrabold text-[#1A1A1A] tracking-[-0.02em] leading-[1.1] mb-5 max-w-[640px] mx-auto">
          Ready to stop charting at night?
        </h2>
        <p className="text-[16px] text-[#6B7280] mb-10 max-w-[430px] mx-auto leading-[1.65]">
          Join over 2,000 clinicians who have recovered an average of 10 hours
          per week. Try EHR Copilot free for 14 days.
        </p>
        <div className="flex items-center justify-center gap-3 mb-6">
          <Link href="/session/new"
            className="bg-[#1A1A1A] text-white text-[15px] font-semibold px-8 py-3.5 rounded-full hover:bg-black transition-colors">
            Start Your Free Trial
          </Link>
          <Link href="#"
            className="bg-white text-[#1A1A1A] text-[15px] font-semibold px-8 py-3.5 rounded-full hover:bg-[#F5F5F5] transition-colors shadow-sm">
            Talk to Sales
          </Link>
        </div>
        <p className="text-[13px] text-[#9CA3AF]">
          No credit card required · HIPAA BAA included · 14-day trial
        </p>
      </div>
    </section>
  );
}


// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      head: 'Product',
      links: ['Features', 'Security', 'Pricing', 'Integrations'],
    },
    {
      head: 'Resources',
      links: ['Clinician Blog', 'API Docs', 'Consent Templates', 'Help Center'],
    },
    {
      head: 'Company',
      links: ['About Us', 'Privacy Policy', 'Terms of Service', 'Contact'],
    },
  ];

  return (
    <footer className="bg-[#F5F5F5] border-t border-[#E8E8E8] mt-6 pt-14 pb-8 px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <p className="text-[17px] font-bold text-[#1A1A1A] mb-3">EHR Copilot</p>
            <p className="text-[13px] text-[#6B7280] leading-relaxed max-w-[200px]">
              The intelligent clinical documentation partner for modern clinicians.
            </p>
          </div>
          {/* Link columns */}
          {cols.map(({ head, links }) => (
            <div key={head}>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">{head}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[14px] text-[#4A4A4A] hover:text-[#1A1A1A] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom */}
        <div className="border-t border-[#E8E8E8] pt-6 flex items-center justify-between">
          <p className="text-[13px] text-[#9CA3AF]">© 2024 EHR Copilot. All rights reserved.</p>
          <div className="flex gap-4 text-[13px] text-[#9CA3AF]">
            {['Twitter', 'LinkedIn'].map((s) => (
              <a key={s} href="#" className="hover:text-[#1A1A1A] transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <Specialties />
      <Security />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

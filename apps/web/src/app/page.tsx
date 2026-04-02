import Link from 'next/link';

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header className="glass-navbar">
      <div className="max-w-[1200px] mx-auto px-8 h-[70px] flex items-center justify-between">
        <Link href="/" className="text-[20px] font-serif font-bold text-foreground tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 bg-neon rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-navy rounded-full" />
          </span>
          EHR Copilot
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          {['How it works', 'For Clinicians', 'Security', 'FAQ'].map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[14px] font-medium text-muted-foreground hover:text-neon transition-colors duration-300">
              {label}
            </a>
          ))}
        </nav>
        <Link href="/session/new" className="btn-premium py-2 px-5 text-sm">
          Get Started
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-40 pb-32 px-8 overflow-hidden">
      {/* Background Blobs */}
      <div className="blob w-[500px] h-[500px] bg-neon/10 -top-40 -left-40 animate-float" />
      <div className="blob w-[400px] h-[400px] bg-blue-500/10 top-1/4 -right-20 animate-float" style={{ animationDelay: '-3s' }} />

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
        {/* Left */}
        <div>
          <div className="badge-neon mb-8 animate-float">
            AI-Powered Clinical Documentation
          </div>
          <h1 className="text-[64px] md:text-[80px] font-serif font-bold text-foreground leading-[1.05] tracking-tight mb-8">
            Fortune favours<br />
            <span className="text-neon glow-neon px-2 -mx-2">the brave.</span>
          </h1>
          <p className="text-[18px] text-muted-foreground leading-[1.6] mb-10 max-w-[480px]">
            The organizations that succeed in AI Search are those that build connected systems, deepen audience insights, and embed continuous iteration.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
            <Link href="/session/new" className="btn-premium">
              Start Free Trial
            </Link>
            <Link href="#how-it-works" className="btn-ghost-premium">
              Book a Demo
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-muted-foreground pt-4 border-t border-white/5">
            {['HIPAA Compliant', 'Secure & Private', 'No credit card'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right — Glass Mockup */}
        <div className="relative group">
          <div className="absolute inset-0 bg-neon/20 blur-[100px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="glass-card aspect-[4/3] overflow-hidden flex flex-col p-2 relative z-20 hover:scale-[1.01] transition-transform duration-500">
            <div className="h-6 bg-white/5 rounded-t-xl flex items-center px-4 gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <div className="w-2 h-2 rounded-full bg-white/20" />
            </div>
            <div className="flex-1 bg-navy/40 rounded-b-xl flex items-center justify-center p-8">
               <div className="w-full space-y-4 max-w-sm">
                  <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-white/5 rounded w-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="h-4 bg-neon/10 rounded w-1/2" />
                  <div className="pt-8 space-y-2">
                    <div className="h-8 bg-neon/20 rounded w-full border border-neon/30 flex items-center px-4">
                      <div className="h-1 bg-neon/40 w-1/2 rounded" />
                    </div>
                  </div>
               </div>
            </div>
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
    <section className="bg-navy-light py-32 px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-[42px] font-serif font-bold text-foreground tracking-tight mb-6">
            Everything starts with <span className="italic text-neon">Connectedness.</span>
          </h2>
          <p className="text-[17px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            AI readiness begins with alignment. The teams that succeed create shared systems and shared direction across your clinical workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Problems */}
          <div className="glass-card p-10 border-red-500/10">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-red-500/80 mb-8">
              The Administrative Toll
            </p>
            <div className="space-y-8">
              {problems.map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-6 items-start">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 border border-red-500/10">
                    {icon}
                  </div>
                  <div>
                    <h4 className="text-[18px] font-bold text-foreground mb-1">{title}</h4>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="glass-card p-10 border-neon/10">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-neon mb-8">
              The Copilot Advantage
            </p>
            <div className="space-y-8">
              {solutions.map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-6 items-start">
                  <div className="w-12 h-12 bg-neon/10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 border border-neon/10">
                    {icon}
                  </div>
                  <div>
                    <h4 className="text-[18px] font-bold text-foreground mb-1">{title}</h4>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
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
      num: '01',
      title: 'Record & Contextualize',
      desc: 'Securely record the session. Our AI understands the nuances of patient interaction, capturing both words and clinical sentiment.',
    },
    {
      num: '02',
      title: 'Intelligent Interpretation',
      desc: 'Our clinical LLMs interpret the transcript, surfacing risk flags and drafting structured SOAP notes with direct citations.',
    },
    {
      num: '03',
      title: 'Seamless Integration',
      desc: 'Sync directly to your EHR platform or export as a secure PDF. One-click documentation, zero administrative friction.',
    },
  ];

  return (
    <section id="how-it-works" className="py-40 px-8 relative overflow-hidden">
      <div className="blob w-[600px] h-[600px] bg-neon/5 -bottom-80 -right-40 animate-float" />
      
      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start mb-24">
          <div>
            <p className="text-neon text-[13px] font-bold uppercase tracking-[0.2em] mb-4">The Methodology</p>
            <h2 className="text-[52px] font-serif font-bold text-foreground leading-[1.1] mb-8">
              Why does this matter?
            </h2>
            <p className="text-[17px] text-muted-foreground leading-[1.7]">
              Without explicit, structured data, AI systems provide inaccurate interpretations. We fill the gaps with clinical precision, ensuring your brand of care is documented exactly as it happened.
            </p>
          </div>
          <div className="space-y-12">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="group flex gap-8 items-start">
                <div className="text-[42px] font-serif font-bold text-neon/20 group-hover:text-neon transition-colors duration-500">
                  {num}
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-foreground mb-4">{title}</h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* UI Mockup */}
        <div className="glass-card overflow-hidden p-0">
          <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
             <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <div className="w-3 h-3 rounded-full bg-green-500/40" />
             </div>
             <div className="text-[11px] text-muted-foreground font-mono">APP.EHRCOPILOT.COM/SESSION/LIVE</div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
             <div className="md:col-span-2">
                <div className="bg-neon/10 border-l-4 border-neon p-6 rounded-r-xl mb-10">
                   <p className="text-neon text-[11px] font-bold uppercase tracking-wider mb-2">Live Transcript</p>
                   <p className="text-[15px] text-foreground italic leading-relaxed">
                      "I've been feeling like I'm just going through the motions, not sure if it matters anymore..."
                   </p>
                </div>
                <div className="space-y-6">
                   <div>
                      <p className="text-muted-foreground text-[12px] font-bold uppercase tracking-wider mb-4">SOAP Assessment</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-neon font-bold mr-3">S</span>
                            <span className="text-[13px] text-muted-foreground">Patient reports persistent lethargy...</span>
                         </div>
                         <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-neon font-bold mr-3">O</span>
                            <span className="text-[13px] text-muted-foreground">Flat affect observed. Eye contact...</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="glass-card bg-navy-deep p-6">
                <p className="text-foreground text-[12px] font-bold mb-6">Clinical Readiness</p>
                <div className="space-y-4">
                   {['Risk Vectors', 'Symptom Mapping', 'DSM-5 Alignment'].map((label) => (
                      <div key={label} className="flex justify-between items-center text-[13px]">
                         <span className="text-muted-foreground">{label}</span>
                         <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                      </div>
                   ))}
                </div>
                <button className="btn-premium w-full mt-10 py-2.5 text-xs">
                   Finalize Session
                </button>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Specialities ──────────────────────────────────────────────────────────────
function Specialities() {
  const specialties = [
    {
      icon: '🧠',
      title: 'Therapists',
      desc: 'Seamlessly capture therapeutic themes, affect, and interventions without the typing.',
    },
    {
      icon: '💊',
      title: 'Psychiatrists',
      desc: 'Medication management and risk tracking integrated into every session note.',
    },
    {
      icon: '🏥',
      title: 'Primary Care',
      desc: 'Summarize complex histories into concise, clinical documentation instantly.',
    },
  ];

  return (
    <section id="for-clinicians" className="py-32 px-8 bg-navy-deep relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto text-center relative z-10">
        <h2 className="text-[42px] font-serif font-bold text-foreground mb-16">
          Tailored for every <span className="text-neon italic">Clinical context.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specialties.map(({ icon, title, desc }) => (
            <div key={title} className="glass-card hover:border-neon/30 transition-colors duration-500 p-10 group">
              <div className="w-16 h-16 bg-neon/10 rounded-full flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform duration-500">
                {icon}
              </div>
              <h3 className="text-[22px] font-bold text-foreground mb-4">{title}</h3>
              <p className="text-[15px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-40 px-8 relative text-center overflow-hidden">
      <div className="blob w-[600px] h-[600px] bg-neon/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float" />
      <div className="max-w-[800px] mx-auto relative z-10">
        <h2 className="text-[56px] md:text-[72px] font-serif font-bold text-foreground leading-[1.1] mb-10">
          Ready to stop charting <span className="text-neon italic">at night?</span>
        </h2>
        <p className="text-[18px] text-muted-foreground mb-12 max-w-lg mx-auto">
          Join over 2,000 clinicians who have recovered an average of 10 hours per week.
        </p>
        <Link href="/session/new" className="btn-premium px-10 py-5 text-lg">
          Start Your Free Trial
        </Link>
        <p className="text-[13px] text-muted-foreground mt-8">
          No credit card required · HIPAA BAA included · 14-day trial
        </p>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="min-h-screen bg-navy selection:bg-neon/30 selection:text-neon">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <Specialities />
      <FinalCTA />
      <footer className="py-20 px-8 border-t border-white/5 text-center text-muted-foreground text-sm">
        <div className="max-w-[1200px] mx-auto">
          <p>© 2024 EHR Copilot. Premium AI Documentation for Clinicians.</p>
        </div>
      </footer>
    </main>
  );
}

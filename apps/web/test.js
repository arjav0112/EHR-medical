const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak
} = require('docx');
const fs = require('fs');

// ─── PALETTE ─────────────────────────────────────────────────
const C = {
  navy:     "0B2545",
  blue:     "1A5276",
  teal:     "0E7C86",
  gold:     "B7860A",
  green:    "1A6B3C",
  purple:   "4B2D8F",
  red:      "A93226",
  orange:   "CA6F1E",
  light:    "EBF5FB",
  tealBg:   "E8F8F5",
  goldBg:   "FEF9E7",
  purpleBg: "F4ECF7",
  navyBg:   "EAF0F6",
  white:    "FFFFFF",
  offwhite: "F8F9FA",
  gray:     "3D3D3D",
  midgray:  "6B6B6B",
  lightgray:"AAAAAA",
};

// ─── BORDER HELPERS ───────────────────────────────────────────
const bdr  = (color = "CCCCCC", size = 1) => ({ style: BorderStyle.SINGLE, size, color });
const bdrs = (color = "CCCCCC") => ({ top: bdr(color), bottom: bdr(color), left: bdr(color), right: bdr(color) });
const noBdr = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBdrs = { top: noBdr, bottom: noBdr, left: noBdr, right: noBdr };
const thickLeft = (color) => ({ top: bdr("EEEEEE"), bottom: bdr("EEEEEE"), left: bdr(color, 20), right: bdr("EEEEEE") });

// ─── PARAGRAPH HELPERS ───────────────────────────────────────
function p(text, { bold=false, size=21, color=C.gray, font="Arial", align=AlignmentType.LEFT,
                   before=80, after=80, italics=false } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { before, after },
    children: [new TextRun({ text, bold, size, color, font, italics })]
  });
}

function pMix(runs, { align=AlignmentType.LEFT, before=80, after=80 } = {}) {
  return new Paragraph({ alignment: align, spacing: { before, after }, children: runs });
}

function run(text, { bold=false, size=21, color=C.gray, font="Arial", italics=false } = {}) {
  return new TextRun({ text, bold, size, color, font, italics });
}

function spacer(h=100) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [new TextRun("")] });
}

function divider(color=C.teal, size=6) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    children: [new TextRun("")]
  });
}

function pgBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function bullet(text, prefix="", prefixColor=C.teal) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 55, after: 55 },
    children: [
      ...(prefix ? [new TextRun({ text: prefix + "  ", bold: true, size: 21, font: "Arial", color: prefixColor })] : []),
      new TextRun({ text, size: 21, font: "Arial", color: C.gray })
    ]
  });
}

function numberedItem(text, prefix="", prefixColor=C.teal) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 55, after: 55 },
    children: [
      ...(prefix ? [new TextRun({ text: prefix + "  ", bold: true, size: 21, font: "Arial", color: prefixColor })] : []),
      new TextRun({ text, size: 21, font: "Arial", color: C.gray })
    ]
  });
}

// ─── TABLE HELPERS ───────────────────────────────────────────
function tc(text, { fill=C.white, color=C.gray, bold=false, width=2000,
                    align=AlignmentType.LEFT, size=20, topBorderColor=null } = {}) {
  const cellBorders = topBorderColor
    ? { top: bdr(topBorderColor, 8), bottom: bdr("DDDDDD"), left: bdr("DDDDDD"), right: bdr("DDDDDD") }
    : bdrs("DDDDDD");
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 110, bottom: 110, left: 150, right: 150 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, bold, size, font: "Arial", color })] })]
  });
}

function tcMulti(children, { fill=C.white, width=2000 } = {}) {
  return new TableCell({
    borders: bdrs("DDDDDD"),
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 110, bottom: 110, left: 150, right: 150 },
    children
  });
}

function hRow(cols, widths, fill=C.navy) {
  return new TableRow({ children: cols.map((c, i) =>
    tc(c, { fill, color: C.white, bold: true, width: widths[i], align: AlignmentType.CENTER })
  )});
}

function dRow(cols, widths, idx=0) {
  const fill = idx % 2 === 0 ? C.white : C.offwhite;
  return new TableRow({ children: cols.map((c, i) => tc(c, { fill, width: widths[i] })) });
}

function tbl(headers, rows, widths) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [ hRow(headers, widths), ...rows.map((r, i) => dRow(r, widths, i)) ]
  });
}

// Full-width colored KPI bar
function kpiBar(items) {
  const w = Math.floor(9360 / items.length);
  const widths = items.map(() => w);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({ children: items.map((it, i) => new TableCell({
      borders: noBdrs,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: it.color, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 120, right: 120 },
      children: [
        p(it.val,   { bold: true, size: 44, color: C.white, align: AlignmentType.CENTER, before: 0, after: 20 }),
        p(it.label, { bold: true, size: 18, color: "DDDDDD", align: AlignmentType.CENTER, before: 0, after: 16 }),
        p(it.sub,   { size: 16, color: "BBCCCC", align: AlignmentType.CENTER, before: 0, after: 0 }),
      ]
    }))})],
  });
}

// Section header with numbered badge
function secHeader(num, title, color=C.navy) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [800, 8560],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBdrs, width: { size: 800, type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        children: [p(num, { bold: true, size: 36, color: C.white, align: AlignmentType.CENTER, before: 0, after: 0 })]
      }),
      new TableCell({
        borders: { top: noBdr, bottom: bdr(color, 4), left: noBdr, right: noBdr },
        width: { size: 8560, type: WidthType.DXA },
        shading: { fill: C.offwhite, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children: [p(title, { bold: true, size: 32, color, before: 0, after: 0 })]
      })
    ]})]
  });
}

// Two-column info table (label | value)
function twoCol(rows, lw=2800, rw=6560) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [lw, rw],
    rows: rows.map(([l, v], i) => new TableRow({ children: [
      tc(l, { fill: C.navyBg, color: C.navy, bold: true, width: lw, size: 20 }),
      tc(v, { fill: i%2===0?C.white:C.offwhite, width: rw, size: 20 })
    ]}))
  });
}

// Highlight callout box
function callout(title, body, color=C.teal, bg="F0FAFA") {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: thickLeft(color),
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 260, right: 260 },
      children: [
        p(title, { bold: true, size: 22, color, before: 0, after: 60 }),
        p(body,  { size: 20, color: C.gray, before: 0, after: 0 })
      ]
    })]})],
  });
}

// Revenue stream card
function streamCard(num, name, tagline, bodyText, metrics, color) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [380, 8980],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBdrs, width: { size: 380, type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [p(num, { bold: true, size: 28, color: C.white, align: AlignmentType.CENTER, before: 160, after: 0 })]
      }),
      new TableCell({
        borders: { top: bdr("E0E0E0"), bottom: bdr("E0E0E0"), left: bdr(color, 12), right: bdr("E0E0E0") },
        width: { size: 8980, type: WidthType.DXA },
        shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 260, right: 260 },
        children: [
          p(name,    { bold: true, size: 26, color, before: 0, after: 30 }),
          p(tagline, { size: 19, color: C.midgray, italics: true, before: 0, after: 100 }),
          p(bodyText,{ size: 20, color: C.gray, before: 0, after: 100 }),
          p(metrics, { bold: true, size: 20, color, before: 0, after: 0 })
        ]
      })
    ]})]
  });
}

// Timeline row
function timelineRow(year, phase, items, color) {
  return new TableRow({ children: [
    tc(year,  { fill: color, color: C.white, bold: true, width: 1200, align: AlignmentType.CENTER, size: 22 }),
    tc(phase, { fill: C.offwhite, color, bold: true, width: 2000, size: 20 }),
    tcMulti(items.map(it => p(it, { size: 19, color: C.gray, before: 30, after: 30 })),
            { fill: C.white, width: 6160 })
  ]});
}

// ─────────────────────────────────────────────────────────────
// BUILD DOCUMENT
// ─────────────────────────────────────────────────────────────
const children = [];

const add = (...items) => items.forEach(i => children.push(i));

// ══════════════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════════════
add(
  spacer(600),
  // Logo-style name block
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBdrs, width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 300, bottom: 300, left: 400, right: 400 },
      children: [
        p("FINWISE AI", { bold: true, size: 96, color: C.white, align: AlignmentType.CENTER, before: 0, after: 60 }),
        p("India's First Privacy-First, Local AI Finance Platform", { size: 26, color: "9BB8D4", align: AlignmentType.CENTER, before: 0, after: 80 }),
        divider("9BB8D4", 3),
        p("Credit Cards  •  Loans  •  Financial Literacy  •  AI-Powered Guidance", { size: 22, color: "CCDDEE", align: AlignmentType.CENTER, before: 80, after: 0 }),
      ]
    })]})],
  }),
  spacer(200),
  kpiBar([
    { val: "900M+", label: "Underserved Users", sub: "Target Market", color: C.navy },
    { val: "₹38 Cr", label: "Year 3 Revenue", sub: "Conservative Estimate", color: C.teal },
    { val: "74%",   label: "Gross Margin",    sub: "At Scale",            color: C.green },
    { val: "₹150",  label: "CAC",             sub: "vs ₹950 LTV",         color: C.gold },
    { val: "Year 6", label: "Loan Provider",  sub: "Expansion Phase",     color: C.purple },
  ]),
  spacer(160),
  p("INVESTOR PITCH DECK  —  Series Seed  |  May 2026", { size: 19, color: C.midgray, align: AlignmentType.CENTER, italics: true }),
  p("Prepared for: Seed Investors, Angel Networks, Fintech VCs", { size: 18, color: C.lightgray, align: AlignmentType.CENTER }),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // TABLE OF CONTENTS
  // ══════════════════════════════════════════════════════════════
  secHeader("—", "Document Index", C.navy),
  spacer(),
  tbl(
    ["#", "Section", "Page Focus"],
    [
      ["01", "The Problem — Why India Needs FinWise",        "Market gap, pain points"],
      ["02", "The Solution — What FinWise AI Does",          "Platform overview, local AI"],
      ["03", "Product Deep Dive",                            "Features, UX, tech stack"],
      ["04", "Market Opportunity",                           "TAM / SAM / SOM, India context"],
      ["05", "Business Model & Revenue Streams",             "8 streams, detailed projections"],
      ["06", "Financial Projections (5-Year P&L)",           "Revenue, costs, EBITDA, unit economics"],
      ["07", "Go-To-Market Strategy",                        "Launch phases, channels, partnerships"],
      ["08", "Competitive Landscape",                        "Vs. SaveSage, BankBazaar, others"],
      ["09", "Technology & AI Architecture",                 "Local model, fine-tuning, stack"],
      ["10", "Traction & Milestones Roadmap",                "Timeline, KPIs, team"],
      ["11", "The Loan Provider Vision — Year 6+",           "NBFC license, direct lending"],
      ["12", "Risk Analysis & Mitigation",                   "Regulatory, tech, market risks"],
      ["13", "The Ask — Funding & Use of Capital",           "Seed ask, deployment plan"],
    ],
    [600, 4800, 3960]
  ),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 01 — THE PROBLEM
  // ══════════════════════════════════════════════════════════════
  secHeader("01", "The Problem — Why India Needs FinWise", C.red),
  spacer(),
  p("India has the world's fastest-growing credit market — but most of its users are financially illiterate, exploited by misinformation, or simply ignored by existing tools. Three massive, unsolved pain points define the opportunity:", { size: 21, color: C.gray }),
  spacer(120),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 3120, 3120],
    rows: [new TableRow({ children: [
      new TableCell({ borders: noBdrs, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "FEF2F2", type: ShadingType.CLEAR }, margins: { top: 200, bottom: 200, left: 200, right: 200 }, children: [
        p("PROBLEM 1", { bold: true, size: 19, color: C.red, align: AlignmentType.CENTER, before: 0, after: 60 }),
        p("Credit Card Chaos", { bold: true, size: 24, color: C.navy, align: AlignmentType.CENTER, before: 0, after: 80 }),
        p("200+ cards in India. Users have no way to compare them meaningfully. 70% never maximize rewards. Most rely on bank call center advice — which is biased.", { size: 19, color: C.gray, align: AlignmentType.CENTER, before: 0, after: 0 }),
      ]}),
      new TableCell({ borders: noBdrs, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "FFF8E1", type: ShadingType.CLEAR }, margins: { top: 200, bottom: 200, left: 200, right: 200 }, children: [
        p("PROBLEM 2", { bold: true, size: 19, color: C.gold, align: AlignmentType.CENTER, before: 0, after: 60 }),
        p("Loan Misinformation", { bold: true, size: 24, color: C.navy, align: AlignmentType.CENTER, before: 0, after: 80 }),
        p("Millions overpay on interest because they don't know NBFC options exist. Loan sharks target the uninformed. CIBIL score is a mystery to most borrowers.", { size: 19, color: C.gray, align: AlignmentType.CENTER, before: 0, after: 0 }),
      ]}),
      new TableCell({ borders: noBdrs, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "F0F4FF", type: ShadingType.CLEAR }, margins: { top: 200, bottom: 200, left: 200, right: 200 }, children: [
        p("PROBLEM 3", { bold: true, size: 19, color: C.blue, align: AlignmentType.CENTER, before: 0, after: 60 }),
        p("Zero Guidance Layer", { bold: true, size: 24, color: C.navy, align: AlignmentType.CENTER, before: 0, after: 80 }),
        p("Existing comparison sites (BankBazaar, Paisabazaar) are static lead generators — not advisors. No platform answers 'What should I do?' in plain Hindi.", { size: 19, color: C.gray, align: AlignmentType.CENTER, before: 0, after: 0 }),
      ]}),
    ]})]
  }),
  spacer(160),
  callout("The Data Behind the Problem",
    "SaveSage's own pan-India survey found that 70% of credit card users fail to maximize rewards. India has 80M+ active card holders yet financial literacy rates for credit products remain below 22% in Tier 2/3 cities. 600M+ loan accounts exist — with the majority sourced through DSAs who charge 1-3% extra in hidden fees. There is no trusted, always-on, personalized financial advisor for the common Indian.",
    C.red, "FEF9F9"),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 02 — THE SOLUTION
  // ══════════════════════════════════════════════════════════════
  secHeader("02", "The Solution — What FinWise AI Does", C.teal),
  spacer(),
  callout("One-Line Pitch",
    "FinWise AI is a locally-hosted, fine-tuned AI financial advisor that answers every credit card and loan question, recommends the right products, and builds financial literacy — entirely on-device, in Hindi and English, with zero cloud dependency.",
    C.teal, C.tealBg),
  spacer(140),
  p("FinWise is not a comparison site. It is a conversational financial co-pilot — the difference between a static menu and a knowledgeable friend who knows your financial situation and guides you in real time.", { size: 21, color: C.gray }),
  spacer(120),
  twoCol([
    ["What It Is",            "An AI-powered finance guidance platform: credit cards, loans, financial literacy, doubt solving"],
    ["What Makes It Unique",  "Local LLM (runs on your server/device — no API, no cloud, no data leakage)"],
    ["Primary Interface",     "Web app + Android app + WhatsApp bot — meets users where they are"],
    ["Languages",             "Hindi + English from Day 1 (Tamil, Telugu in Year 2)"],
    ["Core AI Capability",    "Fine-tuned Mistral 7B on scraped Indian credit card & loan data — answers in <200ms"],
    ["Data Privacy",          "Zero PII leaves the device/local server. No cloud LLM calls. RBI-friendly architecture"],
    ["Target User",           "Salaried Indians aged 22-45, first-time credit users, loan seekers in Tier 1/2/3 cities"],
    ["Business Model",        "Freemium platform + bank referral commissions + sponsorships + B2B API"],
  ]),
  spacer(140),
  p("The Five Things FinWise Does That No One Else Does:", { bold: true, size: 22, color: C.navy }),
  spacer(60),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1440, 3400, 4520],
    rows: [
      hRow(["#", "Capability", "Why It Matters"], [1440, 3400, 4520]),
      dRow(["1", "Conversational card/loan Q&A in Hindi", "Reaches 400M Hindi speakers ignored by English-first tools"], [1440, 3400, 4520], 0),
      dRow(["2", "Local AI — no cloud, no API cost", "CAC stays low; scales to Tier 3 where ARPU is small"], [1440, 3400, 4520], 1),
      dRow(["3", "Loan matching + eligibility pre-check", "Saves users from rejection hits on CIBIL score"], [1440, 3400, 4520], 0),
      dRow(["4", "Financial literacy modules (not just comparison)", "Builds long-term trust and user stickiness"], [1440, 3400, 4520], 1),
      dRow(["5", "Full offline capability via quantized model", "Works in low-connectivity Tier 2/3 areas"], [1440, 3400, 4520], 0),
    ]
  }),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 03 — PRODUCT DEEP DIVE
  // ══════════════════════════════════════════════════════════════
  secHeader("03", "Product Deep Dive", C.blue),
  spacer(),
  p("FinWise ships as a multi-channel product across web, Android, and WhatsApp. The core AI engine is shared across all channels.", { size: 21, color: C.gray }),
  spacer(120),
  p("3.1  Core Feature Set", { bold: true, size: 26, color: C.navy }),
  spacer(60),
  tbl(
    ["Feature", "Description", "Priority", "Available"],
    [
      ["AI Finance Chat",         "Unlimited conversational Q&A on cards, loans, fees, CIBIL, EMI — Hindi + English",   "P0", "Launch"],
      ["Smart Card Recommender",  "Input income + spend habits → ranked top-5 card suggestions with reasoning",           "P0", "Launch"],
      ["Loan Matcher",            "Input loan need + CIBIL range → best lender, rate comparison, eligibility check",      "P0", "Launch"],
      ["EMI Calculator+",         "Not just EMI — full amortization schedule, total interest paid, prepayment impact",    "P0", "Launch"],
      ["CIBIL Coach",             "Explains score, what damaged it, 90-day improvement roadmap",                          "P0", "Launch"],
      ["Financial Literacy Hub",  "Bite-sized explainers: APR, moratorium, minimum due trap, credit utilization",         "P1", "Month 2"],
      ["Doubt Solver",            "Plain-language answers to billing disputes, charge queries, late fee waivers",          "P1", "Month 2"],
      ["Card vs Card Compare",    "Side-by-side compare: 3 cards × 15 parameters, clearly visualized",                   "P1", "Month 3"],
      ["Spend Optimizer",         "Tell FinWise your monthly spend pattern → optimal card-for-spend mapping",             "P2", "Month 6"],
      ["WhatsApp Bot",            "All core features via WhatsApp — zero app install friction",                           "P1", "Month 2"],
      ["Expert Connect",          "Escalate to human certified financial planner (Elite plan)",                           "P2", "Month 6"],
      ["FinWise Academy",         "Short video + text courses on personal finance, sold à la carte",                      "P3", "Month 10"],
    ],
    [2600, 4000, 1200, 1560]
  ),
  spacer(140),
  p("3.2  User Journey (Typical Flow)", { bold: true, size: 26, color: C.navy }),
  spacer(60),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [520, 2200, 4440, 2200],
    rows: [
      hRow(["Step", "Stage", "What Happens", "Revenue Touch"], [520, 2200, 4440, 2200]),
      dRow(["1", "Discovery", "User Googles 'best card for salary 40K' → lands on FinWise SEO article", "Organic traffic"], [520, 2200, 4440, 2200], 0),
      dRow(["2", "Onboarding", "Answers 5 quick questions: income, spending categories, existing cards, loan history", "Data for personalization"], [520, 2200, 4440, 2200], 1),
      dRow(["3", "AI Consult", "Chat with FinWise AI — asks follow-up questions, explains options in Hindi/English", "Engagement, trust build"], [520, 2200, 4440, 2200], 0),
      dRow(["4", "Recommendation", "AI recommends top 3 cards/loans with full rationale and apply links", "Referral commission trigger"], [520, 2200, 4440, 2200], 1),
      dRow(["5", "Application", "User clicks affiliate link → redirected to bank/NBFC, applies", "Commission on approval"], [520, 2200, 4440, 2200], 0),
      dRow(["6", "Follow-up", "FinWise sends optimization tips, rewards reminders, proactive doubt solving", "Retention → upsell to Pro"], [520, 2200, 4440, 2200], 1),
    ]
  }),
  spacer(140),
  p("3.3  Technology Architecture", { bold: true, size: 26, color: C.navy }),
  spacer(60),
  twoCol([
    ["AI Base Model",       "Mistral 7B Instruct v0.3 — fine-tuned via QLoRA on Indian credit/loan scraped dataset"],
    ["Intent Classifier",   "IndicBERT (180M params) — routes queries in <20ms before invoking main model"],
    ["Inference Engine",    "Ollama / llama.cpp — GGUF 4-bit quantized, runs on 8GB RAM (CPU) or single GPU"],
    ["API Layer",           "FastAPI (Python) — REST endpoints consumed by all client apps"],
    ["Vector Database",     "Pinecone / Weaviate — semantic search over 50,000+ card/loan fact chunks (RAG)"],
    ["Backend Database",    "PostgreSQL — user profiles, query history, affiliate tracking"],
    ["Web Frontend",        "Next.js + Tailwind CSS — fast, SEO-optimized"],
    ["Mobile App",          "React Native (Android first) — on-device Phi-3 Mini for offline inference"],
    ["WhatsApp Layer",      "WhatsApp Business API (Meta Cloud) + webhook to FastAPI"],
    ["Analytics",           "PostHog (self-hosted) — privacy-safe product analytics"],
  ]),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 04 — MARKET OPPORTUNITY
  // ══════════════════════════════════════════════════════════════
  secHeader("04", "Market Opportunity", C.green),
  spacer(),
  kpiBar([
    { val: "₹18 Lakh Cr", label: "Annual Card Spend",    sub: "FY2025, India",        color: C.navy },
    { val: "80M+",         label: "Active Card Holders", sub: "Growing 22% YoY",      color: C.teal },
    { val: "600M+",        label: "Loan Accounts",       sub: "Personal + Home + Auto",color: C.green },
    { val: "$2.1B",        label: "India Fintech AI",    sub: "2025 market, 42% CAGR", color: C.gold },
  ]),
  spacer(140),
  p("TAM / SAM / SOM", { bold: true, size: 26, color: C.navy }),
  spacer(60),
  tbl(
    ["Market Level", "Definition", "Size", "FinWise Relevance"],
    [
      ["TAM — Total Addressable", "All Indians who hold or want a credit card or loan product", "~400M users", "Full long-term market"],
      ["SAM — Serviceable",       "Smartphone users, digitally active, aged 18-50, Tier 1/2/3", "~150M users",  "Reachable via web/app/WhatsApp"],
      ["SOM — Obtainable (Y3)",   "Users actively searching for card/loan guidance online",    "~10M MAU",     "3-year realistic target"],
      ["SOM — Obtainable (Y5)",   "With loan provider feature + broader financial OS",         "~35M MAU",     "5-year target with NBFC license"],
    ],
    [2400, 3200, 1560, 2200]
  ),
  spacer(140),
  p("Why Now? The Tailwind Factors:", { bold: true, size: 22, color: C.navy }),
  spacer(60),
  bullet("UPI normalization has created 300M+ digitally-active Indians comfortable with fintech apps"),
  bullet("RBI's Account Aggregator framework (live) enables consent-based financial data access — perfect for FinWise's loan matching"),
  bullet("Credit card penetration growing 22% YoY — millions entering the ecosystem with zero guidance"),
  bullet("Open-source LLMs (Mistral, LLaMA 3) now match GPT-3.5 quality — local AI is finally viable and affordable"),
  bullet("Post-COVID financial anxiety has made Indians hungry for trustworthy, personalized financial guidance"),
  bullet("Jio + cheap data has made Tier 2/3 cities the fastest-growing fintech user base in the world"),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 05 — REVENUE STREAMS
  // ══════════════════════════════════════════════════════════════
  secHeader("05", "Business Model & Revenue Streams", C.gold),
  spacer(),
  p("FinWise operates on a diversified 8-stream revenue model. The model is user-friendly first (free or low-cost for users) while monetizing the financial ecosystem that benefits from FinWise's high-intent, pre-qualified user base.", { size: 21, color: C.gray }),
  spacer(120),

  streamCard("01", "Credit Card Referral Commissions",
    "Per-approved-application fee paid by issuing banks",
    "Every time FinWise recommends a card and the user applies and gets approved through our tracked link, the bank pays FinWise a commission. Rates vary by card tier. This is the highest-volume revenue stream from Day 1.",
    "Commission Range: ₹300–₹2,500 per approval  |  Y1: ₹32L  |  Y3: ₹16.6 Cr",
    C.teal),
  spacer(80),

  streamCard("02", "Credit Card Company Sponsorships",
    "Banks pay for featured placement, launch campaigns, newsletter & content partnerships",
    "Once FinWise reaches 10,000+ MAU, banks pay for premium visibility. Four products: Featured Placement (₹2L/month/card), Launch Campaign (₹8L flat), Newsletter Sponsorship (₹80K/issue), Co-branded Literacy Content (₹5L/module). All sponsorships clearly disclosed — FinWise's credibility is non-negotiable.",
    "Y1: ₹53L  |  Y2: ₹1.8 Cr  |  Y3: ₹3.76 Cr",
    C.gold),
  spacer(80),

  streamCard("03", "Personal & Home Loan Referrals",
    "NBFC and bank commissions on disbursed loan applications",
    "Loan referrals carry the highest per-transaction commission in Indian fintech. FinWise matches users to the right lender based on their income, CIBIL score, and loan purpose — sending pre-qualified leads. Partners include BajajFinserv, MoneyView, HDFC Ltd., Tata Capital, Lendingkart.",
    "Commission: ₹1,000–₹5,000 per disbursed loan  |  Y1: ₹11.5L  |  Y3: ₹5.38 Cr",
    C.green),
  spacer(80),

  streamCard("04", "Premium Subscription (FinWise Pro / Elite)",
    "₹99–₹349/month for power features, unlimited AI, and expert access",
    "Free tier is limited to 5 queries/day and basic comparison. Pro (₹99) unlocks unlimited AI, CIBIL coaching, ad-free experience. Elite (₹249) adds monthly expert consultation calls. Family (₹349) covers 3 members. Target 4% MAU-to-paid conversion — industry-standard for fintech freemium.",
    "ARPU: ₹130 (Pro) / ₹280 (Elite)  |  Y1: ₹34.4L  |  Y3: ₹7.92 Cr",
    C.purple),
  spacer(80),

  streamCard("05", "Insurance Referrals",
    "Term life, health & vehicle insurance commission when users discover insurance need",
    "Financial literacy naturally leads to insurance discovery. A user learning about emergency funds hears about term insurance. FinWise routes to PolicyBazaar, Ditto, or direct insurers. Commission per policy: ₹800–₹5,000.",
    "Activates: Month 8  |  Y2: ₹50L  |  Y3: ₹1.5 Cr",
    C.orange),
  spacer(80),

  streamCard("06", "White-label AI API (B2B)",
    "License the fine-tuned finance LLM to banks, NBFCs, and fintechs",
    "After 12 months of real-world performance data, FinWise licenses its model to organizations that need a financial AI assistant but lack ML capability. Starter (₹25K/month), Business (₹75K/month), Enterprise (₹2-5L/month). High-margin, recurring, defensible.",
    "Activates: Month 14  |  Y2: ₹36L  |  Y3: ₹1.86 Cr",
    C.blue),
  spacer(80),

  streamCard("07", "BNPL / EMI Partnership Commissions",
    "Revenue from Buy-Now-Pay-Later and no-cost EMI integrations",
    "When users calculate EMIs or search for small-ticket credit, FinWise surfaces BNPL options from Simpl, LazyPay, and e-commerce EMI partners. Commission per activated account: ₹150–₹400. Low effort, high volume at scale.",
    "Y1: ₹3L  |  Y2: ₹22L  |  Y3: ₹80L",
    C.red),
  spacer(80),

  streamCard("08", "FinWise Academy — Paid Courses",
    "One-time purchase micro-courses on personal finance topics",
    "'Credit Card Mastery' (₹299), 'Loan Negotiation Playbook' (₹199), 'CIBIL Repair Guide' (₹149), 'Tax + Card Bundle' (₹499). Produced once, sold repeatedly. 80%+ gross margin. Reinforces FinWise as a financial education brand.",
    "Activates: Month 10  |  Y2: ₹26.5L  |  Y3: ₹80L",
    C.navy),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 06 — FINANCIAL PROJECTIONS
  // ══════════════════════════════════════════════════════════════
  secHeader("06", "Financial Projections — 5-Year Model", C.navy),
  spacer(),
  p("6.1  Revenue by Stream (₹ in Lakhs)", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Revenue Stream", "Y1", "Y2", "Y3", "Y4", "Y5"],
    [
      ["1. Card Referral",       "32",    "283",   "1,660", "3,200",  "5,000"],
      ["2. Sponsorships",        "53",    "180",   "376",   "640",    "960"],
      ["3. Loan Referral",       "11.5",  "103",   "538",   "1,100",  "1,800"],
      ["4. Subscriptions",       "34.4",  "198",   "792",   "1,500",  "2,400"],
      ["5. Insurance Referral",  "0",     "50",    "150",   "360",    "650"],
      ["6. B2B API",             "0",     "36",    "186",   "480",    "900"],
      ["7. BNPL Commissions",    "3",     "22",    "80",    "180",    "320"],
      ["8. Academy Courses",     "0",     "26.5",  "80",    "160",    "280"],
      ["TOTAL (₹ Lakhs)",        "133.9", "898.5", "3,862", "7,620",  "12,310"],
      ["TOTAL (₹ Crores)",       "1.34",  "8.99",  "38.62", "76.20",  "123.10"],
    ],
    [2800, 900, 900, 1100, 1100, 1560]
  ),
  spacer(140),
  p("6.2  Cost Structure (₹ in Lakhs)", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Cost Category", "Y1", "Y2", "Y3", "Y4", "Y5"],
    [
      ["Team (salaries)",          "72",   "240",   "600",   "1,200", "2,000"],
      ["Infrastructure / Servers", "6",    "24",    "60",    "120",   "200"],
      ["Model Training & Compute", "8",    "15",    "30",    "50",    "80"],
      ["Marketing & Acquisition",  "24",   "96",    "240",   "480",   "800"],
      ["Legal & Compliance",       "6",    "18",    "48",    "100",   "180"],
      ["Platform & SaaS Tools",    "3",    "8",     "18",    "36",    "60"],
      ["Affiliate Payouts",        "2",    "12",    "48",    "96",    "160"],
      ["Office & Misc.",           "0",    "6",     "16",    "30",    "50"],
      ["TOTAL COSTS (₹ Lakhs)",    "121",  "419",   "1,060", "2,112", "3,530"],
    ],
    [2800, 900, 900, 1100, 1100, 1560]
  ),
  spacer(140),
  p("6.3  Profit & Loss Summary", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["P&L Metric", "Y1", "Y2", "Y3", "Y4", "Y5"],
    [
      ["Revenue (₹ Cr)",        "1.34",  "8.99",  "38.62",  "76.20",   "123.10"],
      ["Total Costs (₹ Cr)",    "1.21",  "4.19",  "10.60",  "21.12",   "35.30"],
      ["EBITDA (₹ Cr)",         "+0.13", "+4.80", "+28.02", "+55.08",  "+87.80"],
      ["EBITDA Margin",         "9.7%",  "53.4%", "72.6%",  "72.3%",   "71.3%"],
      ["Cash-flow Positive",    "Month 11", "—",  "—",      "—",       "—"],
      ["MAU",                   "50K",   "2.5L",  "10L",    "22L",     "40L"],
      ["Paying Subscribers",    "2,000", "11K",   "40K",    "88K",     "1.6L"],
    ],
    [2800, 1020, 1020, 1020, 1240, 1260]
  ),
  spacer(140),
  p("6.4  Unit Economics", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  kpiBar([
    { val: "₹150",  label: "CAC (Y1)",         sub: "Cost per MAU acquired", color: C.navy },
    { val: "₹950",  label: "LTV (18 months)",  sub: "Per user lifetime value", color: C.teal },
    { val: "6.3x",  label: "LTV : CAC",        sub: "Benchmark: 3x is healthy", color: C.green },
    { val: "~5 mo", label: "CAC Payback",       sub: "Months to recover CAC", color: C.gold },
  ]),
  spacer(80),
  twoCol([
    ["Free → Paid Conversion",   "4% (Y1) → 7% (Y3) — inline with fintech freemium benchmarks"],
    ["Card Referral Conversion",  "8% of recommendation sessions → approved applications"],
    ["Avg. Monthly Churn (Paid)", "6% (Y1) falling to 3% (Y3) as product matures"],
    ["ARPU (blended, all MAU)",   "₹22/MAU/month (Y1) → ₹38/MAU/month (Y3)"],
    ["Gross Margin at Scale",     "~74% — driven by low marginal cost of local AI inference"],
    ["Revenue per Employee",      "₹22L (Y1) → ₹84L (Y3) — strong leverage model"],
  ]),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 07 — GO TO MARKET
  // ══════════════════════════════════════════════════════════════
  secHeader("07", "Go-To-Market Strategy", C.teal),
  spacer(),
  p("FinWise's GTM is built on trust and intent — capturing users at the exact moment they are searching for financial guidance, not carpet-bombing them with ads.", { size: 21, color: C.gray }),
  spacer(120),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1200, 2000, 6160],
    rows: [
      hRow(["Phase", "Timeline", "Key Actions & Channels"], [1200, 2000, 6160]),
      timelineRow("Phase 1", "Month 1–4\nMVP Launch", [
        "SEO content engine: 200 articles targeting high-intent queries ('best credit card for ₹30K salary', 'personal loan with 680 CIBIL')",
        "WhatsApp bot launch: viral 'forward this bot to 5 friends' incentive mechanism",
        "Reddit & Quora: answer 50+ finance questions/week, build authority, drive traffic",
        "3 YouTube/Instagram finance influencer collaborations (demo-based, not ads)",
        "Product Hunt launch for tech audience",
      ], C.teal),
      timelineRow("Phase 2", "Month 5–12\nGrowth Engine", [
        "Bank partnership program: integrate referral links for HDFC, Axis, ICICI, SBI, Kotak",
        "NBFC loan referral network: BajajFinserv, MoneyView, KreditBee, Tata Capital",
        "Android app launch with offline AI capability",
        "Hindi-first UI rollout for Tier 2/3 city users",
        "FinWise Forum: community Q&A (content moat + SEO)",
        "First sponsorship deals: target 2 banks for featured placement",
      ], C.blue),
      timelineRow("Phase 3", "Year 2\nScale & Brand", [
        "B2B API product pilot with 2-3 NBFCs",
        "Insurance vertical launch (PolicyBazaar / Ditto partnership)",
        "Tamil + Telugu language support",
        "FinWise Academy course launch",
        "Series A fundraise prep",
        "Targeted performance marketing for loan referral flow (high ROAS category)",
      ], C.green),
      timelineRow("Phase 4", "Year 3–4\nDomination", [
        "Expand B2B API to 8-10 institutional clients",
        "iOS app launch with on-device AI",
        "Mutual fund & FD guidance added",
        "Account Aggregator integration for proactive financial insights",
        "National brand campaign: 'Your Financial Co-pilot'",
      ], C.gold),
    ]
  }),
  spacer(140),
  p("Distribution Moats (Hard to Replicate):", { bold: true, size: 22, color: C.navy }),
  spacer(60),
  bullet("SEO content library — 1,000+ articles in 24 months = compounding organic traffic with near-zero CAC"),
  bullet("WhatsApp distribution — 500M+ Indian users, zero app-install friction, shareable by nature"),
  bullet("Trust capital — FinWise's local AI / no-cloud positioning resonates powerfully in a post-data-breach era"),
  bullet("Dataset moat — proprietary user query data (anonymized) makes the model smarter over time; competitors can't replicate this"),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 08 — COMPETITIVE LANDSCAPE
  // ══════════════════════════════════════════════════════════════
  secHeader("08", "Competitive Landscape", C.purple),
  spacer(),
  tbl(
    ["Competitor", "What They Do", "Strength", "Weakness vs FinWise"],
    [
      ["SaveSage",       "Rewards optimization for existing card users", "Strong brand, 7.5L users, AI assistant (Savvy)", "No loans, no literacy, cloud-based, English-primary, not Tier 2/3 focused"],
      ["BankBazaar",     "Card & loan comparison + lead gen",            "Scale, bank relationships, SEO dominance",        "Static comparison only, no conversational AI, no local model, ad-heavy UX"],
      ["Paisabazaar",    "Loan & credit score marketplace",              "CIBIL integration, strong loan vertical",          "No card guidance depth, no AI advisor, UI is complex for first-time users"],
      ["Jupiter / Fi",   "Neo-banks with some credit guidance",          "Strong UX, niche user base",                      "Not focused on credit card guidance, no local AI, limited loan matching"],
      ["Google / Bard",  "General AI that can answer finance queries",   "Brand trust, quality answers",                     "Not specialized on Indian cards/loans, no referral engine, no local model"],
      ["FinWise AI",     "Local AI finance advisor: cards + loans + literacy", "Privacy, Hindi-first, offline, specialized dataset, referral + subscription revenue", "—"],
    ],
    [1600, 2400, 2200, 3160]
  ),
  spacer(120),
  callout("FinWise's Defensible Moat",
    "FinWise competes on a fundamentally different axis: it is the only platform combining (1) a locally-running, fine-tuned finance AI, (2) bilingual Hindi+English guidance, (3) full loan + card + literacy coverage, and (4) a business model that aligns with user trust. SaveSage is the closest — but they are rewards-focused and cloud-dependent. FinWise is the 10x better version for the 80% of India that SaveSage doesn't serve.",
    C.purple, C.purpleBg),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 09 — TECHNOLOGY
  // ══════════════════════════════════════════════════════════════
  secHeader("09", "Technology & AI Architecture", C.blue),
  spacer(),
  p("FinWise's technology is its deepest competitive barrier. A locally-hosted, fine-tuned LLM trained on proprietary Indian financial data is not something a competitor can replicate in months.", { size: 21, color: C.gray }),
  spacer(120),
  p("9.1  Why Local AI Is the Right Architecture", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Dimension", "Cloud LLM (GPT-4, Gemini)", "FinWise Local AI"],
    [
      ["Cost per query",         "₹0.08–₹0.40 (API cost)",             "~₹0.001 (electricity only)"],
      ["Latency",                "800ms–3,000ms",                       "<200ms — feels instant"],
      ["Data privacy",           "PII sent to US servers",              "Zero data leaves India/device"],
      ["Offline capability",     "Requires internet",                   "Full offline via GGUF model"],
      ["Customization",          "Prompt engineering only",             "Fine-tuned on our exact dataset"],
      ["RBI compliance risk",    "High — foreign data processing",      "Low — local processing"],
      ["Cost at 10M queries/day","₹8–40 Lakh/day (unviable)",          "~₹1,000/day (server electricity)"],
    ],
    [2600, 3200, 3560]
  ),
  spacer(120),
  p("9.2  Model Selection & Training Summary", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  twoCol([
    ["Base Model",          "Mistral 7B Instruct v0.3 (Apache 2.0 — commercially safe)"],
    ["Intent Router",       "IndicBERT (180M) — classifies query type in <20ms, routes to correct module"],
    ["Fine-tuning Method",  "QLoRA (4-bit quantized LoRA) — LoRA rank 16, alpha 32, 3-5 epochs"],
    ["Training Data",       "Scraped dataset: 200+ Indian credit cards, 50+ loan products, 10,000+ QA pairs"],
    ["Hardware to Train",   "Single NVIDIA RTX 3090 (24GB) — accessible, low-cost, 2-3 day training run"],
    ["Inference Format",    "GGUF Q4_K_M — 6GB file, runs on 8GB RAM CPU or any GPU"],
    ["RAG Integration",     "Pinecone vector DB stores 50K+ fact chunks; model retrieves before generating"],
    ["Accuracy Target",     "<2% hallucination rate; ROUGE-L > 0.45; manual factual audit weekly"],
    ["Mobile Model",        "Phi-3 Mini 3.8B (MIT license) — for on-device Android inference, 3GB RAM"],
    ["Update Cycle",        "Dataset refreshed weekly (automated scraper); model retrained quarterly"],
  ]),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 10 — TRACTION & ROADMAP
  // ══════════════════════════════════════════════════════════════
  secHeader("10", "Traction & Milestones Roadmap", C.green),
  spacer(),
  p("10.1  Current Status (Pre-Launch)", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  twoCol([
    ["Dataset",          "Scraped dataset of 200+ credit cards and 50+ loan products — cleaned and structured"],
    ["Base Model",       "Mistral 7B downloaded and initial fine-tuning experiments completed"],
    ["Architecture",     "Two-tier model architecture (IndicBERT + Mistral) designed and tested"],
    ["Business Plan",    "Complete business plan, revenue model, and pitch documentation prepared"],
    ["Partnerships",     "Conversations initiated with 2 bank affiliate programs"],
    ["Funding Status",   "Pre-seed bootstrapped — seeking Seed round to launch MVP"],
  ]),
  spacer(120),
  p("10.2  18-Month Milestone Timeline", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Month", "Milestone", "KPI Target"],
    [
      ["M1–2",  "MVP web app live — AI chat, card recommender, EMI calculator", "100 beta users, 0 revenue"],
      ["M2–3",  "WhatsApp bot launch, first affiliate links live (HDFC, Axis)", "1,000 MAU, first ₹10K commission"],
      ["M3–4",  "SEO content engine: 50 articles published",                    "5,000 MAU, ₹50K/month revenue"],
      ["M4–6",  "Loan referral vertical launched (BajajFinserv, MoneyView)",    "15,000 MAU, ₹3L/month"],
      ["M6",    "Android app launch with offline AI capability",                "25,000 MAU, ₹6L/month"],
      ["M8",    "First bank sponsorship deal signed",                           "35,000 MAU, ₹12L/month"],
      ["M10",   "FinWise Pro subscription launched (₹99/month)",                "50,000 MAU, ₹18L/month"],
      ["M12",   "Series A fundraise initiated, B2B API pilot with 1 NBFC",      "70,000 MAU, ₹25L/month"],
      ["M18",   "2.5L MAU, Tamil + Telugu support, insurance vertical live",     "₹75L/month → ₹9 Cr ARR run rate"],
    ],
    [800, 4600, 3960]
  ),
  spacer(120),
  p("10.3  Founding Team Requirements", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Role", "Core Responsibility", "Hire Type", "Priority"],
    [
      ["Founder / CEO",         "Vision, bank partnerships, fundraising, product strategy", "Founder",            "Now"],
      ["ML Engineer",           "Model fine-tuning, RAG pipeline, inference optimization",  "Full-time",          "Now"],
      ["Backend Engineer",      "FastAPI, database, affiliate tracking, WhatsApp integration", "Full-time",       "Now"],
      ["Frontend / Mobile Dev", "Next.js web + React Native Android app",                   "Full-time",          "Month 1"],
      ["Data Curator / Analyst","Dataset cleaning, weekly scraper, fact-checking, QA",      "Contract → FT",      "Month 1"],
      ["Growth / Content Lead", "SEO strategy, financial articles, influencer relationships","Part-time → FT",     "Month 2"],
      ["Finance + Legal",       "RBI compliance, affiliate contracts, accounting",           "Advisor / Retainer", "Month 2"],
    ],
    [2200, 3200, 1800, 2160]
  ),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 11 — LOAN PROVIDER VISION
  // ══════════════════════════════════════════════════════════════
  secHeader("11", "The Loan Provider Vision — Year 6+", C.purple),
  spacer(),
  callout("The Long Game",
    "After 5 years of operating as an advisory and referral platform, FinWise will have built the most detailed understanding of Indian borrowers' financial behavior of any platform in the country. That data moat, combined with a trusted brand and an active user base of 35M+, creates a unique opportunity: become a licensed direct lender — eliminating the referral middleman and capturing the full spread.",
    C.purple, C.purpleBg),
  spacer(140),
  p("11.1  Why This Makes Sense — The Setup Phase (Year 1-5)", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  bullet("5 years of AI-driven financial profiling: FinWise knows each user's income trajectory, repayment behavior, spending discipline, and financial goals"),
  bullet("Trusted relationship: users who've relied on FinWise for card guidance and loan matching trust FinWise deeply — brand equity for direct lending"),
  bullet("Proprietary credit signal: FinWise's query history and spending pattern data supplements CIBIL — a richer creditworthiness picture than traditional banks use"),
  bullet("Existing NBFC relationships: 5 years of referral partnerships = relationships, regulatory familiarity, and co-lending opportunity"),
  spacer(120),
  p("11.2  The Loan Provider Model — Year 6+", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  twoCol([
    ["License Required",      "NBFC (Non-Banking Financial Company) license from RBI — ₹2 Cr paid-up capital requirement"],
    ["Loan Type (Phase 1)",   "Personal loans: ₹10,000–₹2,00,000 — short tenure, high velocity, lower risk"],
    ["Target Segment",        "Thin-file borrowers: users with limited CIBIL history but strong FinWise behavioral score"],
    ["FinWise Credit Score",  "Proprietary score combining: CIBIL (40%) + FinWise behavioral data (35%) + income signals (25%)"],
    ["Interest Rate",         "18–28% APR — competitive vs. informal lenders (40–60%), premium vs. banks (12–16%)"],
    ["Underwriting Engine",   "Fine-tuned ML model on 5-year FinWise user data — automated approval in <2 minutes"],
    ["Capital Model",         "Co-lending with existing NBFC partners initially; graduate to full balance sheet lending with Series C capital"],
    ["NPA Target",            "<4% net NPA — achievable with behavioral data underwriting and small-ticket focus"],
  ]),
  spacer(120),
  p("11.3  Revenue Uplift from Direct Lending", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Metric", "Year 6 (Launch)", "Year 7", "Year 8"],
    [
      ["Loan Book Size",               "₹50 Cr",    "₹200 Cr",   "₹600 Cr"],
      ["Avg Loan Size",                "₹50,000",   "₹60,000",   "₹70,000"],
      ["Number of Loans Disbursed",    "10,000",    "33,333",    "85,714"],
      ["Avg Interest Rate (APR)",      "22%",       "21%",       "20%"],
      ["Net Interest Margin",          "8–10%",     "9–11%",     "10–12%"],
      ["NII (Net Interest Income)",    "₹4–5 Cr",   "₹18–22 Cr", "₹60–72 Cr"],
      ["Processing Fee Revenue (1%)",  "₹50L",      "₹2 Cr",     "₹6 Cr"],
      ["Total Lending Revenue",        "₹4.5–5.5 Cr","₹20–24 Cr","₹66–78 Cr"],
      ["Existing Platform Revenue",    "₹180 Cr+",  "₹240 Cr+",  "₹320 Cr+"],
    ],
    [3200, 2000, 2000, 2160]
  ),
  spacer(120),
  p("11.4  Path to NBFC License", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  numberedItem("Year 3-4: Establish co-lending agreement with a licensed NBFC partner — FinWise provides leads + underwriting signals; NBFC holds the book"),
  numberedItem("Year 4-5: Apply for NBFC license with RBI. Requirements: ₹2 Cr minimum paid-up capital (easily met by Y4 profitability), 12 months of audited financials, fit-and-proper criteria for directors"),
  numberedItem("Year 5: Shadow lending period — operate under co-lending while NBFC license processes (typically 12-18 months)"),
  numberedItem("Year 6: Full NBFC license operational — begin balance-sheet lending for personal loans up to ₹2L"),
  numberedItem("Year 7-8: Scale loan book with Series C capital; introduce secured products (loan against securities, ESOP-backed loans)"),
  spacer(120),
  callout("Valuation Impact of NBFC License",
    "Fintech lending companies in India trade at 3-5x book value + 15-25x earnings. Adding a lending vertical to FinWise's advisory+SaaS base creates a multi-category fintech valued on blended multiples. Comparable Indian fintechs with lending capabilities (Slice, KreditBee, MoneyTap pre-acquisition) were valued at $500M–$2B. FinWise's 5-year user data moat and brand trust would command a significant premium in that landscape.",
    C.purple, C.purpleBg),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 12 — RISK ANALYSIS
  // ══════════════════════════════════════════════════════════════
  secHeader("12", "Risk Analysis & Mitigation", C.red),
  spacer(),
  tbl(
    ["Risk", "Category", "Likelihood", "Impact", "Mitigation Strategy"],
    [
      ["AI model hallucination\n(wrong fee / interest rate)",   "Technical",    "Medium", "High",   "RAG over verified dataset; weekly automated fact-check; 'Verify with bank' CTA on every answer"],
      ["RBI regulatory action\n(acting as financial advisor)",  "Regulatory",   "Medium", "High",   "Position as 'information platform'; add SEBI/RBI disclaimers; consult fintech-specialized lawyers from Month 1"],
      ["Data breach / privacy\nconcern",                        "Security",     "Low",    "High",   "Local-first architecture eliminates cloud risk; SOC 2 audit in Year 2; no PII stored in cloud"],
      ["Bank affiliate program\ncommission cuts",               "Commercial",   "Medium", "Medium", "Diversify across 8 revenue streams; no single stream >44% of revenue by Y3"],
      ["Dataset staleness\n(card terms change frequently)",     "Operational",  "High",   "Medium", "Automated weekly scrapers; user 'flag incorrect info' button; dataset version control"],
      ["Competition: SaveSage /\nBankBazaar launches AI",       "Competitive",  "Medium", "Medium", "Local model + Hindi-first + loan vertical = different enough; 18-month data moat head start"],
      ["Low NBFC conversion\n(loan referral quality)",          "Commercial",   "Low",    "Medium", "Pre-screen users with CIBIL range check before sending referral; reduces junk leads"],
      ["Founder/key person risk",                               "Operational",  "Medium", "High",   "Document all processes; cross-train ML engineer; ESOP structure for retention"],
    ],
    [2200, 1200, 1100, 900, 3960]
  ),
  pgBreak(),

  // ══════════════════════════════════════════════════════════════
  // 13 — THE ASK
  // ══════════════════════════════════════════════════════════════
  secHeader("13", "The Ask — Seed Funding & Use of Capital", C.gold),
  spacer(),
  callout("Funding Ask",
    "FinWise AI is seeking ₹1.5 Crore in Seed funding at a pre-money valuation of ₹8 Crore (approx 15.8% equity). This gives the company 18 months of runway to reach cash-flow positive and set up a Series A at significantly higher valuation.",
    C.gold, C.goldBg),
  spacer(140),
  p("13.1  Use of Capital", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Category", "Amount", "% of Raise", "What It Buys"],
    [
      ["Team (ML + Backend + Frontend)", "₹72L",  "48%", "3 core technical hires for 18 months — the engine of the product"],
      ["GPU Server (Training + Inference)","₹15L", "10%", "NVIDIA RTX 4090 or A10G cloud instance + local server setup"],
      ["Marketing & User Acquisition",    "₹24L",  "16%", "SEO content production, influencer partnerships, WhatsApp bot growth"],
      ["Legal & Regulatory",             "₹10L",  "6.7%","Fintech legal counsel, affiliate agreements, privacy compliance"],
      ["Product & Design",               "₹12L",  "8%",  "UI/UX design, Android app development, WhatsApp integration"],
      ["Operations & Tools",             "₹8L",   "5.3%","SaaS tools, analytics, hosting, domain, miscellaneous"],
      ["Buffer / Working Capital",        "₹9L",   "6%",  "Contingency and opportunity reserve"],
      ["TOTAL",                          "₹1.5 Cr","100%","18 months to ₹25L/month revenue run rate"],
    ],
    [2800, 900, 1100, 4560]
  ),
  spacer(140),
  p("13.2  What We Achieve With This Capital", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  bullet("50,000 MAU and ₹25L/month revenue by Month 18 — clear path to Series A"),
  bullet("Fine-tuned local model live on web + Android + WhatsApp — three active channels"),
  bullet("5 bank + NBFC affiliate partnerships signed and generating commissions"),
  bullet("First B2B API pilot with an NBFC — revenue diversification proof point"),
  bullet("1,500–2,000 paying Pro/Elite subscribers — subscription revenue validation"),
  bullet("SEO content library of 200+ articles — compounding organic growth engine established"),
  spacer(140),
  p("13.3  Series A Pathway (Month 18–24)", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  twoCol([
    ["Target Raise (Series A)",  "₹15–20 Crore"],
    ["Projected Valuation",      "₹80–100 Crore (9-10x Y2 ARR multiple — standard for Indian fintech SaaS)"],
    ["Use of Series A",          "Scale to 25L MAU; hire 15 more people; launch B2B API commercially; Tamil/Telugu expansion; NBFC co-lending pilot"],
    ["Lead Investor Profile",    "Fintech-focused VCs: Blume Ventures, Elevation Capital, Accel India, Matrix Partners India"],
    ["Revenue at Series A",      "₹8-10 Cr ARR — cash-flow positive, strong unit economics proven"],
  ]),
  spacer(140),
  p("13.4  5-Year Exit Scenarios", { bold: true, size: 24, color: C.navy }),
  spacer(60),
  tbl(
    ["Scenario", "Path", "Revenue (Y5)", "Valuation Multiple", "Est. Valuation"],
    [
      ["Conservative",  "Advisory + SaaS platform, no lending",        "₹80 Cr ARR",  "8x ARR",     "₹640 Cr (~$77M)"],
      ["Base Case",     "Platform + B2B API + co-lending pilot",        "₹123 Cr ARR", "12x ARR",    "₹1,476 Cr (~$177M)"],
      ["Optimistic",    "Platform + full NBFC license + loan book",     "₹180 Cr ARR", "15–20x ARR", "₹2,700–3,600 Cr ($325–430M)"],
      ["Strategic Sale","Acquisition by major bank, NBFC, or fintech",  "₹100 Cr ARR", "15–25x",     "₹1,500–2,500 Cr"],
    ],
    [1500, 2900, 1700, 1700, 1560]
  ),
  spacer(160),
  divider(C.gold, 8),
  spacer(120),

  // CLOSING
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBdrs,
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.navy, type: ShadingType.CLEAR },
      margins: { top: 300, bottom: 300, left: 400, right: 400 },
      children: [
        p("The Opportunity in One Sentence", { bold: true, size: 22, color: "9BB8D4", align: AlignmentType.CENTER, before: 0, after: 80 }),
        p("900 million Indians are making credit and loan decisions without a trusted advisor — FinWise AI is that advisor, running locally on their phone, speaking their language, protecting their data, and getting smarter every day.", { bold: true, size: 26, color: C.white, align: AlignmentType.CENTER, before: 0, after: 120 }),
        divider("3D5A7A", 3),
        p("FINWISE AI  —  Investor Pitch Document  |  May 2026  |  Confidential", { size: 18, color: "7799BB", align: AlignmentType.CENTER, before: 80, after: 0 }),
      ]
    })]})],
  }),
);

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1260, right: 1260, bottom: 1260, left: 1260 }
      }
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('FinWise_Investor_Pitch.docx', buf);
  console.log('Done');
}).catch(console.error);
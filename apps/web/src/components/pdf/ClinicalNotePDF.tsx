import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ReviewPackage } from 'agents';

// Local style type — react-pdf doesn't export Style directly
type Style = ReturnType<typeof StyleSheet.create>[string];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBrand: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  headerMeta: { fontSize: 8, color: '#9ca3af', textAlign: 'right', lineHeight: 1.5 },
  riskBanner: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
    borderRadius: 4,
  },
  riskBannerText: { fontSize: 9, color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  sectionWrapper: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionApprovedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  sectionApprovedPill: {
    fontSize: 7,
    backgroundColor: '#d1fae5',
    color: '#059669',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 20,
  },
  provenancePill: {
    fontSize: 7,
    backgroundColor: '#ede9ff',
    color: '#6c63ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 20,
  },
  sectionContentWrap: {
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  commentaryBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    borderRadius: 4,
    padding: 12,
    marginBottom: 18,
  },
  commentaryLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  commentaryContent: { fontSize: 10, lineHeight: 1.7, color: '#1a1a1a' },
  riskItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    paddingLeft: 8,
    marginBottom: 8,
  },
  riskItemTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  riskEvidence: { fontSize: 8, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  riskMeta: { fontSize: 7, color: '#9ca3af', marginTop: 1 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', marginVertical: 12 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#d1d5db' },
  confidenceLabel: { fontSize: 7, color: '#9ca3af' },
  // Markdown inside PDF
  mdParagraph: { fontSize: 10, lineHeight: 1.7, color: '#1a1a1a', marginBottom: 4 },
  mdH1: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 6, marginTop: 8 },
  mdH2: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4, marginTop: 6 },
  mdH3: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 3, marginTop: 5 },
  mdBullet: { fontSize: 10, lineHeight: 1.6, color: '#1a1a1a', marginBottom: 2 },
  mdHr: { borderBottomWidth: 0.5, borderBottomColor: '#d1d5db', marginVertical: 6 },
  // Table
  tableWrapper: { marginVertical: 8, borderWidth: 0.5, borderColor: '#d1d5db', borderRadius: 3 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#fafafa', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tableRowLast: { flexDirection: 'row' },
  tableHeaderCell: { flex: 1, padding: 5, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151' },
  tableCell: { flex: 1, padding: 5, fontSize: 9, color: '#374151', lineHeight: 1.5 },
});

// ─── Inline Formatter ─────────────────────────────────────────────────────────
// Parses **bold**, *italic*, `code` within a text node and returns
// an array of <Text> elements safe for react-pdf.

function renderInline(text: string, baseStyle: Style, key: string): React.ReactElement {
  // Strip leftover citation markers (transcript:lines:X-Y)
  const cleaned = text.replace(/\(transcript:lines:\d+-\d+\)/g, '').trim();

  const segments: React.ReactElement[] = [];
  let remaining = cleaned;
  let idx = 0;

  while (remaining.length > 0) {
    // ** bold **
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // * italic * (not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // `code`
    const codeMatch = remaining.match(/`([^`]+)`/);

    type Cand = { type: string; index: number; full: string; inner: string };
    const cands: Cand[] = [];
    if (boldMatch?.index != null) cands.push({ type: 'bold', index: boldMatch.index, full: boldMatch[0], inner: boldMatch[1] });
    if (italicMatch?.index != null) cands.push({ type: 'italic', index: italicMatch.index, full: italicMatch[0], inner: italicMatch[1] });
    if (codeMatch?.index != null) cands.push({ type: 'code', index: codeMatch.index, full: codeMatch[0], inner: codeMatch[1] });

    if (cands.length === 0) {
      if (remaining) segments.push(<Text key={`${key}-t${idx++}`} style={baseStyle}>{remaining}</Text>);
      break;
    }

    cands.sort((a, b) => a.index - b.index);
    const first = cands[0];

    if (first.index > 0) {
      segments.push(<Text key={`${key}-t${idx++}`} style={baseStyle}>{remaining.slice(0, first.index)}</Text>);
    }

    if (first.type === 'bold') {
      segments.push(<Text key={`${key}-b${idx++}`} style={{ ...baseStyle, fontFamily: 'Helvetica-Bold' }}>{first.inner}</Text>);
    } else if (first.type === 'italic') {
      segments.push(<Text key={`${key}-i${idx++}`} style={{ ...baseStyle, fontStyle: 'italic' }}>{first.inner}</Text>);
    } else {
      segments.push(<Text key={`${key}-c${idx++}`} style={{ ...baseStyle, fontFamily: 'Courier', fontSize: 9, backgroundColor: '#f3f4f6' }}>{first.inner}</Text>);
    }

    remaining = remaining.slice(first.index + first.full.length);
  }

  return <Text key={key} style={baseStyle}>{segments}</Text>;
}

// Extract [Key: value] bracket annotations from list item text
function extractBracketMeta(text: string): { body: string; meta: { key: string; val: string }[] } {
  const meta: { key: string; val: string }[] = [];
  const body = text
    .replace(/\[([A-Za-z][A-Za-z\s]{1,20}):\s*([^\]]+)\]/g, (_, key, val) => {
      meta.push({ key: key.trim(), val: val.trim() });
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { body, meta };
}

// ─── Markdown Block Renderer ──────────────────────────────────────────────────
// Converts a markdown string into an array of react-pdf View/Text elements.

function renderMarkdown(content: string): React.ReactElement[] {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let listBuffer: { text: string; ordered: boolean; num?: number }[] = [];
  let tableRows: string[][] = [];
  let tableHasHeader = false;
  let keyIdx = 0;

  const uid = () => `md-${keyIdx++}`;

  const flushList = () => {
    if (!listBuffer.length) return;
    const isOrdered = listBuffer[0].ordered;
    elements.push(
      <View key={uid()} style={{ marginBottom: 4 }}>
        {listBuffer.map((item, i) => {
          const { body, meta } = extractBracketMeta(item.text);
          return (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ ...styles.mdBullet, width: 16, flexShrink: 0 }}>
                {isOrdered ? `${item.num}.` : '•'}
              </Text>
              <View style={{ flex: 1 }}>
                {renderInline(body, styles.mdBullet, `${uid()}-b${i}`)}
                {meta.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3, gap: 4 }}>
                    {meta.map((m, mi) => (
                      <Text
                        key={mi}
                        style={{ fontSize: 8, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 }}
                      >
                        {m.key}: {m.val}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
    listBuffer = [];
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const [header, ...body] = tableRows;
    elements.push(
      <View key={uid()} style={styles.tableWrapper}>
        {/* Header */}
        {tableHasHeader && header && (
          <View style={styles.tableHeaderRow}>
            {header.map((cell, ci) => (
              <Text key={ci} style={styles.tableHeaderCell}>{cell.trim()}</Text>
            ))}
          </View>
        )}
        {/* Body */}
        {body.map((row, ri) => {
          const isLast = ri === body.length - 1;
          const rowStyle = isLast ? styles.tableRowLast : ri % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
          return (
            <View key={ri} style={rowStyle}>
              {row.map((cell, ci) => (
                <Text key={ci} style={styles.tableCell}>{cell.trim()}</Text>
              ))}
            </View>
          );
        })}
      </View>
    );
    tableRows = [];
    tableHasHeader = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      flushTable();
      elements.push(<View key={uid()} style={{ height: 4 }} />);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      flushTable();
      elements.push(<View key={uid()} style={styles.mdHr} />);
      continue;
    }

    // Table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      if (/^\|[-|: ]+\|$/.test(trimmed)) {
        // Separator row → marks previous row as header
        tableHasHeader = tableRows.length > 0;
      } else {
        const cells = trimmed.slice(1, -1).split('|');
        tableRows.push(cells);
      }
      continue;
    }

    // If we were collecting a table but hit a non-table line, flush
    if (tableRows.length > 0) flushTable();

    // H1
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<Text key={uid()} style={styles.mdH1}>{trimmed.slice(2)}</Text>);
      continue;
    }
    // H2
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<Text key={uid()} style={styles.mdH2}>{trimmed.slice(3)}</Text>);
      continue;
    }
    // H3
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<Text key={uid()} style={styles.mdH3}>{trimmed.slice(4)}</Text>);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      listBuffer.push({ text: olMatch[2], ordered: true, num: parseInt(olMatch[1]) });
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[*\-•]\s+(.*)/);
    if (ulMatch) {
      listBuffer.push({ text: ulMatch[1], ordered: false });
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(renderInline(trimmed, styles.mdParagraph, uid()));
  }

  flushList();
  flushTable();

  return elements;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(v: number) {
  if (v >= 0.85) return '#10b981';
  if (v >= 0.65) return '#f59e0b';
  return '#ef4444';
}

function provenanceLabel(tag: string, rounds: number): string {
  if (tag === 'clinician_edited') return 'Clinician edited';
  if (tag === 'ai_revised' || rounds > 0) return `AI drafted · Revised ${rounds}×`;
  if (tag === 'approved') return 'AI drafted · Approved';
  return 'AI drafted';
}

function riskBorderColor(severity: string) {
  if (severity === 'high' || severity === 'critical') return '#ef4444';
  if (severity === 'moderate') return '#f59e0b';
  return '#3b82f6';
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

interface ClinicalNotePDFProps {
  reviewPackage: ReviewPackage;
  sessionId: string;
  clinicianNote?: string;
}

export function ClinicalNotePDF({
  reviewPackage,
  sessionId,
  clinicianNote,
}: ClinicalNotePDFProps) {
  const { soapNote, riskFlags, auditLog } = reviewPackage;
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const confirmedFlags = riskFlags.filter((f) => f.status === 'confirmed');

  return (
    <Document
      title={`Clinical Note — ${sessionId}`}
      author="EHR Copilot"
      subject="Mental Health Clinical Documentation"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header} fixed>
          <Text style={styles.headerBrand}>EHR Copilot</Text>
          <Text style={styles.headerMeta}>
            {`Session ID: ${sessionId}\n${now}\nAI-assisted · Clinician approved`}
          </Text>
        </View>

        {/* ── Clinician Final Commentary ── */}
        {clinicianNote && (
          <View style={styles.commentaryBox}>
            <Text style={styles.commentaryLabel}>Clinician Final Commentary</Text>
            <Text style={styles.commentaryContent}>{clinicianNote}</Text>
          </View>
        )}

        {/* ── Risk banner ── */}
        {confirmedFlags.length > 0 && (
          <View style={styles.riskBanner}>
            <Text style={styles.riskBannerText}>
              ⚠  {confirmedFlags.length} risk flag{confirmedFlags.length > 1 ? 's' : ''} confirmed — see below
            </Text>
          </View>
        )}

        {/* ── SOAP sections ── */}
        {(['subjective', 'objective', 'assessment', 'plan'] as const).map((key) => {
          const s = soapNote[key];
          if (!s) return null;
          return (
            <View key={key} style={styles.sectionWrapper}>
              <Text style={styles.sectionLabel}>{key}</Text>

              {/* Confidence + provenance row */}
              <View style={styles.sectionApprovedRow}>
                <Text style={styles.sectionApprovedPill}>✓ Approved</Text>
                <Text style={styles.provenancePill}>
                  {provenanceLabel(s.provenanceTag, s.revisionRounds)}
                </Text>
                <Text style={{ ...styles.confidenceLabel, color: confidenceColor(s.confidence) }}>
                  {Math.round(s.confidence * 100)}% confidence
                </Text>
              </View>

              {/* Markdown-rendered content */}
              <View style={styles.sectionContentWrap}>
                {renderMarkdown(s.content)}
              </View>
            </View>
          );
        })}

        {/* ── Divider ── */}
        {confirmedFlags.length > 0 && <View style={styles.divider} />}

        {/* ── Risk flags ── */}
        {confirmedFlags.length > 0 && (
          <>
            <Text style={{ ...styles.sectionLabel, marginBottom: 8 }}>Risk Flags (Confirmed)</Text>
            {confirmedFlags.map((flag, i) => (
              <View
                key={i}
                style={{ ...styles.riskItem, borderLeftColor: riskBorderColor(flag.severity) }}
              >
                <Text style={styles.riskItemTitle}>
                  {flag.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — {flag.severity.toUpperCase()}
                </Text>
                <Text style={styles.riskEvidence}>"{flag.evidence}"</Text>
                <Text style={styles.riskMeta}>
                  {flag.transcriptLocation}
                  {flag.protocolTriggered ? ` · Protocol: ${flag.protocolTriggered}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Audit log ── */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Audit Trail</Text>
        {auditLog.slice(-8).map((entry, i) => (
          <Text key={i} style={{ fontSize: 7, color: '#9ca3af', lineHeight: 1.5 }}>
            {entry.timestamp} · {entry.section} · {entry.action}
            {entry.details ? ` — ${entry.details}` : ''}
          </Text>
        ))}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            AI-assisted clinical documentation. This note has been reviewed and approved by the clinician.
            It does not replace clinical judgment.
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

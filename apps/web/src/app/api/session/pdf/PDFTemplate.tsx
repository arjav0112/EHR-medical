import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
import type { ReviewPackage, AuditEntry, DiagnosisSuggestion, SOAPNote, RiskFlag, TreatmentPlan } from 'agents';

// Local style type — react-pdf doesn't export Style directly
type Style = ReturnType<typeof StyleSheet.create>[string];


// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    paddingTop: 72,
    paddingBottom: 80,
    paddingHorizontal: 72,
  },
  coverTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  coverMeta: { fontSize: 10, color: '#6b7280', lineHeight: 1.6 },
  sectionHeading: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 18 },
  subsectionHeading: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4, marginTop: 10, color: '#374151' },
  body: { fontSize: 11, lineHeight: 1.7, color: '#1a1a1a' },
  meta: { fontSize: 9, color: '#9ca3af', marginTop: 3 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', marginVertical: 16 },
  riskItem: { borderLeftWidth: 3, borderLeftColor: '#ef4444', paddingLeft: 8, marginBottom: 8 },
  riskTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  riskEvidence: { fontSize: 10, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  riskDisp: { fontSize: 9, color: '#9ca3af', marginTop: 2 },
  auditRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 4 },
  tableCell: { fontSize: 9, color: '#374151', flex: 1 },
  tableHeader: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 72,
    right: 72,
    fontSize: 8,
    color: '#d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentaryBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  commentaryLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  commentaryContent: { fontSize: 11, lineHeight: 1.7, color: '#1a1a1a' },
  // Markdown styles
  mdParagraph: { fontSize: 11, lineHeight: 1.7, color: '#1a1a1a', marginBottom: 4 },
  mdH1: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 6, marginTop: 8 },
  mdH2: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4, marginTop: 6 },
  mdH3: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 3, marginTop: 5 },
  mdBullet: { fontSize: 11, lineHeight: 1.6, color: '#1a1a1a', marginBottom: 2 },
  mdHr: { borderBottomWidth: 0.5, borderBottomColor: '#d1d5db', marginVertical: 6 },
  tableWrapper: { marginVertical: 8, borderWidth: 0.5, borderColor: '#d1d5db', borderRadius: 3 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#fafafa', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tableRowLast: { flexDirection: 'row' },
  tableHeaderCell: { flex: 1, padding: 5, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  mdTableCell: { flex: 1, padding: 5, fontSize: 10, color: '#374151', lineHeight: 1.5 },
});

// ─── Inline Formatter ─────────────────────────────────────────────────────────

function renderInline(text: string, baseStyle: Style, key: string): React.ReactElement {
  const cleaned = text.replace(/\(transcript:lines:\d+-\d+\)/g, '').trim();
  const segments: React.ReactElement[] = [];
  let remaining = cleaned;
  let idx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    type Cand = { type: string; index: number; full: string; inner: string };
    const cands: Cand[] = [];
    if (boldMatch?.index != null) cands.push({ type: 'bold', index: boldMatch.index, full: boldMatch[0], inner: boldMatch[1] });
    if (italicMatch?.index != null) cands.push({ type: 'italic', index: italicMatch.index, full: italicMatch[0], inner: italicMatch[1] });
    if (codeMatch?.index != null) cands.push({ type: 'code', index: codeMatch.index, full: codeMatch[0], inner: codeMatch[1] });

    if (!cands.length) {
      if (remaining) segments.push(<Text key={`${key}-t${idx++}`} style={baseStyle}>{remaining}</Text>);
      break;
    }

    cands.sort((a, b) => a.index - b.index);
    const first = cands[0];
    if (first.index > 0) segments.push(<Text key={`${key}-t${idx++}`} style={baseStyle}>{remaining.slice(0, first.index)}</Text>);

    if (first.type === 'bold') {
      segments.push(<Text key={`${key}-b${idx++}`} style={{ ...baseStyle, fontFamily: 'Helvetica-Bold' }}>{first.inner}</Text>);
    } else if (first.type === 'italic') {
      segments.push(<Text key={`${key}-i${idx++}`} style={{ ...baseStyle, fontStyle: 'italic' }}>{first.inner}</Text>);
    } else {
      segments.push(<Text key={`${key}-c${idx++}`} style={{ ...baseStyle, fontFamily: 'Courier', fontSize: 9 }}>{first.inner}</Text>);
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
              <Text style={{ ...styles.mdBullet, width: 18, flexShrink: 0 }}>{isOrdered ? `${item.num}.` : '•'}</Text>
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
        {tableHasHeader && header && (
          <View style={styles.tableHeaderRow}>
            {header.map((cell, ci) => <Text key={ci} style={styles.tableHeaderCell}>{cell.trim()}</Text>)}
          </View>
        )}
        <View>
          {body.map((row, ri) => {
            const isLast = ri === body.length - 1;
            const rowStyle = isLast ? styles.tableRowLast : ri % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
            return (
              <View key={ri} style={rowStyle}>
                {row.map((cell, ci) => <Text key={ci} style={styles.mdTableCell}>{cell.trim()}</Text>)}
              </View>
            );
          })}
        </View>
      </View>
    );
    tableRows = [];
    tableHasHeader = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) { flushList(); flushTable(); elements.push(<View key={uid()} style={{ height: 5 }} />); continue; }
    if (/^---+$/.test(trimmed)) { flushList(); flushTable(); elements.push(<View key={uid()} style={styles.mdHr} />); continue; }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      if (/^\|[-|: ]+\|$/.test(trimmed)) { tableHasHeader = tableRows.length > 0; }
      else { tableRows.push(trimmed.slice(1, -1).split('|')); }
      continue;
    }
    if (tableRows.length) flushTable();

    if (trimmed.startsWith('# ')) { flushList(); elements.push(<Text key={uid()} style={styles.mdH1}>{trimmed.slice(2)}</Text>); continue; }
    if (trimmed.startsWith('## ')) { flushList(); elements.push(<Text key={uid()} style={styles.mdH2}>{trimmed.slice(3)}</Text>); continue; }
    if (trimmed.startsWith('### ')) { flushList(); elements.push(<Text key={uid()} style={styles.mdH3}>{trimmed.slice(4)}</Text>); continue; }

    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) { listBuffer.push({ text: olMatch[2], ordered: true, num: parseInt(olMatch[1]) }); continue; }
    const ulMatch = trimmed.match(/^[*\-•]\s+(.*)/);
    if (ulMatch) { listBuffer.push({ text: ulMatch[1], ordered: false }); continue; }

    flushList();
    elements.push(renderInline(trimmed, styles.mdParagraph, uid()));
  }
  flushList();
  flushTable();
  return elements;
}

// ─── PDF Component ───────────────────────────────────────────────────────────

export const PDFDocument = ({
  reviewPackage,
  dateStr,
  tsStr,
  clinicianNote = '',
}: {
  reviewPackage: ReviewPackage;
  dateStr: string;
  tsStr: string;
  clinicianNote?: string;
}) => {
  const {
    soapNote = {} as SOAPNote,
    riskFlags = [] as RiskFlag[],
    diagnosisSuggestions = [] as DiagnosisSuggestion[],
    treatmentPlan = null as TreatmentPlan | null,
    auditLog = [] as AuditEntry[],
    sessionId = 'unknown',
  } = reviewPackage || {};

  const confirmedFlags = riskFlags?.filter((f) => f.status === 'confirmed') || [];

  return (
    <Document title={`Clinical Note — ${sessionId}`} author="EHR Copilot">
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>EHR Copilot Clinical Note</Text>
        <Text style={styles.coverMeta}>
          {`Session ID: ${sessionId}\nDate: ${dateStr}\nGenerated: AI-assisted · Clinician reviewed & approved`}
        </Text>
        <View style={styles.divider} />

        {clinicianNote ? (
          <View style={styles.commentaryBox}>
            <Text style={styles.commentaryLabel}>Clinician Final Commentary</Text>
            <Text style={styles.commentaryContent}>{clinicianNote}</Text>
          </View>
        ) : null}

        {confirmedFlags.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Risk Flags</Text>
            {confirmedFlags.map((flag, i) => (
              <View key={`flag-${i}`} style={styles.riskItem}>
                <Text style={styles.riskTitle}>
                  {`${(flag.type || '').replace(/_/g, ' ').toUpperCase()} — ${(flag.severity || '').toUpperCase()}`}
                </Text>
                <Text style={styles.riskEvidence}>{`"${flag.evidence || 'N/A'}"`}</Text>
                <Text style={styles.riskDisp}>
                  {`Disposition: Confirmed · ${flag.transcriptLocation || 'Unknown'}${flag.protocolTriggered ? ` · Protocol: ${flag.protocolTriggered}` : ''}`}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
          </View>
        )}

        <Text style={styles.sectionHeading}>Clinical Note (SOAP)</Text>
        {(['subjective', 'objective', 'assessment', 'plan'] as const).map((key) => {
          const section = soapNote?.[key];
          if (!section) return null;
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return (
            <View key={key}>
              <Text style={styles.subsectionHeading}>{label}</Text>
              {renderMarkdown(section.content || '')}
              <Text style={styles.meta}>
                {`Confidence: ${Math.round((section.confidence || 0) * 100)}% · Provenance: ${section.provenanceTag || ''} · Revisions: ${section.revisionRounds || 0}`}
              </Text>
              {(section.sourceCitations || []).length > 0 && (
                <Text style={styles.meta}>{`Citations: ${section.sourceCitations.join(', ')}`}</Text>
              )}
            </View>
          );
        })}

        {diagnosisSuggestions.length > 0 && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>DSM-5 Diagnostic Impressions</Text>
            {diagnosisSuggestions.map((dx, i) => (
              <View key={`dx-${i}`} wrap={false}>
                <Text style={styles.subsectionHeading}>
                  {`${dx.dsm5Code} — ${dx.label} (${Math.round((dx.confidence || 0) * 100)}% confidence)`}
                </Text>
                {(dx.supportingCriteria || []).length > 0 && (
                  <Text style={styles.meta}>{`Supporting: ${dx.supportingCriteria.join('; ')}`}</Text>
                )}
                {(dx.conflictingSignals || []).length > 0 && (
                  <Text style={styles.meta}>{`Conflicting: ${dx.conflictingSignals.join('; ')}`}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {treatmentPlan && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>Treatment Plan</Text>
            {(treatmentPlan.currentGoalsProgress || []).map((g, i) => (
              <Text key={`goal-${i}`} style={styles.body}>
                {`• ${g.goal} — ${g.status}${g.evidenceFromSession ? `: ${g.evidenceFromSession}` : ''}`}
              </Text>
            ))}
            {(treatmentPlan.newInterventions || []).map((n, i) => (
              <Text key={`ni-${i}`} style={styles.body}>{`Intervention: ${n || ''}`}</Text>
            ))}
            {treatmentPlan.nextSessionFocus && (
              <Text style={styles.body}>{`Next session focus: ${treatmentPlan.nextSessionFocus}`}</Text>
            )}
          </View>
        )}

        <View minPresenceAhead={100}>
          <View style={styles.divider} />
          <Text style={styles.sectionHeading}>Audit Trail</Text>
          <View style={styles.auditRow}>
            <Text style={styles.tableHeader}>Section</Text>
            <Text style={styles.tableHeader}>Action</Text>
            <Text style={styles.tableHeader}>Timestamp</Text>
          </View>
          {(auditLog || []).map((entry, i) => (
            <View key={`audit-${i}`} style={styles.auditRow}>
              <Text style={styles.tableCell}>{entry.section || ''}</Text>
              <Text style={styles.tableCell}>{entry.action || ''}</Text>
              <Text style={styles.tableCell}>{entry.timestamp || ''}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>AI-assisted note · Reviewed and approved by clinician · {tsStr}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};


// ─── Styles ──────────────────────────────────────────────────────────────────


import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { ReviewPackage } from 'agents';

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
  // Header
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
  // Risk alert
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
  // SOAP section
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
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.7,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  // Risk flags (list)
  riskItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    paddingLeft: 8,
    marginBottom: 8,
  },
  riskItemTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  riskEvidence: { fontSize: 8, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  riskMeta: { fontSize: 7, color: '#9ca3af', marginTop: 1 },
  // Divider
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', marginVertical: 12 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#d1d5db' },
  // Confidence
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  confidenceLabel: { fontSize: 7, color: '#9ca3af' },
  confidenceBar: { height: 3, flexGrow: 1, backgroundColor: '#e5e7eb', borderRadius: 2 },
  confidenceFill: { height: 3, borderRadius: 2 },
});

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

        {/* ── Risk banner (if any confirmed flags) ── */}
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
                <Text style={styles.confidenceLabel}>
                  {Math.round(s.confidence * 100)}% confidence
                </Text>
              </View>
              {/* Content */}
              <Text style={styles.sectionContent}>{s.content}</Text>
            </View>
          );
        })}

        {/* ── Divider ── */}
        {confirmedFlags.length > 0 && <View style={styles.divider} />}

        {/* ── Risk flags (confirmed only) ── */}
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
                <Text style={styles.riskEvidence}>&ldquo;{flag.evidence}&rdquo;</Text>
                <Text style={styles.riskMeta}>
                  {flag.transcriptLocation}
                  {flag.protocolTriggered ? ` · Protocol: ${flag.protocolTriggered}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Clinician note (optional) ── */}
        {clinicianNote && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Clinician Addendum</Text>
            <Text style={styles.sectionContent}>{clinicianNote}</Text>
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

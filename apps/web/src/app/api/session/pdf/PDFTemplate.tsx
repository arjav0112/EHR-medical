import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
import type { ReviewPackage, AuditEntry, DiagnosisSuggestion, SOAPNote, RiskFlag, TreatmentPlan } from 'agents';

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
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 4 },
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
});

// ─── PDF Component ───────────────────────────────────────────────────────────

export const PDFDocument = ({
  reviewPackage,
  dateStr,
  tsStr
}: {
  reviewPackage: ReviewPackage;
  dateStr: string;
  tsStr: string;
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

        {/* Cover */}
        <Text style={styles.coverTitle}>EHR Copilot Clinical Note</Text>
        <Text style={styles.coverMeta}>
          {`Session ID: ${sessionId}\nDate: ${dateStr}\nGenerated: AI-assisted · Clinician reviewed & approved`}
        </Text>
        <View style={styles.divider} />

        {/* Risk Flags */}
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
                  {`Disposition: Confirmed · ${flag.transcriptLocation || 'Unknown'}${flag.protocolTriggered ? ` · Protocol: ${flag.protocolTriggered}` : ''
                    }`}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
          </View>
        )}

        {/* SOAP Sections */}
        <Text style={styles.sectionHeading}>Clinical Note (SOAP)</Text>
        {(['subjective', 'objective', 'assessment', 'plan'] as const).map((key) => {
          const section = soapNote?.[key];
          if (!section) return null;
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return (
            <View key={key} wrap={false}>
              <Text style={styles.subsectionHeading}>{label}</Text>
              <Text style={styles.body}>{section.content || ''}</Text>
              <Text style={styles.meta}>
                {`Confidence: ${Math.round((section.confidence || 0) * 100)}% · Provenance: ${section.provenanceTag || ''
                  } · Revisions: ${section.revisionRounds || 0}`}
              </Text>
              {(section.sourceCitations || []).length > 0 && (
                <Text style={styles.meta}>{`Citations: ${section.sourceCitations.join(', ')}`}</Text>
              )}
            </View>
          );
        })}

        {/* DSM-5 Impressions */}
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

        {/* Treatment Plan */}
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

        {/* Audit Trail */}
        <View minPresenceAhead={100}>
          <View style={styles.divider} />
          <Text style={styles.sectionHeading}>Audit Trail</Text>
          <View style={styles.tableRow}>
            <Text style={styles.tableHeader}>Section</Text>
            <Text style={styles.tableHeader}>Action</Text>
            <Text style={styles.tableHeader}>Timestamp</Text>
          </View>
          {(auditLog || []).map((entry, i) => (
            <View key={`audit-${i}`} style={styles.tableRow}>
              <Text style={styles.tableCell}>{entry.section || ''}</Text>
              <Text style={styles.tableCell}>{entry.action || ''}</Text>
              <Text style={styles.tableCell}>{entry.timestamp || ''}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>AI-assisted note · Reviewed and approved by clinician · {tsStr}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

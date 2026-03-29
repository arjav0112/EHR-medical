import React from 'react';
import type { ReviewPackage } from 'agents';

/**
 * Dynamically generates a clinical note PDF using @react-pdf/renderer.
 * Dynamic import ensures this never runs on the server.
 */
export async function generateClinicalNotePdf(reviewPackage: ReviewPackage): Promise<Blob> {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

  const { soapNote, riskFlags, diagnosisSuggestions, treatmentPlan, auditLog, sessionId } =
    reviewPackage;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const tsStr = now.toISOString();

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a', backgroundColor: '#ffffff', paddingTop: 72, paddingBottom: 80, paddingHorizontal: 72 },
    // Cover
    coverTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    coverMeta: { fontSize: 10, color: '#6b7280', lineHeight: 1.6 },
    // Section
    sectionHeading: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 18 },
    subsectionHeading: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4, marginTop: 10, color: '#374151' },
    body: { fontSize: 11, lineHeight: 1.7, color: '#1a1a1a' },
    meta: { fontSize: 9, color: '#9ca3af', marginTop: 3 },
    divider: { borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', marginVertical: 16 },
    // Risk
    riskItem: { borderLeftWidth: 3, borderLeftColor: '#ef4444', paddingLeft: 8, marginBottom: 8 },
    riskTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    riskEvidence: { fontSize: 10, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
    riskDisp: { fontSize: 9, color: '#9ca3af', marginTop: 2 },
    // Audit table
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 4 },
    tableCell: { fontSize: 9, color: '#374151', flex: 1 },
    tableHeader: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', flex: 1 },
    // Footer
    footer: { position: 'absolute', bottom: 30, left: 72, right: 72, fontSize: 8, color: '#d1d5db', flexDirection: 'row', justifyContent: 'space-between' },
  });

  const confirmedFlags = riskFlags.filter((f) => f.status === 'confirmed');

  const doc = React.createElement(
    Document,
    { title: `Clinical Note — ${sessionId}`, author: 'EHR Copilot' },
    // ── Page ──
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // Cover
      React.createElement(Text, { style: styles.coverTitle }, 'EHR Copilot Clinical Note'),
      React.createElement(
        Text,
        { style: styles.coverMeta },
        `Session ID: ${sessionId}\nDate: ${dateStr}\nGenerated: AI-assisted · Clinician reviewed & approved`
      ),

      React.createElement(View, { style: styles.divider }),

      // Risk flags section
      ...(confirmedFlags.length > 0
        ? [
            React.createElement(Text, { style: styles.sectionHeading }, 'Risk Flags'),
            ...confirmedFlags.map((flag, i) =>
              React.createElement(
                View,
                { key: i, style: styles.riskItem },
                React.createElement(
                  Text,
                  { style: styles.riskTitle },
                  `${flag.type.replace(/_/g, ' ').toUpperCase()} — ${flag.severity.toUpperCase()}`
                ),
                React.createElement(Text, { style: styles.riskEvidence }, `"${flag.evidence}"`),
                React.createElement(
                  Text,
                  { style: styles.riskDisp },
                  `Disposition: Confirmed · ${flag.transcriptLocation}${flag.protocolTriggered ? ` · Protocol: ${flag.protocolTriggered}` : ''}`
                )
              )
            ),
            React.createElement(View, { style: styles.divider }),
          ]
        : []),

      // SOAP note
      React.createElement(Text, { style: styles.sectionHeading }, 'Clinical Note (SOAP)'),
      ...(
        [
          ['Subjective', soapNote.subjective],
          ['Objective', soapNote.objective],
          ['Assessment', soapNote.assessment],
          ['Plan', soapNote.plan],
        ] as const
      ).flatMap(([label, section]) =>
        section
          ? [
              React.createElement(Text, { style: styles.subsectionHeading }, label),
              React.createElement(Text, { style: styles.body }, section.content),
              React.createElement(
                Text,
                { style: styles.meta },
                `Confidence: ${Math.round(section.confidence * 100)}% · Provenance: ${section.provenanceTag} · Revisions: ${section.revisionRounds}`
              ),
              ...(section.sourceCitations.length > 0
                ? [React.createElement(Text, { style: styles.meta }, `Citations: ${section.sourceCitations.join(', ')}`)]
                : []),
            ]
          : []
      ),

      // DSM-5 Diagnoses
      ...(diagnosisSuggestions.length > 0
        ? [
            React.createElement(View, { style: styles.divider }),
            React.createElement(Text, { style: styles.sectionHeading }, 'DSM-5 Diagnostic Impressions'),
            ...diagnosisSuggestions.map((dx, i) =>
              React.createElement(
                View,
                { key: i },
                React.createElement(
                  Text,
                  { style: styles.subsectionHeading },
                  `${dx.dsm5Code} — ${dx.label} (${Math.round(dx.confidence * 100)}% confidence)`
                ),
                dx.supportingCriteria.length > 0
                  ? React.createElement(
                      Text,
                      { style: styles.meta },
                      `Supporting: ${dx.supportingCriteria.join('; ')}`
                    )
                  : null,
                dx.conflictingSignals.length > 0
                  ? React.createElement(
                      Text,
                      { style: styles.meta },
                      `Conflicting: ${dx.conflictingSignals.join('; ')}`
                    )
                  : null
              )
            ),
          ]
        : []),

      // Treatment plan
      ...(treatmentPlan
        ? [
            React.createElement(View, { style: styles.divider }),
            React.createElement(Text, { style: styles.sectionHeading }, 'Treatment Plan'),
            ...(treatmentPlan.currentGoalsProgress ?? []).map((g, i) =>
              React.createElement(
                Text,
                { key: i, style: styles.body },
                `• ${g.goal} — ${g.status}${g.evidenceFromSession ? `: ${g.evidenceFromSession}` : ''}`
              )
            ),
            ...(treatmentPlan.newInterventions ?? []).map((n, i) =>
              React.createElement(Text, { key: `ni-${i}`, style: styles.body }, `Intervention: ${n}`)
            ),
            treatmentPlan.nextSessionFocus
              ? React.createElement(
                  Text,
                  { style: styles.body },
                  `Next session focus: ${treatmentPlan.nextSessionFocus}`
                )
              : null,
          ]
        : []),

      // Audit trail
      React.createElement(View, { style: styles.divider }),
      React.createElement(Text, { style: styles.sectionHeading }, 'Audit Trail'),
      // Table header
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableHeader }, 'Section'),
        React.createElement(Text, { style: styles.tableHeader }, 'Action'),
        React.createElement(Text, { style: styles.tableHeader }, 'Timestamp')
      ),
      ...auditLog.map((entry, i) =>
        React.createElement(
          View,
          { key: i, style: styles.tableRow },
          React.createElement(Text, { style: styles.tableCell }, entry.section),
          React.createElement(Text, { style: styles.tableCell }, entry.action),
          React.createElement(Text, { style: styles.tableCell }, entry.timestamp)
        )
      ),

      // Footer (fixed)
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          Text,
          null,
          'AI-assisted note · Reviewed and approved by clinician · ' + tsStr
        ),
        React.createElement(
          Text,
          { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` },
          null
        )
      )
    )
  ) as Parameters<typeof pdf>[0];

  return pdf(doc).toBlob();
}

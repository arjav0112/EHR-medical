import type { ReviewPackage } from 'agents';
import { buildFHIRBundle } from '../fhir/buildFHIRBundle';

/**
 * Generates a comprehensive FHIR R4 Bundle from an approved ReviewPackage.
 * This includes the main DocumentReference plus individual Observation and Condition resources.
 */
export function generateFhirDocumentReference(reviewPackage: ReviewPackage): object {
  const { sessionId } = reviewPackage;
  
  // Extract patientId from sessionId (Format: session-patientId-sessionNumber-timestamp)
  // Default to 'unknown' if parsing fails
  let patientId = 'unknown';
  if (sessionId && sessionId.startsWith('session-')) {
    const parts = sessionId.split('-');
    if (parts.length >= 2) {
      patientId = parts[1];
    }
  }

  return buildFHIRBundle(reviewPackage, patientId, sessionId || 'temporary');
}

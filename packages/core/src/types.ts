/**
 * Generic Lab Result Types
 *
 * Type definitions for lab results that work with any laboratory format.
 * Used by the FHIR converter to transform internal data to FHIR R4 resources.
 */

export type OverallStatus = 'NORMAL' | 'ANORMAL';
export type Flag = 'H' | 'L' | '';
export type Gender = 'male' | 'female' | 'other' | 'unknown';

/**
 * Lab report data for FHIR conversion
 */
export interface LabReportData {
  collectionDate: string;
  createdAt: string;
  laboratoryName?: string;
  overallStatus: OverallStatus;
  processingStatus?: 'complete' | 'partial' | 'pending_review';
  reportId: string;
  userId: string;
}

/**
 * Individual biomarker observation for FHIR conversion
 */
export interface LabObservationData {
  biomarkerCode: string;
  biomarkerName: string;
  collectionDate?: string;
  flag: Flag;
  isQualitative?: boolean;
  referenceMax?: number;
  referenceMin?: number;
  reportId: string;
  unit: string;
  value: number | string;
}

/**
 * Intervention data for FHIR conversion
 */
export interface InterventionData {
  endDate?: string;
  interventionId: string;
  name: string;
  notes?: string;
  startDate: string;
  type: 'medication' | 'diet' | 'exercise' | 'sleep' | 'supplement';
}

/**
 * User profile data for FHIR Patient resource
 */
export interface UserProfileData {
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  birthDate?: string;
  cpf?: string;
  email?: string;
  gender?: Gender;
  name: string;
  phone?: string;
  userId: string;
}

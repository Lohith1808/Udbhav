/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 3: Governance & Capital — Core Types & Interfaces
 * 
 * Defines schemas for:
 * Shoe 4: Industry & CSR Escrow Engine (MCA Schedule VII, SDG Goals, Multi-Stage Tranches)
 * Shoe 5: Government & Safety Engine (Tier 1 Academic Lab + Tier 2 BIS Regulatory Safety Gate)
 * District GIS Telemetry & Distress Heatmaps for Jharkhand Administrative Oversight.
 */

/**
 * 3-Stage Milestone Tranche for CSR Escrow Disbursements
 * Enforcing 30% BOM Release -> 30% Lab Testing -> 40% Field Pilot Handover
 */
export type TrancheStage = 'TRANCHE_1_BOM' | 'TRANCHE_2_LAB' | 'TRANCHE_3_FIELD';

/**
 * Lifecycle status of an individual escrow tranche
 */
export type EscrowStatus = 'LOCKED' | 'APPROVED' | 'DISBURSED' | 'DISPUTED';

/**
 * Individual milestone escrow tranche record
 */
export interface MilestoneTranche {
  stage: TrancheStage;
  percentage: number;
  amountINR: number;
  status: EscrowStatus;
  deliverableDescription: string;
  deliverableProofUrl?: string;
  telemetryUrl?: string;
  handoverNotes?: string;
  facultySignoffAt?: number | string;
  facultySignoffBy?: string;
  panchayatSignoffAt?: number | string;
  panchayatSignoffBy?: string;
  govtSignoffAt?: number | string;
  govtSignoffBy?: string;
  disbursedAt?: number | string;
  rejectionReason?: string;
}

/**
 * Ministry of Corporate Affairs (MCA) Schedule VII Eligible CSR Categories
 */
export type MCAScheduleVIICategory =
  | 'WATER_AND_SANITATION'
  | 'AGRO_FORESTRY'
  | 'RURAL_ENERGY'
  | 'EDUCATION_SKILLS'
  | 'HEALTHCARE';

/**
 * Multi-Stage Escrow Grant contract committed by Industry/PSU CSR sponsors
 */
export interface EscrowGrant {
  id: string; // UUID
  masterIssueId: string;
  teamId: string;
  sponsorId: string;
  sponsorName: string; // e.g., 'Tata Steel CSR Foundation', 'Central Coalfields Limited CSR'
  totalCommittedINR: number;
  mcaScheduleVIICategory: MCAScheduleVIICategory;
  sdgGoalNumber: number; // e.g., 6 for Clean Water, 7 for Clean Energy
  tranches: MilestoneTranche[];
  createdAt: number;
}

/**
 * Accredited Tier 2 Safety & Regulatory Evaluator Laboratories across Jharkhand
 */
export type Tier2EvaluatorAgency =
  | 'CSIR_CIMFR_DHANBAD'
  | 'STATE_WATER_TESTING_LAB'
  | 'STATE_POLLUTION_CONTROL_BOARD'
  | 'ICAR_REGIONAL_STATION';

/**
 * 2-Tier Hardware & Safety Validation Record
 * Tier 1: Faculty Academic Lab & BOM Safety Verification
 * Tier 2: Statutory BIS / NABL Testing (e.g. CSIR-CIMFR Dhanbad) -> DC Pilot Clearance Permit
 */
export interface SafetyValidation {
  id: string; // UUID
  masterIssueId: string;
  teamId: string;
  tier1FacultyPassed: boolean;
  tier1TelemetryReportUrl?: string;
  tier1SignedAt?: number;
  tier1HODName?: string;
  tier2EvaluatorAgency: Tier2EvaluatorAgency;
  tier2BisPassed: boolean;
  tier2TestCertificateUrl?: string;
  tier2CertifiedAt?: number;
  tier2BisStandardCode?: string; // e.g., 'IS 10500:2012 Drinking Water Specification'
  isPublicPilotCleared: boolean;
  dcPilotPermitQR?: string;
  clearedAt?: number;
}

/**
 * Administrative distress intensity classification for Jharkhand Districts
 */
export type DistressIntensityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ACUTE';

/**
 * Aggregated District GIS Telemetry & Spatial Distress Summary
 */
export interface DistrictGISSummary {
  districtCode: number;
  districtName: string;
  totalIssuesReported: number;
  endorsedMasterCount: number;
  activeCapstonesCount: number;
  verifiedDeploymentsCount: number;
  distressIntensityLevel: DistressIntensityLevel;
  averageResolutionDays: number;
}

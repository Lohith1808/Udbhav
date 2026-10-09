/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shoe 1: Grassroots Ingestion & Offline-First Core Type Definitions
 * 
 * Strict alignment with Master Lifecycle State Machine and PostgreSQL schema enums.
 */

/**
 * System-wide user roles across the Quadruple-Helix Innovation Network
 */
export type UserRole =
  | 'CITIZEN'
  | 'PANCHAYAT_OFFICER'
  | 'STUDENT_SOLVER'
  | 'FACULTY_MENTOR'
  | 'INDUSTRY_CSR'
  | 'GOVT_ADMIN'
  | 'ACCREDITED_EVALUATOR';

/**
 * Master Lifecycle State Machine enums for civic challenges
 */
export type IssueStatus =
  | 'REPORTED'
  | 'ROUTED_LOCAL_REPAIR'
  | 'AI_TRIAGED'
  | 'ENDORSED_MASTER'
  | 'CLAIMED_ACADEMIC'
  | 'IN_PROTOTYPING'
  | 'TIER1_LAB_PASSED'
  | 'TIER2_BIS_CERTIFIED'
  | 'PUBLIC_PILOT_ACTIVE'
  | 'RESOLVED_DEPLOYED'
  | 'REJECTED_SPAM';

/**
 * Triage and Panchayat verification severity levels
 */
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Synchronization status for client-side offline queue
 */
export type SyncStatus = 'DRAFT' | 'QUEUED' | 'SYNCED' | 'FAILED';

/**
 * Local Government Directory (LGD) spatial metadata
 * Standardized across Jharkhand administrative hierarchy
 */
export interface LGDLocation {
  state: string; // Default: 'Jharkhand'
  districtName: string;
  districtCode: number;
  blockName: string;
  blockCode: number;
  panchayatName: string;
  panchayatCode: number;
  latitude: number;
  longitude: number;
}

/**
 * Raw GPS Coordinates captured from browser geolocation API
 */
export interface RawCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

/**
 * Offline Draft Submission entity stored in client-side IndexedDB
 * 
 * Guardrails enforced:
 * - PII Isolation: No plain-text phone numbers; phoneHash and maskedCitizenId only.
 * - Zero Risky Permissions: Binary Blobs for client-downscaled photos (<350 KB) and audio only.
 */
export interface OfflineDraftSubmission {
  id: string; // UUID v4
  timestamp: number;
  syncStatus: SyncStatus;
  maskedCitizenId: string; // Formatted mask e.g. 'Citizen #JH-8492'
  phoneHash: string; // Cryptographic SHA-256 hash of telephone number
  isWhistleblower: boolean;
  audioBlob?: Blob; // Push-to-talk vernacular recording
  audioDurationSeconds?: number;
  transcriptionDraft?: string;
  photoBlob?: Blob; // Enforced client-downscaled JPEG (<350 KB)
  photoPreviewUrl?: string; // Volatile local preview object URL
  lgdLocation?: LGDLocation; // Reverse-geocoded official LGD boundary
  rawCoordinates: RawCoordinates;
  aiTriageCategory?: string; // Diagnostic category e.g. 'Water Infrastructure / Contamination'
  intensityScore: number; // Defaults to 1; incremented via nearby clustered reports (<1 km)
  remoteMasterIssueId?: string; // Remote ticket UUID once synced to PostgreSQL
  lastSyncAttempt?: number; // Timestamp of last transmission attempt
  syncErrorMessage?: string; // Human-readable network/schema failure message
  masterLifecycleStatus?: IssueStatus; // Official 6-stage lifecycle state
  severity?: SeverityLevel; // Statutory severity level endorsed by Panchayat
  affectedHouseholdCount?: number; // Estimated affected families verified on-site
  panchayatInspectorId?: string; // Unique Officer / BDO audit identifier
  panchayatInspectionNotes?: string; // Mandatory on-site verification rationale (min 20 chars)
  panchayatEndorsedAt?: number; // Verification timestamp
  rejectionReason?: string; // Reason if flagged as non-actionable or spam
}

/**
 * Cached LGD Reference record for offline reverse-geocoding lookup
 */
export interface CachedLGD {
  panchayatCode: number;
  panchayatName: string;
  blockCode: number;
  blockName: string;
  districtCode: number;
  districtName: string;
  state: string;
  latitude: number;
  longitude: number;
}

/**
 * Maximum photo payload size allowed for client-side IndexedDB persistence (350 KB)
 */
export const MAX_PHOTO_SIZE_BYTES = 350 * 1024;

/**
 * Default administrative state for Project Udbhav
 */
export const DEFAULT_STATE_NAME = 'Jharkhand';

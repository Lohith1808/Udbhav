/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Client-Side IndexedDB Persistence Engine
 * 
 * Powered by Dexie.js for offline-first resilience.
 * Sprint 1: Grassroots Ingestion, PII Isolation, LGD Spatial Caching.
 * Sprint 2: Academic Engine, Problem Briefs, Student Solvers, Faculty Mentorship Guardrails.
 */

import Dexie, { type Table } from 'dexie';
import {
  OfflineDraftSubmission,
  CachedLGD,
  MAX_PHOTO_SIZE_BYTES,
  SeverityLevel,
} from '../types/ingestion';
import {
  EngineeringProblemBrief,
  StudentTeam,
  FacultyMentorProfile,
  PanchayatTechnicalQuery,
  MilestoneNumber,
  FACULTY_MAX_ACTIVE_PROJECTS,
  FACULTY_MAX_PENDING_QUEUE,
  MAX_BRIEF_BUDGET_INR,
} from '../types/solver';
import {
  EscrowGrant,
  SafetyValidation,
  DistrictGISSummary,
  TrancheStage,
  EscrowStatus,
  Tier2EvaluatorAgency,
} from '../types/governance';

/**
 * Custom error classes for fine-grained client-side storage diagnostics
 */
export class StorageQuotaExceededError extends Error {
  constructor(message = 'Client storage quota exceeded. Clear synced records or downscale media.') {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

export class StorageAccessBlockedError extends Error {
  constructor(message = 'IndexedDB access is blocked (e.g. strict private browsing or disabled cookies).') {
    super(message);
    this.name = 'StorageAccessBlockedError';
  }
}

export class MediaPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaPayloadValidationError';
  }
}

/**
 * Database schema specification for Project Udbhav
 */
export class UdbhavDatabase extends Dexie {
  draftSubmissions!: Table<OfflineDraftSubmission, string>;
  cachedLGD!: Table<CachedLGD, number>;
  engineeringBriefs!: Table<EngineeringProblemBrief, string>;
  studentTeams!: Table<StudentTeam, string>;
  facultyMentors!: Table<FacultyMentorProfile, string>;
  technicalQueries!: Table<PanchayatTechnicalQuery, string>;
  escrowGrants!: Table<EscrowGrant, string>;
  safetyValidations!: Table<SafetyValidation, string>;
  districtGISMetrics!: Table<DistrictGISSummary, number>;

  constructor() {
    super('UdbhavDatabase');

    // Schema version 1 (Sprint 1: Grassroots Ingestion)
    this.version(1).stores({
      draftSubmissions: 'id, [syncStatus+timestamp], phoneHash, syncStatus',
      cachedLGD: 'panchayatCode, districtCode, blockCode',
    });

    // Schema version 2 (Sprint 2 - Task 2.1: Academic Engine)
    this.version(2).stores({
      engineeringBriefs: 'id, masterIssueId, domainSector, status, createdAt',
      studentTeams: 'id, briefId, mentorStatus, leadStudentId, currentMilestone',
      facultyMentors: 'id, institution, activeProjectsCount, slotType',
      technicalQueries: 'id, teamId, masterIssueId, status, createdAt',
    });

    // Schema version 3 (Sprint 3 - Task 3.1: Governance & Capital)
    this.version(3).stores({
      escrowGrants: 'id, masterIssueId, teamId, sponsorId, mcaScheduleVIICategory',
      safetyValidations: 'id, masterIssueId, teamId, isPublicPilotCleared',
      districtGISMetrics: 'districtCode, distressIntensityLevel',
    });
  }
}

/**
 * Singleton database instance
 */
export const db = new UdbhavDatabase();

/**
 * Normalizes and intercepts Dexie / DOMException storage errors
 */
function handleStorageError(error: unknown, context: string): never {
  if (error instanceof Error) {
    const errorName = error.name;
    if (errorName === 'QuotaExceededError' || error.message.includes('QuotaExceededError')) {
      throw new StorageQuotaExceededError(
        `Failed to execute ${context}: Browser storage quota exceeded.`
      );
    }
    if (
      errorName === 'SecurityError' ||
      errorName === 'InvalidStateError' ||
      error.message.includes('SecurityError') ||
      error.message.includes('access is blocked')
    ) {
      throw new StorageAccessBlockedError(
        `Failed to execute ${context}: Private browsing or browser security prevented IndexedDB operations.`
      );
    }
  }
  throw error;
}

/**
 * Validates offline draft against strict security and payload size constraints
 */
function validateDraftPayload(draft: OfflineDraftSubmission): void {
  if (!draft.id || typeof draft.id !== 'string') {
    throw new MediaPayloadValidationError('Draft ID must be a valid unique identifier.');
  }

  // Guardrail 1: PII Isolation
  if (!draft.phoneHash || draft.phoneHash.length !== 64) {
    throw new MediaPayloadValidationError(
      'Invalid phoneHash: A 64-character SHA-256 hash is required to prevent plain-text PII storage.'
    );
  }

  if (!draft.maskedCitizenId || !draft.maskedCitizenId.startsWith('Citizen #')) {
    throw new MediaPayloadValidationError(
      'Invalid maskedCitizenId: Submitter identity must use masked format e.g. "Citizen #JH-XXXX".'
    );
  }

  // Guardrail 2: Media size and type restrictions (<350 KB JPEG)
  if (draft.photoBlob) {
    if (!(draft.photoBlob instanceof Blob)) {
      throw new MediaPayloadValidationError('Photo payload must be a valid binary Blob.');
    }
    if (draft.photoBlob.size > MAX_PHOTO_SIZE_BYTES) {
      throw new MediaPayloadValidationError(
        `Photo payload exceeds maximum threshold of 350 KB (Received: ${(draft.photoBlob.size / 1024).toFixed(1)} KB). Downscale before saving.`
      );
    }
  }

  if (draft.audioBlob && !(draft.audioBlob instanceof Blob)) {
    throw new MediaPayloadValidationError('Audio payload must be a valid binary Blob.');
  }
}

/**
 * Saves or updates a draft submission in client-side IndexedDB
 */
export async function saveDraft(draft: OfflineDraftSubmission): Promise<string> {
  try {
    validateDraftPayload(draft);

    const sanitizedDraft: OfflineDraftSubmission = {
      ...draft,
      intensityScore: draft.intensityScore ?? 1,
      timestamp: draft.timestamp || Date.now(),
    };

    await db.draftSubmissions.put(sanitizedDraft);
    return sanitizedDraft.id;
  } catch (error) {
    return handleStorageError(error, 'saveDraft');
  }
}

/**
 * Retrieves all submissions currently marked as QUEUED for remote synchronization,
 * ordered chronologically (FIFO).
 */
export async function getQueuedSubmissions(): Promise<OfflineDraftSubmission[]> {
  try {
    return await db.draftSubmissions
      .where('syncStatus')
      .equals('QUEUED')
      .sortBy('timestamp');
  } catch (error) {
    return handleStorageError(error, 'getQueuedSubmissions');
  }
}

/**
 * Marks a queued draft submission as successfully synced to the central PostgreSQL registry.
 */
export async function markAsSynced(id: string, remoteMasterIssueId: string): Promise<void> {
  try {
    const updatedCount = await db.draftSubmissions.update(id, {
      syncStatus: 'SYNCED',
      remoteMasterIssueId,
      lastSyncAttempt: Date.now(),
      syncErrorMessage: undefined,
    });

    if (updatedCount === 0) {
      throw new Error(`Draft submission with ID "${id}" was not found in local IndexedDB.`);
    }
  } catch (error) {
    return handleStorageError(error, 'markAsSynced');
  }
}

/**
 * Deletes a draft submission from the client storage.
 */
export async function deleteDraft(id: string): Promise<void> {
  try {
    await db.draftSubmissions.delete(id);
  } catch (error) {
    return handleStorageError(error, 'deleteDraft');
  }
}

/**
 * Marks a queued submission as failed with an error reason
 */
export async function markAsFailed(id: string, errorMessage: string): Promise<void> {
  try {
    await db.draftSubmissions.update(id, {
      syncStatus: 'FAILED',
      lastSyncAttempt: Date.now(),
      syncErrorMessage: errorMessage,
    });
  } catch (error) {
    return handleStorageError(error, 'markAsFailed');
  }
}

/**
 * Queues a draft for transmission (transitions 'DRAFT' or 'FAILED' to 'QUEUED')
 */
export async function queueDraft(id: string): Promise<void> {
  try {
    const count = await db.draftSubmissions.update(id, {
      syncStatus: 'QUEUED',
      syncErrorMessage: undefined,
    });
    if (count === 0) {
      throw new Error(`Draft submission with ID "${id}" not found.`);
    }
  } catch (error) {
    return handleStorageError(error, 'queueDraft');
  }
}

/**
 * Retrieves a single draft submission by ID
 */
export async function getDraft(id: string): Promise<OfflineDraftSubmission | undefined> {
  try {
    return await db.draftSubmissions.get(id);
  } catch (error) {
    return handleStorageError(error, 'getDraft');
  }
}

/**
 * Retrieves all draft submissions regardless of syncStatus
 */
export async function getAllDrafts(): Promise<OfflineDraftSubmission[]> {
  try {
    return await db.draftSubmissions.toArray();
  } catch (error) {
    return handleStorageError(error, 'getAllDrafts');
  }
}

/**
 * Bulk caches LGD records for offline reverse-geocoding
 */
export async function cacheLGDRecords(records: CachedLGD[]): Promise<void> {
  try {
    await db.cachedLGD.bulkPut(records);
  } catch (error) {
    return handleStorageError(error, 'cacheLGDRecords');
  }
}

/**
 * Searches cached LGD records by district and block codes
 */
export async function lookupLGDByDistrictAndBlock(
  districtCode: number,
  blockCode: number
): Promise<CachedLGD[]> {
  try {
    return await db.cachedLGD
      .where('districtCode')
      .equals(districtCode)
      .and((record) => record.blockCode === blockCode)
      .toArray();
  } catch (error) {
    return handleStorageError(error, 'lookupLGDByDistrictAndBlock');
  }
}

/**
 * Endorses a civic draft submission after mandatory on-site inspection by Panchayat Officer.
 */
export async function endorseSubmission(
  id: string,
  severity: SeverityLevel,
  affectedHouseholds: number,
  notes: string,
  inspectorId: string
): Promise<void> {
  try {
    const trimmedNotes = (notes || '').trim();
    if (trimmedNotes.length < 20) {
      throw new Error(
        'Anti-Rubber-Stamp Violation: Mandatory field inspection note must be at least 20 characters long.'
      );
    }
    if (!affectedHouseholds || affectedHouseholds < 1) {
      throw new Error('Estimated affected households count must be at least 1.');
    }

    const updatedCount = await db.draftSubmissions.update(id, {
      masterLifecycleStatus: 'ENDORSED_MASTER',
      severity,
      affectedHouseholdCount: Math.floor(affectedHouseholds),
      panchayatInspectionNotes: trimmedNotes,
      panchayatInspectorId: inspectorId || 'OFFICER-JH-BDO-01',
      panchayatEndorsedAt: Date.now(),
    });

    if (updatedCount === 0) {
      throw new Error(`Draft submission with ID "${id}" was not found.`);
    }
  } catch (error) {
    return handleStorageError(error, 'endorseSubmission');
  }
}

/**
 * Rejects a civic report as spam, duplicate, or non-actionable with audit rationale.
 */
export async function rejectSubmission(
  id: string,
  reason: string,
  inspectorId: string
): Promise<void> {
  try {
    const updatedCount = await db.draftSubmissions.update(id, {
      masterLifecycleStatus: 'REJECTED_SPAM',
      rejectionReason: reason.trim() || 'Non-actionable / out of jurisdiction',
      panchayatInspectorId: inspectorId || 'OFFICER-JH-BDO-01',
      panchayatEndorsedAt: Date.now(),
    });

    if (updatedCount === 0) {
      throw new Error(`Draft submission with ID "${id}" was not found.`);
    }
  } catch (error) {
    return handleStorageError(error, 'rejectSubmission');
  }
}

// ============================================================================
// SPRINT 2 — TASK 2.1: ACADEMIC ENGINE REPOSITORY HELPERS & SEED DATA
// ============================================================================

/**
 * Initial accredited Faculty Profiles from Jharkhand HEIs
 * Demonstrating the 70/30 hybrid slot allocation (2 Core Competency, 1 Wildcard Exploratory)
 */
export const INITIAL_FACULTY_MENTORS: FacultyMentorProfile[] = [
  {
    id: 'FAC-JH-BITS-01',
    name: 'Dr. R. K. Singh',
    designation: 'Professor & Head of Department',
    department: 'Chemical & Environmental Engineering',
    institution: 'BIT Sindri, Dhanbad',
    coreCompetencyTags: [
      'water-filtration',
      'arsenic-remediation',
      'environmental-chemistry',
      'groundwater-purification',
    ],
    activeProjectsCount: 1, // Within max 3 cap
    maxCapacity: FACULTY_MAX_ACTIVE_PROJECTS,
    pendingReviewQueueCount: 1, // Within max 5 queue ceiling
    slotType: 'CORE_COMPETENCY',
  },
  {
    id: 'FAC-JH-NITJ-02',
    name: 'Dr. Priya Soren',
    designation: 'Associate Professor',
    department: 'Mechanical Engineering & Rural Energy Systems',
    institution: 'NIT Jamshedpur',
    coreCompetencyTags: [
      'solar-thermal',
      'micro-cold-storage',
      'rural-energy-systems',
      'refrigeration',
    ],
    activeProjectsCount: 2, // Near max 3 cap
    maxCapacity: FACULTY_MAX_ACTIVE_PROJECTS,
    pendingReviewQueueCount: 2, // Within max 5 queue ceiling
    slotType: 'CORE_COMPETENCY',
  },
  {
    id: 'FAC-JH-BITM-03',
    name: 'Dr. Amit Verma',
    designation: 'Associate Professor',
    department: 'Electronics & Communication Engineering',
    institution: 'BIT Mesra, Ranchi',
    coreCompetencyTags: [
      'embedded-iot',
      'sensor-telemetry',
      'wireless-sensor-networks',
      'edge-computing',
    ],
    activeProjectsCount: 0,
    maxCapacity: FACULTY_MAX_ACTIVE_PROJECTS,
    pendingReviewQueueCount: 0,
    slotType: 'WILDCARD_EXPLORATORY', // 30% Wildcard Exploratory slot for cross-disciplinary innovation
  },
];

/**
 * Initial curated Engineering Problem Briefs derived from endorsed Jharkhand issues
 */
export const INITIAL_ENGINEERING_BRIEFS: EngineeringProblemBrief[] = [
  {
    id: 'BRIEF-JH-2026-001',
    masterIssueId: 'JH-2026-M-849201',
    title: 'Low-Cost Arsenic & Iron Groundwater Filtration Unit for Rural Tube Wells',
    domainSector: 'WATER_RESOURCES',
    contextSummary:
      'Tube wells across Dumka Sadar block exhibit severe arsenic (>0.08 mg/L) and dissolved iron contamination, causing chronic dermatological lesions, blackfoot risk, and unpalatable drinking water. Rural habitations lack reliable three-phase power, rendering conventional high-pressure RO plants unviable.',
    boundaryConstraints: [
      'Off-grid gravity-fed operation (100% zero electrical power consumption)',
      'Platform installation footprint <= 0.8 sq.m adjacent to handpump discharge apron',
      'Filtration media restricted to locally procurable materials (graded sand, gravel, zero-valent iron filings, activated charcoal)',
      'Manufacturing BOM unit cost strictly capped <= ₹2,500 with zero consumable recurring costs for minimum 6 months',
    ],
    measurableBenchmarks: [
      {
        metric: 'Arsenic (As) concentration in treated water',
        targetValue: '<0.01 mg/L (WHO Drinking Standard)',
        tolerance: '±0.002 mg/L',
      },
      {
        metric: 'Total dissolved iron concentration',
        targetValue: '<0.3 mg/L',
        tolerance: '±0.05 mg/L',
      },
      {
        metric: 'Continuous gravity throughput flow',
        targetValue: '>= 4.0 Liters/minute',
        tolerance: '±0.5 L/min',
      },
    ],
    maxCostINR: 2450,
    fieldEvidenceSummary: {
      photoCount: 4,
      audioNotePresent: true,
      householdImpact: 320,
      panchayatNote:
        'Asanwar Gram Panchayat tubewell #4 yields rust-colored turbid discharge. Over 320 tribal families dependent on this single borehole. Immediate decentralized filtration needed.',
      district: 'Dumka',
      block: 'Dumka Sadar',
    },
    status: 'OPEN_FOR_CLAIMS',
    createdAt: 1773120000000,
  },
  {
    id: 'BRIEF-JH-2026-002',
    masterIssueId: 'JH-2026-M-391842',
    title: 'Decentralized Solar-Evaporative Micro-Cold Storage Chamber for Smallholder Horticulture',
    domainSector: 'AGRITECH',
    contextSummary:
      'Smallholder tomato, chili, and cauliflower growers in Ormanjhi experience 35-42% post-harvest spoilage within 48 hours during peak summer and post-monsoon harvest cycles due to lack of local cold storage and frequent power outages, forcing distress sales to middlemen at sub-remunerative rates.',
    boundaryConstraints: [
      'Decentralized off-grid operation utilizing micro solar PV (<=50W) and passive evaporative water-wicking cooling',
      'Internal usable storage chamber volume >= 250 Liters (minimum 5 standard agricultural crates capacity)',
      'Chamber thermal insulation constructed with local bio-composite materials (paddy straw, bamboo lattice, terracotta clay wicks)',
      'Total manufacturing bill-of-materials strictly capped <= ₹2,500 per unit',
    ],
    measurableBenchmarks: [
      {
        metric: 'Internal chamber temperature depression below ambient',
        targetValue: '10°C to 12°C below ambient (maintaining 16-18°C chamber)',
        tolerance: '±1.5°C',
      },
      {
        metric: 'Relative humidity inside storage chamber',
        targetValue: '85% to 92% RH',
        tolerance: '±3% RH',
      },
      {
        metric: 'Perishable produce shelf-life retention for Solanaceae vegetables',
        targetValue: '>= 5 days delay of senescence',
        tolerance: '±1 day',
      },
    ],
    maxCostINR: 2490,
    fieldEvidenceSummary: {
      photoCount: 3,
      audioNotePresent: true,
      householdImpact: 195,
      panchayatNote:
        'Panchayat Krishi Mitra reported distress sales of tomatoes at ₹2-3/kg due to absence of overnight holding coolers in Ormanjhi weekly haat.',
      district: 'Ranchi',
      block: 'Ormanjhi',
    },
    status: 'OPEN_FOR_CLAIMS',
    createdAt: 1773123600000,
  },
];

let isSeedingSolverData = false;

/**
 * Seeds initial academic problem briefs, faculty profiles, and default student teams if tables are empty.
 * Idempotent and concurrency-guarded.
 */
export async function seedSolverDataIfEmpty(): Promise<void> {
  if (isSeedingSolverData) return;
  try {
    isSeedingSolverData = true;

    const briefCount = await db.engineeringBriefs.count();
    if (briefCount === 0) {
      await db.engineeringBriefs.bulkPut(INITIAL_ENGINEERING_BRIEFS);
    }

    const facultyCount = await db.facultyMentors.count();
    if (facultyCount === 0) {
      await db.facultyMentors.bulkPut(INITIAL_FACULTY_MENTORS);
    }

    const teamCount = await db.studentTeams.count();
    if (teamCount === 0) {
      await db.studentTeams.bulkPut(INITIAL_STUDENT_TEAMS);
    }
  } catch (error) {
    console.error('Error seeding initial solver data:', error);
  } finally {
    isSeedingSolverData = false;
  }
}

let isSeedingGovernanceData = false;

/**
 * Seeds initial CSR escrow grants, safety validations, and district GIS summary metrics.
 * Idempotent and concurrency-guarded.
 */
export async function seedGovernanceDataIfEmpty(): Promise<void> {
  if (isSeedingGovernanceData) return;
  try {
    isSeedingGovernanceData = true;

    await seedSolverDataIfEmpty();

    const grantCount = await db.escrowGrants.count();
    if (grantCount === 0) {
      await db.escrowGrants.bulkPut(INITIAL_ESCROW_GRANTS);
    }

    const validationCount = await db.safetyValidations.count();
    if (validationCount === 0) {
      await db.safetyValidations.bulkPut(INITIAL_SAFETY_VALIDATIONS);
    }

    const districtCount = await db.districtGISMetrics.count();
    if (districtCount === 0) {
      await db.districtGISMetrics.bulkPut(INITIAL_DISTRICT_GIS_METRICS);
    }
  } catch (error) {
    console.error('Error seeding initial governance & capital data:', error);
  } finally {
    isSeedingGovernanceData = false;
  }
}

// Hook into database ready lifecycle to ensure initial mock data is populated
db.on('ready', async () => {
  await seedSolverDataIfEmpty();
  await seedGovernanceDataIfEmpty();
});

/**
 * Saves or updates an Engineering Problem Brief in client storage.
 * Enforces statutory cost ceiling (<= ₹2,500).
 */
export async function saveEngineeringBrief(brief: EngineeringProblemBrief): Promise<void> {
  try {
    if (brief.maxCostINR > MAX_BRIEF_BUDGET_INR) {
      throw new Error(
        `Guardrail Violation: Maximum brief budget cannot exceed ₹${MAX_BRIEF_BUDGET_INR}. Received: ₹${brief.maxCostINR}`
      );
    }
    await db.engineeringBriefs.put(brief);
  } catch (error) {
    return handleStorageError(error, 'saveEngineeringBrief');
  }
}

/**
 * Retrieves engineering problem briefs, optionally filtered by domain sector.
 * Ordered by createdAt descending.
 */
export async function getBriefs(sectorFilter?: string): Promise<EngineeringProblemBrief[]> {
  try {
    await seedSolverDataIfEmpty();
    let briefs: EngineeringProblemBrief[];
    if (sectorFilter && sectorFilter !== 'ALL') {
      briefs = await db.engineeringBriefs
        .where('domainSector')
        .equals(sectorFilter)
        .toArray();
    } else {
      briefs = await db.engineeringBriefs.toArray();
    }
    return briefs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    return handleStorageError(error, 'getBriefs');
  }
}

/**
 * Retrieves a single engineering problem brief by unique identifier
 */
export async function getBriefById(id: string): Promise<EngineeringProblemBrief | undefined> {
  try {
    await seedSolverDataIfEmpty();
    return await db.engineeringBriefs.get(id);
  } catch (error) {
    return handleStorageError(error, 'getBriefById');
  }
}

/**
 * Creates and registers a new collegiate student solver team.
 * @returns Registered team ID
 */
export async function createTeam(team: StudentTeam): Promise<string> {
  try {
    await db.studentTeams.put(team);
    return team.id;
  } catch (error) {
    return handleStorageError(error, 'createTeam');
  }
}

/**
 * Retrieves a student team by its unique identifier
 */
export async function getTeamById(id: string): Promise<StudentTeam | undefined> {
  try {
    return await db.studentTeams.get(id);
  } catch (error) {
    return handleStorageError(error, 'getTeamById');
  }
}

/**
 * Retrieves all registered student teams
 */
export async function getAllTeams(): Promise<StudentTeam[]> {
  try {
    return await db.studentTeams.toArray();
  } catch (error) {
    return handleStorageError(error, 'getAllTeams');
  }
}

/**
 * Assigns or requests a faculty mentor for a student team while enforcing academic capacity guardrails:
 * 1. Hard capacity cap: Maximum 3 active projects per faculty mentor.
 * 2. Hard review ceiling: Maximum 5 pending review proposals in faculty queue.
 *
 * @param teamId UUID of the collegiate student team
 * @param mentorId Identifier of the targeted faculty mentor
 */
export async function assignMentorToTeam(
  teamId: string,
  mentorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await seedSolverDataIfEmpty();

    return await db.transaction('rw', db.studentTeams, db.facultyMentors, async () => {
      const mentor = await db.facultyMentors.get(mentorId);
      if (!mentor) {
        return {
          success: false,
          message: `Faculty mentor with ID "${mentorId}" not found in accredited registry.`,
        };
      }

      const team = await db.studentTeams.get(teamId);
      if (!team) {
        return {
          success: false,
          message: `Student solver team with ID "${teamId}" not found.`,
        };
      }

      // Enforce Guardrail 1: Hard active project capacity (Max 3)
      if (mentor.activeProjectsCount >= FACULTY_MAX_ACTIVE_PROJECTS) {
        return {
          success: false,
          message: 'Faculty active capacity cap reached (Max 3 teams)',
        };
      }

      // Enforce Guardrail 2: Hard pending review queue ceiling (Max 5)
      if (mentor.pendingReviewQueueCount >= FACULTY_MAX_PENDING_QUEUE) {
        return {
          success: false,
          message: 'Faculty pending review queue full (Max 5 proposals)',
        };
      }

      // Increment faculty pending review queue count
      await db.facultyMentors.update(mentorId, {
        pendingReviewQueueCount: mentor.pendingReviewQueueCount + 1,
      });

      // Update student team with pending mentorship assignment
      const requestTimestamp = Date.now();
      await db.studentTeams.update(teamId, {
        assignedMentorId: mentorId,
        mentorStatus: 'PENDING_APPROVAL',
        mentorRequestTimestamp: requestTimestamp,
      });

      return {
        success: true,
        message: 'Mentorship proposal successfully submitted for faculty evaluation.',
      };
    });
  } catch (error) {
    return handleStorageError(error, 'assignMentorToTeam');
  }
}

/**
 * Endorses and approves student team mentorship request.
 * Increments faculty activeProjectsCount, decrements pendingReviewQueueCount.
 */
export async function approveTeamMentorship(
  teamId: string,
  mentorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await db.transaction('rw', db.studentTeams, db.facultyMentors, async () => {
      const mentor = await db.facultyMentors.get(mentorId);
      if (!mentor) {
        return { success: false, message: 'Faculty mentor not found.' };
      }
      if (mentor.activeProjectsCount >= FACULTY_MAX_ACTIVE_PROJECTS) {
        return {
          success: false,
          message: 'Faculty active capacity cap reached (Max 3 teams)',
        };
      }

      await db.facultyMentors.update(mentorId, {
        activeProjectsCount: mentor.activeProjectsCount + 1,
        pendingReviewQueueCount: Math.max(0, mentor.pendingReviewQueueCount - 1),
      });

      await db.studentTeams.update(teamId, {
        mentorStatus: 'APPROVED',
        assignedMentorId: mentorId,
      });

      return { success: true, message: 'Mentorship proposal successfully approved.' };
    });
  } catch (error) {
    return handleStorageError(error, 'approveTeamMentorship');
  }
}

/**
 * Declines or reroutes student team mentorship request.
 * Frees pending queue slot and sets team mentorStatus to 'REROUTED'.
 */
export async function declineTeamMentorship(
  teamId: string,
  mentorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await db.transaction('rw', db.studentTeams, db.facultyMentors, async () => {
      const mentor = await db.facultyMentors.get(mentorId);
      if (mentor) {
        await db.facultyMentors.update(mentorId, {
          pendingReviewQueueCount: Math.max(0, mentor.pendingReviewQueueCount - 1),
        });
      }

      await db.studentTeams.update(teamId, {
        mentorStatus: 'REROUTED',
        assignedMentorId: undefined,
      });

      return { success: true, message: 'Proposal declined and rerouted for alternate mentor selection.' };
    });
  } catch (error) {
    return handleStorageError(error, 'declineTeamMentorship');
  }
}

/**
 * Advances the capstone milestone progression for an approved student team (Milestone 1 to 4).
 */
export async function advanceTeamMilestone(
  teamId: string,
  milestone: MilestoneNumber
): Promise<void> {
  try {
    await db.studentTeams.update(teamId, {
      currentMilestone: milestone,
    });
  } catch (error) {
    return handleStorageError(error, 'advanceTeamMilestone');
  }
}

/**
 * Retrieves all accredited faculty mentor profiles
 */
export async function getFacultyMentors(): Promise<FacultyMentorProfile[]> {
  try {
    await seedSolverDataIfEmpty();
    return await db.facultyMentors.toArray();
  } catch (error) {
    return handleStorageError(error, 'getFacultyMentors');
  }
}

/**
 * Retrieves a single faculty mentor profile by identifier
 */
export async function getFacultyMentorById(id: string): Promise<FacultyMentorProfile | undefined> {
  try {
    await seedSolverDataIfEmpty();
    return await db.facultyMentors.get(id);
  } catch (error) {
    return handleStorageError(error, 'getFacultyMentorById');
  }
}

/**
 * Submits a technical grassroots query from a student solver team to Panchayat administration
 */
export async function saveTechnicalQuery(query: PanchayatTechnicalQuery): Promise<string> {
  try {
    await db.technicalQueries.put(query);
    return query.id;
  } catch (error) {
    return handleStorageError(error, 'saveTechnicalQuery');
  }
}

/**
 * Retrieves technical queries, optionally filtered by student team
 */
export async function getTechnicalQueries(teamId?: string): Promise<PanchayatTechnicalQuery[]> {
  try {
    if (teamId) {
      return await db.technicalQueries.where('teamId').equals(teamId).reverse().sortBy('createdAt');
    }
    return await db.technicalQueries.orderBy('createdAt').reverse().toArray();
  } catch (error) {
    return handleStorageError(error, 'getTechnicalQueries');
  }
}

// ============================================================================
// SPRINT 3 — TASK 3.1: GOVERNANCE & CAPITAL REPOSITORY HELPERS & SEED DATA
// ============================================================================

/**
 * Initial registered student solver team linked to the Dumka Water Challenge
 */
export const INITIAL_STUDENT_TEAMS: StudentTeam[] = [
  {
    id: 'TEAM-JH-SOLVER-01',
    briefId: 'BRIEF-JH-2026-001',
    teamName: 'Jal-Shuddhi Innovators',
    leadStudentId: 'JH-STU-BITS-2201',
    leadStudentName: 'Aakash Kumar Mahato',
    leadCollege: 'BIT Sindri',
    roster: [
      {
        studentId: 'JH-STU-BITS-2201',
        name: 'Aakash Kumar Mahato',
        department: 'CHEMICAL',
        year: 3,
        roleDescription: 'Media adsorption lead & chemical filtration sizing',
      },
      {
        studentId: 'JH-STU-BITS-2215',
        name: 'Anjali Soren',
        department: 'CIVIL',
        year: 3,
        roleDescription: 'Gravity apron CAD & structural pipe casing',
      },
      {
        studentId: 'JH-STU-BITS-2244',
        name: 'Rohan Gupta',
        department: 'CSE',
        year: 2,
        roleDescription: 'IoT optical turbidity sensor & Panchayat field telemetry',
      },
    ],
    assignedMentorId: 'FAC-JH-BITS-01',
    mentorStatus: 'APPROVED',
    mentorRequestTimestamp: 1773125000000,
    repoUrl: 'github.com/jh-dhte-capstone/jal-shuddhi-dumka',
    currentMilestone: 2,
  },
];

/**
 * Initial seeded Escrow Grant linked to the Dumka Water Challenge funded by Tata Steel CSR
 * ₹1,50,000 committed, Tranche 1 disbursed, Tranche 2 under review
 */
export const INITIAL_ESCROW_GRANTS: EscrowGrant[] = [
  {
    id: 'GRANT-JH-CSR-2026-001',
    masterIssueId: 'JH-2026-M-849201',
    teamId: 'TEAM-JH-SOLVER-01',
    sponsorId: 'SPONSOR-TATA-STEEL-01',
    sponsorName: 'Tata Steel CSR Foundation',
    totalCommittedINR: 150000,
    mcaScheduleVIICategory: 'WATER_AND_SANITATION',
    sdgGoalNumber: 6,
    tranches: [
      {
        stage: 'TRANCHE_1_BOM',
        percentage: 30,
        amountINR: 45000,
        status: 'DISBURSED',
        deliverableDescription: 'BOM Procurement & Sand/Iron Media Architecture validation under ₹2,500 budget limit.',
        deliverableProofUrl: 'https://udbhav.jharkhand.gov.in/proofs/bom-receipts-t1.pdf',
        facultySignoffAt: 1773200000000,
        disbursedAt: 1773250000000,
      },
      {
        stage: 'TRANCHE_2_LAB',
        percentage: 30,
        amountINR: 45000,
        status: 'LOCKED',
        deliverableDescription: 'Lab bench prototyping & WHO arsenic filtration benchmark validation (<0.01 mg/L).',
        deliverableProofUrl: 'https://udbhav.jharkhand.gov.in/proofs/lab-telemetry-test-report.pdf',
      },
      {
        stage: 'TRANCHE_3_FIELD',
        percentage: 40,
        amountINR: 60000,
        status: 'LOCKED',
        deliverableDescription: 'Panchayat ground installation at Dumka Sadar, BDO handover, and 30-day water safety telemetry.',
      },
    ],
    createdAt: 1773180000000,
  },
];

/**
 * Initial seeded Safety Validation showing Tier 1 lab pass and pending Tier 2 testing at CSIR-CIMFR Dhanbad
 */
export const INITIAL_SAFETY_VALIDATIONS: SafetyValidation[] = [
  {
    id: 'SAFE-JH-2026-001',
    masterIssueId: 'JH-2026-M-849201',
    teamId: 'TEAM-JH-SOLVER-01',
    tier1FacultyPassed: true,
    tier1TelemetryReportUrl: 'https://udbhav.jharkhand.gov.in/certs/bit-sindri-tier1-safety.pdf',
    tier1SignedAt: 1773220000000,
    tier1HODName: 'Dr. R. K. Singh (BIT Sindri)',
    tier2EvaluatorAgency: 'CSIR_CIMFR_DHANBAD',
    tier2BisPassed: false,
    tier2BisStandardCode: 'IS 10500:2012 Drinking Water Specification',
    isPublicPilotCleared: false,
  },
];

/**
 * Initial summary metrics across 5 key Jharkhand districts
 */
export const INITIAL_DISTRICT_GIS_METRICS: DistrictGISSummary[] = [
  {
    districtCode: 3401,
    districtName: 'Ranchi',
    totalIssuesReported: 48,
    endorsedMasterCount: 36,
    activeCapstonesCount: 12,
    verifiedDeploymentsCount: 7,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 18,
  },
  {
    districtCode: 3402,
    districtName: 'Dhanbad',
    totalIssuesReported: 54,
    endorsedMasterCount: 41,
    activeCapstonesCount: 14,
    verifiedDeploymentsCount: 9,
    distressIntensityLevel: 'ACUTE',
    averageResolutionDays: 22,
  },
  {
    districtCode: 3403,
    districtName: 'Dumka',
    totalIssuesReported: 39,
    endorsedMasterCount: 28,
    activeCapstonesCount: 9,
    verifiedDeploymentsCount: 4,
    distressIntensityLevel: 'ACUTE',
    averageResolutionDays: 26,
  },
  {
    districtCode: 3404,
    districtName: 'East Singhbhum',
    totalIssuesReported: 32,
    endorsedMasterCount: 24,
    activeCapstonesCount: 8,
    verifiedDeploymentsCount: 6,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 15,
  },
  {
    districtCode: 3405,
    districtName: 'Hazaribagh',
    totalIssuesReported: 27,
    endorsedMasterCount: 19,
    activeCapstonesCount: 6,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'LOW',
    averageResolutionDays: 14,
  },
];

/**
 * Saves or updates an Escrow Grant committed by Industry/CSR sponsors.
 */
export async function saveEscrowGrant(grant: EscrowGrant): Promise<void> {
  try {
    await db.escrowGrants.put(grant);
  } catch (error) {
    return handleStorageError(error, 'saveEscrowGrant');
  }
}

/**
 * Retrieves the escrow grant committed for a specific student team.
 */
export async function getEscrowGrantByTeam(teamId: string): Promise<EscrowGrant | undefined> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.escrowGrants.where('teamId').equals(teamId).first();
  } catch (error) {
    return handleStorageError(error, 'getEscrowGrantByTeam');
  }
}

/**
 * Retrieves an escrow grant by unique identifier.
 */
export async function getEscrowGrantById(id: string): Promise<EscrowGrant | undefined> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.escrowGrants.get(id);
  } catch (error) {
    return handleStorageError(error, 'getEscrowGrantById');
  }
}

/**
 * Retrieves all escrow grants registered in the system.
 */
export async function getAllEscrowGrants(): Promise<EscrowGrant[]> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.escrowGrants.toArray();
  } catch (error) {
    return handleStorageError(error, 'getAllEscrowGrants');
  }
}

/**
 * Updates an escrow tranche status with strict role-based verification rules:
 * - Tranche 1 (BOM): Requires FACULTY sign-off.
 * - Tranche 2 (LAB): Requires FACULTY sign-off with verified telemetry proof URL.
 * - Tranche 3 (FIELD): Requires BOTH FACULTY and GOVT sign-offs before approval / disbursement.
 */
export async function updateTrancheStatus(
  grantId: string,
  stage: TrancheStage,
  status: EscrowStatus,
  signoffRole: 'FACULTY' | 'GOVT' | 'INDUSTRY_CSR',
  rejectionReason?: string
): Promise<void> {
  try {
    await seedGovernanceDataIfEmpty();

    const grant = await db.escrowGrants.get(grantId);
    if (!grant) {
      throw new Error(`Escrow grant with ID "${grantId}" was not found.`);
    }

    const trancheIndex = grant.tranches.findIndex((t) => t.stage === stage);
    if (trancheIndex === -1) {
      throw new Error(`Tranche stage "${stage}" not found on grant "${grantId}".`);
    }

    const tranche = { ...grant.tranches[trancheIndex] };
    const now = Date.now();

    // Check Dispute Flagging by Industry / Sponsor
    if (status === 'DISPUTED') {
      tranche.status = 'DISPUTED';
      if (rejectionReason) {
        tranche.rejectionReason = rejectionReason;
      }
    } else if (stage === 'TRANCHE_1_BOM') {
      // Enforce Role & Proof Constraints per Stage
      if (signoffRole !== 'FACULTY') {
        throw new Error('Guardrail Violation: Tranche 1 (BOM) requires Faculty Mentor sign-off.');
      }
      tranche.facultySignoffAt = now;
      tranche.status = status;
      if (status === 'DISBURSED') {
        tranche.disbursedAt = now;
      }
    } else if (stage === 'TRANCHE_2_LAB') {
      if (signoffRole !== 'FACULTY') {
        throw new Error('Guardrail Violation: Tranche 2 (Lab Bench) requires Faculty Mentor sign-off.');
      }
      if (!tranche.deliverableProofUrl || tranche.deliverableProofUrl.trim() === '') {
        throw new Error(
          'Guardrail Violation: Tranche 2 requires verified telemetry proof URL before faculty sign-off.'
        );
      }
      tranche.facultySignoffAt = now;
      tranche.status = status;
      if (status === 'DISBURSED') {
        tranche.disbursedAt = now;
      }
    } else if (stage === 'TRANCHE_3_FIELD') {
      if (signoffRole === 'FACULTY') {
        tranche.facultySignoffAt = now;
      } else if (signoffRole === 'GOVT') {
        tranche.govtSignoffAt = now;
      }

      // Tranche 3 requires both FACULTY and GOVT approvals to transition to APPROVED or DISBURSED
      const hasDualSignoffs = Boolean(tranche.facultySignoffAt && tranche.govtSignoffAt);
      if (status === 'APPROVED' || status === 'DISBURSED') {
        if (!hasDualSignoffs) {
          // If only 1 signature recorded so far, keep in locked/pending state while recording timestamp
          tranche.status = 'LOCKED';
        } else {
          tranche.status = status;
          if (status === 'DISBURSED') {
            tranche.disbursedAt = now;
          }
        }
      } else {
        tranche.status = status;
      }
    }

    grant.tranches[trancheIndex] = tranche;
    await db.escrowGrants.put(grant);
  } catch (error) {
    return handleStorageError(error, 'updateTrancheStatus');
  }
}

/**
 * Saves or updates a 2-Tier Hardware Safety Validation record.
 */
export async function saveSafetyValidation(val: SafetyValidation): Promise<void> {
  try {
    await db.safetyValidations.put(val);
  } catch (error) {
    return handleStorageError(error, 'saveSafetyValidation');
  }
}

/**
 * Retrieves the safety validation record for a specific student team.
 */
export async function getSafetyValidation(teamId: string): Promise<SafetyValidation | undefined> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.safetyValidations.where('teamId').equals(teamId).first();
  } catch (error) {
    return handleStorageError(error, 'getSafetyValidation');
  }
}

/**
 * Retrieves a safety validation record by unique identifier.
 */
export async function getSafetyValidationById(id: string): Promise<SafetyValidation | undefined> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.safetyValidations.get(id);
  } catch (error) {
    return handleStorageError(error, 'getSafetyValidationById');
  }
}

/**
 * Retrieves all registered safety validations across Jharkhand student capstones.
 */
export async function getAllSafetyValidations(): Promise<SafetyValidation[]> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.safetyValidations.toArray();
  } catch (error) {
    return handleStorageError(error, 'getAllSafetyValidations');
  }
}

/**
 * Signs off on Tier 1 Academic Lab Bench clearance by Faculty Supervisor / HOD.
 */
export async function signTier1Safety(
  validationId: string,
  hodName: string,
  telemetryReportUrl: string
): Promise<void> {
  try {
    await seedGovernanceDataIfEmpty();

    const record = await db.safetyValidations.get(validationId);
    if (!record) {
      throw new Error(`Safety validation record with ID "${validationId}" was not found.`);
    }

    const now = Date.now();
    await db.safetyValidations.update(validationId, {
      tier1FacultyPassed: true,
      tier1HODName: hodName,
      tier1TelemetryReportUrl: telemetryReportUrl,
      tier1SignedAt: now,
    });
  } catch (error) {
    return handleStorageError(error, 'signTier1Safety');
  }
}

/**
 * Certifies Tier 2 Statutory BIS / NABL laboratory safety (e.g. CSIR-CIMFR Dhanbad).
 * Transitions tier2BisPassed to true and generates verifiable DC Pilot Authorization Token.
 */
export async function certifyTier2Safety(
  validationId: string,
  evaluatorAgency: string,
  bisStandard: string,
  certificateUrl?: string
): Promise<void> {
  try {
    await seedGovernanceDataIfEmpty();

    const record = await db.safetyValidations.get(validationId);
    if (!record) {
      throw new Error(`Safety validation record with ID "${validationId}" was not found.`);
    }

    if (!record.tier1FacultyPassed) {
      throw new Error(
        'Guardrail Violation: Cannot certify Tier 2 regulatory safety without prior Tier 1 Faculty Lab clearance.'
      );
    }

    const now = Date.now();
    const tokenSuffix = crypto.randomUUID().slice(0, 4).toUpperCase();
    const dcPermitQR = `JH-DC-PILOT-PERMIT-2026-${tokenSuffix}`;

    await db.safetyValidations.update(validationId, {
      tier2EvaluatorAgency: evaluatorAgency as Tier2EvaluatorAgency,
      tier2BisStandardCode: bisStandard,
      tier2BisPassed: true,
      tier2CertifiedAt: now,
      isPublicPilotCleared: true,
      clearedAt: now,
      dcPilotPermitQR: dcPermitQR,
      tier2TestCertificateUrl:
        certificateUrl ||
        `https://udbhav.jharkhand.gov.in/certs/tier2-${evaluatorAgency.toLowerCase()}-${tokenSuffix}.pdf`,
    });
  } catch (error) {
    return handleStorageError(error, 'certifyTier2Safety');
  }
}

/**
 * Retrieves district GIS summary metrics across Jharkhand districts for spatial telemetry.
 */
export async function getDistrictGISMetrics(): Promise<DistrictGISSummary[]> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.districtGISMetrics.toArray();
  } catch (error) {
    return handleStorageError(error, 'getDistrictGISMetrics');
  }
}

/**
 * Saves or updates a district GIS summary record.
 */
export async function saveDistrictGISSummary(summary: DistrictGISSummary): Promise<void> {
  try {
    await db.districtGISMetrics.put(summary);
  } catch (error) {
    return handleStorageError(error, 'saveDistrictGISSummary');
  }
}


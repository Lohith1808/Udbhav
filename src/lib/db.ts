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
  MilestoneTranche,
  SafetyValidation,
  DistrictGISSummary,
  DistressIntensityLevel,
  TrancheStage,
  EscrowStatus,
  Tier2EvaluatorAgency,
} from '../types/governance';
import {
  evaluateClusterAssignment,
  resolveHighestSeverity,
  type ClusterEvaluationResult,
} from '../utils/intensityScorer';

export type { ClusterEvaluationResult };

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

  get projectTeams(): Table<StudentTeam, string> {
    return this.studentTeams;
  }

  get masterIssues(): Table<OfflineDraftSubmission, string> {
    return this.draftSubmissions;
  }

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
 * Sprint 6 - Task 6.3: Cross-Device Spatial Clustering & Distributed Ingestion
 * Evaluates spatial proximity (<=1000m or LGD panchayatCode match) and phoneHash deduplication.
 * - Same phoneHash: flag duplicate notification, prevent score inflation.
 * - Distinct citizen within radius: merge into Master Issue, increment intensityScore, preserve highest severity.
 * - Isolated: saves as new primary master record.
 */
export async function clusterAndSaveSubmission(
  submission: OfflineDraftSubmission
): Promise<ClusterEvaluationResult> {
  try {
    validateDraftPayload(submission);

    const existingDrafts = await db.draftSubmissions.toArray();
    const evaluation = evaluateClusterAssignment(submission, existingDrafts);

    if (evaluation.isDirectUserDuplicate) {
      // Repeat submission from the same citizen: update missing media if any, do not inflate score
      if (evaluation.targetMasterIssueId) {
        const master = await db.draftSubmissions.get(evaluation.targetMasterIssueId);
        if (master) {
          const mergedPhoto = master.photoBlob || submission.photoBlob;
          const mergedAudio = master.audioBlob || submission.audioBlob;
          await db.draftSubmissions.update(master.id, {
            photoBlob: mergedPhoto,
            audioBlob: mergedAudio,
            timestamp: Date.now(),
          });
        }
      }
      return evaluation;
    }

    if (evaluation.shouldMergeIntoMaster && evaluation.targetMasterIssueId) {
      const master = await db.draftSubmissions.get(evaluation.targetMasterIssueId);
      if (master) {
        const targetIntensity = Math.max(
          (master.intensityScore || 1) + 1,
          evaluation.newIntensityScore
        );
        const resolvedSeverity = resolveHighestSeverity(master.severity, submission.severity);
        const mergedPhoto = master.photoBlob || submission.photoBlob;
        const mergedAudio = master.audioBlob || submission.audioBlob;

        await db.draftSubmissions.update(master.id, {
          intensityScore: targetIntensity,
          severity: resolvedSeverity,
          photoBlob: mergedPhoto,
          audioBlob: mergedAudio,
          timestamp: Date.now(),
          aiTriageCategory: master.aiTriageCategory || submission.aiTriageCategory,
        });

        // Also persist incoming submission referencing the Master Issue for auditability
        const clusteredRecord: OfflineDraftSubmission = {
          ...submission,
          intensityScore: targetIntensity,
          remoteMasterIssueId: master.id,
          status: master.status,
          masterLifecycleStatus: master.masterLifecycleStatus,
          timestamp: submission.timestamp || Date.now(),
        };
        await db.draftSubmissions.put(clusteredRecord);

        return {
          ...evaluation,
          newIntensityScore: targetIntensity,
        };
      }
    }

    // Isolated new incident
    const sanitizedDraft: OfflineDraftSubmission = {
      ...submission,
      intensityScore: submission.intensityScore ?? 1,
      timestamp: submission.timestamp || Date.now(),
    };
    await db.draftSubmissions.put(sanitizedDraft);

    return evaluation;
  } catch (error) {
    return handleStorageError(error, 'clusterAndSaveSubmission');
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
export async function markAsSynced(
  id: string,
  remoteMasterIssueId: string,
  remoteRevision?: number
): Promise<void> {
  try {
    const updatedCount = await db.draftSubmissions.update(id, {
      syncStatus: 'SYNCED',
      remoteMasterIssueId,
      lastSyncAttempt: Date.now(),
      lastSyncedAt: new Date().toISOString(),
      remoteRevision: remoteRevision ?? 1,
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
 * Batch upserts remote issues into local IndexedDB with queue protection,
 * conflict resolution, and spatial cluster assignment (Sprint 6 - Task 6.3).
 * - Prevents data loss by never overwriting local offline drafts marked as 'QUEUED'.
 * - Applies timestamp-based "Last-Write-Wins" on immutable/status fields.
 * - Enforces monotonic counter increments for intensityScore (Math.max).
 * - Runs evaluateClusterAssignment on incoming remote issues to avoid split clusters across nodes.
 */
export async function upsertRemoteIssues(issues: OfflineDraftSubmission[]): Promise<void> {
  if (!issues || issues.length === 0) return;

  try {
    await db.transaction('rw', db.draftSubmissions, async () => {
      for (const remote of issues) {
        if (!remote.id) continue;
        const local = await db.draftSubmissions.get(remote.id);

        if (local) {
          // Guardrail: DO NOT overwrite local offline drafts marked as QUEUED
          if (local.syncStatus === 'QUEUED') {
            const maxIntensity = Math.max(local.intensityScore || 1, remote.intensityScore || 1);
            if (maxIntensity !== local.intensityScore) {
              await db.draftSubmissions.update(local.id, {
                intensityScore: maxIntensity,
              });
            }
            continue;
          }

          // Conflict Resolution: Last-Write-Wins based on latest timestamp
          const localTs = Math.max(local.panchayatEndorsedAt || 0, local.timestamp || 0);
          const remoteTs = Math.max(remote.panchayatEndorsedAt || 0, remote.timestamp || 0);
          const maxIntensity = Math.max(local.intensityScore || 1, remote.intensityScore || 1);
          const resolvedSeverity = resolveHighestSeverity(local.severity, remote.severity);

          if (remoteTs >= localTs) {
            await db.draftSubmissions.put({
              ...local,
              ...remote,
              // Retain local binary blobs if remote payload stripped them
              photoBlob: remote.photoBlob || local.photoBlob,
              audioBlob: remote.audioBlob || local.audioBlob,
              intensityScore: maxIntensity,
              severity: resolvedSeverity,
              syncStatus: 'SYNCED',
              lastSyncedAt: remote.lastSyncedAt || new Date().toISOString(),
              remoteRevision: remote.remoteRevision ?? (local.remoteRevision ?? 0) + 1,
            });
          } else {
            // Local is newer: preserve local state, monotonic intensity score update
            await db.draftSubmissions.update(local.id, {
              intensityScore: maxIntensity,
              severity: resolvedSeverity,
              lastSyncedAt: new Date().toISOString(),
            });
          }
        } else {
          // New remote record: evaluate clustering against existing local records
          const currentLocalList = await db.draftSubmissions.toArray();
          const clusterEval = evaluateClusterAssignment(remote, currentLocalList);

          if (clusterEval.isDirectUserDuplicate && clusterEval.targetMasterIssueId) {
            // Repeat submission from the same citizen: update timestamp & retain evidence
            const targetMaster = await db.draftSubmissions.get(clusterEval.targetMasterIssueId);
            if (targetMaster) {
              await db.draftSubmissions.update(targetMaster.id, {
                photoBlob: targetMaster.photoBlob || remote.photoBlob,
                audioBlob: targetMaster.audioBlob || remote.audioBlob,
                lastSyncedAt: new Date().toISOString(),
              });
            }
            await db.draftSubmissions.put({
              ...remote,
              remoteMasterIssueId: clusterEval.targetMasterIssueId,
              syncStatus: 'SYNCED',
              intensityScore: targetMaster?.intensityScore || 1,
              lastSyncedAt: remote.lastSyncedAt || new Date().toISOString(),
              remoteRevision: remote.remoteRevision ?? 1,
            });
          } else if (clusterEval.shouldMergeIntoMaster && clusterEval.targetMasterIssueId) {
            // Distinct citizen spatial cluster: elevate master issue score and severity
            const targetMaster = await db.draftSubmissions.get(clusterEval.targetMasterIssueId);
            if (targetMaster) {
              const updatedScore = Math.max(
                (targetMaster.intensityScore || 1) + 1,
                clusterEval.newIntensityScore,
                remote.intensityScore || 1
              );
              const resolvedSeverity = resolveHighestSeverity(targetMaster.severity, remote.severity);

              await db.draftSubmissions.update(targetMaster.id, {
                intensityScore: updatedScore,
                severity: resolvedSeverity,
                photoBlob: targetMaster.photoBlob || remote.photoBlob,
                audioBlob: targetMaster.audioBlob || remote.audioBlob,
                lastSyncedAt: new Date().toISOString(),
              });
            }
            await db.draftSubmissions.put({
              ...remote,
              remoteMasterIssueId: clusterEval.targetMasterIssueId,
              syncStatus: 'SYNCED',
              intensityScore: clusterEval.newIntensityScore,
              lastSyncedAt: remote.lastSyncedAt || new Date().toISOString(),
              remoteRevision: remote.remoteRevision ?? 1,
            });
          } else {
            // Isolated incident: insert safely
            await db.draftSubmissions.put({
              ...remote,
              syncStatus: 'SYNCED',
              intensityScore: remote.intensityScore || 1,
              lastSyncedAt: remote.lastSyncedAt || new Date().toISOString(),
              remoteRevision: remote.remoteRevision ?? 1,
            });
          }
        }
      }
    });
  } catch (error) {
    return handleStorageError(error, 'upsertRemoteIssues');
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
    // Anti-Gibberish: reject repeated single-character sequences
    if (/(.)\1{3,}/i.test(trimmedNotes)) {
      throw new Error(
        'Anti-Rubber-Stamp Violation: Repeated character sequences rejected. Please provide a substantive field inspection note.'
      );
    }
    // Require at least 3 distinct words separated by spaces
    const words = trimmedNotes.split(/\s+/).filter((w) => w.length > 0);
    const distinctWords = new Set(words.map((w) => w.toLowerCase()));
    if (words.length < 3 || distinctWords.size < 3) {
      throw new Error(
        'Anti-Rubber-Stamp Violation: Field inspection note must contain at least 3 distinct words.'
      );
    }
    if (!affectedHouseholds || affectedHouseholds < 1) {
      throw new Error('Estimated affected households count must be at least 1.');
    }

    const updatedCount = await db.draftSubmissions.update(id, {
      status: 'ENDORSED_MASTER',
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
      status: 'REJECTED_SPAM',
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

/**
 * Initial grassroots draft submissions for instant demo and cross-device queue review
 */
export const INITIAL_DRAFT_SUBMISSIONS: OfflineDraftSubmission[] = [
  {
    id: 'draft-grassroots-rnc-01',
    timestamp: Date.now() - 3600000 * 4,
    syncStatus: 'SYNCED',
    status: 'REPORTED',
    masterLifecycleStatus: 'REPORTED',
    maskedCitizenId: 'Citizen #JH-8492',
    phoneHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isWhistleblower: false,
    audioDurationSeconds: 14,
    transcriptionDraft: 'चापाकल से लाल पानी आ रहा है और फ्लोराइड की गंध है। पूरे टोले के बच्चे पेट दर्द से ग्रसित हैं। तत्काल शुद्ध जल संयंत्र चाहिए।',
    lgdLocation: {
      state: 'Jharkhand',
      districtName: 'Ranchi',
      districtCode: 351,
      blockName: 'Kanke',
      blockCode: 3188,
      panchayatName: 'Arsande',
      panchayatCode: 114829,
      latitude: 23.4385,
      longitude: 85.3245,
    },
    rawCoordinates: {
      latitude: 23.4385,
      longitude: 85.3245,
      accuracyMeters: 8,
    },
    aiTriageCategory: 'Water Infrastructure / Contamination',
    intensityScore: 3,
  },
  {
    id: 'draft-grassroots-orm-02',
    timestamp: Date.now() - 3600000 * 18,
    syncStatus: 'SYNCED',
    status: 'AI_TRIAGED',
    masterLifecycleStatus: 'AI_TRIAGED',
    maskedCitizenId: 'Citizen #JH-3918',
    phoneHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    isWhistleblower: false,
    audioDurationSeconds: 22,
    transcriptionDraft: 'सब्जी उत्पादक किसानों के लिए कोल्ड स्टोरेज की कोई व्यवस्था नहीं है। टमाटर और हरी सब्जियां मंडी में सड़ जाती हैं। सौर ऊर्जा चालित सूक्ष्म शीतगृह की आवश्यकता है।',
    lgdLocation: {
      state: 'Jharkhand',
      districtName: 'Ranchi',
      districtCode: 351,
      blockName: 'Ormanjhi',
      blockCode: 3192,
      panchayatName: 'Chutupalu',
      panchayatCode: 114950,
      latitude: 23.512,
      longitude: 85.489,
    },
    rawCoordinates: {
      latitude: 23.512,
      longitude: 85.489,
      accuracyMeters: 12,
    },
    aiTriageCategory: 'Agricultural Cold Storage & Solar',
    intensityScore: 5,
  },
  {
    id: 'draft-grassroots-ang-03',
    timestamp: Date.now() - 3600000 * 72,
    syncStatus: 'SYNCED',
    status: 'ENDORSED_MASTER',
    masterLifecycleStatus: 'ENDORSED_MASTER',
    maskedCitizenId: 'Citizen #JH-7492',
    phoneHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    isWhistleblower: false,
    audioDurationSeconds: 16,
    transcriptionDraft: 'महुआ और वनोपज प्रसंस्करण हेतु ड्रायर एवं प्राथमिक मशीनरी उपलब्ध कराई जाए ताकि ग्रामीणों को उचित मूल्य मिल सके।',
    lgdLocation: {
      state: 'Jharkhand',
      districtName: 'Ranchi',
      districtCode: 351,
      blockName: 'Angara',
      blockCode: 3175,
      panchayatName: 'Nawatoli',
      panchayatCode: 114710,
      latitude: 23.385,
      longitude: 85.542,
    },
    rawCoordinates: {
      latitude: 23.385,
      longitude: 85.542,
      accuracyMeters: 6,
    },
    aiTriageCategory: 'Forest Produce Processing & Value Addition',
    intensityScore: 8,
    severity: 'HIGH',
    affectedHouseholdCount: 45,
    panchayatInspectorId: 'Panchayat #JH-BDO-12',
    panchayatInspectionNotes: 'स्थलीय निरीक्षण में पाया गया कि 45 वनवासी परिवारों की आजीविका महुआ प्रसंस्करण पर निर्भर है। राज्य तकनीकी विश्वविद्यालय से सौर ड्रायर मॉडल स्वीकृत कराने की अनुशंसा की जाती है।',
    panchayatEndorsedAt: Date.now() - 3600000 * 48,
  },
];

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

    // Auto-migrate legacy 30-30-40 seeded grants to statutory 30-40-30 model
    const existingGrants = await db.escrowGrants.toArray();
    for (const g of existingGrants) {
      if (
        g.tranches &&
        g.tranches.length >= 3 &&
        g.tranches[1].percentage === 30 &&
        g.tranches[2].percentage === 40
      ) {
        g.tranches[1].percentage = 40;
        g.tranches[1].amountINR = Math.round(g.totalCommittedINR * 0.4);
        g.tranches[2].percentage = 30;
        g.tranches[2].amountINR = Math.round(g.totalCommittedINR * 0.3);
        await db.escrowGrants.put(g);
      }
    }
  } catch (error) {
    console.error('Error seeding initial governance & capital data:', error);
  } finally {
    isSeedingGovernanceData = false;
  }
}

let isSeedingDraftData = false;

/**
 * Seeds initial grassroots submissions if draftSubmissions table is empty.
 * Ensures the Panchayat Verification Desk is instantly testable and demonstrable.
 */
export async function seedDraftSubmissionsIfEmpty(): Promise<void> {
  if (isSeedingDraftData) return;
  try {
    isSeedingDraftData = true;
    const count = await db.draftSubmissions.count();
    if (count === 0) {
      await db.draftSubmissions.bulkPut(INITIAL_DRAFT_SUBMISSIONS);
    }
  } catch (error) {
    console.error('Error seeding initial draft submissions:', error);
  } finally {
    isSeedingDraftData = false;
  }
}

// Hook into database ready lifecycle to ensure initial mock data is populated
db.on('ready', async () => {
  await seedDraftSubmissionsIfEmpty();
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
  mentorId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await db.transaction('rw', db.studentTeams, db.facultyMentors, async () => {
      const team = await db.studentTeams.get(teamId);
      if (!team) {
        return { success: false, message: 'Student team not found.' };
      }
      const targetMentorId = mentorId || team.assignedMentorId;
      if (!targetMentorId) {
        return { success: false, message: 'No mentor assigned to this proposal.' };
      }

      const mentor = await db.facultyMentors.get(targetMentorId);
      if (!mentor) {
        return { success: false, message: 'Faculty mentor not found.' };
      }
      if (mentor.activeProjectsCount >= FACULTY_MAX_ACTIVE_PROJECTS) {
        return {
          success: false,
          message: 'Faculty active capacity cap reached (Max 3 teams)',
        };
      }

      await db.facultyMentors.update(targetMentorId, {
        activeProjectsCount: mentor.activeProjectsCount + 1,
        pendingReviewQueueCount: Math.max(0, mentor.pendingReviewQueueCount - 1),
      });

      await db.studentTeams.update(teamId, {
        mentorStatus: 'APPROVED',
        assignedMentorId: targetMentorId,
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
  mentorId?: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await db.transaction('rw', db.studentTeams, db.facultyMentors, async () => {
      const team = await db.studentTeams.get(teamId);
      const targetMentorId = mentorId || team?.assignedMentorId;
      if (targetMentorId) {
        const mentor = await db.facultyMentors.get(targetMentorId);
        if (mentor) {
          await db.facultyMentors.update(targetMentorId, {
            pendingReviewQueueCount: Math.max(0, mentor.pendingReviewQueueCount - 1),
          });
        }
      }

      await db.studentTeams.update(teamId, {
        mentorStatus: 'REROUTED',
        assignedMentorId: undefined,
      });

      return {
        success: true,
        message: reason
          ? `Proposal declined (${reason}) and rerouted for alternate mentor selection.`
          : 'Proposal declined and rerouted for alternate mentor selection.',
      };
    });
  } catch (error) {
    return handleStorageError(error, 'declineTeamMentorship');
  }
}

/**
 * Automatically reroutes a stalled (7-day expired) student capstone proposal
 * to an alternate accredited faculty member with available active and review queue capacity.
 */
export async function autoRerouteTeamMentorship(
  teamId: string,
  currentMentorId?: string,
  preferredNextMentorId?: string
): Promise<{ success: boolean; message: string; newMentorId?: string }> {
  try {
    return await db.transaction('rw', db.studentTeams, db.facultyMentors, async () => {
      const team = await db.studentTeams.get(teamId);
      if (!team) {
        return { success: false, message: 'Student team not found.' };
      }

      const activeCurrentMentorId = currentMentorId || team.assignedMentorId;
      if (activeCurrentMentorId) {
        const currentMentor = await db.facultyMentors.get(activeCurrentMentorId);
        if (currentMentor) {
          await db.facultyMentors.update(activeCurrentMentorId, {
            pendingReviewQueueCount: Math.max(0, currentMentor.pendingReviewQueueCount - 1),
          });
        }
      }

      // Find suitable alternative faculty mentor
      let nextMentor: FacultyMentorProfile | undefined;
      if (preferredNextMentorId && preferredNextMentorId !== activeCurrentMentorId) {
        nextMentor = await db.facultyMentors.get(preferredNextMentorId);
      }
      if (
        !nextMentor ||
        nextMentor.activeProjectsCount >= FACULTY_MAX_ACTIVE_PROJECTS ||
        nextMentor.pendingReviewQueueCount >= FACULTY_MAX_PENDING_QUEUE
      ) {
        const allMentors = await db.facultyMentors.toArray();
        nextMentor = allMentors.find(
          (m) =>
            m.id !== activeCurrentMentorId &&
            m.activeProjectsCount < FACULTY_MAX_ACTIVE_PROJECTS &&
            m.pendingReviewQueueCount < FACULTY_MAX_PENDING_QUEUE
        );
      }

      if (nextMentor) {
        await db.facultyMentors.update(nextMentor.id, {
          pendingReviewQueueCount: nextMentor.pendingReviewQueueCount + 1,
        });

        const rerouteTimestamp = Date.now();
        await db.studentTeams.update(teamId, {
          assignedMentorId: nextMentor.id,
          mentorStatus: 'PENDING_APPROVAL',
          mentorRequestTimestamp: rerouteTimestamp,
        });

        return {
          success: true,
          message: `Stalled proposal auto-rerouted to alternate mentor ${nextMentor.name} (${nextMentor.institution}).`,
          newMentorId: nextMentor.id,
        };
      } else {
        // No alternate mentor with available capacity; reset to REROUTED for open catalog selection
        await db.studentTeams.update(teamId, {
          assignedMentorId: undefined,
          mentorStatus: 'REROUTED',
        });
        return {
          success: true,
          message: 'Proposal rerouted back to solver pool for manual re-assignment (all faculty currently at capacity).',
        };
      }
    });
  } catch (error) {
    return handleStorageError(error, 'autoRerouteTeamMentorship');
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
        status: 'LOCKED',
        deliverableDescription: 'BOM Procurement & Sand/Iron Media Architecture validation under ₹2,500 budget limit.',
        deliverableProofUrl: 'https://udbhav.jharkhand.gov.in/proofs/bom-receipts-t1.pdf',
      },
      {
        stage: 'TRANCHE_2_LAB',
        percentage: 40,
        amountINR: 60000,
        status: 'LOCKED',
        deliverableDescription: 'Lab bench prototyping & WHO arsenic filtration benchmark validation (<0.01 mg/L).',
        deliverableProofUrl: 'https://udbhav.jharkhand.gov.in/proofs/lab-telemetry-test-report.pdf',
      },
      {
        stage: 'TRANCHE_3_FIELD',
        percentage: 30,
        amountINR: 45000,
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
 * Initial summary metrics across all 24 official Jharkhand districts
 */
export const INITIAL_DISTRICT_GIS_METRICS: DistrictGISSummary[] = [
  // Santhal Pargana Division
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
    districtCode: 3406,
    districtName: 'Deoghar',
    totalIssuesReported: 22,
    endorsedMasterCount: 17,
    activeCapstonesCount: 5,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 16,
  },
  {
    districtCode: 3407,
    districtName: 'Godda',
    totalIssuesReported: 18,
    endorsedMasterCount: 13,
    activeCapstonesCount: 4,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 21,
  },
  {
    districtCode: 3410,
    districtName: 'Sahibganj',
    totalIssuesReported: 26,
    endorsedMasterCount: 19,
    activeCapstonesCount: 6,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 24,
  },
  {
    districtCode: 3409,
    districtName: 'Pakur',
    totalIssuesReported: 16,
    endorsedMasterCount: 11,
    activeCapstonesCount: 3,
    verifiedDeploymentsCount: 1,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 19,
  },
  {
    districtCode: 3408,
    districtName: 'Jamtara',
    totalIssuesReported: 15,
    endorsedMasterCount: 12,
    activeCapstonesCount: 3,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'LOW',
    averageResolutionDays: 13,
  },

  // North Chotanagpur Division
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
    districtCode: 3411,
    districtName: 'Bokaro',
    totalIssuesReported: 31,
    endorsedMasterCount: 25,
    activeCapstonesCount: 8,
    verifiedDeploymentsCount: 5,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 17,
  },
  {
    districtCode: 3413,
    districtName: 'Giridih',
    totalIssuesReported: 29,
    endorsedMasterCount: 21,
    activeCapstonesCount: 7,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 20,
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
  {
    districtCode: 3414,
    districtName: 'Koderma',
    totalIssuesReported: 14,
    endorsedMasterCount: 10,
    activeCapstonesCount: 3,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'LOW',
    averageResolutionDays: 12,
  },
  {
    districtCode: 3412,
    districtName: 'Chatra',
    totalIssuesReported: 23,
    endorsedMasterCount: 16,
    activeCapstonesCount: 5,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 22,
  },
  {
    districtCode: 3415,
    districtName: 'Ramgarh',
    totalIssuesReported: 19,
    endorsedMasterCount: 15,
    activeCapstonesCount: 4,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'LOW',
    averageResolutionDays: 11,
  },

  // South Chotanagpur Division
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
    districtCode: 3418,
    districtName: 'Lohardaga',
    totalIssuesReported: 13,
    endorsedMasterCount: 10,
    activeCapstonesCount: 3,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'LOW',
    averageResolutionDays: 13,
  },
  {
    districtCode: 3416,
    districtName: 'Gumla',
    totalIssuesReported: 25,
    endorsedMasterCount: 18,
    activeCapstonesCount: 5,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 23,
  },
  {
    districtCode: 3419,
    districtName: 'Simdega',
    totalIssuesReported: 17,
    endorsedMasterCount: 12,
    activeCapstonesCount: 4,
    verifiedDeploymentsCount: 1,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 19,
  },
  {
    districtCode: 3417,
    districtName: 'Khunti',
    totalIssuesReported: 21,
    endorsedMasterCount: 15,
    activeCapstonesCount: 5,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 16,
  },

  // Kolhan Division
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
    districtCode: 3421,
    districtName: 'Saraikela-Kharsawan',
    totalIssuesReported: 20,
    endorsedMasterCount: 16,
    activeCapstonesCount: 5,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'LOW',
    averageResolutionDays: 14,
  },
  {
    districtCode: 3420,
    districtName: 'West Singhbhum',
    totalIssuesReported: 33,
    endorsedMasterCount: 22,
    activeCapstonesCount: 7,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'ACUTE',
    averageResolutionDays: 27,
  },

  // Palamu Division
  {
    districtCode: 3424,
    districtName: 'Palamu',
    totalIssuesReported: 35,
    endorsedMasterCount: 24,
    activeCapstonesCount: 7,
    verifiedDeploymentsCount: 3,
    distressIntensityLevel: 'ACUTE',
    averageResolutionDays: 25,
  },
  {
    districtCode: 3422,
    districtName: 'Garhwa',
    totalIssuesReported: 28,
    endorsedMasterCount: 19,
    activeCapstonesCount: 6,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'HIGH',
    averageResolutionDays: 24,
  },
  {
    districtCode: 3423,
    districtName: 'Latehar',
    totalIssuesReported: 24,
    endorsedMasterCount: 17,
    activeCapstonesCount: 5,
    verifiedDeploymentsCount: 2,
    distressIntensityLevel: 'MEDIUM',
    averageResolutionDays: 18,
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
 * - Tranche 1 (BOM): Requires FACULTY sign-off (30%).
 * - Tranche 2 (LAB): Requires FACULTY sign-off with verified telemetry proof URL (40%).
 * - Tranche 3 (FIELD): Requires BOTH FACULTY and GOVT sign-offs before disbursement (30%).
 * 
 * Supports both:
 * 1. updateTrancheStatus(grantId, trancheIndex, updateData)
 * 2. updateTrancheStatus(grantId, stage, status, signoffRole, rejectionReason?, signatoryName?, deliverableProofUrl?)
 */
export async function updateTrancheStatus(
  grantId: string,
  trancheIndex: number,
  updateData: Partial<MilestoneTranche>
): Promise<void>;
export async function updateTrancheStatus(
  grantId: string,
  stage: TrancheStage,
  status: EscrowStatus,
  signoffRole?: 'FACULTY' | 'GOVT' | 'PANCHAYAT' | 'INDUSTRY_CSR',
  rejectionReason?: string,
  signatoryName?: string,
  deliverableProofUrl?: string
): Promise<void>;
export async function updateTrancheStatus(
  grantId: string,
  trancheIndexOrStage: number | TrancheStage,
  updateDataOrStatus: Partial<MilestoneTranche> | EscrowStatus,
  signoffRole?: 'FACULTY' | 'GOVT' | 'PANCHAYAT' | 'INDUSTRY_CSR',
  rejectionReason?: string,
  signatoryName?: string,
  deliverableProofUrl?: string
): Promise<void> {
  try {
    await seedGovernanceDataIfEmpty();

    const grant = await db.escrowGrants.get(grantId);
    if (!grant) {
      throw new Error(`Escrow grant with ID "${grantId}" was not found.`);
    }

    if (typeof trancheIndexOrStage === 'number') {
      const trancheIndex = trancheIndexOrStage;
      if (trancheIndex < 0 || trancheIndex >= grant.tranches.length) {
        throw new Error(`Tranche index ${trancheIndex} out of bounds on grant "${grantId}".`);
      }

      const updateData = typeof updateDataOrStatus === 'object'
        ? updateDataOrStatus
        : { status: updateDataOrStatus as EscrowStatus };

      const tranche = { ...grant.tranches[trancheIndex], ...updateData };
      const now = Date.now();

      if (updateData.status === 'DISBURSED' && !tranche.disbursedAt) {
        tranche.disbursedAt = now;
      }
      if (updateData.telemetryUrl && !tranche.deliverableProofUrl) {
        tranche.deliverableProofUrl = updateData.telemetryUrl;
      }

      grant.tranches[trancheIndex] = tranche;
      await db.escrowGrants.put(grant);
      return;
    }

    const stage = trancheIndexOrStage;
    const status = updateDataOrStatus as EscrowStatus;
    const trancheIndex = grant.tranches.findIndex((t) => t.stage === stage);
    if (trancheIndex === -1) {
      throw new Error(`Tranche stage "${stage}" not found on grant "${grantId}".`);
    }

    const tranche = { ...grant.tranches[trancheIndex] };
    const now = Date.now();

    if (deliverableProofUrl && deliverableProofUrl.trim()) {
      tranche.deliverableProofUrl = deliverableProofUrl.trim();
      tranche.telemetryUrl = deliverableProofUrl.trim();
    }

    // Check Dispute Flagging by Industry / Sponsor
    if (status === 'DISPUTED') {
      tranche.status = 'DISPUTED';
      if (rejectionReason) {
        tranche.rejectionReason = rejectionReason;
      }
    } else if (stage === 'TRANCHE_1_BOM') {
      // Enforce Role & Proof Constraints per Stage
      if (signoffRole && signoffRole !== 'FACULTY') {
        throw new Error('Guardrail Violation: Tranche 1 (BOM) requires Faculty Mentor sign-off.');
      }
      tranche.facultySignoffAt = now;
      if (signatoryName) tranche.facultySignoffBy = signatoryName;
      tranche.status = status;
      if (status === 'DISBURSED') {
        tranche.disbursedAt = now;
      }
    } else if (stage === 'TRANCHE_2_LAB') {
      if (signoffRole && signoffRole !== 'FACULTY') {
        throw new Error('Guardrail Violation: Tranche 2 (Lab Bench) requires Faculty Mentor sign-off.');
      }
      if (!tranche.deliverableProofUrl || tranche.deliverableProofUrl.trim() === '') {
        throw new Error(
          'Guardrail Violation: Tranche 2 requires verified telemetry proof URL before faculty sign-off.'
        );
      }
      tranche.facultySignoffAt = now;
      if (signatoryName) tranche.facultySignoffBy = signatoryName;
      tranche.status = status;
      if (status === 'DISBURSED') {
        tranche.disbursedAt = now;
      }
    } else if (stage === 'TRANCHE_3_FIELD') {
      if (signoffRole === 'FACULTY') {
        tranche.facultySignoffAt = now;
        if (signatoryName) tranche.facultySignoffBy = signatoryName;
      } else if (signoffRole === 'PANCHAYAT' || signoffRole === 'GOVT') {
        tranche.panchayatSignoffAt = now;
        tranche.govtSignoffAt = now;
        if (signatoryName) {
          tranche.panchayatSignoffBy = signatoryName;
          tranche.govtSignoffBy = signatoryName;
        }
      }

      // Tranche 3 requires both FACULTY and PANCHAYAT/GOVT approvals to transition to APPROVED or DISBURSED
      const hasDualSignoffs = Boolean(
        tranche.facultySignoffAt && (tranche.panchayatSignoffAt || tranche.govtSignoffAt)
      );
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
 * Retrieves a safety validation record by associated Master Issue ID.
 */
export async function getSafetyValidationByMasterIssueId(masterIssueId: string): Promise<SafetyValidation | undefined> {
  try {
    await seedGovernanceDataIfEmpty();
    return await db.safetyValidations.where('masterIssueId').equals(masterIssueId).first();
  } catch (error) {
    return handleStorageError(error, 'getSafetyValidationByMasterIssueId');
  }
}

/**
 * Signs off on Tier 1 Academic Lab Bench clearance by Faculty Supervisor / HOD.
 */
export async function signTier1Safety(
  validationId: string,
  telemetryUrlOrHODName: string,
  facultyIdOrTelemetryUrl: string,
  facultyId?: string
): Promise<void> {
  try {
    await seedGovernanceDataIfEmpty();

    const record = await db.safetyValidations.get(validationId);
    if (!record) {
      throw new Error(`Safety validation record with ID "${validationId}" was not found.`);
    }

    let hodName = telemetryUrlOrHODName;
    let telemetryReportUrl = facultyIdOrTelemetryUrl;
    if (telemetryUrlOrHODName.startsWith('http') || telemetryUrlOrHODName.startsWith('/')) {
      telemetryReportUrl = telemetryUrlOrHODName;
      hodName = facultyIdOrTelemetryUrl || 'Faculty Supervisor';
    } else if (facultyId) {
      hodName = `${telemetryUrlOrHODName} (${facultyId})`;
      telemetryReportUrl = facultyIdOrTelemetryUrl;
    }

    const now = Date.now();
    await db.safetyValidations.update(validationId, {
      tier1FacultyPassed: true,
      tier1HODName: hodName,
      tier1TelemetryReportUrl: telemetryReportUrl,
      tier1SignedAt: now,
    });

    // Broadcast state transitions across centralSyncService (Task 7.2)
    try {
      import('../services/centralSyncService').then(({ centralSyncService }) => {
        centralSyncService.publish('RECORD_UPDATED', { type: 'SAFETY_TIER1_SIGNED', validationId });
      });
    } catch {
      // Non-blocking sync broadcast
    }
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
  certificateUrl?: string,
  _evaluatorId?: string
): Promise<string> {
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

    // Broadcast state transitions across centralSyncService (Task 7.2)
    try {
      import('../services/centralSyncService').then(({ centralSyncService }) => {
        centralSyncService.publish('SAFETY_GATE_CLEARED', { validationId, permitToken: dcPermitQR });
      });
    } catch {
      // Non-blocking sync broadcast
    }

    return dcPermitQR;
  } catch (error) {
    handleStorageError(error, 'certifyTier2Safety');
    return `JH-DC-PILOT-PERMIT-2026-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  }
}

/**
 * Retrieves district GIS summary metrics across Jharkhand districts for spatial telemetry.
 * Dynamically aggregates metrics across masterIssues (draftSubmissions), projectTeams (studentTeams),
 * and safetyValidations, with fallback to seeded district fixtures if the database is newly initialized.
 */
export async function getDistrictGISMetrics(): Promise<DistrictGISSummary[]> {
  try {
    await seedGovernanceDataIfEmpty();

    const [storedDistricts, allIssues, allBriefs, allTeams, allSafety] = await Promise.all([
      db.districtGISMetrics.toArray(),
      db.draftSubmissions.toArray(),
      db.engineeringBriefs.toArray(),
      db.studentTeams.toArray(),
      db.safetyValidations.toArray(),
    ]);

    // Build lookup maps linking issues and briefs to districts
    const issueToDistrictMap = new Map<string, string>();
    allIssues.forEach((issue) => {
      const dist = issue.lgdLocation?.districtName?.trim().toLowerCase();
      if (dist) {
        issueToDistrictMap.set(issue.id, dist);
        if (issue.remoteMasterIssueId) {
          issueToDistrictMap.set(issue.remoteMasterIssueId, dist);
        }
      }
    });

    const briefToDistrictMap = new Map<string, string>();
    allBriefs.forEach((brief) => {
      const dist = issueToDistrictMap.get(brief.masterIssueId);
      if (dist) {
        briefToDistrictMap.set(brief.id, dist);
      }
    });

    // Baseline fixtures for all 24 districts
    const baselineList = INITIAL_DISTRICT_GIS_METRICS;

    const aggregated: DistrictGISSummary[] = baselineList.map((fixture) => {
      const normalizedName = fixture.districtName.toLowerCase().replace(/[^a-z]/g, '');

      // Dynamic issues from db.draftSubmissions
      const matchingIssues = allIssues.filter((issue) => {
        const issueDistName = issue.lgdLocation?.districtName?.toLowerCase().replace(/[^a-z]/g, '') || '';
        return (
          issueDistName.includes(normalizedName) ||
          normalizedName.includes(issueDistName) ||
          issue.lgdLocation?.districtCode === fixture.districtCode
        );
      });

      const dynamicTotal = matchingIssues.length;
      const dynamicEndorsed = matchingIssues.filter(
        (i) => Boolean(i.panchayatEndorsedAt || i.masterLifecycleStatus === 'ENDORSED_MASTER' || i.status === 'ENDORSED_MASTER')
      ).length;

      // Dynamic teams from db.studentTeams
      const matchingTeams = allTeams.filter((team) => {
        const teamDist = briefToDistrictMap.get(team.briefId) || '';
        const normDist = teamDist.replace(/[^a-z]/g, '');
        return normDist && (normDist.includes(normalizedName) || normalizedName.includes(normDist));
      });

      // Dynamic safety validations from db.safetyValidations
      const matchingSafety = allSafety.filter((val) => {
        const valDist = issueToDistrictMap.get(val.masterIssueId) || '';
        const normDist = valDist.replace(/[^a-z]/g, '');
        return val.isPublicPilotCleared && normDist && (normDist.includes(normalizedName) || normalizedName.includes(normDist));
      });

      // Stored record from DB if present
      const stored = storedDistricts.find(
        (s) => s.districtCode === fixture.districtCode || s.districtName.toLowerCase().replace(/[^a-z]/g, '') === normalizedName
      );

      const totalIssues = dynamicTotal > 0 ? (fixture.totalIssuesReported + dynamicTotal) : (stored?.totalIssuesReported ?? fixture.totalIssuesReported);
      const endorsedCount = dynamicEndorsed > 0 ? (fixture.endorsedMasterCount + dynamicEndorsed) : (stored?.endorsedMasterCount ?? fixture.endorsedMasterCount);
      const activeCapstones = matchingTeams.length > 0 ? (fixture.activeCapstonesCount + matchingTeams.length) : (stored?.activeCapstonesCount ?? fixture.activeCapstonesCount);
      const verifiedDeployments = matchingSafety.length > 0 ? (fixture.verifiedDeploymentsCount + matchingSafety.length) : (stored?.verifiedDeploymentsCount ?? fixture.verifiedDeploymentsCount);

      // Recalculate distress intensity based on issue load
      let distressLevel: DistressIntensityLevel = fixture.distressIntensityLevel;
      if (totalIssues >= 35) {
        distressLevel = 'ACUTE';
      } else if (totalIssues >= 25) {
        distressLevel = 'HIGH';
      } else if (totalIssues >= 18) {
        distressLevel = 'MEDIUM';
      } else {
        distressLevel = 'LOW';
      }

      return {
        districtCode: fixture.districtCode,
        districtName: fixture.districtName,
        totalIssuesReported: totalIssues,
        endorsedMasterCount: endorsedCount,
        activeCapstonesCount: activeCapstones,
        verifiedDeploymentsCount: verifiedDeployments,
        distressIntensityLevel: distressLevel,
        averageResolutionDays: stored?.averageResolutionDays ?? fixture.averageResolutionDays,
      };
    });

    return aggregated;
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


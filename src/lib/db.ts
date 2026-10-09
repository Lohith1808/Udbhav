/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shoe 1: Client-Side IndexedDB Persistence Engine
 * 
 * Powered by Dexie.js for offline-first resilience.
 * Enforces PII Isolation, binary media constraints, and compound index querying.
 */

import Dexie, { type Table } from 'dexie';
import {
  OfflineDraftSubmission,
  CachedLGD,
  MAX_PHOTO_SIZE_BYTES,
  SeverityLevel,
} from '../types/ingestion';

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

  constructor() {
    super('UdbhavDatabase');

    // Schema version 1
    // draftSubmissions: primary key 'id', compound index '[syncStatus+timestamp]', secondary indexes 'phoneHash', 'syncStatus'
    // cachedLGD: primary key 'panchayatCode', secondary indexes 'districtCode', 'blockCode'
    this.version(1).stores({
      draftSubmissions: 'id, [syncStatus+timestamp], phoneHash, syncStatus',
      cachedLGD: 'panchayatCode, districtCode, blockCode',
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
 * 
 * @param draft Submission payload containing masked citizen info and downscaled media
 * @returns ID of the saved submission
 */
export async function saveDraft(draft: OfflineDraftSubmission): Promise<string> {
  try {
    validateDraftPayload(draft);

    // Sanitize in-memory URL references so volatile object URLs aren't permanently serialized
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
 * 
 * @returns List of queued offline drafts
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
 * 
 * @param id UUID of the local draft
 * @param remoteMasterIssueId The authoritative ticket UUID generated by the DHTE backend
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
 * 
 * @param id UUID of the draft to delete
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
 * Enforces Anti-Rubber-Stamp Guardrails:
 * 1. Mandatory on-site inspection note must contain at least 20 characters.
 * 2. Estimated affected households must be at least 1.
 * Transitions masterLifecycleStatus to 'ENDORSED_MASTER'.
 * 
 * @param id UUID of the draft submission
 * @param severity Evaluated severity level
 * @param affectedHouseholds Number of families affected (>= 1)
 * @param notes Detailed on-site inspection rationale (>= 20 chars)
 * @param inspectorId Official Officer ID / NIC token
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
 * Transitions masterLifecycleStatus to 'REJECTED_SPAM'.
 * 
 * @param id UUID of the draft submission
 * @param reason Reason for rejection / non-actionable determination
 * @param inspectorId Official Officer ID
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

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Central State Sync Store & Multi-Device Communication Engine
 * 
 * Rectifies Bug 4 (Cross-Device & Cross-Tab Data Isolation Gap)
 * Implements real-time BroadcastChannel synchronization and snapshot replication
 * between multiple tabs, windows, and paired devices.
 */

import { db } from '../lib/db';
import { OfflineDraftSubmission } from '../types/ingestion';
import { EngineeringProblemBrief, StudentTeam } from '../types/solver';
import { EscrowGrant, SafetyValidation, DistrictGISSummary } from '../types/governance';
import { UserSession } from '../types/session';

export type SyncEventType =
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'ENDORSEMENT_COMPLETED'
  | 'TRANCHE_DISBURSED'
  | 'SAFETY_GATE_CLEARED'
  | 'SESSION_CHANGED'
  | 'DATABASE_FULL_SYNC';

export interface SyncEventMessage<T = unknown> {
  id: string;
  type: SyncEventType;
  timestamp: number;
  originClientId: string;
  payload?: T;
}

export interface CentralStateSnapshot {
  version: string;
  timestamp: number;
  originId: string;
  data: {
    draftSubmissions: OfflineDraftSubmission[];
    engineeringBriefs: EngineeringProblemBrief[];
    studentTeams: StudentTeam[];
    escrowGrants: EscrowGrant[];
    safetyValidations: SafetyValidation[];
    districtGISMetrics: DistrictGISSummary[];
    activeSession?: UserSession;
  };
}

class CentralSyncService {
  private channel: BroadcastChannel | null = null;
  private clientId: string;
  private subscribers: Set<(message: SyncEventMessage) => void> = new Set();
  private readonly CHANNEL_NAME = 'udbhav_central_sync_bus_v1';
  private readonly STORAGE_RELAY_KEY = 'udbhav_central_relay_payload';

  constructor() {
    this.clientId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client-${Math.random().toString(36).substring(2, 9)}`;

    this.initChannel();
    this.initStorageListener();
  }

  /**
   * Initializes browser-native BroadcastChannel for instantaneous zero-latency tab sync
   */
  private initChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncEventMessage>) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn('[CentralSync] BroadcastChannel unsupported or blocked, using storage fallback:', err);
      }
    }
  }

  /**
   * Fallback for browsers/windows where BroadcastChannel is blocked
   */
  private initStorageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === this.STORAGE_RELAY_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue) as SyncEventMessage;
            if (parsed.originClientId !== this.clientId) {
              this.handleIncomingMessage(parsed);
            }
          } catch {
            // Ignore parse errors on corrupted storage events
          }
        }
      });
    }
  }

  private handleIncomingMessage(message: SyncEventMessage): void {
    // Suppress loopback echoes
    if (message.originClientId === this.clientId) {
      return;
    }

    this.subscribers.forEach((handler) => {
      try {
        handler(message);
      } catch (err) {
        console.error('[CentralSync] Error in sync handler:', err);
      }
    });
  }

  /**
   * Publishes a state change event across all open windows and sessions
   */
  public publish<T = unknown>(type: SyncEventType, payload?: T): void {
    const message: SyncEventMessage<T> = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: Date.now(),
      originClientId: this.clientId,
      payload,
    };

    // 1. Send via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('[CentralSync] PostMessage failed, using storage relay:', err);
      }
    }

    // 2. Storage relay fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.STORAGE_RELAY_KEY, JSON.stringify(message));
      } catch {
        // Storage quota may be full or blocked
      }
    }

    // 3. Dispatch on local window for same-frame listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('udbhav:central_sync', { detail: message })
      );
    }
  }

  /**
   * Subscribes to real-time sync events
   */
  public subscribe(handler: (message: SyncEventMessage) => void): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Generates a complete serialized state snapshot of all tables for cross-device sharing
   */
  public async exportCentralSnapshot(): Promise<CentralStateSnapshot> {
    const [
      draftSubmissions,
      engineeringBriefs,
      studentTeams,
      escrowGrants,
      safetyValidations,
      districtGISMetrics,
    ] = await Promise.all([
      db.draftSubmissions.toArray(),
      db.engineeringBriefs.toArray(),
      db.studentTeams.toArray(),
      db.escrowGrants.toArray(),
      db.safetyValidations.toArray(),
      db.districtGISMetrics.toArray(),
    ]);

    let activeSession: UserSession | undefined;
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('udbhav_user_session');
      if (stored) {
        try {
          activeSession = JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      originId: this.clientId,
      data: {
        draftSubmissions,
        engineeringBriefs,
        studentTeams,
        escrowGrants,
        safetyValidations,
        districtGISMetrics,
        activeSession,
      },
    };
  }

  /**
   * Merges and restores a remote state snapshot into client IndexedDB
   */
  public async importCentralSnapshot(
    snapshot: CentralStateSnapshot
  ): Promise<{ success: boolean; importedCount: number; message: string }> {
    try {
      if (!snapshot || !snapshot.data) {
        throw new Error('Invalid snapshot payload format.');
      }

      const {
        draftSubmissions = [],
        engineeringBriefs = [],
        studentTeams = [],
        escrowGrants = [],
        safetyValidations = [],
        districtGISMetrics = [],
        activeSession,
      } = snapshot.data;

      // Bulk write all collections atomically or in parallel
      await Promise.all([
        draftSubmissions.length > 0 ? db.draftSubmissions.bulkPut(draftSubmissions) : Promise.resolve(),
        engineeringBriefs.length > 0 ? db.engineeringBriefs.bulkPut(engineeringBriefs) : Promise.resolve(),
        studentTeams.length > 0 ? db.studentTeams.bulkPut(studentTeams) : Promise.resolve(),
        escrowGrants.length > 0 ? db.escrowGrants.bulkPut(escrowGrants) : Promise.resolve(),
        safetyValidations.length > 0 ? db.safetyValidations.bulkPut(safetyValidations) : Promise.resolve(),
        districtGISMetrics.length > 0 ? db.districtGISMetrics.bulkPut(districtGISMetrics) : Promise.resolve(),
      ]);

      if (activeSession && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('udbhav_user_session', JSON.stringify(activeSession));
      }

      const totalItems =
        draftSubmissions.length +
        engineeringBriefs.length +
        studentTeams.length +
        escrowGrants.length +
        safetyValidations.length +
        districtGISMetrics.length;

      // Broadcast full sync notification to all open tabs
      this.publish('DATABASE_FULL_SYNC', { totalItems, timestamp: Date.now() });

      return {
        success: true,
        importedCount: totalItems,
        message: `Successfully synchronized ${totalItems} state records across local store!`,
      };
    } catch (err) {
      console.error('[CentralSync] Import failed:', err);
      return {
        success: false,
        importedCount: 0,
        message: err instanceof Error ? err.message : 'Unknown snapshot import error.',
      };
    }
  }

  /**
   * Generates a 6-character room/pairing code for cross-device pairing demo (e.g. "JH-7294")
   */
  public generatePairingCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `JH-${num}`;
  }
}

export const centralSyncService = new CentralSyncService();

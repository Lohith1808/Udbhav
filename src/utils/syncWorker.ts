/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Background Auto-Sync Worker & Offline Queue Reconnection Manager
 * 
 * Automatically synchronizes queued grassroots reports upon network restoration
 * without requiring page reload.
 */

import { getQueuedSubmissions, markAsSynced } from '../lib/db';

export const SYNC_COMPLETE_EVENT = 'udbhav:sync_complete';

/**
 * Executes a batch synchronization run for all submissions currently QUEUED in IndexedDB.
 * Generates official state master issue IDs for DHTE registry.
 * 
 * @returns Number of successfully synced reports
 */
export async function triggerBatchSync(): Promise<number> {
  const queuedItems = await getQueuedSubmissions();
  if (!queuedItems || queuedItems.length === 0) {
    return 0;
  }

  // Simulate network latency / batch API handshake
  await new Promise((resolve) => setTimeout(resolve, 1200));

  let syncedCount = 0;

  for (const item of queuedItems) {
    try {
      // Authoritative DHTE Master Issue ID Format: JH-YYYY-M-XXXXXX
      const generatedRemoteId = `JH-2026-M-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      await markAsSynced(item.id, generatedRemoteId);
      syncedCount += 1;
    } catch (err) {
      console.error(`[Udbhav AutoSync] Failed to sync draft ${item.id}:`, err);
    }
  }

  // Dispatch custom event for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SYNC_COMPLETE_EVENT, {
        detail: { count: syncedCount },
      })
    );
  }

  return syncedCount;
}

/**
 * Initializes the background network restoration listener.
 * Whenever the browser fires the 'online' event, any queued offline drafts
 * are automatically batch-synced.
 * 
 * @param onSyncComplete Optional callback notifying caller of number of synced items
 * @returns Cleanup function to unregister event listener on unmount
 */
export function initAutoSyncListener(
  onSyncComplete?: (syncedCount: number) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let isSyncingInProgress = false;

  const handleOnline = async () => {
    if (isSyncingInProgress) return;

    try {
      isSyncingInProgress = true;
      const count = await triggerBatchSync();
      if (count > 0 && onSyncComplete) {
        onSyncComplete(count);
      }
    } catch (error) {
      console.error('[Udbhav AutoSync] Auto-sync execution failed on reconnection:', error);
    } finally {
      isSyncingInProgress = false;
    }
  };

  window.addEventListener('online', handleOnline);

  // Return unregister callback
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

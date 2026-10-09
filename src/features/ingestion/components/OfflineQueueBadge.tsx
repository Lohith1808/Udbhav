/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shoe 1: Grassroots Ingestion - Offline Queue & Network Status Badge
 * 
 * Reactive badge listening to Dexie IndexedDB live queries and browser network telemetry.
 * Strictly styled using Udbhav Tailwind tokens without external heavyweight UI libraries.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import {
  WifiOff,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  HardDriveDownload,
} from 'lucide-react';

export interface OfflineQueueBadgeProps {
  /** Optional custom CSS classes for custom positioning */
  className?: string;
  /** Explicit sync progress state override (e.g. during active background sync) */
  isSyncing?: boolean;
  /** Optional callback to trigger manual or automated batch synchronization */
  onSyncTrigger?: () => Promise<void> | void;
  /** Whether to render in minimal icon-only badge format */
  compact?: boolean;
}

export const OfflineQueueBadge: React.FC<OfflineQueueBadgeProps> = ({
  className = '',
  isSyncing: externalIsSyncing,
  onSyncTrigger,
  compact = false,
}) => {
  // Reactive network state
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  // Local sync state for inline trigger
  const [internalSyncing, setInternalSyncing] = useState<boolean>(false);
  const isSyncing = externalIsSyncing || internalSyncing;

  // Track potential IndexedDB access errors (e.g. private browsing restrictions)
  const [dbError, setDbError] = useState<string | null>(null);

  // Reactive Dexie query for pending submissions where syncStatus === 'QUEUED'
  const queuedSubmissions = useLiveQuery(
    async () => {
      try {
        setDbError(null);
        return await db.draftSubmissions.where('syncStatus').equals('QUEUED').toArray();
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Local storage access restricted or quota exceeded.';
        console.error('[Udbhav DB] Error reading queued submissions:', err);
        setDbError(errorMsg);
        return [];
      }
    },
    [],
    [] // Default fallback array
  );

  const queuedCount = queuedSubmissions ? queuedSubmissions.length : 0;

  // Dynamic network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync handler
  const handleTriggerSync = useCallback(async () => {
    if (!isOnline || isSyncing || queuedCount === 0 || !onSyncTrigger) return;
    try {
      setInternalSyncing(true);
      await onSyncTrigger();
    } catch (err) {
      console.error('[Udbhav Sync] Manual sync failed:', err);
    } finally {
      setInternalSyncing(false);
    }
  }, [isOnline, isSyncing, queuedCount, onSyncTrigger]);

  // Private browsing / storage error fallback
  if (dbError) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-warning/15 border border-brand-warning/30 text-brand-warning shadow-sm ${className}`}
        title={`Storage issue: ${dbError}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-brand-warning shrink-0" aria-hidden="true" />
        <span>Storage restricted (Private browsing)</span>
      </div>
    );
  }

  // 1. Syncing state ("Syncing grassroots data..." with subtle spinner using brand-accent)
  if (isSyncing) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-accent/10 border border-brand-accent/30 text-brand-accent shadow-sm animate-pulse ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-accent shrink-0" aria-hidden="true" />
        {compact ? (
          <span>Syncing...</span>
        ) : (
          <span>Syncing grassroots data...</span>
        )}
      </div>
    );
  }

  // 2. Offline states
  if (!isOnline) {
    if (queuedCount > 0) {
      // Offline + Drafts Waiting: Warns "Offline - X reports saved on device" with brand-warning chip
      const reportLabel = queuedCount === 1 ? 'report' : 'reports';
      return (
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-warning/15 border border-brand-warning/40 text-brand-warning shadow-sm ${className}`}
          title="Internet connection unavailable. Submissions will be uploaded when connection is restored."
        >
          <WifiOff className="w-3.5 h-3.5 text-brand-warning shrink-0" aria-hidden="true" />
          {compact ? (
            <span>Offline ({queuedCount})</span>
          ) : (
            <span>Offline &mdash; {queuedCount} {reportLabel} saved on device</span>
          )}
        </div>
      );
    }

    // Offline + 0 Drafts Waiting
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-canvas border border-brand-border text-brand-slate/70 shadow-sm ${className}`}
      >
        <WifiOff className="w-3.5 h-3.5 text-brand-slate/50 shrink-0" aria-hidden="true" />
        {compact ? (
          <span>Offline</span>
        ) : (
          <span>Offline &mdash; Reports will save to device</span>
        )}
      </div>
    );
  }

  // 3. Online states
  // Online + Drafts Waiting in queue
  if (queuedCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-focus/10 border border-brand-focus/30 text-brand-focus shadow-sm ${className}`}
      >
        <HardDriveDownload className="w-3.5 h-3.5 text-brand-focus shrink-0" aria-hidden="true" />
        <span>
          {queuedCount} {queuedCount === 1 ? 'report' : 'reports'} queued for sync
        </span>
        {onSyncTrigger && (
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-focus text-white hover:bg-brand-focus/90 active:scale-95 transition-all text-[11px] font-medium"
            title="Upload queued reports now"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Sync</span>
          </button>
        )}
      </div>
    );
  }

  // Online + Synced: Subtle indicator with brand-verified dot
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-card border border-brand-border text-brand-slate shadow-sm hover:border-brand-verified/40 transition-colors ${className}`}
      title="System is connected and all local submissions are synced to the central database."
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-verified opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-verified"></span>
      </span>
      {compact ? (
        <span className="text-brand-slate font-medium">Synced</span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-brand-slate">
          <span>Online</span>
          <span className="text-brand-slate/40">&bull;</span>
          <span className="text-brand-verified font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-brand-verified" aria-hidden="true" />
            Synced
          </span>
        </span>
      )}
    </div>
  );
};

export default OfflineQueueBadge;

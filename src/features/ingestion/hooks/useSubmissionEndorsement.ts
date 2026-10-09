/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shared Submission Endorsement / Rejection Actions
 *
 * Deliberate shared interface for the statutory Panchayat endorsement flow,
 * used independently by the Citizen Ingestion Terminal ledger and the
 * Panchayat Verification Desk. Both workspaces own their own queue state and
 * UI; only the endorsement write-path (IndexedDB + cross-tab sync broadcast)
 * is shared here.
 */

import { useCallback } from 'react';
import { UserSession } from '../../../types/session';
import { SeverityLevel } from '../../../types/ingestion';
import { endorseSubmission, rejectSubmission } from '../../../lib/db';
import { centralSyncService } from '../../../services/centralSyncService';
import { UILanguage } from '../../../pages/shared/workspacePageProps';

export interface EndorsementData {
  severity: SeverityLevel;
  affectedHouseholds: number;
  inspectionNote: string;
  inspectorId: string;
}

export interface SubmissionEndorsementActions {
  endorse: (draftId: string, data: EndorsementData) => Promise<void>;
  reject: (draftId: string, reason: string) => Promise<void>;
}

export function useSubmissionEndorsement(
  session: UserSession,
  language: UILanguage,
  notify: (text: string, type: 'success' | 'info' | 'error') => void
): SubmissionEndorsementActions {
  const endorse = useCallback(
    async (draftId: string, data: EndorsementData) => {
      const activeInspector =
        session.role === 'PANCHAYAT_OFFICER' ? session.maskedIdentifier : data.inspectorId;
      await endorseSubmission(
        draftId,
        data.severity,
        data.affectedHouseholds,
        data.inspectionNote,
        activeInspector
      );
      centralSyncService.publish('RECORD_UPDATED', {
        id: draftId,
        status: 'ENDORSED_MASTER',
        masterLifecycleStatus: 'ENDORSED_MASTER',
        type: 'draft',
      });
      centralSyncService.publish('ENDORSEMENT_COMPLETED', {
        draftId,
        data: { ...data, inspectorId: activeInspector, timestamp: Date.now() },
      });
      notify(
        language === 'hi'
          ? 'पंचायत सत्यापन सफल! समस्या तकनीकी विश्वविद्यालयों हेतु आधिकारिक रूप से प्रेषित (ENDORSED_MASTER)।'
          : 'Panchayat Verification Endorsed! Issue escalated to Engineering Universities (Step 3).',
        'success'
      );
    },
    [session, language, notify]
  );

  const reject = useCallback(
    async (draftId: string, reason: string) => {
      const inspectorId =
        session.role === 'PANCHAYAT_OFFICER' ? session.maskedIdentifier : 'JH-BDO-RNC-04';
      await rejectSubmission(draftId, reason, inspectorId);
      centralSyncService.publish('RECORD_UPDATED', { type: 'rejected', draftId });
      notify(
        language === 'hi'
          ? 'प्रविष्टि अस्वीकृत / स्पैम के रूप में दर्ज की गई।'
          : 'Submission marked as Rejected / Non-Actionable.',
        'info'
      );
    },
    [session, language, notify]
  );

  return { endorse, reject };
}

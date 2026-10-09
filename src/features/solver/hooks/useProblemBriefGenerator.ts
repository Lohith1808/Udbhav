/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shared AI Problem Boundary Brief Generator
 *
 * Deliberate shared interface for generating and saving Engineering Problem
 * Briefs from endorsed citizen submissions. Used independently by the Citizen
 * Ingestion Terminal ledger and the Panchayat Verification Desk; the Academic
 * Challenge Board consumes the saved briefs from IndexedDB.
 *
 * Generation prefers the configured LLM (Gemini Flash) and transparently
 * falls back to the deterministic boundary generator when unkeyed or offline.
 */

import { useState, useCallback } from 'react';
import { OfflineDraftSubmission } from '../../../types/ingestion';
import { EngineeringProblemBrief } from '../../../types/solver';
import { generateProblemBoundaryBrief } from '../utils/boundaryGenerator';
import { generateLLMProblemBoundaryBrief } from '../../../services/aiService';
import { saveEngineeringBrief } from '../../../lib/db';
import { centralSyncService } from '../../../services/centralSyncService';
import { UILanguage } from '../../../pages/shared/workspacePageProps';

export interface ProblemBriefGenerator {
  /** The most recently generated brief (renders the brief modal). */
  activeBrief: EngineeringProblemBrief | null;
  /** True while the LLM/deterministic generation is running. */
  isGenerating: boolean;
  /** Generate a brief for an endorsed submission (LLM first, deterministic fallback). */
  generate: (submission: OfflineDraftSubmission) => Promise<void>;
  /** Persist a generated brief to the Challenge Board. */
  save: (brief: EngineeringProblemBrief) => Promise<void>;
  /** Clear the active brief (closes the modal). */
  clear: () => void;
}

export function useProblemBriefGenerator(
  language: UILanguage,
  notify: (text: string, type: 'success' | 'info' | 'error') => void
): ProblemBriefGenerator {
  const [activeBrief, setActiveBrief] = useState<EngineeringProblemBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const generate = useCallback(
    async (submission: OfflineDraftSubmission) => {
      setIsGenerating(true);
      try {
        const brief = await generateLLMProblemBoundaryBrief({
          id: submission.remoteMasterIssueId || submission.id,
          transcriptionText: submission.transcriptionDraft || '',
          category: submission.aiTriageCategory,
          district: submission.lgdLocation?.districtName || 'Jharkhand',
          block: submission.lgdLocation?.blockName || 'Administrative Block',
          affectedHouseholds: submission.affectedHouseholdCount || 50,
          panchayatNote:
            submission.panchayatInspectionNotes || 'On-site statutory audit completed by Panchayat Officer.',
          severity: submission.severity || 'HIGH',
        });
        setActiveBrief(brief);
      } catch (err) {
        console.error('Failed to generate LLM boundary brief, using deterministic fallback:', err);
        const fallbackBrief = generateProblemBoundaryBrief({
          id: submission.remoteMasterIssueId || submission.id,
          transcriptionText: submission.transcriptionDraft || '',
          category: submission.aiTriageCategory,
          district: submission.lgdLocation?.districtName || 'Jharkhand',
          block: submission.lgdLocation?.blockName || 'Administrative Block',
          affectedHouseholds: submission.affectedHouseholdCount || 50,
          panchayatNote:
            submission.panchayatInspectionNotes || 'On-site statutory audit completed by Panchayat Officer.',
          severity: submission.severity || 'HIGH',
        });
        setActiveBrief(fallbackBrief);
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const save = useCallback(
    async (brief: EngineeringProblemBrief) => {
      setIsGenerating(true);
      try {
        await saveEngineeringBrief(brief);
        centralSyncService.publish('RECORD_CREATED', { type: 'brief', id: brief.id });
        notify(
          language === 'hi'
            ? `इंजीनियरिंग समस्या सीमा विनिर्देश सफलतापूर्वक चुनौती बोर्ड में सहेजा गया (${brief.id})!`
            : `Engineering Problem Brief successfully registered to Challenge Board (${brief.id})!`,
          'success'
        );
      } catch (err) {
        console.error(err);
        notify(
          err instanceof Error ? err.message : 'Failed to save brief to Challenge Board',
          'error'
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [language, notify]
  );

  const clear = useCallback(() => {
    setActiveBrief(null);
  }, []);

  return { activeBrief, isGenerating, generate, save, clear };
}

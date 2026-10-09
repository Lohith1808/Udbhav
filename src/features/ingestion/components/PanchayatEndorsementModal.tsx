/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Gram Panchayat Endorsement & Mandatory Inspection Review Modal
 * 
 * Strict Anti-Rubber-Stamp & Audit Guardrails:
 * 1. Role-Based Access Control (RBAC): Enforces verified PANCHAYAT_OFFICER credentials
 * 2. Severity Classification (LOW, MEDIUM, HIGH, CRITICAL)
 * 3. Estimated Affected Households (>= 1)
 * 4. Mandatory Field Inspection Note with strict minimum of 20 characters (live counter indicator)
 * 5. Cross-Device Synchronization via CentralSyncService & IndexedDB state transition (REPORTED -> ENDORSED_MASTER)
 */

import React, { useState, useEffect } from 'react';
import {
  OfflineDraftSubmission,
  SeverityLevel,
} from '../../../types/ingestion';
import { useSession } from '../../../context/SessionContext';
import { centralSyncService } from '../../../services/centralSyncService';
import { endorseSubmission, rejectSubmission } from '../../../lib/db';
import {
  ShieldCheck,
  X,
  AlertTriangle,
  Camera,
  Volume2,
  MapPin,
  Users,
  CheckCircle2,
  Ban,
  Clock,
  Building,
  UserCheck,
  Lock,
} from 'lucide-react';

export interface PanchayatEndorsementModalProps {
  /** Target civic submission being reviewed */
  submission: OfflineDraftSubmission;
  /** UI language ('hi' or 'en') */
  language?: 'hi' | 'en';
  /** Modal close handler */
  onClose: () => void;
  /** Optional endorsement callback emitting validated metadata */
  onEndorse?: (
    draftId: string,
    data: {
      severity: SeverityLevel;
      affectedHouseholds: number;
      inspectionNote: string;
      inspectorId: string;
    }
  ) => Promise<void>;
  /** Optional rejection callback */
  onReject?: (draftId: string, reason: string) => Promise<void>;
}

export const MIN_NOTE_CHARACTERS = 20;

export interface NoteValidationResult {
  isValid: boolean;
  length: number;
  wordCount: number;
  distinctWordCount: number;
  hasRepeatedPattern: boolean;
  errorMessageHi: string;
  errorMessageEn: string;
}

/**
 * Substantive Note Heuristic:
 * 1. Checks length >= 20 characters
 * 2. Rejects repeated single-character sequences (e.g. aaaaaaaaaaaaaaaaaaaa or 11111111111111111111)
 * 3. Requires at least 3 distinct words separated by spaces
 */
export function validateSubstantiveNote(text: string): NoteValidationResult {
  const trimmed = text.trim();
  const length = trimmed.length;

  if (length < MIN_NOTE_CHARACTERS) {
    return {
      isValid: false,
      length,
      wordCount: 0,
      distinctWordCount: 0,
      hasRepeatedPattern: false,
      errorMessageHi: `एंटी-रबर-स्टैम्प नियम: स्थलीय निरीक्षण नोट में कम से कम ${MIN_NOTE_CHARACTERS} अक्षर होने अनिवार्य हैं (${MIN_NOTE_CHARACTERS - length} अक्षर शेष)।`,
      errorMessageEn: `Anti-Rubber-Stamp Rule: Inspection rationale must have at least ${MIN_NOTE_CHARACTERS} characters (${MIN_NOTE_CHARACTERS - length} remaining).`,
    };
  }

  // Anti-Gibberish Rule 1: Reject repeated single-character sequences
  const hasConsecutiveRepeats = /(.)\1{3,}/i.test(trimmed);
  const nonWhitespace = trimmed.replace(/\s+/g, '');
  const uniqueChars = new Set(nonWhitespace.toLowerCase());
  const isHomogeneous = uniqueChars.size < 4 && nonWhitespace.length >= 10;

  if (hasConsecutiveRepeats || isHomogeneous) {
    return {
      isValid: false,
      length,
      wordCount: 0,
      distinctWordCount: 0,
      hasRepeatedPattern: true,
      errorMessageHi: 'कृपया वास्तविक निरीक्षण टिप्पणी दर्ज करें (Please provide a substantive field inspection note — दोहराए गए वर्ण अमान्य हैं)।',
      errorMessageEn: 'कृपया वास्तविक निरीक्षण टिप्पणी दर्ज करें (Please provide a substantive field inspection note — repeated characters rejected).',
    };
  }

  // Anti-Gibberish Rule 2: Require at least 3 distinct words separated by spaces
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 3) {
    return {
      isValid: false,
      length,
      wordCount: words.length,
      distinctWordCount: words.length,
      hasRepeatedPattern: false,
      errorMessageHi: 'कृपया वास्तविक निरीक्षण टिप्पणी दर्ज करें (Please provide a substantive field inspection note — कम से कम 3 शब्द आवश्यक हैं)।',
      errorMessageEn: 'कृपया वास्तविक निरीक्षण टिप्पणी दर्ज करें (Please provide a substantive field inspection note — at least 3 words separated by spaces required).',
    };
  }

  const distinctWords = new Set(words.map((w) => w.toLowerCase()));
  if (distinctWords.size < 3) {
    return {
      isValid: false,
      length,
      wordCount: words.length,
      distinctWordCount: distinctWords.size,
      hasRepeatedPattern: false,
      errorMessageHi: 'कृपया वास्तविक निरीक्षण टिप्पणी दर्ज करें (Please provide a substantive field inspection note — दोहराए गए शब्द अमान्य हैं)।',
      errorMessageEn: 'कृपया वास्तविक निरीक्षण टिप्पणी दर्ज करें (Please provide a substantive field inspection note — repetitive single-word phrases are rejected).',
    };
  }

  return {
    isValid: true,
    length,
    wordCount: words.length,
    distinctWordCount: distinctWords.size,
    hasRepeatedPattern: false,
    errorMessageHi: '',
    errorMessageEn: '',
  };
}

export const PanchayatEndorsementModal: React.FC<PanchayatEndorsementModalProps> = ({
  submission,
  language = 'en',
  onClose,
  onEndorse,
  onReject,
}) => {
  // Session & RBAC Verification
  const { session, openVerificationModal, isVerified } = useSession();
  const isAuthorizedOfficer = session.role === 'PANCHAYAT_OFFICER' && (session.isVerified ?? isVerified);

  // Form input states
  const [severity, setSeverity] = useState<SeverityLevel>(submission.severity || 'MEDIUM');
  const [affectedHouseholds, setAffectedHouseholds] = useState<number>(
    submission.affectedHouseholdCount || 12
  );
  const [inspectionNote, setInspectionNote] = useState<string>(
    submission.panchayatInspectionNotes || ''
  );
  const [inspectorId, setInspectorId] = useState<string>(
    session.role === 'PANCHAYAT_OFFICER'
      ? session.maskedIdentifier
      : submission.panchayatInspectorId || 'JH-BDO-RNC-04'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showRejectPrompt, setShowRejectPrompt] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync inspectorId when session role switches to Panchayat Officer
  useEffect(() => {
    if (session.role === 'PANCHAYAT_OFFICER') {
      setInspectorId(session.maskedIdentifier);
    }
  }, [session.role, session.maskedIdentifier]);

  // Local object URL for photo evidence with auto cleanup
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    submission.photoPreviewUrl || null
  );

  useEffect(() => {
    if (submission.photoPreviewUrl) {
      setPhotoPreview(submission.photoPreviewUrl);
      return;
    }
    if (submission.photoBlob) {
      const url = URL.createObjectURL(submission.photoBlob);
      setPhotoPreview(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [submission.photoBlob, submission.photoPreviewUrl]);

  // Anti-Rubber-Stamp Substantive Validation Checks
  const noteValidation = validateSubstantiveNote(inspectionNote);
  const isHouseholdsValid = affectedHouseholds >= 1;
  const isSeverityValid = Boolean(severity);

  // Button disabled rule: must be authorized officer + substantive note + households >= 1 + severity selected
  const canEndorse =
    isAuthorizedOfficer &&
    noteValidation.isValid &&
    isHouseholdsValid &&
    isSeverityValid &&
    !isSubmitting;

  const handleEndorseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthorizedOfficer) {
      setErrorMessage(
        language === 'hi'
          ? 'पैनल प्रतिबंधित: स्थलीय सत्यापन केवल अधिकृत पंचायत सचिव या बीडीओ द्वारा ही किया जा सकता है।'
          : 'PANEL RESTRICTED: Requires Panchayat Secretary or BDO credentials.'
      );
      return;
    }

    if (!isSeverityValid) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया गंभीरता वर्गीकरण (Severity Level) का चयन करें।'
          : 'Please select a statutory severity classification.'
      );
      return;
    }

    if (!isHouseholdsValid) {
      setErrorMessage(
        language === 'hi'
          ? 'प्रभावित परिवारों की संख्या कम से कम 1 होनी चाहिए।'
          : 'Affected households count must be at least 1.'
      );
      return;
    }

    if (!noteValidation.isValid) {
      setErrorMessage(
        language === 'hi' ? noteValidation.errorMessageHi : noteValidation.errorMessageEn
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const activeInspectorId =
        session.role === 'PANCHAYAT_OFFICER'
          ? session.maskedIdentifier
          : inspectorId.trim() || 'Panchayat #JH-BDO-12';

      // 1. Transition record to ENDORSED_MASTER in IndexedDB
      await endorseSubmission(
        submission.id,
        severity,
        affectedHouseholds,
        inspectionNote.trim(),
        activeInspectorId
      );

      // 2. Invoke callback if supplied by parent
      if (onEndorse) {
        await onEndorse(submission.id, {
          severity,
          affectedHouseholds,
          inspectionNote: inspectionNote.trim(),
          inspectorId: activeInspectorId,
        });
      }

      // 3. Publish cross-tab lifecycle broadcast events
      centralSyncService.publish('RECORD_UPDATED', {
        id: submission.id,
        type: 'draft',
        status: 'ENDORSED_MASTER',
        masterLifecycleStatus: 'ENDORSED_MASTER',
      });
      centralSyncService.publish('ENDORSEMENT_COMPLETED', {
        draftId: submission.id,
        data: {
          severity,
          affectedHouseholds,
          inspectionNote: inspectionNote.trim(),
          inspectorId: activeInspectorId,
          timestamp: Date.now(),
        },
      });

      // 4. Trigger native toast & browser notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? `पंचायत सत्यापन सफल! समस्या आधिकारिक रूप से प्रेषित (${submission.maskedCitizenId} → ENDORSED_MASTER)`
                  : `Panchayat Official Endorsement Confirmed! Record ${submission.maskedCitizenId} promoted to ENDORSED_MASTER.`,
              type: 'success',
            },
          })
        );

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('DHTE Jharkhand — Endorsement Stamped', {
              body: `Issue ${submission.maskedCitizenId} officially endorsed by ${activeInspectorId}.`,
              icon: '/favicon.ico',
            });
          } catch {
            // Notification error ignored
          }
        }
      }

      onClose();
    } catch (err) {
      console.error('[Panchayat Modal] Endorsement error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Endorsement failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    try {
      setIsSubmitting(true);
      const activeInspectorId =
        session.role === 'PANCHAYAT_OFFICER'
          ? session.maskedIdentifier
          : inspectorId.trim() || 'Panchayat #JH-BDO-12';
      const cleanReason = rejectReason.trim() || 'Non-actionable / out of territorial scope';

      if (onReject) {
        await onReject(submission.id, cleanReason);
      } else {
        await rejectSubmission(submission.id, cleanReason, activeInspectorId);
      }

      centralSyncService.publish('RECORD_UPDATED', {
        id: submission.id,
        type: 'draft',
        status: 'REJECTED_SPAM',
        masterLifecycleStatus: 'REJECTED_SPAM',
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? `प्रविष्टि अस्वीकृत / स्पैम के रूप में दर्ज की गई (${submission.maskedCitizenId})`
                  : `Submission ${submission.maskedCitizenId} flagged as Rejected / Spam.`,
              type: 'info',
            },
          })
        );
      }

      onClose();
    } catch (err) {
      console.error('[Panchayat Modal] Rejection error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border-2 border-slate-400 rounded-none shadow-2xl max-w-3xl w-full my-auto overflow-hidden animate-in fade-in duration-150">
        {/* ============================================================== */}
        {/* 1. OFFICIAL NAVY STATUTORY HEADER */}
        {/* ============================================================== */}
        <div className="bg-[#0B2545] text-white px-4 py-2.5 font-bold text-sm tracking-wide flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <div>
              <span className="uppercase text-xs sm:text-sm">
                {language === 'hi'
                  ? 'पंचायत सत्यापन एवं स्थलीय निरीक्षण द्वार'
                  : 'Gram Panchayat Endorsement & Inspection Gate'}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] bg-white/10 px-1.5 py-0.2 text-amber-200 font-mono">
                DHTE STATUTORY AUDIT
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 cursor-pointer transition-colors"
            title="Close Review Gate"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* 2. RBAC WARNING BANNER OR VERIFIED OFFICER STRIP */}
        {/* ============================================================== */}
        {!isAuthorizedOfficer ? (
          <div className="bg-amber-50 border-b-2 border-amber-500 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                    <span>PANEL RESTRICTED: Requires Panchayat Secretary or BDO credentials</span>
                  </div>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                    {language === 'hi'
                      ? `सत्यापन केवल अधिकृत पंचायत सचिव या प्रखण्ड विकास पदाधिकारी (BDO) द्वारा ही किया जा सकता है। वर्तमान में आप ${session.role} (${session.fullName}) के रूप में सक्रिय हैं।`
                      : `Statutory endorsement requires verified Panchayat Secretary or BDO credentials. Currently logged in as ${session.role} (${session.fullName} - ${session.maskedIdentifier}).`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openVerificationModal}
                className="px-3.5 py-2 bg-[#7A1B1B] hover:bg-[#5E1414] active:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-none shrink-0 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>{language === 'hi' ? 'पहचान सत्यापित करें' : 'Verify Officer Profile'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border-b border-emerald-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {language === 'hi' ? 'अधिकृत पंचायत अधिकारी:' : 'Verified Officer:'}{' '}
                <strong className="text-emerald-900">{session.fullName}</strong> ({session.maskedIdentifier})
              </span>
            </div>
            <span className="text-[10px] bg-emerald-700 text-white font-mono px-2 py-0.5 uppercase tracking-wider font-bold">
              RBAC AUTHENTICATED &bull; LGD VALIDATED
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. SUBMITTED CITIZEN EVIDENCE PLATE */}
        {/* ============================================================== */}
        <div className="bg-slate-50 border-b border-slate-300 p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-extrabold text-slate-900 bg-white border border-slate-300 px-2 py-0.5">
                {submission.maskedCitizenId}
              </span>
              {submission.isWhistleblower && (
                <span className="bg-red-100 text-red-900 border border-red-300 px-1.5 py-0.2 font-black text-[10px] uppercase">
                  Whistleblower Protected
                </span>
              )}
              <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(submission.timestamp).toLocaleDateString([], {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                &bull;{' '}
                {new Date(submission.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Intensity Impact Counter Badge */}
            <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 px-2.5 py-1 text-amber-900 text-xs font-bold self-start sm:self-auto">
              <Users className="w-3.5 h-3.5 text-[#7A1B1B]" />
              <span>
                {language === 'hi'
                  ? `${submission.intensityScore || 1} नागरिकों द्वारा प्रभावित`
                  : `Affected Citizen Impact: ${submission.intensityScore || 1}`}
              </span>
            </div>
          </div>

          {/* LGD & Category Badge Strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1 text-slate-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#7A1B1B] shrink-0" />
              <span>
                GP: <strong className="text-slate-900">{submission.lgdLocation?.panchayatName || 'Arsande'}</strong>{' '}
                ({submission.lgdLocation?.blockName || 'Kanke'}, {submission.lgdLocation?.districtName || 'Ranchi'}) &bull; LGD Code:{' '}
                <strong className="text-emerald-800 font-mono">{submission.lgdLocation?.panchayatCode || '114829'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-700 font-medium">
              <Building className="w-3.5 h-3.5 text-[#0B2545] shrink-0" />
              <span>
                Domain: <strong className="text-slate-900">{submission.aiTriageCategory || 'General Civic Infrastructure'}</strong>
              </span>
            </div>
          </div>

          {/* Media Evidence & Statement Preview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white border border-slate-200 p-2.5">
            {/* Live Camera Photo Evidence */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center bg-slate-100 border border-slate-300 p-1 min-h-[90px]">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Inspection Site Evidence"
                  className="w-full h-20 object-cover border border-slate-300"
                />
              ) : (
                <div className="text-center text-slate-400 py-2">
                  <Camera className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                  <span className="text-[10px] font-mono font-bold">NO LIVE PHOTO</span>
                </div>
              )}
            </div>

            {/* Transcript & Voice Info */}
            <div className="sm:col-span-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-800">
                  {language === 'hi' ? 'नागरिक मौखिक बयान' : 'Citizen Vernacular Testimony'}
                </span>
                {submission.audioDurationSeconds ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300">
                    <Volume2 className="w-3 h-3" />
                    <span>Voice Memo: {submission.audioDurationSeconds}s</span>
                  </span>
                ) : null}
              </div>
              <p className="text-slate-700 italic bg-slate-50 p-2 border border-slate-200 text-[11px] leading-relaxed">
                &ldquo;{submission.transcriptionDraft || 'कोई लिखित विवरण नहीं है'}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. STRUCTURED PANCHAYAT ENDORSEMENT FORM */}
        {/* ============================================================== */}
        <form onSubmit={handleEndorseSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Field 1: Severity Classification */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi' ? '1. गंभीरता वर्गीकरण (Severity Level)' : '1. Severity Classification'}
                <span className="text-red-600 ml-1">*</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full text-xs p-2 border border-slate-400 bg-white rounded-none focus:outline-none focus:border-[#0B2545] font-bold"
              >
                <option value="LOW">LOW &bull; स्थानीय मरम्मत योग्य (Routine Maintenance)</option>
                <option value="MEDIUM">MEDIUM &bull; मध्यम प्रभाव (Structural Repair Needed)</option>
                <option value="HIGH">HIGH &bull; उच्च प्राथमिकता (Major Infrastructure Failure)</option>
                <option value="CRITICAL">CRITICAL &bull; अति-संवेदनशील संकट (Emergency Civic Threat)</option>
              </select>
            </div>

            {/* Field 2: Estimated Affected Households */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi'
                  ? '2. प्रभावित परिवारों की संख्या (Affected Households)'
                  : '2. Estimated Affected Households'}
                <span className="text-red-600 ml-1">* (min: 1)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-2.5 border border-r-0 border-slate-400 bg-slate-100 text-xs font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={affectedHouseholds}
                  onChange={(e) => setAffectedHouseholds(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-xs p-2 border border-slate-400 bg-white rounded-none focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Field Inspector Identification Token */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi'
                  ? 'निरीक्षण अधिकारी पहचान (Inspector ID / Officer Code)'
                  : 'Field Inspector Identity (NIC / BDO Code)'}
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-2.5 border border-r-0 border-slate-400 bg-slate-100 text-xs font-bold text-slate-700">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={inspectorId}
                  onChange={(e) => setInspectorId(e.target.value)}
                  placeholder="JH-BDO-RNC-04"
                  readOnly={isAuthorizedOfficer}
                  className={`flex-1 text-xs p-2 border border-slate-400 rounded-none focus:outline-none font-mono font-bold ${
                    isAuthorizedOfficer ? 'bg-slate-100 text-slate-800' : 'bg-white'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center text-[11px] text-slate-600 bg-slate-50 border border-slate-200 p-2">
              <span className="leading-snug">
                {language === 'hi'
                  ? 'सत्यापन के उपरांत यह चुनौती राज्य के तकनीकी विश्वविद्यालयों हेतु आधिकारिक रूप से प्रेषित होगी (ENDORSED_MASTER)।'
                  : 'Once endorsed, this civic challenge is published to technical universities across Jharkhand for engineering solutions.'}
              </span>
            </div>
          </div>

          {/* Field 3: Mandatory Field Inspection Note (Strict Anti-Rubber-Stamp >= 20 chars) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                {language === 'hi'
                  ? '3. अनिवार्य स्थलीय निरीक्षण टिप्पणी (Field Inspection Note)'
                  : '3. Mandatory Field Inspection Note'}
                <span className="text-red-600 ml-1">*</span>
              </label>

              {/* Live Character Counter & Substantive Heuristic Indicator */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <span
                  className={`px-2 py-0.5 border ${
                    noteValidation.isValid
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-red-100 text-red-900 border-red-400 animate-pulse'
                  }`}
                >
                  {noteValidation.isValid
                    ? `✓ ${noteValidation.length} chars • ${noteValidation.wordCount} words (Substantive)`
                    : `${noteValidation.length} / ${MIN_NOTE_CHARACTERS} min chars`}
                </span>
              </div>
            </div>

            <textarea
              rows={3}
              value={inspectionNote}
              onChange={(e) => setInspectionNote(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'स्थल पर जाकर पाइपलाइन व चापाकल की जांच की गई, जल में फ्लोराइड की गंध है और तत्काल तकनीकी समाधान की आवश्यकता है...'
                  : 'Inspected site personally; handpump valve is jammed with reddish corrosive residue, requiring solar filtration unit...'
              }
              className={`w-full text-xs p-2.5 border rounded-none focus:outline-none font-sans ${
                noteValidation.isValid
                  ? 'border-emerald-600 bg-emerald-50/20'
                  : 'border-slate-400 bg-white focus:border-[#0B2545]'
              }`}
            />

            {!noteValidation.isValid && (
              <div className="mt-1.5 p-2 bg-red-50 border border-red-300 text-[11px] text-red-800 font-semibold flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-700 mt-0.5" />
                <span>
                  {language === 'hi'
                    ? noteValidation.errorMessageHi
                    : noteValidation.errorMessageEn}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-red-100 border border-red-400 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Rejection Prompt Dropdown */}
          {showRejectPrompt && (
            <div className="bg-red-50 border-2 border-red-500 p-3 space-y-2">
              <div className="text-xs font-bold text-red-900">
                {language === 'hi'
                  ? 'अस्वीकृति कारण दर्ज करें (Spam / Duplicate / Non-Actionable):'
                  : 'Specify Statutory Reason for Rejection / Spam Classification:'}
              </div>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Non-actionable / out of territorial scope / duplicate report"
                className="w-full text-xs p-2 border border-red-300 bg-white rounded-none focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold uppercase rounded-none cursor-pointer"
                >
                  {language === 'hi' ? 'अस्वीकृत पुष्टि करें' : 'Confirm Rejection'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectPrompt(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-800 text-xs font-bold uppercase rounded-none cursor-pointer"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. ACTION BUTTONS & AUDIT COMMIT */}
          {/* ============================================================== */}
          <div className="pt-2 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Reject / Spam Trigger */}
              {!showRejectPrompt && (
                <button
                  type="button"
                  onClick={() => setShowRejectPrompt(true)}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'अस्वीकार / स्पैम' : 'Reject / Spam'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors w-full sm:w-auto cursor-pointer"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>

              {/* Confirm Official Endorsement Button */}
              <button
                type="submit"
                disabled={!canEndorse}
                className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center justify-center gap-2 shadow-2xs transition-all ${
                  canEndorse
                    ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                }`}
                title={
                  !isAuthorizedOfficer
                    ? 'Panel Restricted: Requires Panchayat Secretary or BDO credentials'
                    : !noteValidation.isValid
                    ? (language === 'hi' ? noteValidation.errorMessageHi : noteValidation.errorMessageEn)
                    : !isHouseholdsValid
                    ? 'Affected households must be at least 1'
                    : !isSeverityValid
                    ? 'Please select a statutory severity level'
                    : 'Confirm Official Endorsement'
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? language === 'hi'
                      ? 'सत्यापन जारी...'
                      : 'Endorsing...'
                    : language === 'hi'
                    ? 'आधिकारिक सत्यापन की पुष्टि करें'
                    : 'Confirm Official Endorsement'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PanchayatEndorsementModal;

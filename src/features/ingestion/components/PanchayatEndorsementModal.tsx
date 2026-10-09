/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Gram Panchayat Endorsement & Mandatory Inspection Review Modal
 * 
 * Strict Anti-Rubber-Stamp & Audit Guardrails:
 * 1. Severity Classification (LOW, MEDIUM, HIGH, CRITICAL)
 * 2. Estimated Affected Households (>= 1)
 * 3. Mandatory Field Inspection Note with strict minimum of 20 characters
 * 4. Stamped with Inspector ID and timestamp upon endorsement
 */

import React, { useState, useEffect } from 'react';
import {
  OfflineDraftSubmission,
  SeverityLevel,
} from '../../../types/ingestion';
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
} from 'lucide-react';

export interface PanchayatEndorsementModalProps {
  /** Target civic submission being reviewed */
  submission: OfflineDraftSubmission;
  /** UI language ('hi' or 'en') */
  language?: 'hi' | 'en';
  /** Modal close handler */
  onClose: () => void;
  /** Endorsement callback emitting validated metadata */
  onEndorse: (
    draftId: string,
    data: {
      severity: SeverityLevel;
      affectedHouseholds: number;
      inspectionNote: string;
      inspectorId: string;
    }
  ) => Promise<void>;
  /** Rejection callback */
  onReject?: (draftId: string, reason: string) => Promise<void>;
}

const MIN_NOTE_CHARACTERS = 20;

export const PanchayatEndorsementModal: React.FC<PanchayatEndorsementModalProps> = ({
  submission,
  language = 'en',
  onClose,
  onEndorse,
  onReject,
}) => {
  // Form input states
  const [severity, setSeverity] = useState<SeverityLevel>(submission.severity || 'MEDIUM');
  const [affectedHouseholds, setAffectedHouseholds] = useState<number>(
    submission.affectedHouseholdCount || 12
  );
  const [inspectionNote, setInspectionNote] = useState<string>(
    submission.panchayatInspectionNotes || ''
  );
  const [inspectorId, setInspectorId] = useState<string>(
    submission.panchayatInspectorId || 'JH-BDO-RNC-04'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showRejectPrompt, setShowRejectPrompt] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const noteLength = inspectionNote.trim().length;
  const isNoteValid = noteLength >= MIN_NOTE_CHARACTERS;
  const isHouseholdsValid = affectedHouseholds >= 1;
  const canEndorse = isNoteValid && isHouseholdsValid && !isSubmitting;

  const handleEndorseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isNoteValid) {
      setErrorMessage(
        language === 'hi'
          ? `अमान्य टिप्पणी: स्थलीय निरीक्षण नोट में कम से कम ${MIN_NOTE_CHARACTERS} अक्षर होने अनिवार्य हैं (वर्तमान: ${noteLength})।`
          : `Anti-Rubber-Stamp Violation: Inspection note must be at least ${MIN_NOTE_CHARACTERS} characters (Current: ${noteLength}).`
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

    try {
      setIsSubmitting(true);
      await onEndorse(submission.id, {
        severity,
        affectedHouseholds,
        inspectionNote: inspectionNote.trim(),
        inspectorId: inspectorId.trim() || 'JH-BDO-RNC-04',
      });
      onClose();
    } catch (err) {
      console.error('[Panchayat Modal] Endorsement error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Endorsement failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!onReject) return;
    try {
      setIsSubmitting(true);
      await onReject(
        submission.id,
        rejectReason.trim() || 'Non-actionable / out of territorial scope'
      );
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
                  ? 'पंचायत सत्यापन एवं स्थलीय निरीक्षण'
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
        {/* 2. SUBMITTED CITIZEN EVIDENCE PLATE */}
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
                Domain: <strong className="text-slate-900">{submission.aiTriageCategory}</strong>
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
        {/* 3. STRUCTURED PANCHAYAT ENDORSEMENT FORM */}
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

          {/* Inspector Identification Token */}
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
                  className="flex-1 text-xs p-2 border border-slate-400 bg-white rounded-none focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center text-[11px] text-slate-500 bg-slate-50 border border-slate-200 p-2">
              <span className="leading-snug">
                {language === 'hi'
                  ? 'सत्यापन के उपरांत यह चुनौती राज्य के तकनीकी विश्वविद्यालयों हेतु आधिकारिक रूप से प्रेषित होगी।'
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

              {/* Live Character Counter Indicator */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <span
                  className={`px-1.5 py-0.2 border ${
                    isNoteValid
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-red-100 text-red-900 border-red-400 animate-pulse'
                  }`}
                >
                  {noteLength} / {MIN_NOTE_CHARACTERS} min chars
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
                isNoteValid
                  ? 'border-emerald-600 bg-emerald-50/20'
                  : 'border-slate-400 bg-white focus:border-[#0B2545]'
              }`}
            />

            {!isNoteValid && (
              <p className="mt-1 text-[11px] text-red-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  {language === 'hi'
                    ? `एंटी-रबर-स्टैम्प नियम: सत्यापन हेतु कम से कम ${MIN_NOTE_CHARACTERS} अक्षरों की स्थलीय रिपोर्ट अनिवार्य है (${MIN_NOTE_CHARACTERS - noteLength} अक्षर शेष)।`
                    : `Anti-Rubber-Stamp Rule: Inspection rationale must have at least ${MIN_NOTE_CHARACTERS} characters (${MIN_NOTE_CHARACTERS - noteLength} remaining).`}
                </span>
              </p>
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
          {/* 4. ACTION BUTTONS */}
          {/* ============================================================== */}
          <div className="pt-2 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Reject / Spam Trigger */}
              {!showRejectPrompt && onReject && (
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
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors w-full sm:w-auto"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>

              {/* Endorse & Escalate Button */}
              <button
                type="submit"
                disabled={!canEndorse}
                className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center justify-center gap-2 shadow-2xs transition-all ${
                  canEndorse
                    ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                }`}
                title={
                  !isNoteValid
                    ? `Requires at least ${MIN_NOTE_CHARACTERS} characters in the inspection note`
                    : 'Endorse and Escalate to Universities'
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? language === 'hi'
                      ? 'सत्यापन जारी...'
                      : 'Endorsing...'
                    : language === 'hi'
                    ? 'सत्यापित कर विश्वविद्यालय को प्रेषित करें'
                    : 'Endorse & Escalate to Universities'}
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

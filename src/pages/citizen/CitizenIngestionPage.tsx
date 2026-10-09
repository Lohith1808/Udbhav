/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Citizen Ingestion Terminal (Workspace Route: #/report)
 *
 * Citizen-owned workspace: vernacular issue intake form (voice, transcript,
 * live camera, LGD geotagging) plus the local persistence ledger.
 * All form state, ledger state, and citizen-specific logic live here.
 */

import React, { useState } from 'react';
import {
  saveDraft,
  markAsSynced,
  deleteDraft,
  queueDraft,
  getDraft,
} from '../../lib/db';
import { createOfflineDraftSubmission, generateMaskedCitizenId } from '../../lib/security';
import { centralSyncService } from '../../services/centralSyncService';
import { calculateIntensityScore } from '../../utils/intensityScorer';
import { OfflineDraftSubmission, LGDLocation, RawCoordinates } from '../../types/ingestion';
import { WorkspacePageProps } from '../shared/workspacePageProps';
import { BlobThumbnail } from '../../components/shared/BlobThumbnail';
import { LiveCameraCapture } from '../../features/ingestion/components/LiveCameraCapture';
import { LGDGeoTagger } from '../../features/ingestion/components/LGDGeoTagger';
import { AudioVoiceRecorder } from '../../features/ingestion/components/AudioVoiceRecorder';
import { SpeechToTextControl } from '../../features/ingestion/components/SpeechToTextControl';
import { useSubmissionEndorsement } from '../../features/ingestion/hooks/useSubmissionEndorsement';
import { useProblemBriefGenerator } from '../../features/solver/hooks/useProblemBriefGenerator';
import {
  Building2,
  Database,
  Send,
  Trash2,
  MapPin,
  Lock,
  Layers,
  FileText,
  Mic,
  Hash,
  FileSpreadsheet,
  Activity,
  Volume2,
  ShieldCheck,
  Users,
  CheckCircle2,
  Ban,
  Sparkles,
} from 'lucide-react';

const ProblemBriefModal = React.lazy(
  () => import('../../features/solver/components/ProblemBriefModal')
);
const CitizenStatusTracker = React.lazy(
  () => import('../../features/ingestion/components/CitizenStatusTracker')
);
const PanchayatEndorsementModal = React.lazy(
  () => import('../../features/ingestion/components/PanchayatEndorsementModal')
);
const CivicFirstAidTriageCard = React.lazy(
  () =>
    import('../../features/ingestion/components/CivicFirstAidTriageCard').then((m) => ({
      default: m.CivicFirstAidTriageCard,
    }))
);

export interface CitizenIngestionPageProps extends WorkspacePageProps {
  allSubmissions: OfflineDraftSubmission[];
  queuedSubmissions: OfflineDraftSubmission[];
}

export const CitizenIngestionPage: React.FC<CitizenIngestionPageProps> = (props) => {
  const {
    session,
    language,
    notify,
    onOpenAiSettings,
    isSyncing,
    onSyncTrigger,
    allSubmissions,
    queuedSubmissions,
  } = props;

  // ---- Citizen intake form state (page-owned) ----
  const [rawPhoneInput, setRawPhoneInput] = useState<string>('9876543210');
  const [isWhistleblower, setIsWhistleblower] = useState<boolean>(false);
  const [issueCategory, setIssueCategory] = useState<string>(
    'Drinking Water & Fluoride Filtration'
  );
  const [vernacularText, setVernacularText] = useState<string>(
    'चापाकल का पानी लाल निकल रहा है और मोटर का वाल्व जाम हो गया है।'
  );
  const [resolvedLgdLocation, setResolvedLgdLocation] = useState<LGDLocation | null>(null);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<RawCoordinates>({
    latitude: 23.4385,
    longitude: 85.3245,
    accuracyMeters: 8,
  });
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);
  const [capturedPhotoPreviewUrl, setCapturedPhotoPreviewUrl] = useState<string | null>(null);
  const [capturedAudioBlob, setCapturedAudioBlob] = useState<Blob | null>(null);
  const [capturedAudioDuration, setCapturedAudioDuration] = useState<number>(0);

  // ---- Ledger state (page-owned) ----
  const [activeLedgerTab, setActiveLedgerTab] = useState<'ALL' | 'QUEUED' | 'DRAFT' | 'SYNCED'>('ALL');

  // ---- Modal trigger state (page-owned) ----
  const [selectedTicketForTracker, setSelectedTicketForTracker] = useState<OfflineDraftSubmission | null>(null);
  const [selectedTicketForEndorsement, setSelectedTicketForEndorsement] = useState<OfflineDraftSubmission | null>(null);

  const { endorse, reject } = useSubmissionEndorsement(session, language, notify);
  const { activeBrief, isGenerating, generate, save, clear } = useProblemBriefGenerator(language, notify);

  const previewMaskedId = generateMaskedCitizenId(rawPhoneInput);

  const handleSaveToTerminal = async (targetStatus: 'DRAFT' | 'QUEUED') => {
    try {
      if (!rawPhoneInput || rawPhoneInput.replace(/\D/g, '').length < 10) {
        notify(
          language === 'hi'
            ? 'कृपया वैध 10-अंकीय मोबाइल नंबर दर्ज करें।'
            : 'Please enter a valid 10-digit citizen mobile number.',
          'error'
        );
        return;
      }

      // Use captured live photo blob if present, otherwise generate lightweight canvas test blob (<350 KB)
      let photoBlobToSave = capturedPhotoBlob;
      if (!photoBlobToSave) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0B2545';
          ctx.fillRect(0, 0, 160, 120);
          ctx.fillStyle = '#7A1B1B';
          ctx.fillRect(10, 10, 140, 100);
        }
        photoBlobToSave = await new Promise<Blob>((res) => {
          canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.85);
        });
      }

      // Use captured voice audio if available, otherwise synthesize fallback vernacular chunk
      const audioBlobToSave =
        capturedAudioBlob ||
        new Blob(['sample-vernacular-audio-pcm'], { type: 'audio/webm' });
      const audioDurationToSave = capturedAudioDuration > 0 ? capturedAudioDuration : 12;

      const newDraft = await createOfflineDraftSubmission({
        rawPhone: rawPhoneInput,
        isWhistleblower,
        audioBlob: audioBlobToSave,
        audioDurationSeconds: audioDurationToSave,
        transcriptionDraft: vernacularText,
        photoBlob: photoBlobToSave,
        lgdLocation: resolvedLgdLocation || {
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
        rawCoordinates: resolvedCoordinates,
        aiTriageCategory: issueCategory,
        intensityScore: 1,
      });

      // Deduplication & Spatial Clustering Heuristic
      const existingList = allSubmissions || [];
      const clusterResult = calculateIntensityScore(existingList, newDraft);

      if (clusterResult.isDuplicate) {
        notify(
          language === 'hi'
            ? `नागरिक डुप्लिकेट प्रविष्टि: यह समस्या आपके नंबर से पूर्व में दर्ज की जा चुकी है (टिकट ID: #${clusterResult.clusteredMasterId?.slice(0, 8)})।`
            : `Duplicate Report Flagged: Identical report already recorded for this citizen token (#${clusterResult.clusteredMasterId?.slice(0, 8)}).`,
          'info'
        );
        return;
      }

      if (clusterResult.clusteredMasterId) {
        newDraft.intensityScore = clusterResult.updatedIntensity;
        const masterCard = await getDraft(clusterResult.clusteredMasterId);
        if (masterCard) {
          await saveDraft({
            ...masterCard,
            intensityScore: clusterResult.updatedIntensity,
          });
        }
      }

      if (targetStatus === 'QUEUED') {
        newDraft.syncStatus = 'QUEUED';
      }

      await saveDraft(newDraft);
      centralSyncService.publish('RECORD_CREATED', {
        type: 'draft',
        id: newDraft.id,
        draft: newDraft,
      });

      // Reset photo & audio states
      setCapturedPhotoBlob(null);
      setCapturedPhotoPreviewUrl(null);
      setCapturedAudioBlob(null);
      setCapturedAudioDuration(0);

      const clusterNotice = clusterResult.clusteredMasterId
        ? language === 'hi'
          ? ` • क्लस्टर प्रभाव बढ़ा (${clusterResult.updatedIntensity} नागरिक)`
          : ` • Clustered Impact Escalated (${clusterResult.updatedIntensity} citizens)`
        : '';

      notify(
        language === 'hi'
          ? `नागरिक शिकायत पत्र सफलतापूर्वक ${targetStatus === 'QUEUED' ? 'कतारबद्ध' : 'सहेजा'} गया (${newDraft.maskedCitizenId})${clusterNotice}`
          : `Civic record successfully registered as ${targetStatus} (${newDraft.maskedCitizenId})${clusterNotice}.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      notify(err instanceof Error ? err.message : 'Database error occurred', 'error');
    }
  };

  const filteredList = (allSubmissions || []).filter((sub: OfflineDraftSubmission) => {
    if (activeLedgerTab === 'ALL') return true;
    return sub.syncStatus === activeLedgerTab;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ============================================================== */}
      {/* PANEL 1: Ground-Zero Ingestion Terminal (5 Cols) */}
      {/* ============================================================== */}
      <section className="lg:col-span-5 bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden">
        {/* Official Tabular Form Header */}
        <div className="bg-[#0B2545] text-white py-2 px-4 uppercase text-xs tracking-wider font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-300" aria-hidden="true" />
            <span>
              {language === 'hi'
                ? 'नागरिक शिकायत प्रपत्र'
                : 'Shoe 1: Grassroots Registration'}
            </span>
          </div>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 text-slate-200">
            PANCHAYAT INTAKE
          </span>
        </div>

        {/* Formal Fieldset Form Layout */}
        <div className="p-4 space-y-4">
          {/* Fieldset 1: Citizen Identity & PII Isolation */}
          <fieldset className="border border-slate-300 p-3 rounded-none space-y-2">
            <legend className="px-2 text-[11px] font-bold text-slate-800 uppercase bg-white">
              1. {language === 'hi' ? 'नागरिक पहचान व पीआईआई सुरक्षा' : 'Citizen Identity & PII Isolation'}
            </legend>

            <div>
              <label className="block text-xs font-bold text-slate-800">
                {language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}
                <span className="text-red-600 font-bold ml-1">* अनिवार्य / Mandatory</span>
              </label>
              <div className="flex gap-1.5 mt-1">
                <span className="inline-flex items-center px-2 border border-slate-300 bg-slate-100 text-xs font-mono font-bold text-slate-800">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={rawPhoneInput}
                  onChange={(e) => setRawPhoneInput(e.target.value)}
                  placeholder="9876543210"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-400 focus:outline-none focus:border-[#0B2545] rounded-none"
                />
              </div>

              {/* Masked Preview Tag */}
              <div className="mt-1.5 flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 text-[11px]">
                <div className="flex items-center gap-1 font-bold text-emerald-800">
                  <Lock className="w-3 h-3 text-emerald-700" />
                  <span>{previewMaskedId}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  SHA-256 Cryptographic Token
                </span>
              </div>
            </div>

            {/* Whistleblower Toggle */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-200">
              <div className="text-[11px] text-slate-700 font-medium">
                {language === 'hi'
                  ? 'गुप्त सूचनादाता संरक्षण (Whistleblower)'
                  : 'Whistleblower Protection (Anonymized)'}
              </div>
              <input
                type="checkbox"
                checked={isWhistleblower}
                onChange={(e) => setIsWhistleblower(e.target.checked)}
                className="w-4 h-4 accent-[#7A1B1B] cursor-pointer"
              />
            </div>
          </fieldset>

          {/* Fieldset 2: Local Government Directory (LGD) Spatial Geotagging */}
          <fieldset className="border border-slate-300 p-3 rounded-none space-y-2">
            <legend className="px-2 text-[11px] font-bold text-slate-800 uppercase bg-white">
              2. {language === 'hi' ? 'एलजीडी प्रशासनिक क्षेत्राधिकार' : 'LGD Spatial Administrative Hierarchy'}
            </legend>

            <LGDGeoTagger
              language={language}
              onLocationResolved={(loc, rawCoords) => {
                setResolvedLgdLocation(loc);
                if (rawCoords) {
                  setResolvedCoordinates(rawCoords);
                }
              }}
              initialLocation={resolvedLgdLocation || undefined}
            />
          </fieldset>

          {/* Fieldset 3: Problem Description & Media Constraints */}
          <fieldset className="border border-slate-300 p-3 rounded-none space-y-2">
            <legend className="px-2 text-[11px] font-bold text-slate-800 uppercase bg-white">
              3. {language === 'hi' ? 'समस्या विवरण व मीडिया प्रमाण' : 'Problem Statement & Evidence'}
            </legend>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi' ? 'समस्या वर्गीकरण' : 'Classification Category'}
                <span className="text-red-600 ml-1">*</span>
              </label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-400 bg-white rounded-none focus:outline-none"
              >
                <option>Drinking Water &amp; Fluoride Filtration</option>
                <option>Canal Siltation &amp; Solar Lift Irrigation</option>
                <option>Cold Storage Biomass Energy Breakdown</option>
                <option>Rural Microgrid Battery Storage Defect</option>
              </select>
            </div>

            {/* Tactile Push-to-Talk Voice Recording */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi'
                  ? 'मौखिक ऑडियो विवरण (पुश-टू-टॉक वॉइस)'
                  : 'Vernacular Audio Description (Push-to-Talk Voice)'}
                <span className="text-red-600 font-bold ml-1">*</span>
              </label>
              <AudioVoiceRecorder
                language={language}
                onAudioRecorded={(blob, duration) => {
                  setCapturedAudioBlob(blob);
                  setCapturedAudioDuration(duration);
                }}
                onAudioCleared={() => {
                  setCapturedAudioBlob(null);
                  setCapturedAudioDuration(0);
                }}
                initialAudioBlob={capturedAudioBlob || undefined}
                initialDurationSeconds={capturedAudioDuration}
              />
            </div>

            {/* Speech-to-Text: dictate the issue description */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi'
                  ? 'बोलकर विवरण लिखें (Speech-to-Text)'
                  : 'Dictate Description (Speech-to-Text)'}
              </label>
              <SpeechToTextControl
                language={language}
                onTranscript={(text) =>
                  setVernacularText((prev) => (prev.trim() ? `${prev} ${text}`.trim() : text))
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>
                  {language === 'hi' ? 'नागरिक वक्तव्य / ट्रांसक्रिप्शन' : 'Vernacular Spoken Transcript'}
                </span>
                <span className="text-[10px] text-[#7A1B1B] font-bold flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  <span>{capturedAudioBlob ? 'Voice Memo Attached' : 'Voice Memo Pending'}</span>
                </span>
              </label>
              <textarea
                rows={2}
                value={vernacularText}
                onChange={(e) => setVernacularText(e.target.value)}
                className="w-full text-xs p-2 border border-slate-400 bg-slate-50 rounded-none focus:outline-none font-sans"
                aria-label={language === 'hi' ? 'नागरिक वक्तव्य' : 'Vernacular spoken transcript'}
              />
            </div>

            {/* Enforced Live Camera Capture & Canvas Downscaler */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {language === 'hi'
                  ? 'स्थल छायाचित्र साक्ष्य (लाइव कैमरा)'
                  : 'Site Photographic Evidence (Live Camera)'}
                <span className="text-red-600 font-bold ml-1">*</span>
              </label>
              <LiveCameraCapture
                language={language}
                onPhotoCaptured={(blob, previewUrl) => {
                  setCapturedPhotoBlob(blob);
                  setCapturedPhotoPreviewUrl(previewUrl);
                }}
                onPhotoCleared={() => {
                  setCapturedPhotoBlob(null);
                  setCapturedPhotoPreviewUrl(null);
                }}
                initialPreviewUrl={capturedPhotoPreviewUrl || undefined}
              />
            </div>
          </fieldset>

          {/* AI First-Aid Triage & Local Technician Dispatch Card */}
          <React.Suspense fallback={null}>
            <CivicFirstAidTriageCard
              transcript={vernacularText}
              category={issueCategory}
              village={resolvedLgdLocation?.panchayatName || 'Ranchi'}
              language={language}
              onEscalateToRD={() => handleSaveToTerminal('QUEUED')}
              onOpenAiSettings={onOpenAiSettings}
            />
          </React.Suspense>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-300 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => handleSaveToTerminal('QUEUED')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none shadow-2xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {language === 'hi' ? 'केंद्रीय सिंक हेतु कतारबद्ध करें' : 'Queue for Central Sync'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveToTerminal('DRAFT')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-400 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>{language === 'hi' ? 'स्थानीय प्रारूप' : 'Local Draft'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* PANEL 2: Official Persistence Ledger (Dexie IndexedDB) (7 Cols) */}
      {/* ============================================================== */}
      <section className="lg:col-span-7 bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden">
        {/* Official Tabular Form Header */}
        <div className="bg-[#0B2545] text-white py-2 px-4 uppercase text-xs tracking-wider font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#FF9933]" aria-hidden="true" />
            <span>
              {language === 'hi'
                ? 'स्थानीय अनुक्रमणिका बहीखाता (IndexedDB Ledger)'
                : 'Official Client Persistence Ledger (Dexie.js)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {queuedSubmissions && queuedSubmissions.length > 0 && (
              <button
                type="button"
                onClick={onSyncTrigger}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase rounded-none disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Sync ({queuedSubmissions.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Header Filter Bar */}
        <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>{language === 'hi' ? 'अभिलेख सूची' : 'Master Records'}:</span>
            <span className="px-1.5 py-0.2 bg-[#0B2545] text-white font-mono text-[10px]">
              {filteredList.length}
            </span>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 text-[11px]">
            {(['ALL', 'QUEUED', 'DRAFT', 'SYNCED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveLedgerTab(tab)}
                className={`px-2 py-0.5 font-bold uppercase rounded-none transition-colors cursor-pointer ${
                  activeLedgerTab === tab
                    ? 'bg-[#0B2545] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tabular Ledger Display */}
        {filteredList.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 bg-slate-100 border border-slate-300 mx-auto flex items-center justify-center text-slate-400 mb-2 rounded-none">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase">
              {language === 'hi' ? 'कोई प्रविष्टि उपलब्ध नहीं है' : 'No records found in this view'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
              {language === 'hi'
                ? 'कृपया बाएं पैनल से नई नागरिक शिकायत दर्ज करें।'
                : 'Submit a new report from the form on the left to add a record to IndexedDB.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 max-h-[580px] overflow-y-auto">
            {filteredList.map((entry: OfflineDraftSubmission, idx: number) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-[#7A1B1B]"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Evidence Thumbnail */}
                    <BlobThumbnail blob={entry.photoBlob} previewUrl={entry.photoPreviewUrl} />

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-200 text-slate-800 border border-slate-300">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>

                        {/* Status Tag */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.2 text-[10px] font-black uppercase tracking-wider rounded-none ${
                            entry.syncStatus === 'SYNCED'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                              : entry.syncStatus === 'QUEUED'
                              ? 'bg-amber-100 text-amber-900 border border-amber-400'
                              : 'bg-slate-200 text-slate-800 border border-slate-400'
                          }`}
                        >
                          {entry.syncStatus}
                        </span>

                        {/* Lifecycle Endorsement Tag */}
                        {entry.masterLifecycleStatus === 'ENDORSED_MASTER' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                            <span>ENDORSED</span>
                          </span>
                        ) : entry.masterLifecycleStatus === 'REJECTED_SPAM' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-900 border border-red-400">
                            <Ban className="w-2.5 h-2.5 text-red-700" />
                            <span>REJECTED</span>
                          </span>
                        ) : null}

                        {/* Intensity Impact Counter Badge */}
                        {entry.intensityScore > 1 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-400">
                            <Users className="w-2.5 h-2.5 text-[#7A1B1B]" />
                            <span>Impact: {entry.intensityScore}</span>
                          </span>
                        )}

                        <span className="font-extrabold text-xs text-slate-900">
                          {entry.maskedCitizenId}
                        </span>

                        {entry.isWhistleblower && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-red-100 text-red-900 border border-red-300">
                            Whistleblower
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Category & Transcript */}
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>{entry.aiTriageCategory}</span>
                        {entry.audioDurationSeconds ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300">
                            <Volume2 className="w-2.5 h-2.5" />
                            <span>Voice: {entry.audioDurationSeconds}s</span>
                          </span>
                        ) : null}
                      </div>
                      {entry.transcriptionDraft && (
                        <div className="text-xs text-slate-700 italic bg-slate-50 p-1.5 border border-slate-200">
                          &ldquo;{entry.transcriptionDraft}&rdquo;
                        </div>
                      )}

                      {/* Metadata Strip */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600 pt-0.5 font-mono">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#7A1B1B]" />
                          <span>
                            GP: <strong className="text-slate-900">{entry.lgdLocation?.panchayatName}</strong> ({entry.lgdLocation?.blockName}, {entry.lgdLocation?.districtName}) &bull; LGD Code: <strong className="text-emerald-800">{entry.lgdLocation?.panchayatCode}</strong>
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Hash className="w-2.5 h-2.5" />
                          <span>SHA: {entry.phoneHash.slice(0, 10)}...</span>
                        </span>

                        {entry.remoteMasterIssueId && (
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-1 border border-emerald-300">
                            REMOTE ID: {entry.remoteMasterIssueId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {/* Quick Endorse Gate Action */}
                    {entry.masterLifecycleStatus !== 'ENDORSED_MASTER' &&
                      entry.masterLifecycleStatus !== 'REJECTED_SPAM' && (
                        <button
                          type="button"
                          onClick={() => setSelectedTicketForEndorsement(entry)}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title={language === 'hi' ? 'पंचायत स्थलीय सत्यापन द्वार' : 'Panchayat Statutory Endorsement Gate'}
                        >
                          <ShieldCheck className="w-3 h-3 text-amber-300" />
                          <span>{language === 'hi' ? 'सत्यापन' : 'Endorse'}</span>
                        </button>
                      )}

                    {entry.masterLifecycleStatus === 'ENDORSED_MASTER' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedTicketForEndorsement(entry)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Review Endorsement Stamp"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                          <span>Stamp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => generate(entry)}
                          disabled={isGenerating}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                          title={language === 'hi' ? 'एआई इंजीनियरिंग समस्या सीमा तैयार करें' : 'Generate AI Engineering Problem Brief'}
                        >
                          <Sparkles className="w-3 h-3 text-[#7A1B1B]" />
                          <span>{language === 'hi' ? 'सीमा विनिर्देश' : 'AI Brief'}</span>
                        </button>
                      </>
                    )}

                    {/* Track 6-stage lifecycle progress modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedTicketForTracker(entry)}
                      className="px-2 py-1 bg-[#0B2545] hover:bg-[#1E3A5F] text-[#F8E7A2] text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title={language === 'hi' ? 'प्रगति स्थिति ट्रैक करें' : 'Track 6-Stage Milestone Lifecycle'}
                    >
                      <Activity className="w-3 h-3 text-amber-300" />
                      <span>{language === 'hi' ? 'ट्रैक' : 'Track'}</span>
                    </button>

                    {entry.syncStatus === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => queueDraft(entry.id)}
                        className="px-2 py-1 bg-[#0B2545] hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Queue this draft"
                      >
                        <Send className="w-3 h-3" />
                        <span>Queue</span>
                      </button>
                    )}

                    {entry.syncStatus === 'QUEUED' && (
                      <button
                        type="button"
                        onClick={() =>
                          markAsSynced(
                            entry.id,
                            `JH-2026-M-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
                          )
                        }
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Mark as synced to Central Master"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Sync</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteDraft(entry.id)}
                      className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Purge record from local storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6-Stage Citizen Status Tracker Modal */}
      {selectedTicketForTracker && (
        <React.Suspense fallback={null}>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="max-w-2xl w-full my-auto">
              <CitizenStatusTracker
                status={
                  selectedTicketForTracker.masterLifecycleStatus ||
                  (selectedTicketForTracker.remoteMasterIssueId
                    ? 'ENDORSED_MASTER'
                    : selectedTicketForTracker.syncStatus === 'QUEUED'
                    ? 'REPORTED'
                    : 'REPORTED')
                }
                trackingToken={
                  selectedTicketForTracker.remoteMasterIssueId ||
                  `JH-2026-T-${selectedTicketForTracker.id.slice(0, 8).toUpperCase()}`
                }
                maskedCitizenId={selectedTicketForTracker.maskedCitizenId}
                language={language}
                onClose={() => setSelectedTicketForTracker(null)}
              />
            </div>
          </div>
        </React.Suspense>
      )}

      {/* Panchayat Endorsement & Inspection Gate Modal */}
      {selectedTicketForEndorsement && (
        <React.Suspense fallback={null}>
          <PanchayatEndorsementModal
            submission={selectedTicketForEndorsement}
            language={language}
            onClose={() => setSelectedTicketForEndorsement(null)}
            onEndorse={endorse}
            onReject={reject}
          />
        </React.Suspense>
      )}

      {/* AI Engineering Problem Boundary Brief Modal */}
      {activeBrief && (
        <React.Suspense fallback={null}>
          <ProblemBriefModal
            brief={activeBrief}
            language={language}
            onClose={clear}
            onSaveToChallengeBoard={() => save(activeBrief)}
            isSaving={isGenerating}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default CitizenIngestionPage;

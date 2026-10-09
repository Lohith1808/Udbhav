/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Official Civic Ledger & Ground-Zero Ingestion Terminal
 * 
 * Conforms to NIC / Government of Jharkhand Civic Design Patterns.
 */

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  saveDraft,
  markAsSynced,
  deleteDraft,
  queueDraft,
  endorseSubmission,
  rejectSubmission,
  getDraft,
  saveEngineeringBrief,
} from './lib/db';
import { generateProblemBoundaryBrief } from './features/solver';
import { EngineeringProblemBrief, StudentTeam } from './types/solver';

const ProblemBriefModal = React.lazy(
  () => import('./features/solver/components/ProblemBriefModal')
);
const TeamAssemblyModal = React.lazy(
  () => import('./features/solver/components/TeamAssemblyModal')
);
const PanchayatQueryModal = React.lazy(
  () => import('./features/solver/components/PanchayatQueryModal')
);
const FacultyMatchmakerModal = React.lazy(
  () => import('./features/mentor/components/FacultyMatchmakerModal')
);
const FacultyMentorDashboard = React.lazy(
  () => import('./features/mentor/components/FacultyMentorDashboard')
);
const CitizenStatusTracker = React.lazy(
  () => import('./features/ingestion/components/CitizenStatusTracker')
);
const PanchayatEndorsementModal = React.lazy(
  () => import('./features/ingestion/components/PanchayatEndorsementModal')
);
import {
  createOfflineDraftSubmission,
  generateMaskedCitizenId,
} from './lib/security';
import { GovtHeader } from './components/common/GovtHeader';
import { GovtFooter } from './components/common/GovtFooter';
import { LiveCameraCapture } from './features/ingestion/components/LiveCameraCapture';
import { LGDGeoTagger } from './features/ingestion/components/LGDGeoTagger';
import { AudioVoiceRecorder } from './features/ingestion/components/AudioVoiceRecorder';
import { initAutoSyncListener } from './utils/syncWorker';
import { calculateIntensityScore } from './utils/intensityScorer';
import {
  OfflineDraftSubmission,
  LGDLocation,
  RawCoordinates,
  SeverityLevel,
} from './types/ingestion';
import {
  Building2,
  Database,
  FileCheck2,
  Send,
  Trash2,
  MapPin,
  Lock,
  Layers,
  Radio,
  FileText,
  Camera,
  Mic,
  Hash,
  AlertTriangle,
  FileSpreadsheet,
  Activity,
  Volume2,
  ShieldCheck,
  Users,
  CheckCircle2,
  Ban,
  Sparkles,
  ExternalLink,
  MessageSquare,
  GraduationCap,
} from 'lucide-react';

/**
 * Thumbnail viewer for binary Blobs persisted in client-side IndexedDB
 * Handles automatic object URL creation and revocation to prevent memory leaks
 */
const BlobThumbnail: React.FC<{ blob?: Blob; previewUrl?: string }> = ({ blob, previewUrl }) => {
  const [localUrl, setLocalUrl] = useState<string | null>(previewUrl || null);

  useEffect(() => {
    if (previewUrl) {
      setLocalUrl(previewUrl);
      return;
    }
    if (!blob) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setLocalUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, previewUrl]);

  if (!localUrl) {
    return (
      <div
        className="w-13 h-13 bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0 select-none"
        title="No Live Photo Attached"
      >
        <Camera className="w-4 h-4 text-slate-400" />
        <span className="text-[8px] text-slate-400 font-mono mt-0.5 font-bold">NO PIC</span>
      </div>
    );
  }

  return (
    <div className="relative group shrink-0 select-none">
      <img
        src={localUrl}
        alt="Civic Hazard Evidence"
        className="w-13 h-13 object-cover border border-slate-400 bg-slate-900 shadow-2xs"
      />
      <span className="absolute bottom-0 right-0 bg-[#0B2545] text-[#F8E7A2] text-[8px] font-mono px-1 font-bold">
        LIVE
      </span>
    </div>
  );
};

export const App: React.FC = () => {
  // Localization & Accessibility state
  const [language, setLanguage] = useState<'hi' | 'en'>('en');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<string>('report');

  // Terminal form state for civic ledger
  const [rawPhoneInput, setRawPhoneInput] = useState<string>('9876543210');
  const [isWhistleblower, setIsWhistleblower] = useState<boolean>(false);
  const [issueCategory, setIssueCategory] = useState<string>(
    'Drinking Water & Fluoride Filtration'
  );
  const [vernacularText, setVernacularText] = useState<string>(
    'चापाकल का पानी लाल निकल रहा है और मोटर का वाल्व जाम हो गया है।'
  );
  // LGD Spatial & Coordinate state
  const [resolvedLgdLocation, setResolvedLgdLocation] = useState<LGDLocation | null>(null);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<RawCoordinates>({
    latitude: 23.4385,
    longitude: 85.3245,
    accuracyMeters: 8,
  });

  const [isSimulatingSync, setIsSimulatingSync] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Live Camera Photo state
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);
  const [capturedPhotoPreviewUrl, setCapturedPhotoPreviewUrl] = useState<string | null>(null);

  // Audio Voice Recording state (Task 1.4)
  const [capturedAudioBlob, setCapturedAudioBlob] = useState<Blob | null>(null);
  const [capturedAudioDuration, setCapturedAudioDuration] = useState<number>(0);

  // Inspector state for 6-stage lifecycle progress tracker (Task 1.4)
  const [selectedTicketForTracker, setSelectedTicketForTracker] = useState<OfflineDraftSubmission | null>(null);

  // Inspector state for Panchayat Endorsement Review Modal (Task 1.5)
  const [selectedTicketForEndorsement, setSelectedTicketForEndorsement] = useState<OfflineDraftSubmission | null>(null);

  // Filter tab for the persistence ledger
  const [activeLedgerTab, setActiveLedgerTab] = useState<'ALL' | 'QUEUED' | 'DRAFT' | 'SYNCED'>('ALL');

  // Filter tab for the Panchayat Verification Desk
  const [deskFilter, setDeskFilter] = useState<'ALL' | 'PENDING' | 'ENDORSED' | 'REJECTED'>('PENDING');

  // State for AI Problem Boundary Brief (Task 2.2)
  const [activeGeneratedBrief, setActiveGeneratedBrief] = useState<EngineeringProblemBrief | null>(null);
  const [selectedBriefForView, setSelectedBriefForView] = useState<EngineeringProblemBrief | null>(null);
  const [isSavingBrief, setIsSavingBrief] = useState<boolean>(false);
  const [briefSectorFilter, setBriefSectorFilter] = useState<string>('ALL');

  // State for Multidisciplinary Teaming & Panchayat Queries (Task 2.3)
  const [selectedBriefForTeam, setSelectedBriefForTeam] = useState<EngineeringProblemBrief | null>(null);
  const [selectedBriefForQuery, setSelectedBriefForQuery] = useState<EngineeringProblemBrief | null>(null);

  // State for Faculty 70/30 Matchmaker (Task 2.4)
  const [selectedTeamForMentor, setSelectedTeamForMentor] = useState<{
    brief: EngineeringProblemBrief;
    team: StudentTeam | null;
  } | null>(null);

  // Reactive IndexedDB queries
  const allSubmissions = useLiveQuery(() => db.draftSubmissions.toArray(), [], []);
  const queuedSubmissions = useLiveQuery(
    () => db.draftSubmissions.where('syncStatus').equals('QUEUED').toArray(),
    [],
    []
  );
  const allBriefs = useLiveQuery(() => db.engineeringBriefs.toArray(), [], []);
  const allTeams = useLiveQuery(() => db.studentTeams.toArray(), [], []);

  // Computed audit counters for Panchayat Desk
  const pendingEndorsementsCount = (allSubmissions || []).filter(
    (s) =>
      !s.masterLifecycleStatus ||
      (s.masterLifecycleStatus !== 'ENDORSED_MASTER' &&
        s.masterLifecycleStatus !== 'REJECTED_SPAM')
  ).length;

  const endorsedSubmissionsCount = (allSubmissions || []).filter(
    (s) => s.masterLifecycleStatus === 'ENDORSED_MASTER'
  ).length;

  // Register background network restoration auto-sync worker (Task 1.4)
  useEffect(() => {
    const cleanup = initAutoSyncListener((syncedCount) => {
      setStatusNotification({
        text:
          language === 'hi'
            ? `नेटवर्क पुनः कनेक्ट हुआ: ${syncedCount} ऑफ़लाइन रिपोर्ट स्वतः सिंक हो गईं!`
            : `Network restored: ${syncedCount} queued reports auto-synced to Central Master!`,
        type: 'success',
      });
      setTimeout(() => setStatusNotification(null), 5000);
    });
    return cleanup;
  }, [language]);

  // Dynamic PII mask and hash preview
  const previewMaskedId = generateMaskedCitizenId(rawPhoneInput);

  // Add draft to IndexedDB with Anti-Rubber-Stamp Deduplication & Intensity Clustering
  const handleSaveToTerminal = async (targetStatus: 'DRAFT' | 'QUEUED') => {
    try {
      if (!rawPhoneInput || rawPhoneInput.replace(/\D/g, '').length < 10) {
        setStatusNotification({
          text:
            language === 'hi'
              ? 'कृपया वैध 10-अंकीय मोबाइल नंबर दर्ज करें।'
              : 'Please enter a valid 10-digit citizen mobile number.',
          type: 'error',
        });
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

      // Deduplication & Spatial Clustering Heuristic (Task 1.5)
      const existingList = allSubmissions || [];
      const clusterResult = calculateIntensityScore(existingList, newDraft);

      if (clusterResult.isDuplicate) {
        setStatusNotification({
          text:
            language === 'hi'
              ? `नागरिक डुप्लिकेट प्रविष्टि: यह समस्या आपके नंबर से पूर्व में दर्ज की जा चुकी है (टिकट ID: #${clusterResult.clusteredMasterId?.slice(0, 8)})।`
              : `Duplicate Report Flagged: Identical report already recorded for this citizen token (#${clusterResult.clusteredMasterId?.slice(0, 8)}).`,
          type: 'info',
        });
        return;
      }

      if (clusterResult.clusteredMasterId) {
        // Clustered with existing master issue in same Panchayat or < 1km
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

      setStatusNotification({
        text:
          language === 'hi'
            ? `नागरिक शिकायत पत्र सफलतापूर्वक ${targetStatus === 'QUEUED' ? 'कतारबद्ध' : 'सहेजा'} गया (${newDraft.maskedCitizenId})${clusterNotice}`
            : `Civic record successfully registered as ${targetStatus} (${newDraft.maskedCitizenId})${clusterNotice}.`,
        type: 'success',
      });
      setTimeout(() => setStatusNotification(null), 4500);
    } catch (err) {
      console.error(err);
      setStatusNotification({
        text: err instanceof Error ? err.message : 'Database error occurred',
        type: 'error',
      });
    }
  };

  // Panchayat Endorsement & Rejection Handlers (Task 1.5)
  const handleEndorseSubmission = async (
    draftId: string,
    data: {
      severity: SeverityLevel;
      affectedHouseholds: number;
      inspectionNote: string;
      inspectorId: string;
    }
  ) => {
    await endorseSubmission(
      draftId,
      data.severity,
      data.affectedHouseholds,
      data.inspectionNote,
      data.inspectorId
    );
    setStatusNotification({
      text:
        language === 'hi'
          ? 'पंचायत सत्यापन सफल! समस्या तकनीकी विश्वविद्यालयों हेतु आधिकारिक रूप से प्रेषित (ENDORSED_MASTER)।'
          : 'Panchayat Verification Endorsed! Issue escalated to Engineering Universities (Step 3).',
      type: 'success',
    });
    setTimeout(() => setStatusNotification(null), 5000);
  };

  const handleRejectSubmission = async (draftId: string, reason: string) => {
    await rejectSubmission(draftId, reason, 'JH-BDO-RNC-04');
    setStatusNotification({
      text:
        language === 'hi'
          ? 'प्रविष्टि अस्वीकृत / स्पैम के रूप में दर्ज की गई।'
          : 'Submission marked as Rejected / Non-Actionable.',
      type: 'info',
    });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // AI Problem Boundary Brief Handlers (Task 2.2)
  const handleGenerateBrief = (submission: OfflineDraftSubmission) => {
    const brief = generateProblemBoundaryBrief({
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
    setActiveGeneratedBrief(brief);
  };

  const handleSaveGeneratedBrief = async (brief: EngineeringProblemBrief) => {
    setIsSavingBrief(true);
    try {
      await saveEngineeringBrief(brief);
      setStatusNotification({
        text:
          language === 'hi'
            ? `इंजीनियरिंग समस्या सीमा विनिर्देश सफलतापूर्वक चुनौती बोर्ड में सहेजा गया (${brief.id})!`
            : `Engineering Problem Brief successfully registered to Challenge Board (${brief.id})!`,
        type: 'success',
      });
      setTimeout(() => setStatusNotification(null), 4500);
    } catch (err) {
      console.error(err);
      setStatusNotification({
        text: err instanceof Error ? err.message : 'Failed to save brief to Challenge Board',
        type: 'error',
      });
    } finally {
      setIsSavingBrief(false);
    }
  };

  // Batch sync action
  const handleBatchSync = async () => {
    if (!queuedSubmissions || queuedSubmissions.length === 0) return;
    setIsSimulatingSync(true);
    setStatusNotification({
      text:
        language === 'hi'
          ? 'केंद्रीय डीएचटीई रजिस्ट्री में रिपोर्ट सिंक की जा रही हैं...'
          : 'Synchronizing queued records to Central DHTE Database...',
      type: 'info',
    });

    try {
      await new Promise((res) => setTimeout(res, 1800));

      for (const item of queuedSubmissions) {
        const generatedMasterId = `JH-2026-M-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        await markAsSynced(item.id, generatedMasterId);
      }

      setStatusNotification({
        text:
          language === 'hi'
            ? `${queuedSubmissions.length} नागरिक रिपोर्ट सफलतापूर्वक केंद्रीय मास्टर डेटाबेस में दर्ज हो गईं!`
            : `Sync Complete: ${queuedSubmissions.length} offline reports promoted to Central Master Register.`,
        type: 'success',
      });
      setTimeout(() => setStatusNotification(null), 5000);
    } catch (err) {
      console.error(err);
      setStatusNotification({
        text: 'Sync error occurred. Local reports remain safely cached in IndexedDB.',
        type: 'error',
      });
    } finally {
      setIsSimulatingSync(false);
    }
  };

  // Filtered ledger view
  const filteredList = (allSubmissions || []).filter((sub: OfflineDraftSubmission) => {
    if (activeLedgerTab === 'ALL') return true;
    return sub.syncStatus === activeLedgerTab;
  });

  // Filtered list for Panchayat Verification Desk (Task 1.5)
  const panchayatDeskList = (allSubmissions || []).filter((sub: OfflineDraftSubmission) => {
    if (deskFilter === 'ALL') return true;
    if (deskFilter === 'PENDING') {
      return (
        !sub.masterLifecycleStatus ||
        (sub.masterLifecycleStatus !== 'ENDORSED_MASTER' &&
          sub.masterLifecycleStatus !== 'REJECTED_SPAM')
      );
    }
    if (deskFilter === 'ENDORSED') {
      return sub.masterLifecycleStatus === 'ENDORSED_MASTER';
    }
    if (deskFilter === 'REJECTED') {
      return sub.masterLifecycleStatus === 'REJECTED_SPAM';
    }
    return true;
  });

  // Dynamic root font scale class
  const fontScaleClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  const contrastContainerClass = highContrast
    ? 'bg-black text-white'
    : 'bg-[#F8FAFC] text-slate-900';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans antialiased ${fontScaleClass} ${contrastContainerClass}`}
    >
      {/* Official Government Header */}
      <GovtHeader
        language={language}
        onLanguageChange={setLanguage}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        highContrast={highContrast}
        onHighContrastToggle={() => setHighContrast(!highContrast)}
        activeNavTab={activeNavTab}
        onNavTabChange={setActiveNavTab}
        isSyncing={isSimulatingSync}
        onSyncTrigger={handleBatchSync}
      />

      {/* Main Administrative Workspace */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Anti-Fraud Sarkari Warning Ribbon */}
        <section
          className="bg-yellow-100 border-2 border-yellow-500 text-yellow-950 p-3 rounded-none shadow-2xs flex items-center gap-3"
          role="alert"
        >
          <div className="bg-yellow-500 text-black p-1.5 shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-950" aria-hidden="true" />
          </div>
          <div className="text-xs leading-snug">
            <span className="font-extrabold uppercase tracking-wide mr-1.5 underline">
              {language === 'hi' ? 'सतर्कता चेतावनी / OFFICIAL ADVISORY:' : 'ANTI-FRAUD STATUTORY NOTICE:'}
            </span>
            <span>
              {language === 'hi'
                ? 'झारखंड सरकार द्वारा यह सेवा पूर्णतः निःशुल्क संचालित है। किसी भी व्यक्ति या कॉल पर बैंक विवरण, यूपीआई या भुगतान न करें। अनाधिकृत लेन-देन कानूनी अपराध है।'
                : 'Government of Jharkhand provides this intake service completely FREE of charge. Do NOT disclose banking credentials, OTPs, or process fees to anyone. Violators will be prosecuted under IT Act 2000.'}
            </span>
          </div>
        </section>

        {/* State Departmental Master Banner */}
        <section className="bg-white border border-slate-300 rounded-none p-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#7A1B1B] text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                  FORM NIC-DHTE-JH-01
                </span>
                <span className="text-[11px] font-bold text-slate-600 font-mono">
                  REF: SIH-26043 / SPRINT-1 / SHOE-1
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 uppercase">
                {language === 'hi'
                  ? 'नागरिक जमीनी अंतर्ग्रहण व ऑफ़लाइन सत्यापन बहीखाता'
                  : 'Official Civic Problem Intake & Local Government Verification Ledger'}
              </h2>
            </div>

            {/* Quick Audit Counters */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 border border-slate-300 px-3 py-1 text-center">
                <div className="text-[10px] font-bold text-slate-600 uppercase">
                  {language === 'hi' ? 'सक्रिय कतार' : 'Queue Length'}
                </div>
                <div className="text-base font-black text-[#7A1B1B]">
                  {queuedSubmissions ? queuedSubmissions.length : 0}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 px-3 py-1 text-center">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">
                  {language === 'hi' ? 'कुल प्रविष्टियां' : 'Total Entries'}
                </div>
                <div className="text-base font-black text-emerald-900">
                  {allSubmissions ? allSubmissions.length : 0}
                </div>
              </div>
            </div>
          </div>

          {/* System Notification Toast */}
          {statusNotification && (
            <div
              className={`mt-3 p-2.5 text-xs font-semibold border flex items-center gap-2 ${
                statusNotification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                  : statusNotification.type === 'info'
                  ? 'bg-blue-50 border-blue-400 text-blue-900'
                  : 'bg-red-50 border-red-400 text-red-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              <span>{statusNotification.text}</span>
            </div>
          )}
        </section>

        {/* Module Switcher Tabs (Citizen Ingestion vs Panchayat Verification Desk) */}
        <div className="bg-white border border-slate-300 p-1 flex flex-wrap items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveNavTab('report')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNavTab !== 'panchayat'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>
              {language === 'hi'
                ? 'नागरिक इनटेक टर्मिनल (Shoe 1)'
                : 'Citizen Ingestion Terminal'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('panchayat')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNavTab === 'panchayat'
                ? 'bg-[#7A1B1B] text-[#F8E7A2] shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {language === 'hi'
                ? 'पंचायत सत्यापन डेस्क (Quality Gate)'
                : 'Panchayat Verification Desk (Gate)'}
            </span>
            {pendingEndorsementsCount > 0 && (
              <span className="bg-[#FF9933] text-black px-1.5 py-0.2 text-[10px] font-mono font-black animate-pulse">
                {pendingEndorsementsCount} {language === 'hi' ? 'जांच बाकी' : 'Pending'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('academic')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNavTab === 'academic'
                ? 'bg-[#2A6F86] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {language === 'hi'
                ? 'अकादमिक चुनौती बोर्ड (Shoe 2)'
                : 'Academic Challenge Board (Shoe 2)'}
            </span>
            {allBriefs && allBriefs.length > 0 && (
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] font-mono font-black">
                {allBriefs.length} {language === 'hi' ? 'समस्याएँ' : 'Briefs'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('faculty')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeNavTab === 'faculty'
                ? 'bg-[#7A1B1B] text-[#F8E7A2] shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>
              {language === 'hi'
                ? 'संकाय मेंटर डेस्क (Shoe 3)'
                : 'Faculty Mentor Desk (Shoe 3)'}
            </span>
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] font-mono font-black">
              70/30 Cap
            </span>
          </button>
        </div>

        {/* View Switch: Panchayat Verification Desk vs Citizen Ingestion Terminal */}
        {activeNavTab === 'panchayat' ? (
          <section className="bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden">
            {/* Bureau Masthead Banner */}
            <div className="bg-[#0B2545] text-white py-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <div className="bg-[#7A1B1B] text-[#F8E7A2] p-2 border border-amber-900/60 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                      GOVERNMENT OF JHARKHAND
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      DIRECTORATE OF PANCHAYATI RAJ &bull; STATUTORY AUDIT
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5">
                    {language === 'hi'
                      ? 'ग्राम पंचायत स्थलीय सत्यापन एवं गुणवत्ता द्वार'
                      : 'Gram Panchayat Field Verification & Endorsement Quality Gate'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {language === 'hi'
                      ? 'बीडीओ / पंचायत सचिव: स्थलीय निरीक्षण, गंभीरता स्तर व प्रभावित परिवारों के सत्यापन के उपरांत ही समस्या विश्वविद्यालयों को प्रेषित होगी।'
                      : 'BDO / Panchayat Secretary Gate: Only verified civic challenges with mandatory 20+ char inspection notes escalate to engineering solvers.'}
                  </p>
                </div>
              </div>

              {/* Desk Audit Counters */}
              <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 font-mono text-xs">
                <div className="bg-white/10 border border-white/20 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-amber-300 uppercase font-sans font-bold">
                    {language === 'hi' ? 'सत्यापन बाकी' : 'Pending Gate'}
                  </div>
                  <div className="text-lg font-black text-white">
                    {pendingEndorsementsCount}
                  </div>
                </div>

                <div className="bg-emerald-900/60 border border-emerald-500 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-sans font-bold">
                    {language === 'hi' ? 'विश्वविद्यालय प्रेषित' : 'Endorsed Master'}
                  </div>
                  <div className="text-lg font-black text-emerald-200">
                    {endorsedSubmissionsCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Header Filter Bar */}
            <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>{language === 'hi' ? 'सत्यापन कार्यसूची' : 'Verification Queue'}:</span>
                <span className="px-1.5 py-0.2 bg-[#0B2545] text-white font-mono text-[10px]">
                  {panchayatDeskList.length}
                </span>
              </div>

              {/* Desk Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 text-[11px]">
                {(['PENDING', 'ENDORSED', 'REJECTED', 'ALL'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDeskFilter(tab)}
                    className={`px-2.5 py-1 font-bold uppercase rounded-none transition-colors cursor-pointer ${
                      deskFilter === tab
                        ? 'bg-[#7A1B1B] text-[#F8E7A2]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'PENDING'
                      ? `${language === 'hi' ? 'जांच बाकी' : 'Pending'} (${pendingEndorsementsCount})`
                      : tab === 'ENDORSED'
                      ? `${language === 'hi' ? 'सत्यापित' : 'Endorsed'} (${endorsedSubmissionsCount})`
                      : tab === 'REJECTED'
                      ? `${language === 'hi' ? 'अस्वीकृत' : 'Rejected'}`
                      : `${language === 'hi' ? 'सभी' : 'All'}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Desk Queue Items */}
            {panchayatDeskList.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 border border-slate-300 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-700" />
                </div>
                <p className="text-xs font-bold text-slate-800 uppercase">
                  {language === 'hi'
                    ? 'वर्तमान में इस श्रेणी में कोई प्रविष्टि नहीं है'
                    : 'No submissions in this verification queue'}
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                  {language === 'hi'
                    ? 'नागरिक इनटेक से नई रिपोर्ट दर्ज होने पर यहां सत्यापन हेतु प्रदर्शित होगी।'
                    : 'Incoming reports from the Citizen Intake Terminal will appear here for statutory Panchayat inspection.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {panchayatDeskList.map((entry: OfflineDraftSubmission, idx: number) => {
                  const isEndorsed = entry.masterLifecycleStatus === 'ENDORSED_MASTER';
                  const isRejected = entry.masterLifecycleStatus === 'REJECTED_SPAM';
                  const isPending = !isEndorsed && !isRejected;

                  return (
                    <div
                      key={entry.id}
                      className={`p-4 hover:bg-slate-50/80 transition-colors border-l-4 ${
                        isEndorsed
                          ? 'border-l-emerald-600'
                          : isRejected
                          ? 'border-l-red-600'
                          : 'border-l-amber-500 bg-amber-50/15'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 flex-1">
                          {/* Site Evidence Thumbnail */}
                          <BlobThumbnail blob={entry.photoBlob} previewUrl={entry.photoPreviewUrl} />

                          <div className="space-y-1.5 flex-1">
                            {/* Header Status & Citizen Identification Strip */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-200 text-slate-800 border border-slate-300">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>

                              {/* Lifecycle Status Pill */}
                              {isEndorsed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-400">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>ENDORSED MASTER ISSUE</span>
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-900 border border-red-400">
                                  <Ban className="w-3 h-3 text-red-700" />
                                  <span>REJECTED / SPAM</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-400 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  <span>PENDING FIELD INSPECTION</span>
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

                              {/* Citizen Impact Counter Badge */}
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 border ${
                                  entry.intensityScore > 1
                                    ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                <Users className="w-3 h-3 text-[#7A1B1B]" />
                                <span>Impact: {entry.intensityScore || 1} Citizens Clustered</span>
                              </span>

                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(entry.timestamp).toLocaleDateString([], {
                                  day: '2-digit',
                                  month: 'short',
                                })}{' '}
                                &bull;{' '}
                                {new Date(entry.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Category, Transcript & Voice */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {entry.aiTriageCategory}
                              </span>
                              {entry.audioDurationSeconds ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300">
                                  <Volume2 className="w-2.5 h-2.5" />
                                  <span>Voice Memo: {entry.audioDurationSeconds}s</span>
                                </span>
                              ) : null}
                            </div>

                            {entry.transcriptionDraft && (
                              <p className="text-xs text-slate-700 italic bg-white p-2 border border-slate-200">
                                &ldquo;{entry.transcriptionDraft}&rdquo;
                              </p>
                            )}

                            {/* LGD Hierarchy Strip */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-mono">
                              <span className="inline-flex items-center gap-1 text-slate-800">
                                <MapPin className="w-3 h-3 text-[#7A1B1B]" />
                                <span>
                                  GP: <strong>{entry.lgdLocation?.panchayatName}</strong> ({entry.lgdLocation?.blockName}, {entry.lgdLocation?.districtName}) &bull; LGD Code: <strong className="text-emerald-800">{entry.lgdLocation?.panchayatCode}</strong>
                                </span>
                              </span>
                            </div>

                            {/* Endorsement Audit Stamp Box */}
                            {isEndorsed && (
                              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 text-xs space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-emerald-200 pb-1">
                                  <span className="font-black text-emerald-900 uppercase flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Panchayat Statutory Endorsement Stamp</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-emerald-800">
                                    Inspector: {entry.panchayatInspectorId || 'JH-BDO-RNC-04'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-950 pt-0.5">
                                  <span>
                                    Severity: <strong className="font-black text-[#7A1B1B]">{entry.severity || 'MEDIUM'}</strong>
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    Affected: <strong className="font-black text-slate-900">{entry.affectedHouseholdCount || 1} Families</strong>
                                  </span>
                                </div>
                                {entry.panchayatInspectionNotes && (
                                  <div className="text-[11px] text-emerald-900 italic bg-white/80 p-1.5 border border-emerald-200 mt-1">
                                    <strong>Inspection Note:</strong> &ldquo;{entry.panchayatInspectionNotes}&rdquo;
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Rejection Stamp */}
                            {isRejected && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-300 text-xs text-red-900">
                                <span className="font-bold">Rejection Rationale: </span>
                                <span>{entry.rejectionReason || 'Classified as duplicate or non-actionable'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setSelectedTicketForEndorsement(entry)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title="Conduct statutory on-site inspection review"
                            >
                              <ShieldCheck className="w-4 h-4 text-amber-300" />
                              <span>{language === 'hi' ? 'निरीक्षण एवं सत्यापन' : 'Inspect & Endorse'}</span>
                            </button>
                          )}

                          {isEndorsed && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedTicketForEndorsement(entry)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Re-inspect endorsement record"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                <span>{language === 'hi' ? 'पुनरावलोकन' : 'Review Stamp'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleGenerateBrief(entry)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Synthesize AI Engineering Problem Brief"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#7A1B1B]" />
                                <span>{language === 'hi' ? 'एआई सीमा विनिर्देश' : 'AI Brief'}</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedTicketForTracker(entry)}
                            className="px-2.5 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Track 6-Stage Progress"
                          >
                            <Activity className="w-3.5 h-3.5 text-amber-300" />
                            <span>{language === 'hi' ? 'ट्रैक' : 'Track'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : activeNavTab === 'academic' ? (
          /* Academic Engine: Solver Briefs & Challenge Board (Sprint 2) */
          <section className="bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden">
            {/* Bureau Masthead Banner */}
            <div className="bg-[#0B2545] text-white py-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <div className="bg-[#2A6F86] text-white p-2 border border-sky-400/30 shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                      GOVERNMENT OF JHARKHAND
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      DHTE &bull; QUADRUPLE-HELIX INNOVATION NETWORK (SHOE 2)
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5">
                    {language === 'hi'
                      ? 'अकादमिक इंजीनियरिंग समस्या विनिर्देश एवं चुनौती बोर्ड'
                      : 'Academic Engineering Problem Briefs & Challenge Board'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {language === 'hi'
                      ? 'सत्यापित पंचायती समस्याओं से उत्पन्न गैर-परक्राम्य इंजीनियरिंग सीमाएँ व मापनीय बेंचमार्क।'
                      : 'Non-negotiable operational boundary briefs and measurable benchmarks synthesized from endorsed civic challenges.'}
                  </p>
                </div>
              </div>

              {/* Counter badges */}
              <div className="flex items-center gap-2 font-mono text-xs self-start md:self-auto">
                <div className="bg-white/10 border border-white/20 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-amber-300 uppercase font-sans font-bold">
                    Active Briefs
                  </div>
                  <div className="text-base font-black text-white">
                    {allBriefs ? allBriefs.length : 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="font-bold text-slate-700 uppercase text-[11px] shrink-0 mr-1">
                  Sector:
                </span>
                {(
                  [
                    'ALL',
                    'WATER_RESOURCES',
                    'AGRITECH',
                    'RURAL_ENERGY',
                    'SANITATION',
                    'HEALTHCARE',
                    'CIVIL_INFRA',
                  ] as const
                ).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setBriefSectorFilter(sec)}
                    className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-none transition-colors shrink-0 cursor-pointer ${
                      briefSectorFilter === sec
                        ? 'bg-[#2A6F86] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sec.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                Showing{' '}
                {(allBriefs || []).filter(
                  (b) => briefSectorFilter === 'ALL' || b.domainSector === briefSectorFilter
                ).length}{' '}
                Registered Briefs
              </div>
            </div>

            {/* Briefs Grid */}
            <div className="p-4 bg-slate-50">
              {(() => {
                const filtered = (allBriefs || []).filter(
                  (b) => briefSectorFilter === 'ALL' || b.domainSector === briefSectorFilter
                );

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white border border-slate-300 p-10 text-center">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-300 mx-auto flex items-center justify-center text-slate-400 mb-2">
                        <Sparkles className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 uppercase">
                        {language === 'hi'
                          ? 'इस क्षेत्र में कोई सक्रिय समस्या विनिर्देश नहीं है'
                          : 'No Engineering Problem Briefs in this Sector'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                        {language === 'hi'
                          ? 'पंचायत डेस्क से सत्यापित समस्या पर "AI Brief" बटन दबाकर नया सीमा विनिर्देश तैयार करें।'
                          : 'Navigate to the Panchayat Verification Desk, select any endorsed report, and click "AI Brief" to synthesize a new boundary brief.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white border-2 border-slate-300 hover:border-[#2A6F86] p-4 flex flex-col justify-between shadow-2xs transition-colors"
                      >
                        <div className="space-y-2.5">
                          {/* Card Top Meta */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 font-bold uppercase text-[10px]">
                              {b.domainSector.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-slate-500 text-[10px]">
                              {b.id}
                            </span>
                            <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300 text-[10px] font-bold">
                              {b.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-[#0B2545] leading-snug">
                            {b.title}
                          </h4>

                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {b.contextSummary}
                          </p>

                          {/* Quick Metrics Strip */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 border border-slate-200 text-center">
                            <div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase">
                                Limits
                              </div>
                              <div className="text-xs font-black text-slate-800">
                                {b.boundaryConstraints.length} Rules
                              </div>
                            </div>
                            <div className="border-x border-slate-200">
                              <div className="text-[9px] font-bold text-slate-500 uppercase">
                                Benchmarks
                              </div>
                              <div className="text-xs font-black text-slate-800">
                                {b.measurableBenchmarks.length} Targets
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-[#7A1B1B] uppercase">
                                Max BOM
                              </div>
                              <div className="text-xs font-black text-[#7A1B1B] font-mono">
                                ₹{b.maxCostINR.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>

                          {/* Field Provenance */}
                          <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#7A1B1B]" />
                              <span>
                                {b.fieldEvidenceSummary.block}, {b.fieldEvidenceSummary.district}
                              </span>
                            </span>
                            <span className="flex items-center gap-1 font-bold text-emerald-800">
                              <Users className="w-3 h-3 text-emerald-700" />
                              <span>{b.fieldEvidenceSummary.householdImpact} Families</span>
                            </span>
                          </div>
                        </div>

                        {/* Card CTA */}
                        <div className="pt-3 border-t border-slate-200 mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.status === 'OPEN_FOR_CLAIMS' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedBriefForTeam(b)}
                                className="px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Form Multidisciplinary Team & Claim Challenge"
                              >
                                <Users className="w-3.5 h-3.5 text-amber-300" />
                                <span>
                                  {language === 'hi'
                                    ? 'टीम बनाएं एवं दावा करें'
                                    : 'Assemble Team & Claim'}
                                </span>
                              </button>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Claimed / In Roster</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBriefForQuery(b)}
                                  className="px-2.5 py-1 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-[11px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Open Panchayat Field Clarification Bridge"
                                >
                                  <MessageSquare className="w-3 h-3 text-amber-300" />
                                  <span>
                                    {language === 'hi'
                                      ? 'पंचायत स्पष्टीकरण'
                                      : 'Panchayat Bridge'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const associatedTeam = (allTeams || []).find((t) => t.briefId === b.id) || null;
                                    setSelectedTeamForMentor({ brief: b, team: associatedTeam });
                                  }}
                                  className="px-2.5 py-1 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-[11px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Request Faculty Mentorship with 70/30 Capacity Matchmaking"
                                >
                                  <GraduationCap className="w-3 h-3 text-amber-300" />
                                  <span>{language === 'hi' ? 'मेंटर अनुरोध' : 'Request Mentor'}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedBriefForView(b)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-600" />
                            <span>
                              {language === 'hi' ? 'सीमा विनिर्देश' : 'Boundary Spec'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </section>
        ) : activeNavTab === 'faculty' ? (
          /* Faculty Mentorship Appraisal & Review Desk (Shoe 3 - Task 2.4) */
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-slate-500 bg-white border border-slate-300">
                Loading Faculty Mentor Desk...
              </div>
            }
          >
            <FacultyMentorDashboard language={language} />
          </React.Suspense>
        ) : (
          /* Two-Column Official Civic Ledger Content Layout */
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

                {/* Tactile Push-to-Talk Voice Recording (Task 1.4) */}
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
                  />
                </div>

                {/* Enforced Live Camera Capture & Canvas Downscaler (Task 1.2) */}
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

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-300 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveToTerminal('QUEUED')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none shadow-2xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {language === 'hi' ? 'केंद्रीय सिंक हेतु कतारबद्ध करें' : 'Queue for Central Sync'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveToTerminal('DRAFT')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-400 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors"
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
                    onClick={handleBatchSync}
                    disabled={isSimulatingSync}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase rounded-none disabled:opacity-50 transition-colors"
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
                    className={`px-2 py-0.5 font-bold uppercase rounded-none transition-colors ${
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
                        {/* Quick Endorse Gate Action (Task 1.5) */}
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
                              onClick={() => handleGenerateBrief(entry)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title={language === 'hi' ? 'एआई इंजीनियरिंग समस्या सीमा तैयार करें' : 'Generate AI Engineering Problem Brief'}
                            >
                              <Sparkles className="w-3 h-3 text-[#7A1B1B]" />
                              <span>{language === 'hi' ? 'सीमा विनिर्देश' : 'AI Brief'}</span>
                            </button>
                          </>
                        )}

                        {/* Track 6-stage lifecycle progress modal (Task 1.4) */}
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
                            className="px-2 py-1 bg-[#0B2545] hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1"
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
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1"
                            title="Mark as synced to Central Master"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Sync</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteDraft(entry.id)}
                          className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
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
        </div>
      )}
      </main>

      {/* 6-Stage Citizen Status Tracker Modal (Task 1.4) */}
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

      {/* Panchayat Endorsement & Inspection Gate Modal (Task 1.5) */}
      {selectedTicketForEndorsement && (
        <React.Suspense fallback={null}>
          <PanchayatEndorsementModal
            submission={selectedTicketForEndorsement}
            language={language}
            onClose={() => setSelectedTicketForEndorsement(null)}
            onEndorse={handleEndorseSubmission}
            onReject={handleRejectSubmission}
          />
        </React.Suspense>
      )}

      {/* AI Engineering Problem Boundary Brief Modal (Task 2.2) */}
      {(activeGeneratedBrief || selectedBriefForView) && (
        <React.Suspense fallback={null}>
          <ProblemBriefModal
            brief={(activeGeneratedBrief || selectedBriefForView)!}
            language={language}
            onClose={() => {
              setActiveGeneratedBrief(null);
              setSelectedBriefForView(null);
            }}
            onSaveToChallengeBoard={activeGeneratedBrief ? handleSaveGeneratedBrief : undefined}
            isSaving={isSavingBrief}
          />
        </React.Suspense>
      )}

      {/* Multidisciplinary Team Assembly Modal (Task 2.3) */}
      {selectedBriefForTeam && (
        <React.Suspense fallback={null}>
          <TeamAssemblyModal
            brief={selectedBriefForTeam}
            language={language}
            onClose={() => setSelectedBriefForTeam(null)}
            onSuccess={(team) => {
              setSelectedBriefForTeam(null);
              setStatusNotification({
                text:
                  language === 'hi'
                    ? `टीम "${team.teamName}" का सफलतापूर्वक गठन हुआ और चुनौती का दावा किया गया!`
                    : `Team "${team.teamName}" successfully assembled and claimed challenge!`,
                type: 'success',
              });
              setTimeout(() => setStatusNotification(null), 4500);
            }}
          />
        </React.Suspense>
      )}

      {/* Panchayat Field Clarification Bridge Modal (Task 2.3) */}
      {selectedBriefForQuery && (
        <React.Suspense fallback={null}>
          <PanchayatQueryModal
            brief={selectedBriefForQuery}
            team={(allTeams || []).find((t) => t.briefId === selectedBriefForQuery.id) || null}
            language={language}
            onClose={() => setSelectedBriefForQuery(null)}
          />
        </React.Suspense>
      )}

      {/* Faculty 70/30 Matchmaker Modal (Task 2.4) */}
      {selectedTeamForMentor && (
        <React.Suspense fallback={null}>
          <FacultyMatchmakerModal
            brief={selectedTeamForMentor.brief}
            initialTeam={selectedTeamForMentor.team}
            language={language}
            onClose={() => setSelectedTeamForMentor(null)}
            onSuccess={() => {
              setSelectedTeamForMentor(null);
              setStatusNotification({
                text:
                  language === 'hi'
                    ? 'संकाय मेंटर अनुरोध सफलतापूर्वक समीक्षा हेतु प्रेषित किया गया!'
                    : 'Faculty mentorship request submitted for review!',
                type: 'success',
              });
              setTimeout(() => setStatusNotification(null), 4000);
            }}
          />
        </React.Suspense>
      )}

      {/* Official Formal NIC Civic Footer */}
      <GovtFooter language={language} />
    </div>
  );
};

export default App;

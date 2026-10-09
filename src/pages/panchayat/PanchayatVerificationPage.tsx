/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Panchayat Verification Desk (Workspace Route: #/panchayat)
 *
 * Panchayat Officer-owned workspace: statutory field verification queue,
 * endorsement / rejection workflow, and AI brief escalation.
 * All desk state and panchayat-specific logic live here.
 */

import React, { useState } from 'react';
import { OfflineDraftSubmission } from '../../types/ingestion';
import { WorkspacePageProps } from '../shared/workspacePageProps';
import { BlobThumbnail } from '../../components/shared/BlobThumbnail';
import { useSubmissionEndorsement } from '../../features/ingestion/hooks/useSubmissionEndorsement';
import { useProblemBriefGenerator } from '../../features/solver/hooks/useProblemBriefGenerator';
import {
  ShieldCheck,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Users,
  Activity,
  Sparkles,
  Volume2,
  MapPin,
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

/** Queue ticket categorization predicates (Panchayat Desk) */
const isTicketPending = (s: OfflineDraftSubmission): boolean => {
  const st = s.status || s.masterLifecycleStatus || 'REPORTED';
  return (
    st === 'REPORTED' ||
    st === 'AI_TRIAGED' ||
    (!s.masterLifecycleStatus && st !== 'ENDORSED_MASTER' && st !== 'REJECTED_SPAM')
  );
};

const isTicketEndorsed = (s: OfflineDraftSubmission): boolean => {
  const st = s.status || s.masterLifecycleStatus;
  return st === 'ENDORSED_MASTER';
};

const isTicketRejected = (s: OfflineDraftSubmission): boolean => {
  const st = s.status || s.masterLifecycleStatus;
  return st === 'REJECTED_SPAM';
};

export interface PanchayatVerificationPageProps extends WorkspacePageProps {
  allSubmissions: OfflineDraftSubmission[];
}

export const PanchayatVerificationPage: React.FC<PanchayatVerificationPageProps> = (props) => {
  const { session, language, notify, allSubmissions } = props;

  // ---- Desk state (page-owned) ----
  const [deskFilter, setDeskFilter] = useState<'ALL' | 'PENDING' | 'ENDORSED' | 'REJECTED'>('PENDING');
  const [selectedTicketForTracker, setSelectedTicketForTracker] = useState<OfflineDraftSubmission | null>(null);
  const [selectedTicketForEndorsement, setSelectedTicketForEndorsement] = useState<OfflineDraftSubmission | null>(null);

  const { endorse, reject } = useSubmissionEndorsement(session, language, notify);
  const { activeBrief, isGenerating, generate, save, clear } = useProblemBriefGenerator(language, notify);

  // Desk audit counters
  const pendingEndorsementsCount = (allSubmissions || []).filter(isTicketPending).length;
  const endorsedSubmissionsCount = (allSubmissions || []).filter(isTicketEndorsed).length;
  const rejectedSubmissionsCount = (allSubmissions || []).filter(isTicketRejected).length;

  // Filtered list for the verification queue
  const panchayatDeskList = (allSubmissions || []).filter((sub: OfflineDraftSubmission) => {
    if (deskFilter === 'ALL') return true;
    if (deskFilter === 'PENDING') return isTicketPending(sub);
    if (deskFilter === 'ENDORSED') return isTicketEndorsed(sub);
    if (deskFilter === 'REJECTED') return isTicketRejected(sub);
    return true;
  });

  return (
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
                ? `${language === 'hi' ? 'अस्वीकृत' : 'Rejected'} (${rejectedSubmissionsCount})`
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
            const entryStatus = entry.status || entry.masterLifecycleStatus || 'REPORTED';
            const isEndorsed = entryStatus === 'ENDORSED_MASTER';
            const isRejected = entryStatus === 'REJECTED_SPAM';
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
                        ) : entryStatus === 'AI_TRIAGED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-400">
                            <AlertTriangle className="w-3 h-3 text-blue-700" />
                            <span>AI TRIAGED &bull; PENDING PANCHAYAT</span>
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
                          onClick={() => generate(entry)}
                          disabled={isGenerating}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
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
    </section>
  );
};

export default PanchayatVerificationPage;

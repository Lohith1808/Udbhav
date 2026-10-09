/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Application Shell — Official Civic Ledger & Ground-Zero Ingestion Terminal
 *
 * The shell owns shared infrastructure only:
 * - Session state and mock authentication (src/context/SessionContext)
 * - Role-based view routing & route protection (src/auth/useWorkspaceView,
 *   src/config/roleRoutes.ts)
 * - Portal-wide accessibility settings (language / font size / contrast)
 * - Cross-tab sync bus subscription and background auto-sync worker
 * - Batch sync to the Central Master register
 * - Global modals (profile verification, AI key configuration)
 *
 * Each stakeholder workspace is an independent page module under
 * src/pages/<role>/ — adding or changing a workspace does not require
 * editing this file or another workspace.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, markAsSynced } from './lib/db';
import { SessionProvider, useSession } from './context/SessionContext';
import { GovtHeader } from './components/common/GovtHeader';
import { GovtFooter } from './components/common/GovtFooter';
import { useWorkspaceView } from './auth/useWorkspaceView';
import { getAllowedViews, isWorkspaceViewId } from './config/roleRoutes';
import { initAutoSyncListener } from './utils/syncWorker';
import { centralSyncService } from './services/centralSyncService';
import {
  OfflineDraftSubmission,
  IssueStatus,
  SeverityLevel,
} from './types/ingestion';
import { LoginPage } from './pages/auth/LoginPage';
import { StatusNotificationState } from './pages/shared/workspacePageProps';
import { AlertTriangle, Radio } from 'lucide-react';

const ProfileVerificationModal = React.lazy(
  () =>
    import('./components/common/ProfileVerificationModal').then((m) => ({
      default: m.ProfileVerificationModal,
    }))
);
const ApiKeyConfigModal = React.lazy(
  () =>
    import('./components/common/ApiKeyConfigModal').then((m) => ({
      default: m.ApiKeyConfigModal,
    }))
);

// ---------------------------------------------------------------------------
// Workspace pages (independent stakeholder modules — lazy-loaded)
// ---------------------------------------------------------------------------
const CitizenIngestionPage = React.lazy(
  () => import('./pages/citizen/CitizenIngestionPage').then((m) => ({ default: m.CitizenIngestionPage }))
);
const PanchayatVerificationPage = React.lazy(
  () =>
    import('./pages/panchayat/PanchayatVerificationPage').then((m) => ({
      default: m.PanchayatVerificationPage,
    }))
);
const AcademicChallengePage = React.lazy(
  () => import('./pages/student/AcademicChallengePage').then((m) => ({ default: m.AcademicChallengePage }))
);
const FacultyMentorPage = React.lazy(
  () => import('./pages/faculty/FacultyMentorPage').then((m) => ({ default: m.FacultyMentorPage }))
);
const CsrEscrowPage = React.lazy(
  () => import('./pages/csr/CsrEscrowPage').then((m) => ({ default: m.CsrEscrowPage }))
);
const GovernmentCommandPage = React.lazy(
  () =>
    import('./pages/government/GovernmentCommandPage').then((m) => ({
      default: m.GovernmentCommandPage,
    }))
);

/** Governance personas simulatable inside the legacy dashboards. */
const SIMULATED_GOVERNANCE_ROLES: ReadonlyArray<string> = [
  'FACULTY_MENTOR',
  'GOVT_ADMIN',
  'INDUSTRY_CSR',
  'ACCREDITED_EVALUATOR',
];

const AppContent: React.FC = () => {
  const {
    session,
    isAuthenticated,
    logout,
    isVerificationModalOpen,
    closeVerificationModal,
  } = useSession();

  // ---- Shared localization & accessibility state ----
  const [language, setLanguage] = useState<'hi' | 'en'>('en');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isAiConfigOpen, setIsAiConfigOpen] = useState<boolean>(false);

  // ---- Shared shell state ----
  const [isSimulatingSync, setIsSimulatingSync] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<StatusNotificationState | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<
    'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR'
  >('INDUSTRY_CSR');
  const notificationTimerRef = useRef<number | null>(null);

  // ---- Shared reactive data (client-side IndexedDB via Dexie) ----
  const allSubmissions = useLiveQuery(() => db.draftSubmissions.toArray(), [], []);
  const queuedSubmissions = useLiveQuery(
    () => db.draftSubmissions.where('syncStatus').equals('QUEUED').toArray(),
    [],
    []
  );
  const allBriefs = useLiveQuery(() => db.engineeringBriefs.toArray(), [], []);
  const allTeams = useLiveQuery(() => db.studentTeams.toArray(), [], []);

  // ---- Role-based view resolution + route protection ----
  const { view: currentView, navigateTo } = useWorkspaceView(isAuthenticated ? session : null);

  // Keep the legacy dashboards' simulated persona aligned with the real session
  useEffect(() => {
    if (session && SIMULATED_GOVERNANCE_ROLES.includes(session.role)) {
      setSimulatedRole(
        session.role as 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.role]);

  // ---- Status toast helper (shared by shell + workspace pages) ----
  const notify = (text: string, type: StatusNotificationState['type']) => {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
    }
    setStatusNotification({ text, type });
    notificationTimerRef.current = window.setTimeout(() => setStatusNotification(null), 4500);
  };

  // Multi-Device Cross-Tab Real-Time Sync Bus Listener (Task 4.4 & Bug 4 Resolution)
  useEffect(() => {
    const unsubscribe = centralSyncService.subscribe(async (msg) => {
      if (msg.type === 'RECORD_CREATED') {
        const payload = msg.payload as { type?: string; id?: string; draft?: OfflineDraftSubmission };
        if (payload?.type === 'draft' && payload?.draft) {
          const existing = await db.draftSubmissions.get(payload.draft.id);
          if (!existing) {
            await db.draftSubmissions.put(payload.draft);
          }
        }
        notify(
          language === 'hi'
            ? 'नया नागरिक शिकायत पत्र प्राप्त हुआ — पंचायत सत्यापन कतार अद्यतित!'
            : 'New citizen intake report received — Panchayat verification queue updated immediately!',
          'info'
        );
      } else if (msg.type === 'ENDORSEMENT_COMPLETED') {
        const payload = msg.payload as {
          draftId?: string;
          data?: {
            severity: SeverityLevel;
            affectedHouseholds: number;
            inspectionNote: string;
            inspectorId: string;
            timestamp?: number;
          };
        };
        if (payload?.draftId && payload?.data) {
          const existing = await db.draftSubmissions.get(payload.draftId);
          if (existing && existing.masterLifecycleStatus !== 'ENDORSED_MASTER') {
            await db.draftSubmissions.update(payload.draftId, {
              status: 'ENDORSED_MASTER',
              masterLifecycleStatus: 'ENDORSED_MASTER',
              severity: payload.data.severity,
              affectedHouseholdCount: payload.data.affectedHouseholds,
              panchayatInspectionNotes: payload.data.inspectionNote,
              panchayatInspectorId: payload.data.inspectorId,
              panchayatEndorsedAt: payload.data.timestamp || Date.now(),
            });
          }
        }
        notify(
          language === 'hi'
            ? 'पंचायत सत्यापन सफल! समस्या आधिकारिक रूप से प्रेषित (ENDORSED_MASTER)।'
            : 'Panchayat endorsement synchronized across terminals (ENDORSED_MASTER)!',
          'success'
        );
      } else if (msg.type === 'RECORD_UPDATED') {
        const payload = msg.payload as { id?: string; status?: IssueStatus; masterLifecycleStatus?: IssueStatus };
        if (payload?.id) {
          const targetStatus = payload.status || payload.masterLifecycleStatus;
          if (targetStatus) {
            const existing = await db.draftSubmissions.get(payload.id);
            if (existing && existing.masterLifecycleStatus !== targetStatus) {
              await db.draftSubmissions.update(payload.id, {
                status: targetStatus,
                masterLifecycleStatus: targetStatus,
              });
            }
          }
        }
      }
    });

    const handleToastEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.text) {
        notify(detail.text, detail.type || 'info');
      }
    };
    window.addEventListener('udbhav:toast', handleToastEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('udbhav:toast', handleToastEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Register background network restoration auto-sync worker (Task 1.4)
  useEffect(() => {
    const cleanup = initAutoSyncListener((syncedCount) => {
      notify(
        language === 'hi'
          ? `नेटवर्क पुनः कनेक्ट हुआ: ${syncedCount} ऑफ़लाइन रिपोर्ट स्वतः सिंक हो गईं!`
          : `Network restored: ${syncedCount} queued reports auto-synced to Central Master!`,
        'success'
      );
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Batch sync action (queued reports → Central DHTE Master Register)
  const handleBatchSync = async () => {
    if (!queuedSubmissions || queuedSubmissions.length === 0) return;
    setIsSimulatingSync(true);
    notify(
      language === 'hi'
        ? 'केंद्रीय डीएचटीई रजिस्ट्री में रिपोर्ट सिंक की जा रही हैं...'
        : 'Synchronizing queued records to Central DHTE Database...',
      'info'
    );

    try {
      await new Promise((res) => setTimeout(res, 1800));

      for (const item of queuedSubmissions) {
        const generatedMasterId = `JH-2026-M-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        await markAsSynced(item.id, generatedMasterId);
      }

      notify(
        language === 'hi'
          ? `${queuedSubmissions.length} नागरिक रिपोर्ट सफलतापूर्वक केंद्रीय मास्टर डेटाबेस में दर्ज हो गईं!`
          : `Sync Complete: ${queuedSubmissions.length} offline reports promoted to Central Master Register.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      notify('Sync error occurred. Local reports remain safely cached in IndexedDB.', 'error');
    } finally {
      setIsSimulatingSync(false);
    }
  };

  // ---- Authentication gate: unauthenticated users see only the login page ----
  if (!isAuthenticated || !session || !currentView) {
    return <LoginPage />;
  }

  // Dynamic root font scale class
  const fontScaleClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  const contrastContainerClass = highContrast
    ? 'bg-black text-white'
    : 'bg-[#F8FAFC] text-slate-900';

  // Role-filtered navigation: only the permitted workspace routes are rendered.
  const navItems = getAllowedViews(session.role).map((viewDef) => ({
    id: viewDef.id,
    labelEn: viewDef.labelEn,
    labelHi: viewDef.labelHi,
  }));

  return (
    <div
      className={`min-h-screen flex flex-col font-sans antialiased ${fontScaleClass} ${contrastContainerClass}`}
    >
      {/* Official Government Header (role-filtered navigation + logout) */}
      <GovtHeader
        language={language}
        onLanguageChange={setLanguage}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        highContrast={highContrast}
        onHighContrastToggle={() => setHighContrast(!highContrast)}
        navItems={navItems}
        activeViewId={currentView}
        onNavigate={(viewId) => {
          if (isWorkspaceViewId(viewId)) {
            navigateTo(viewId);
          }
        }}
        onOpenAiSettings={() => setIsAiConfigOpen(true)}
        isSyncing={isSimulatingSync}
        onSyncTrigger={handleBatchSync}
        onLogout={logout}
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
              role="status"
            >
              <Radio className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              <span>{statusNotification.text}</span>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* Active role-guarded workspace page (independent module)          */}
        {/* ============================================================== */}
        <React.Suspense
          fallback={
            <div className="p-8 text-center text-slate-500 bg-white border border-slate-300">
              Loading workspace...
            </div>
          }
        >
          {currentView === 'report' && (
            <CitizenIngestionPage
              session={session}
              language={language}
              fontScaleClass={fontScaleClass}
              statusNotification={statusNotification}
              notify={notify}
              onOpenAiSettings={() => setIsAiConfigOpen(true)}
              isSyncing={isSimulatingSync}
              onSyncTrigger={handleBatchSync}
              allSubmissions={allSubmissions || []}
              queuedSubmissions={queuedSubmissions || []}
            />
          )}
          {currentView === 'panchayat' && (
            <PanchayatVerificationPage
              session={session}
              language={language}
              fontScaleClass={fontScaleClass}
              statusNotification={statusNotification}
              notify={notify}
              onOpenAiSettings={() => setIsAiConfigOpen(true)}
              isSyncing={isSimulatingSync}
              onSyncTrigger={handleBatchSync}
              allSubmissions={allSubmissions || []}
            />
          )}
          {currentView === 'academic' && (
            <AcademicChallengePage
              session={session}
              language={language}
              fontScaleClass={fontScaleClass}
              statusNotification={statusNotification}
              notify={notify}
              onOpenAiSettings={() => setIsAiConfigOpen(true)}
              isSyncing={isSimulatingSync}
              onSyncTrigger={handleBatchSync}
              allBriefs={allBriefs || []}
              allTeams={allTeams || []}
            />
          )}
          {currentView === 'faculty' && (
            <FacultyMentorPage
              session={session}
              language={language}
              fontScaleClass={fontScaleClass}
              statusNotification={statusNotification}
              notify={notify}
              onOpenAiSettings={() => setIsAiConfigOpen(true)}
              isSyncing={isSimulatingSync}
              onSyncTrigger={handleBatchSync}
            />
          )}
          {currentView === 'csr' && (
            <CsrEscrowPage
              session={session}
              language={language}
              fontScaleClass={fontScaleClass}
              statusNotification={statusNotification}
              notify={notify}
              onOpenAiSettings={() => setIsAiConfigOpen(true)}
              isSyncing={isSimulatingSync}
              onSyncTrigger={handleBatchSync}
              simulatedRole={simulatedRole}
              onSimulatedRoleChange={setSimulatedRole}
            />
          )}
          {currentView === 'gis' && (
            <GovernmentCommandPage
              session={session}
              language={language}
              fontScaleClass={fontScaleClass}
              statusNotification={statusNotification}
              notify={notify}
              onOpenAiSettings={() => setIsAiConfigOpen(true)}
              isSyncing={isSimulatingSync}
              onSyncTrigger={handleBatchSync}
              simulatedRole={simulatedRole}
              onSimulatedRoleChange={setSimulatedRole}
            />
          )}
        </React.Suspense>
      </main>

      {/* Official Formal NIC Civic Footer */}
      <GovtFooter language={language} />

      {/* Verified Profile & Central Sync Gateway Modal (Bug 1 & 4) */}
      {isVerificationModalOpen && (
        <React.Suspense fallback={null}>
          <ProfileVerificationModal
            isOpen={isVerificationModalOpen}
            onClose={closeVerificationModal}
            language={language}
          />
        </React.Suspense>
      )}

      {/* Google Gemini 1.5 Flash AI Settings Modal (Bug 3 Resolution) */}
      {isAiConfigOpen && (
        <React.Suspense fallback={null}>
          <ApiKeyConfigModal
            isOpen={isAiConfigOpen}
            onClose={() => setIsAiConfigOpen(false)}
            language={language}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
};

export default App;

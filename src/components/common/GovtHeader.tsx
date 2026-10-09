/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Official Government of Jharkhand / NIC / GIGW 3.0 Standard Header
 * 
 * Features:
 * - 32px Deep Navy Accessibility Strip with live IST timestamp & High Contrast toggle
 * - Cross-Device Synchronization Status Pill ("Network Sync Active" / "Local Only" / "Connecting...")
 * - 3.5px Indian Tricolor sub-border
 * - Institutional Emblem Masthead with official State Seal & Stamp Box for OfflineQueueBadge
 * - Deep Administrative Maroon (#7A1B1B) & Gold (#F8E7A2) Civic Navbar
 * - Government Marquee / Live Ticker Bulletin
 * - Interactive Cross-Device Sync Modal with Room ID pairing and 1-click Force Sync
 */

import React, { useState, useEffect } from 'react';
import { OfflineQueueBadge } from '../../features/ingestion/components/OfflineQueueBadge';
import { useSession } from '../../context/SessionContext';
import {
  Globe,
  SunMoon,
  Clock,
  ShieldCheck,
  Building,
  UserCheck,
  Cpu,
  Wifi,
  Radio,
  RefreshCw,
  Loader2,
  X,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { checkOllamaActive, getOllamaModel } from '../../services/aiService';
import {
  centralSyncService,
  type SyncTransportState,
} from '../../services/centralSyncService';

export interface GovtHeaderProps {
  language: 'hi' | 'en';
  onLanguageChange: (lang: 'hi' | 'en') => void;
  fontSize: 'sm' | 'md' | 'lg';
  onFontSizeChange: (size: 'sm' | 'md' | 'lg') => void;
  highContrast: boolean;
  onHighContrastToggle: () => void;
  activeNavTab?: string;
  onNavTabChange?: (tab: string) => void;
  isSyncing?: boolean;
  onSyncTrigger?: () => Promise<void> | void;
  onOpenAiSettings?: () => void;
}

export const GovtHeader: React.FC<GovtHeaderProps> = ({
  language,
  onLanguageChange,
  fontSize,
  onFontSizeChange,
  highContrast,
  onHighContrastToggle,
  activeNavTab = 'report',
  onNavTabChange,
  isSyncing,
  onSyncTrigger,
  onOpenAiSettings,
}) => {
  const { session, openVerificationModal } = useSession();
  // Live IST Timestamp formatter
  const [currentIST, setCurrentIST] = useState<string>('');
  const [isOllamaLive, setIsOllamaLive] = useState<boolean>(false);
  const [ollamaModel, setOllamaModel] = useState<string>('llama3.2');

  // Sprint 6 - Task 6.1: Cross-Device Sync Telemetry
  const [syncState, setSyncState] = useState<SyncTransportState>(() =>
    centralSyncService.getSyncTransportState()
  );
  const [activeRoomId, setActiveRoomId] = useState<string>(() =>
    centralSyncService.getSyncRoomId()
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [roomInput, setRoomInput] = useState<string>(() =>
    centralSyncService.getSyncRoomId()
  );
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isCodeCopied, setIsCodeCopied] = useState<boolean>(false);

  // Subscribe to real-time sync telemetry
  useEffect(() => {
    const unsubscribe = centralSyncService.subscribe((msg) => {
      if (msg.type === 'SYNC_STATUS_CHANGED') {
        setSyncState(centralSyncService.getSyncTransportState());
      } else if (msg.type === 'SYNC_ROOM_CHANGED') {
        const room = centralSyncService.getSyncRoomId();
        setActiveRoomId(room);
        setRoomInput(room);
      } else if (msg.type === 'DATABASE_FULL_SYNC') {
        setSyncState(centralSyncService.getSyncTransportState());
      }
    });

    setSyncState(centralSyncService.getSyncTransportState());
    setActiveRoomId(centralSyncService.getSyncRoomId());
    setRoomInput(centralSyncService.getSyncRoomId());

    return () => {
      unsubscribe();
    };
  }, []);

  // Monitor local Ollama daemon reachability
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const active = await checkOllamaActive();
      if (isMounted) {
        setIsOllamaLive(active);
        setOllamaModel(getOllamaModel());
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as DD-Mon-YYYY | HH:mm IST
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const formatted = new Intl.DateTimeFormat('en-IN', options).format(now);
      setCurrentIST(`${formatted.replace(',', ' |')} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1-Click Force Sync Action
  const handleForceSync = async () => {
    setIsManualSyncing(true);
    setSyncFeedback(
      language === 'hi'
        ? 'नेटवर्क और लिंक्ड डिवाइसों के बीच सिंक जारी है...'
        : 'Synchronizing across network & paired devices...'
    );
    try {
      const result = await centralSyncService.syncWithRemoteHub();
      if (onSyncTrigger) {
        await onSyncTrigger();
      }
      setSyncFeedback(
        language === 'hi'
          ? `सिंक पूर्ण! प्रेषित: ${result.pushed}, प्राप्त: ${result.pulled}`
          : `Sync Complete! Pushed: ${result.pushed}, Pulled: ${result.pulled} records.`
      );
    } catch {
      setSyncFeedback(
        language === 'hi'
          ? 'सिंक त्रुटि: स्थानीय रूप से सुरक्षित'
          : 'Sync error: Changes safely cached in IndexedDB.'
      );
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4500);
    }
  };

  // Switch Room ID
  const handleRoomSwitch = async () => {
    const trimmed = roomInput.trim().toUpperCase();
    if (!trimmed) return;
    setIsManualSyncing(true);
    setSyncFeedback(
      language === 'hi'
        ? `रूम ${trimmed} से जुड़ रहे हैं...`
        : `Connecting to Room ${trimmed}...`
    );
    try {
      const result = await centralSyncService.setSyncRoomId(trimmed);
      setActiveRoomId(centralSyncService.getSyncRoomId());
      setSyncFeedback(
        language === 'hi'
          ? `रूम ${trimmed} सक्रिय! प्रेषित: ${result.pushed}, प्राप्त: ${result.pulled}`
          : `Connected to Room ${trimmed}! Pushed: ${result.pushed}, Pulled: ${result.pulled}`
      );
    } catch {
      setSyncFeedback(language === 'hi' ? 'रूम स्विच विफल' : 'Failed to switch room');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4500);
    }
  };

  const handleGeneratePairingCode = () => {
    const code = centralSyncService.generatePairingCode();
    setRoomInput(code);
  };

  const handleCopyRoomCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeRoomId);
      setIsCodeCopied(true);
      setTimeout(() => setIsCodeCopied(false), 2500);
    }
  };

  const handleProbeHub = async () => {
    setIsManualSyncing(true);
    const live = await centralSyncService.probeNetworkHub();
    setSyncState(centralSyncService.getSyncTransportState());
    setIsManualSyncing(false);
    setSyncFeedback(
      live
        ? (language === 'hi' ? 'नेटवर्क हब सक्रिय (HTTP 200 OK)' : 'Network Hub Active (HTTP 200 OK)')
        : (language === 'hi' ? 'नेटवर्क हब ऑफलाइन — लोकल मेश सक्रिय' : 'Network Hub Offline — Local Mesh Active')
    );
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const navItems = [
    { id: 'home', labelHi: 'मुख्य पृष्ठ', labelEn: 'Home' },
    { id: 'report', labelHi: 'समस्या दर्ज करें', labelEn: 'Report Citizen Issue' },
    { id: 'panchayat', labelHi: 'पंचायत सत्यापन', labelEn: 'Panchayat Verification' },
    { id: 'academic', labelHi: 'विश्वविद्यालय नवाचार', labelEn: 'Academic Solvers' },
    { id: 'csr', labelHi: 'उद्योग एवं सीएसआर', labelEn: 'Industry CSR' },
    { id: 'gis', labelHi: 'डैशबोर्ड / जीआईएस', labelEn: 'GIS Heatmap' },
  ];

  return (
    <header className="w-full bg-white select-none z-50">
      {/* ============================================================== */}
      {/* 1. OFFICIAL TOP ACCESSIBILITY & UTILITY STRIP (32px) */}
      {/* ============================================================== */}
      <div className="bg-[#0A1C2A] text-slate-100 text-[11px] leading-tight border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between">
          {/* Left: Dual National & State Jurisdiction Identifiers */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-semibold text-slate-200 hover:text-white transition-colors">
              भारत सरकार | Government of India
            </span>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
              |
            </span>
            <span className="font-semibold text-amber-300 hidden sm:inline">
              झारखंड सरकार | Government of Jharkhand
            </span>
          </div>

          {/* Right: Accessibility Controls, AI Status, Sync Telemetry & IST Clock */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Font Sizing Toggles */}
            <div
              className="hidden md:flex items-center border border-slate-700 bg-slate-900/80 rounded-none px-1"
              role="group"
              aria-label="Text sizing"
            >
              <button
                type="button"
                onClick={() => onFontSizeChange('sm')}
                className={`px-1.5 py-0.5 font-bold transition-colors ${
                  fontSize === 'sm' ? 'bg-[#FF9933] text-black font-extrabold' : 'text-slate-300 hover:text-white'
                }`}
                title="Decrease font size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => onFontSizeChange('md')}
                className={`px-1.5 py-0.5 font-bold transition-colors ${
                  fontSize === 'md' ? 'bg-[#FF9933] text-black font-extrabold' : 'text-slate-300 hover:text-white'
                }`}
                title="Normal font size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => onFontSizeChange('lg')}
                className={`px-1.5 py-0.5 font-bold transition-colors ${
                  fontSize === 'lg' ? 'bg-[#FF9933] text-black font-extrabold' : 'text-slate-300 hover:text-white'
                }`}
                title="Increase font size"
              >
                A+
              </button>
            </div>

            <span className="text-slate-700 hidden md:inline" aria-hidden="true">
              |
            </span>

            {/* High Contrast Toggle */}
            <button
              type="button"
              onClick={onHighContrastToggle}
              className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-bold uppercase transition-colors ${
                highContrast
                  ? 'bg-yellow-400 border-yellow-300 text-black'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle Contrast"
            >
              <SunMoon className="w-3 h-3" />
              <span>{highContrast ? 'High Contrast' : 'Standard'}</span>
            </button>

            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">
              |
            </span>

            {/* Language Toggle (हिन्दी / English) */}
            <button
              type="button"
              onClick={() => onLanguageChange(language === 'hi' ? 'en' : 'hi')}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#138808] hover:bg-[#117a07] text-white font-bold text-[11px] border border-green-600 transition-colors shadow-2xs cursor-pointer"
              title={language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
            >
              <Globe className="w-3 h-3" />
              <span>{language === 'hi' ? 'English' : 'हिन्दी'}</span>
            </button>

            {/* AI Engine Settings Trigger (Local Ollama AI) */}
            {onOpenAiSettings && (
              <>
                <span className="text-slate-700 hidden sm:inline" aria-hidden="true">
                  |
                </span>
                <button
                  type="button"
                  onClick={onOpenAiSettings}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-bold text-[10px] border transition-colors shadow-2xs cursor-pointer ${
                    isOllamaLive
                      ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500 hover:bg-emerald-800'
                      : 'bg-amber-900/80 text-amber-200 border-amber-600/60 hover:bg-amber-800'
                  }`}
                  title={
                    isOllamaLive
                      ? `Local Ollama AI Active (${ollamaModel}) / स्थानीय ओलामा एआई`
                      : 'Local Ollama Offline — Heuristic Fallback Active / ऑफलाइन मॉडल'
                  }
                >
                  <Cpu className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>
                    {isOllamaLive
                      ? `● Ollama Active (${ollamaModel})`
                      : language === 'hi'
                      ? '○ AI Local Fallback (ऑफलाइन)'
                      : '○ AI Local Fallback'}
                  </span>
                </button>
              </>
            )}

            {/* Task 6.1: Cross-Device Synchronization Status Pill */}
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-bold text-[10px] border transition-colors shadow-2xs cursor-pointer ${
                syncState === 'CONNECTING' || isManualSyncing || isSyncing
                  ? 'bg-sky-900/90 text-sky-200 border-sky-500 animate-pulse'
                  : syncState === 'NETWORK_ACTIVE'
                  ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500 hover:bg-emerald-800'
                  : 'bg-amber-900/80 text-amber-200 border-amber-600/60 hover:bg-amber-800'
              }`}
              title={`Cross-Device Sync: Room ${activeRoomId} (${syncState}) / क्लिक कर सिंक हब खोलें`}
            >
              {syncState === 'CONNECTING' || isManualSyncing || isSyncing ? (
                <Loader2 className="w-3 h-3 text-sky-300 animate-spin shrink-0" />
              ) : syncState === 'NETWORK_ACTIVE' ? (
                <Wifi className="w-3 h-3 text-emerald-300 shrink-0" />
              ) : (
                <Radio className="w-3 h-3 text-amber-300 shrink-0" />
              )}
              <span>
                {syncState === 'CONNECTING' || isManualSyncing || isSyncing
                  ? 'Connecting...'
                  : syncState === 'NETWORK_ACTIVE'
                  ? '● Network Sync Active'
                  : '○ Local Only'}
              </span>
              <span className="font-mono text-[9px] text-amber-300/90 hidden xl:inline">
                [{activeRoomId}]
              </span>
            </button>

            <span className="text-slate-700 hidden lg:inline" aria-hidden="true">
              |
            </span>

            {/* Live IST Timestamp */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-900/60 px-2 py-0.5 border border-slate-800">
              <Clock className="w-3 h-3 text-[#FF9933]" />
              <span>{currentIST}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sharp 3.5px Horizontal Indian Tricolor Bar */}
      <div className="w-full h-[3.5px] flex" aria-hidden="true">
        <div className="w-1/3 h-full bg-[#FF9933]" />
        <div className="w-1/3 h-full bg-[#FFFFFF]" />
        <div className="w-1/3 h-full bg-[#138808]" />
      </div>

      {/* ============================================================== */}
      {/* 2. OFFICIAL EMBLEM MASTHEAD (NIC Standard Layout) */}
      {/* ============================================================== */}
      <div className="bg-white border-b border-[#CBD5E1] py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Side: Dual Insignia & State Seal */}
          <div className="flex items-center gap-4">
            {/* Official Circular Seal of Jharkhand SVG */}
            <div
              className="w-16 h-16 sm:w-18 sm:h-18 p-1 bg-white border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center rounded-full"
              title="झारखंड सरकार • Government of Jharkhand"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="47" stroke="#138808" strokeWidth="3" />
                <circle cx="50" cy="50" r="41" stroke="#138808" strokeWidth="1" strokeDasharray="3 2" />
                <circle cx="50" cy="50" r="29" fill="#F0FDF4" stroke="#138808" strokeWidth="2" />
                <rect x="46" y="32" width="8" height="24" fill="#0A1C2A" />
                <rect x="42" y="56" width="16" height="5" fill="#7A1B1B" />
                <rect x="38" y="61" width="24" height="6" fill="#0A1C2A" />
                <circle cx="50" cy="44" r="5.5" stroke="#138808" strokeWidth="1.5" />
                <line x1="50" y1="39" x2="50" y2="49" stroke="#138808" strokeWidth="1" />
                <line x1="45" y1="44" x2="55" y2="44" stroke="#138808" strokeWidth="1" />
                <circle cx="26" cy="50" r="3" fill="#138808" />
                <circle cx="74" cy="50" r="3" fill="#138808" />
                <circle cx="50" cy="23" r="3" fill="#FF9933" />
                <circle cx="50" cy="74" r="3" fill="#138808" />
              </svg>
            </div>

            {/* Bilingual Typography */}
            <div className="leading-tight">
              <h1 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                झारखंड सरकार
              </h1>
              <div className="font-bold text-xs sm:text-sm text-slate-800 tracking-wider uppercase">
                GOVERNMENT OF JHARKHAND
              </div>
              <div className="text-xs sm:text-[13px] font-semibold text-[#7A1B1B] mt-0.5">
                Department of Higher &amp; Technical Education | उच्च एवं तकनीकी शिक्षा विभाग
              </div>
            </div>
          </div>

          {/* Center/Right Side: Project Seal + Verified Identity Stamp + Offline Stamp Box */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-4 self-end md:self-center">
            {/* Project Seal Badge */}
            <div className="text-right hidden sm:block border-r border-slate-200 pr-4">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-base font-black text-[#7A1B1B]">उद्भव</span>
                <span className="text-xs text-slate-400 font-bold">&bull;</span>
                <span className="text-base font-black tracking-widest text-[#0A1C2A] uppercase">
                  UDBHAV
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-600 max-w-xs">
                A Quadruple-Helix Demand-Driven Civic R&amp;D Ecosystem
              </div>
              <div className="inline-block mt-0.5 text-[10px] font-bold text-[#7A1B1B] bg-red-50 border border-red-200 px-1.5 py-0.2">
                SIH Problem Statement ID: 26043
              </div>
            </div>

            {/* Official Verified Identity & Role Stamp */}
            <button
              type="button"
              onClick={openVerificationModal}
              className="border-2 border-[#0F2537] bg-slate-50 hover:bg-amber-50/60 px-2.5 py-1.5 rounded-none shadow-2xs flex items-center gap-2 cursor-pointer transition-colors text-left group"
              title="Click to Verify Identity or Switch Persona / अपनी पहचान सत्यापित करें"
            >
              <div className="w-7 h-7 bg-[#0F2537] text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#7A1B1B] transition-colors">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="leading-tight">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <span className="font-mono text-[#7A1B1B] font-bold">{session.maskedIdentifier}</span>
                  <span
                    className={`text-[8px] px-1 font-bold ${
                      session.isVerified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {session.isVerified ? 'VERIFIED ✓' : 'UNVERIFIED'}
                  </span>
                </div>
                <div className="text-[11px] font-extrabold text-slate-900 truncate max-w-[130px]">
                  {session.role.replace('_', ' ')}
                </div>
              </div>
            </button>

            {/* Official Stamp Box for OfflineQueueBadge & Room Pairing Link */}
            <div
              className="border-2 border-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-none shadow-2xs flex items-center gap-2 cursor-pointer hover:bg-emerald-100/70 transition-colors"
              title="Click to open Cross-Device Sync Hub & Active Room Pairing"
              onClick={() => setIsSyncModalOpen(true)}
            >
              <div className="text-left">
                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    <span>NIC Offline Cache</span>
                  </div>
                  <span className="font-mono text-[8px] bg-emerald-200/90 text-emerald-950 px-1 py-0.2 border border-emerald-400 font-bold">
                    {activeRoomId}
                  </span>
                </div>
                <div className="mt-0.5">
                  <OfflineQueueBadge
                    isSyncing={isSyncing || isManualSyncing}
                    onSyncTrigger={handleForceSync}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. DEEP MAROON & GOLD PRIMARY CIVIC NAVBAR */}
      {/* ============================================================== */}
      <nav
        className="bg-[#7A1B1B] text-[#F8E7A2] border-y border-amber-900/60 shadow-xs"
        aria-label="Government Portal Primary Navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center overflow-x-auto scrollbar-none gap-0.5">
            {navItems.map((item) => {
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavTabChange && onNavTabChange(item.id)}
                  className={`px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors rounded-none flex items-center gap-1.5 border-b-3 ${
                    isActive
                      ? 'bg-[#5F1414] text-white border-[#F8E7A2] shadow-inner'
                      : 'text-[#F8E7A2] border-transparent hover:bg-[#681717] hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Building className="w-3.5 h-3.5 opacity-70" />
                  <span>{language === 'hi' ? item.labelHi : item.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* 4. GOVERNMENT MARQUEE / TICKER BULLETIN */}
      {/* ============================================================== */}
      <div className="bg-amber-50 border-b border-amber-300 text-slate-900 text-xs flex items-stretch overflow-hidden">
        <div className="bg-red-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-1.5 flex items-center gap-1 shrink-0 z-10 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1" />
          <span>{language === 'hi' ? 'महत्वपूर्ण सूचना' : 'LATEST UPDATES'}</span>
        </div>

        <div className="flex-1 py-1 px-3 overflow-hidden flex items-center">
          <div className="whitespace-nowrap animate-marquee font-medium text-slate-800 text-[11px]">
            {language === 'hi'
              ? `क्रॉस-डिवाइस सिंक सक्रिय: रूम [${activeRoomId}] • नागरिक सूचना: यह पोर्टल किसी भी सेवा के लिए शुल्क अथवा बैंक विवरण नहीं मांगता है • LGD Directory Integration Active for all 24 Districts of Jharkhand • SIH PS 26043 •`
              : `Cross-Device Sync Active: Room [${activeRoomId}] • CITIZEN ADVISORY: This official portal will NEVER request processing fees or bank account credentials • Local Government Directory (LGD) Active for all 24 Districts of Jharkhand • SIH PS 26043 •`}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. SPRINT 6 TASK 6.1: CROSS-DEVICE SYNC MODAL / POPOVER */}
      {/* ============================================================== */}
      {isSyncModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white border-2 border-[#0A1C2A] shadow-2xl max-w-xl w-full text-slate-900 overflow-hidden">
            {/* Indian Tricolor Bar */}
            <div className="w-full h-1 flex" aria-hidden="true">
              <div className="w-1/3 h-full bg-[#FF9933]" />
              <div className="w-1/3 h-full bg-[#FFFFFF]" />
              <div className="w-1/3 h-full bg-[#138808]" />
            </div>

            {/* Modal Header */}
            <div className="bg-[#0A1C2A] text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-300" />
                <div>
                  <h2 id="sync-modal-title" className="text-sm font-bold tracking-tight">
                    {language === 'hi'
                      ? 'क्रॉस-डिवाइस सिंक्रनाइज़ेशन हब'
                      : 'Cross-Device Synchronization Engine'}
                  </h2>
                  <div className="text-[10px] text-slate-300 font-mono">
                    SIH PS 26043 • Academic Bridge &amp; Multi-Device Protocol
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Status Banner */}
              <div className="p-3.5 border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    {language === 'hi' ? 'सक्रिय ट्रांसपोर्ट स्थिति' : 'Active Transport State'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border ${
                        syncState === 'NETWORK_ACTIVE'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : syncState === 'CONNECTING'
                          ? 'bg-sky-100 text-sky-900 border-sky-400'
                          : 'bg-amber-100 text-amber-900 border-amber-400'
                      }`}
                    >
                      {syncState === 'NETWORK_ACTIVE' ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Network Sync Active (HTTP Remote Hub)</span>
                        </>
                      ) : syncState === 'CONNECTING' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-sky-700 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-3.5 h-3.5 text-amber-700" />
                          <span>Local Only (Mesh Bus &amp; Storage Relay)</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-600">
                    <span className="font-semibold">Endpoint:</span>{' '}
                    <code className="bg-slate-200 px-1 py-0.5 rounded-none font-mono text-[10px]">
                      {centralSyncService.getHubUrl()}
                    </code>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProbeHub}
                  disabled={isManualSyncing}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold uppercase shrink-0 transition-colors shadow-2xs"
                  title="Check network endpoint reachability"
                >
                  {language === 'hi' ? 'जांचें' : 'Probe Hub'}
                </button>
              </div>

              {/* Feedback Alert */}
              {syncFeedback && (
                <div
                  className="p-2.5 bg-blue-50 border border-blue-300 text-blue-900 text-xs font-semibold flex items-center gap-2"
                  role="status"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Section: Room ID Device Pairing */}
              <div className="border border-slate-200 p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-[#7A1B1B] uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#7A1B1B]" />
                    <span>
                      {language === 'hi'
                        ? 'डिवाइस पेयरिंग एवं रूम कोड एक्सचेंज'
                        : 'Device Pairing & Code/Room Exchange'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Active:</span>
                    <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 border border-amber-300">
                      {activeRoomId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRoomCode}
                      className="p-1 hover:bg-slate-100 border border-slate-300 text-slate-600 transition-colors ml-1"
                      title="Copy Room ID"
                    >
                      {isCodeCopied ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {language === 'hi'
                    ? 'दो अलग-अलग स्मार्टफोन अथवा कंप्यूटरों पर समान रूम कोड दर्ज करें। नागरिक द्वारा ऑफलाइन दर्ज की गई रिपोर्ट, पंचायत सत्यापन तथा विश्वविद्यालय के समाधानकर्ता वास्तविक समय में स्वतः सिंक होंगे।'
                    : 'Enter the identical Room ID on a second phone, tablet, or browser window. Offline citizen drafts, Panchayat verifications, and Academic challenge bids will mirror queues across devices.'}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label htmlFor="sync-room-input" className="sr-only">
                      Room ID
                    </label>
                    <input
                      id="sync-room-input"
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                      placeholder="e.g. JH-RANCHI-2026"
                      className="w-full px-3 py-1.5 border border-slate-300 font-mono text-xs uppercase font-bold text-slate-900 bg-white focus:outline-none focus:border-[#7A1B1B]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRoomSwitch}
                    disabled={isManualSyncing || !roomInput.trim()}
                    className="px-3 py-1.5 bg-[#0A1C2A] hover:bg-[#16334d] text-white text-xs font-bold uppercase transition-colors shrink-0 disabled:opacity-50"
                  >
                    {language === 'hi' ? 'रूम बदलें' : 'Join Room'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGeneratePairingCode}
                    className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold shrink-0 transition-colors"
                    title="Generate Random Code"
                  >
                    {language === 'hi' ? 'नया कोड' : 'Random Code'}
                  </button>
                </div>
              </div>

              {/* Section: 1-Click Force Sync Action */}
              <div className="bg-amber-50/70 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[#7A1B1B]" />
                    <span>
                      {language === 'hi'
                        ? '1-क्लिक संपूर्ण सिंक्रनाइज़ेशन'
                        : '1-Click Force Snapshot Sync'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {language === 'hi'
                      ? 'स्थानीय अनुक्रमित ड्राफ्ट को प्रेषित करें एवं केंद्रीय रजिस्ट्री से नवीनतम रिकॉर्ड प्राप्त करें।'
                      : 'Push local queued offline drafts & pull latest master issues into local Dexie.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isManualSyncing}
                  className="px-4 py-2 bg-[#7A1B1B] hover:bg-[#5F1414] text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {isManualSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing...'}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                      <span>{language === 'hi' ? 'तत्काल सिंक करें' : 'Force Sync Now'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sprint 6 - Task 6.3: Spatial Clustering Telemetry */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 text-[10px] text-blue-900 space-y-1">
                <div className="font-bold uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1 text-blue-950">
                    <Radio className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      {language === 'hi'
                        ? 'स्थानिक क्लस्टरिंग सक्रिय: 1.0 किमी हैवर्सिन दायरा'
                        : 'Spatial Clustering Active: 1.0 km Haversine Radius & LGD Deduplication'}
                    </span>
                  </span>
                  <span className="bg-blue-200 text-blue-900 font-mono font-bold px-1.5 py-0.2 border border-blue-300">
                    RADIUS: 1000m
                  </span>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  {language === 'hi'
                    ? 'अलग-अलग मोबाइल फोनों से दर्ज की गई समान पंचायत अथवा 1.0 किमी दायरे की समस्याओं को स्वतः एक मास्टर टिकट में संकलित किया जाता है।'
                    : 'Reports submitted from multiple devices within the same Gram Panchayat or <=1,000m radius auto-cluster into a Master Issue, escalating citizen distress intensity monotonically.'}
                </p>
              </div>

              {/* Privacy & PII Guardrail Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {language === 'hi'
                      ? 'गोपनीयता एवं पीआईआई सुरक्षा (SIH PS 26043)'
                      : 'Privacy & PII Isolation Guardrails (GIGW 3.0)'}
                  </span>
                </div>
                <p>
                  {language === 'hi'
                    ? 'नागरिकों के सादे फोन नंबर अथवा उपकरण के आईपी पते कभी भी प्रसारित नहीं किए जाते हैं। सभी पेलोड में मास्क पहचानकर्ता (उदा. Citizen #JH-8492) तथा साल्टेड SHA-256 हैश का उपयोग होता है।'
                    : 'Plain citizen phone numbers and device IPs are strictly excluded from transmission. All sync payloads utilize masked identifiers (e.g. Citizen #JH-8492) and cryptographic salted SHA-256 hashes.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-mono">
                DHTE Jharkhand • NIC Civic R&amp;D
              </span>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-1.5 bg-[#0A1C2A] text-white font-bold text-xs uppercase hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'पूर्ण / बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default GovtHeader;

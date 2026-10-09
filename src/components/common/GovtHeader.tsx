/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Official Government of Jharkhand / NIC / GIGW 3.0 Standard Header
 * 
 * Features:
 * - 32px Deep Navy Accessibility Strip with live IST timestamp & High Contrast toggle
 * - 3.5px Indian Tricolor sub-border
 * - Institutional Emblem Masthead with official State Seal & Stamp Box for OfflineQueueBadge
 * - Deep Administrative Maroon (#7A1B1B) & Gold (#F8E7A2) Civic Navbar
 * - Government Marquee / Live Ticker Bulletin
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
} from 'lucide-react';
import { checkOllamaActive, getOllamaModel } from '../../services/aiService';

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

          {/* Right: Accessibility Controls & Live IST Clock */}
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

            {/* AI Engine Settings Trigger (Local Ollama AI / ऑफलाइन मॉडल) */}
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
                      ? '○ AI Local Fallback (ऑफलाइन मॉडल)'
                      : '○ AI Local Fallback'}
                  </span>
                </button>
              </>
            )}

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
                {/* Concentric green circles */}
                <circle cx="50" cy="50" r="47" stroke="#138808" strokeWidth="3" />
                <circle cx="50" cy="50" r="41" stroke="#138808" strokeWidth="1" strokeDasharray="3 2" />
                <circle cx="50" cy="50" r="29" fill="#F0FDF4" stroke="#138808" strokeWidth="2" />
                {/* Emblem Pillar / Ashok Stambh Representation */}
                <rect x="46" y="32" width="8" height="24" fill="#0A1C2A" />
                <rect x="42" y="56" width="16" height="5" fill="#7A1B1B" />
                <rect x="38" y="61" width="24" height="6" fill="#0A1C2A" />
                {/* Ashoka Chakra Center */}
                <circle cx="50" cy="44" r="5.5" stroke="#138808" strokeWidth="1.5" />
                <line x1="50" y1="39" x2="50" y2="49" stroke="#138808" strokeWidth="1" />
                <line x1="45" y1="44" x2="55" y2="44" stroke="#138808" strokeWidth="1" />
                {/* Cultural Motifs / Elephant & Palash Points */}
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

          {/* Center/Right Side: Project Seal + Official Stamp Box for OfflineQueueBadge */}
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

            {/* Official Verified Identity & Role Stamp (Bug 1 & 4) */}
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

            {/* Official Stamp Box for OfflineQueueBadge */}
            <div
              className="border-2 border-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-none shadow-2xs flex items-center gap-2"
              title="Official Offline Verification Stamp"
            >
              <div className="text-left">
                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>NIC Offline Cache</span>
                </div>
                <div className="mt-0.5">
                  <OfflineQueueBadge
                    isSyncing={isSyncing}
                    onSyncTrigger={onSyncTrigger}
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
        {/* Red Latest Updates Stamp */}
        <div className="bg-red-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-1.5 flex items-center gap-1 shrink-0 z-10 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1" />
          <span>{language === 'hi' ? 'महत्वपूर्ण सूचना' : 'LATEST UPDATES'}</span>
        </div>

        {/* Ticker Scrolling Strip */}
        <div className="flex-1 py-1 px-3 overflow-hidden flex items-center">
          <div className="whitespace-nowrap animate-marquee font-medium text-slate-800 text-[11px]">
            {language === 'hi'
              ? 'नागरिक सूचना: यह पोर्टल किसी भी सेवा के लिए शुल्क अथवा बैंक विवरण नहीं मांगता है • LGD Directory Integration Active for all 24 Districts of Jharkhand • Smart India Hackathon PS 26043 • ऑफलाइन मोड सक्रिय: डेटा स्थानीय रूप से सुरक्षित रहेगा •'
              : 'CITIZEN ADVISORY: This official portal will NEVER request processing fees or bank account credentials • Local Government Directory (LGD) Active for all 24 Districts of Jharkhand • SIH PS 26043 • Offline Resilience: Submissions safely persist in local storage •'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GovtHeader;

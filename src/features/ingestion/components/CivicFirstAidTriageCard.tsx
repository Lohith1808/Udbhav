/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * AI First-Aid Triage & Local Livelihood Dispatch Card (Sprint 8 — Task 8.2)
 * 
 * Features:
 * - Dynamic Local Rural Technician Directory & Livelihood Dispatch (Sprint 8 - Task 8.2)
 * - Real LLM Structured-Output Triage using local Ollama (Llama 3.2) or deterministic fallback
 * - Spoken Vernacular DIY Advice Readout via native HTML5 SpeechSynthesis
 * - LGD-Mapped Rural Artisan Matching (District, Block & Panchayat)
 * - Chronic Structural Escalation Gate to Academic Solvers (Shoe 2)
 */

import React, { useState, useEffect } from 'react';
import {
  evaluateCivicFirstAidTriage,
  CivicFirstAidTriageResult,
  checkOllamaActive,
  getOllamaModel,
} from '../../../services/aiService';
import {
  getTechniciansByLocation,
  normalizeTechnicianTrade,
  TRADE_META,
  type EmpanelledTechnician,
} from '../data/techniciansDirectory';
import {
  Sparkles,
  Wrench,
  Zap,
  Hammer,
  Truck,
  Sun,
  Volume2,
  VolumeX,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Cpu,
  GraduationCap,
  Settings,
  Star,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export interface CivicFirstAidTriageCardProps {
  transcript: string;
  category: string;
  village: string;
  language?: 'hi' | 'en';
  onEscalateToRD?: () => void;
  onOpenAiSettings?: () => void;
  /** Active geo-tagged LGD location metadata */
  lgdLocation?: {
    state?: string;
    districtName?: string;
    districtCode?: number;
    blockName?: string;
    blockCode?: number;
    panchayatName?: string;
    panchayatCode?: number;
  } | null;
  districtCode?: number;
  blockCode?: number;
}

export const CivicFirstAidTriageCard: React.FC<CivicFirstAidTriageCardProps> = ({
  transcript,
  category,
  village,
  language = 'en',
  onEscalateToRD,
  onOpenAiSettings,
  lgdLocation,
  districtCode,
  blockCode,
}) => {
  const [triageResult, setTriageResult] = useState<CivicFirstAidTriageResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [resolvedLocally, setResolvedLocally] = useState<boolean>(false);
  const [isOllamaLive, setIsOllamaLive] = useState<boolean>(false);
  const [ollamaModel, setOllamaModel] = useState<string>('llama3.2');
  const [callDispatchNotice, setCallDispatchNotice] = useState<{
    message: string;
    technician: EmpanelledTechnician;
  } | null>(null);

  // Probe local Ollama status
  useEffect(() => {
    let isMounted = true;
    checkOllamaActive().then((active) => {
      if (isMounted) {
        setIsOllamaLive(active);
        setOllamaModel(getOllamaModel());
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRunTriage = async () => {
    if (!transcript.trim()) return;

    setIsEvaluating(true);
    setResolvedLocally(false);
    setCallDispatchNotice(null);
    try {
      const result = await evaluateCivicFirstAidTriage(transcript, category, village);
      setTriageResult(result);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSpeakAdvice = () => {
    if (!triageResult?.vernacularTroubleshootingTip) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(triageResult.vernacularTroubleshootingTip);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSimulateCall = (tech: EmpanelledTechnician) => {
    const locName = lgdLocation?.panchayatName || village || 'Arsande';
    const msg =
      language === 'hi'
        ? `LGD डिस्पैच ब्रिज सक्रिय: ${tech.name} (${tech.maskedContact}) को ग्राम पंचायत ${locName} हेतु संपर्क किया गया। आजीविका कार्य टोकन जेनरेट किया गया।`
        : `LGD Dispatch Bridge Connected: Contacted ${tech.name} (${tech.maskedContact}) for Gram Panchayat ${locName}. Rural artisan service ticket generated.`;

    setCallDispatchNotice({
      message: msg,
      technician: tech,
    });
  };

  const getTradeIcon = (trade: string | null) => {
    const normalized = normalizeTechnicianTrade(trade);
    switch (normalized) {
      case 'PLUMBER':
        return <Wrench className="w-4 h-4 text-sky-600" />;
      case 'ELECTRICIAN':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'PUMP_MECHANIC':
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case 'SOLAR_TECHNICIAN':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'MASON':
        return <Hammer className="w-4 h-4 text-stone-600" />;
      default:
        return <Wrench className="w-4 h-4 text-slate-700" />;
    }
  };

  // Derive active LGD coordinates & codes
  const effectiveDistrictCode = lgdLocation?.districtCode ?? districtCode ?? 351;
  const effectiveBlockCode = lgdLocation?.blockCode ?? blockCode ?? 3188;

  // Retrieve dynamically matched rural technicians
  const matchedTechnicians = getTechniciansByLocation(
    effectiveDistrictCode,
    effectiveBlockCode,
    triageResult?.suggestedTechnicianTrade
  );
  const matchedTechnician = matchedTechnicians[0] || null;

  return (
    <div className="bg-white border-2 border-slate-300 p-4 shadow-2xs space-y-3">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0F2537] text-white">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#7A1B1B] font-mono tracking-wider">
              SHOE 1 &bull; AI FIRST-AID TRIAGE &amp; LOCAL DISPATCH
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
              {language === 'hi'
                ? 'त्वरित एआई निदान व स्थानीय मिस्त्री सहायता'
                : 'AI First-Aid Triage & Local Technician Dispatch'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live vs Offline Engine Indicator */}
          <span
            className={`px-2 py-0.5 text-[9px] font-mono font-bold border flex items-center gap-1 ${
              isOllamaLive
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>{isOllamaLive ? `Ollama (${ollamaModel})` : 'Offline Heuristic'}</span>
          </span>

          {onOpenAiSettings && (
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Local Ollama AI Settings / स्थानीय एआई सेटिंग्स"
              aria-label="AI Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Trigger Button if not yet evaluated */}
      {!triageResult && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3">
          <p className="text-xs text-slate-600">
            {language === 'hi'
              ? 'क्या यह समस्या तुरंत किसी स्थानीय मिस्त्री (नल/मोटर/इलेक्ट्रीशियन) द्वारा ठीक हो सकती है? एआई द्वारा त्वरित जांच करें:'
              : 'Analyze if this issue can be quickly serviced by a nearby registered rural tradesperson before escalating to university R&D:'}
          </p>

          <button
            type="button"
            onClick={handleRunTriage}
            disabled={isEvaluating || !transcript.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-[#0F2537] hover:bg-[#1a3a54] disabled:opacity-50 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>{language === 'hi' ? 'निदान जारी है...' : 'Evaluating Triage...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{language === 'hi' ? 'एआई जांच करें' : 'Run First-Aid Triage'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Triage Output Card */}
      {triageResult && (
        <div className="space-y-3 pt-1">
          {/* Outcome Verdict Ribbon */}
          <div
            className={`p-3 border flex items-start gap-2.5 ${
              triageResult.isRoutineMaintenance
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
            }`}
          >
            {triageResult.isRoutineMaintenance ? (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            ) : (
              <GraduationCap className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-black tracking-wider">
                  {triageResult.isRoutineMaintenance
                    ? 'ROUTINE LOCAL MAINTENANCE IDENTIFIED (सामान्य स्थानीय मरम्मत)'
                    : 'CHRONIC STRUCTURAL NEED (विश्वविद्यालय नवाचार अनिवार्य)'}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-white/80 border border-slate-300">
                  Confidence: {Math.round(triageResult.confidenceScore * 100)}%
                </span>
              </div>
              <p className="text-xs font-medium mt-1 leading-snug">
                {triageResult.reasoningSummary}
              </p>
            </div>
          </div>

          {/* Prominent Structural Transition Banner (when structural issue identified) */}
          {(triageResult.escalateToCivicRD || !triageResult.isRoutineMaintenance) && (
            <div className="bg-[#0B2545] border-2 border-amber-400 p-3.5 text-white space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'संरचनात्मक तकनीकी समस्या: इंजीनियरिंग विश्वविद्यालय R&D नवाचार हेतु प्रेषित'
                    : 'Structural Issue Identified: Escalating beyond routine repair to Engineering Capstone R&D (Shoe 2)'}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {language === 'hi'
                  ? 'यह समस्या सामान्य मिस्त्री द्वारा ठीक नहीं हो सकती (उदा. रासायनिक फ्लोराइड संदूषण, माइक्रोग्रिड भंडारण विफलता, सिल्टेशन)। इसे तकनीकी विश्वविद्यालयों के छात्र-शिक्षकों हेतु इंजीनियरिंग ब्रीफ में अग्रेषित किया जा रहा है।'
                  : 'This challenge exceeds routine village artisan maintenance and requires engineering root-cause resolution (e.g. fluoride de-fluoridation, battery storage chemistry, lift hydraulics). Escalating to Engineering Capstone R&D.'}
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/80">
                <span className="text-[10px] font-mono font-bold text-amber-200">
                  Statutory Protocol: NEP 2020 Real-World Capstone Integration
                </span>
                {onEscalateToRD && (
                  <button
                    type="button"
                    onClick={onEscalateToRD}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>{language === 'hi' ? 'R&D हेतु अग्रेषित करें' : 'Escalate to Capstone R&D'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actionable DIY Troubleshooting Tip (Vernacular Hindi) */}
          <div className="bg-slate-50 border border-slate-300 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <span>{language === 'hi' ? 'त्वरित सलाह (DIY Advice):' : 'Vernacular DIY Troubleshooting Advice:'}</span>
              </span>

              {/* Read Aloud Button */}
              <button
                type="button"
                onClick={handleSpeakAdvice}
                className={`px-2 py-1 text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                  isSpeaking
                    ? 'bg-red-700 text-white border-red-800 animate-pulse'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
                title="Listen Spoken Readout / सलाह सुनें"
              >
                {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-[#7A1B1B]" />}
                <span>{isSpeaking ? 'Stop Audio' : 'ऑडियो सुनें'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-900 bg-white p-2.5 border border-slate-200 leading-relaxed font-medium">
              &ldquo;{triageResult.vernacularTroubleshootingTip}&rdquo;
            </p>
          </div>

          {/* Dynamic LGD Rural Artisan Dispatch Card (If routine maintenance) */}
          {triageResult.isRoutineMaintenance && matchedTechnician && (
            <div className="bg-emerald-50/70 border-2 border-emerald-500/60 p-3.5 space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-emerald-200/80 pb-2">
                <div className="text-xs font-extrabold uppercase text-emerald-950 flex items-center gap-2">
                  <div className="p-1 bg-emerald-800 text-white rounded-none">
                    {getTradeIcon(matchedTechnician.trade)}
                  </div>
                  <span>
                    {language === 'hi'
                      ? 'पंजीकृत स्थानीय तकनीशियन (LGD ग्रामीण आजीविका)'
                      : 'Registered Local Technician (LGD Rural Livelihood Dispatch)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 border ${
                      matchedTechnician.dailyAvailability === 'AVAILABLE_NOW'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {matchedTechnician.dailyAvailability === 'AVAILABLE_NOW'
                      ? language === 'hi'
                        ? '● तत्काल उपलब्ध'
                        : '● Available Now'
                      : language === 'hi'
                        ? '● कॉल पर व्यस्त'
                        : '● Busy on Call'}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white text-emerald-900 border border-emerald-300 px-1.5 py-0.5">
                    ID: {matchedTechnician.id}
                  </span>
                </div>
              </div>

              {/* Technician Profile Row */}
              <div className="bg-white p-3 border border-emerald-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">
                      {matchedTechnician.name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-bold">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{matchedTechnician.rating.toFixed(1)}</span>
                    </span>
                    <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold">
                      {matchedTechnician.experienceYears}{' '}
                      {language === 'hi' ? 'वर्ष अनुभव' : 'Years Exp'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#0B2545]">
                      {language === 'hi' ? matchedTechnician.tradeHindi : TRADE_META[matchedTechnician.trade]?.en}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600 font-mono text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>
                        {matchedTechnician.panchayatName} GP, {matchedTechnician.blockName} Block ({matchedTechnician.districtName})
                      </span>
                    </span>
                  </div>

                  {/* Verification Badge Chip */}
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-400 text-emerald-950 text-[10px] font-extrabold uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        {language === 'hi'
                          ? `✓ पंचायत सत्यापित (LGD ब्लॉक: ${matchedTechnician.blockName})`
                          : `✓ Panchayat Verified (LGD Block: ${matchedTechnician.blockName})`}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {TRADE_META[matchedTechnician.trade]?.defaultEquipment}
                    </span>
                  </div>
                </div>

                {/* Call Simulation Button */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSimulateCall(matchedTechnician)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-extrabold text-xs uppercase tracking-wider rounded-none shadow-2xs transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {language === 'hi'
                        ? 'संपर्क करें (कॉल सिम्युलेशन)'
                        : 'Connect via Dispatch Bridge'}
                    </span>
                  </button>
                  <span className="text-[10px] font-mono text-center text-slate-500">
                    Contact: {matchedTechnician.maskedContact}
                  </span>
                </div>
              </div>

              {/* Simulated Non-Blocking Notification Toast/Banner */}
              {callDispatchNotice && (
                <div className="p-2.5 bg-[#0B2545] border-l-4 border-amber-400 text-white text-xs flex items-start justify-between gap-2 shadow-2xs animate-fade-in">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#F8E7A2] text-xs">
                        {language === 'hi'
                          ? 'ग्रामीण आजीविका डिस्पैच कॉल कनेक्ट किया गया'
                          : 'Rural Livelihood Dispatch Bridge Connected'}
                      </div>
                      <p className="text-[11px] text-slate-200 mt-0.5">
                        {callDispatchNotice.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallDispatchNotice(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold px-1.5 cursor-pointer"
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Citizen Decision Prompt */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
            {triageResult.isRoutineMaintenance && !resolvedLocally ? (
              <>
                <button
                  type="button"
                  onClick={() => setResolvedLocally(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'स्थानीय स्तर पर समाधान हो गया' : 'Resolved Locally via Technician'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onEscalateToRD) onEscalateToRD();
                  }}
                  className="px-3 py-1.5 bg-[#0F2537] hover:bg-[#1a3a54] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <span>{language === 'hi' ? 'नहीं, R&D हेतु आगे भेजें' : 'No, Escalate to University R&D'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                </button>
              </>
            ) : resolvedLocally ? (
              <div className="w-full p-2 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'धन्यवाद! स्थानीय आजीविका समाधान दर्ज किया गया। ग्रामीण मिस्त्री को सेवा हेतु धन्यवाद।'
                    : 'Success! Resolved locally without overloading academic capacity. Local trade stimulated.'}
                </span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-medium">
                  {language === 'hi'
                    ? 'यह समस्या विश्वविद्यालय नवाचार हेतु उपयुक्त है।'
                    : 'Classified as an innovation challenge for Engineering Colleges (Shoe 2).'}
                </span>
                <button
                  type="button"
                  onClick={handleRunTriage}
                  className="text-xs text-[#0F2537] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-evaluate</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CivicFirstAidTriageCard;

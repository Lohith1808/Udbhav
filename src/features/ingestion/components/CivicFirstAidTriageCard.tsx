/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * AI First-Aid Triage & Local Livelihood Dispatch Card (Sprint 4 — Task 4.3)
 * 
 * Features:
 * - Real LLM Structured-Output Triage using Gemini 1.5 Flash
 * - Spoken Vernacular DIY Advice Readout via native HTML5 SpeechSynthesis
 * - Local Rural Technician Auto-Dispatch (Plumber, Electrician, Mechanic, Mason)
 * - Chronic Structural Escalation Gate to Academic Solvers (Shoe 2)
 */

import React, { useState } from 'react';
import {
  evaluateCivicFirstAidTriage,
  CivicFirstAidTriageResult,
  hasGeminiApiKey,
} from '../../../services/aiService';
import {
  Sparkles,
  Wrench,
  Zap,
  Hammer,
  Truck,
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
} from 'lucide-react';

export interface CivicFirstAidTriageCardProps {
  transcript: string;
  category: string;
  village: string;
  language?: 'hi' | 'en';
  onEscalateToRD?: () => void;
  onOpenAiSettings?: () => void;
}

export const CivicFirstAidTriageCard: React.FC<CivicFirstAidTriageCardProps> = ({
  transcript,
  category,
  village,
  language = 'en',
  onEscalateToRD,
  onOpenAiSettings,
}) => {
  const [triageResult, setTriageResult] = useState<CivicFirstAidTriageResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [resolvedLocally, setResolvedLocally] = useState<boolean>(false);

  const handleRunTriage = async () => {
    if (!transcript.trim()) return;

    setIsEvaluating(true);
    setResolvedLocally(false);
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

  const isGeminiLive = hasGeminiApiKey();

  const getTradeIcon = (trade: string | null) => {
    switch (trade) {
      case 'PLUMBER':
        return <Wrench className="w-4 h-4 text-sky-700" />;
      case 'ELECTRICIAN':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'MECHANIC':
        return <Truck className="w-4 h-4 text-orange-700" />;
      case 'MASON':
        return <Hammer className="w-4 h-4 text-stone-700" />;
      default:
        return <Wrench className="w-4 h-4 text-slate-700" />;
    }
  };

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
              SHOE 1 &bull; AI FIRST-AID TRIAGE ENGINE
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
              isGeminiLive
                ? 'bg-purple-50 text-purple-900 border-purple-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>{isGeminiLive ? 'Gemini 1.5 Flash' : 'Offline Heuristic'}</span>
          </span>

          {onOpenAiSettings && (
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Configure Gemini API Key / एआई सेटिंग्स"
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
              ? 'क्या यह समस्या तुरंत किसी स्थानीय मिस्त्री (नल/मोटर/मिस्त्री) द्वारा ठीक हो सकती है? एआई द्वारा त्वरित जांच करें:'
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

          {/* Local Rural Tradesperson Dispatch Card (If routine maintenance) */}
          {triageResult.isRoutineMaintenance && triageResult.technicianContactSimulation && (
            <div className="bg-emerald-50 border border-emerald-300 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  {getTradeIcon(triageResult.suggestedTechnicianTrade)}
                  <span>Registered Local Technician (पंचायत पंजीकृत तकनीशियन)</span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-1.5 py-0.2">
                  ~{triageResult.technicianContactSimulation.approxDistanceKm} km
                </span>
              </div>

              <div className="bg-white p-2.5 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {triageResult.technicianContactSimulation.contactName}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {triageResult.technicianContactSimulation.tradeTitle}
                  </div>
                </div>

                {triageResult.technicianContactSimulation.contactPhone && (
                  <a
                    href={`tel:${triageResult.technicianContactSimulation.contactPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{triageResult.technicianContactSimulation.contactPhone}</span>
                  </a>
                )}
              </div>
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

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — Problem Brief Modal Component
 * 
 * Renders the synthesized Engineering Problem Brief adhering to
 * Government of Jharkhand GIGW 3.0 design guidelines and NEP 2020
 * non-prescriptive solver guardrails.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck2,
  X,
  Layers,
  Scale,
  MapPin,
  Users,
  CheckCircle2,
  DollarSign,
  Info,
  Sparkles,
} from 'lucide-react';
import { EngineeringProblemBrief, DomainSector } from '../../../types/solver';

export interface ProblemBriefModalProps {
  brief: EngineeringProblemBrief;
  language?: 'en' | 'hi';
  onClose: () => void;
  onSaveToChallengeBoard?: (brief: EngineeringProblemBrief) => Promise<void> | void;
  isSaving?: boolean;
}

const SECTOR_LABELS: Record<DomainSector, { en: string; hi: string; colorClass: string }> = {
  WATER_RESOURCES: {
    en: 'Water Resources & Quality',
    hi: 'जल संसाधन एवं गुणवत्ता',
    colorClass: 'bg-blue-50 text-blue-900 border-blue-400',
  },
  AGRITECH: {
    en: 'Agritech & Post-Harvest',
    hi: 'कृषि तकनीक एवं फसल संरक्षण',
    colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-400',
  },
  RURAL_ENERGY: {
    en: 'Rural Energy & Microgrids',
    hi: 'ग्रामीण ऊर्जा एवं माइक्रोग्रिड',
    colorClass: 'bg-amber-50 text-amber-900 border-amber-400',
  },
  SANITATION: {
    en: 'Sanitation & Solid Waste',
    hi: 'स्वच्छता एवं ठोस अपशिष्ट प्रबंधन',
    colorClass: 'bg-teal-50 text-teal-900 border-teal-400',
  },
  HEALTHCARE: {
    en: 'Rural Healthcare & Cold Chain',
    hi: 'ग्रामीण स्वास्थ्य एवं कोल्ड चेन',
    colorClass: 'bg-rose-50 text-rose-900 border-rose-400',
  },
  CIVIL_INFRA: {
    en: 'Civil Infra & Drainage',
    hi: 'सिविल अवसंरचना एवं जल निकासी',
    colorClass: 'bg-slate-100 text-slate-900 border-slate-400',
  },
};

export const ProblemBriefModal: React.FC<ProblemBriefModalProps> = ({
  brief,
  language = 'en',
  onClose,
  onSaveToChallengeBoard,
  isSaving = false,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const sectorInfo = SECTOR_LABELS[brief.domainSector] || SECTOR_LABELS.WATER_RESOURCES;

  const handleSave = async () => {
    if (onSaveToChallengeBoard) {
      await onSaveToChallengeBoard(brief);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-modal-title"
    >
      <div className="bg-white border-2 border-[#7A1B1B] max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================== */}
        {/* MODAL HEADER: Official NIC Seal, Government Maroon Banner */}
        {/* ================================================================== */}
        <div className="bg-[#7A1B1B] text-white p-3.5 sm:p-4 flex items-start justify-between gap-3 border-b-2 border-[#5E1414] shrink-0">
          <div className="flex items-start gap-3">
            {/* Official Emblem Icon Graphic */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white text-[#7A1B1B] border border-amber-300 flex items-center justify-center shrink-0 shadow-xs font-serif font-black text-sm">
              <span className="text-center leading-tight">
                <span className="block text-[8px] tracking-widest text-slate-600">GOVT</span>
                <span className="block text-[11px] font-black text-[#7A1B1B]">JH</span>
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#7A1B1B]" />
                  <span>AI Boundary Engine</span>
                </span>
                <span className="font-mono text-[11px] bg-[#5E1414] px-2 py-0.5 text-amber-200 border border-amber-300/30">
                  {brief.id}
                </span>
              </div>
              <h2
                id="brief-modal-title"
                className="text-base sm:text-lg font-black text-[#F8E7A2] leading-snug tracking-tight"
              >
                {language === 'hi'
                  ? 'एआई इंजीनियरिंग समस्या सीमा विनिर्देश'
                  : 'AI Engineering Problem Boundary Brief'}
              </h2>
              <p className="text-[11px] text-amber-100/90 font-medium">
                {language === 'hi'
                  ? 'उच्च एवं तकनीकी शिक्षा विभाग, झारखण्ड सरकार • एनईपी 2020 सॉल्वर फ्रेमवर्क'
                  : 'Department of Higher & Technical Education, Govt of Jharkhand • NEP 2020 Solver Track'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white hover:bg-[#5E1414] rounded-none transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================== */}
        {/* MODAL BODY (SCROLLABLE) */}
        {/* ================================================================== */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-900 bg-[#FCFDFE]">
          {/* Brief Title & Sector Badge */}
          <div className="border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border ${sectorInfo.colorClass}`}
              >
                {language === 'hi' ? sectorInfo.hi : sectorInfo.en}
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200">
                Master Ref: {brief.masterIssueId}
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300 ml-auto">
                ● {brief.status.replace(/_/g, ' ')}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-[#0B2545] leading-snug">
              {brief.title}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
              {brief.contextSummary}
            </p>
          </div>

          {/* Civic Provenance Verification Box */}
          <div className="bg-emerald-50/70 border border-emerald-300 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'सत्यापित पंचायती जमीनी साक्ष्य'
                    : 'Endorsed Civic Field Provenance'}
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 italic">
                "{brief.fieldEvidenceSummary.panchayatNote}"
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-700 bg-white border border-emerald-200 px-3 py-1.5">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  <strong>{brief.fieldEvidenceSummary.block}</strong>, {brief.fieldEvidenceSummary.district}
                </span>
              </div>
              <div className="h-3 w-px bg-slate-300" />
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  <strong>{brief.fieldEvidenceSummary.householdImpact}</strong> {language === 'hi' ? 'परिवार' : 'Families'}
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* CRITICAL SECTION: Non-Negotiable Operating Limits */}
          {/* ================================================================ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#7A1B1B] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {language === 'hi'
                    ? 'गैर-परक्राम्य परिचालन सीमाएँ (Boundary Constraints)'
                    : 'Non-Negotiable Boundary Constraints'}
                </span>
              </h4>
              <span className="text-[10px] font-bold text-[#7A1B1B] bg-red-50 border border-red-200 px-2 py-0.5">
                {language === 'hi' ? 'कठोर इंजीनियरिंग सीमाएँ' : 'Strict Operating Limits'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {brief.boundaryConstraints.map((constraint, idx) => (
                <div
                  key={idx}
                  className="bg-white border-l-3 border-l-[#7A1B1B] border-y border-r border-slate-200 p-2.5 text-xs text-slate-800 shadow-2xs flex items-start gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-[#7A1B1B] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug font-medium">{constraint}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================ */}
          {/* Measurable Benchmarks Data Table */}
          {/* ================================================================ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#2A6F86]" />
                <span>
                  {language === 'hi'
                    ? 'मापनीय तकनीकी बेंचमार्क (Target Benchmarks)'
                    : 'Measurable Technical Benchmarks'}
                </span>
              </h4>
              <span className="text-[10px] font-semibold text-slate-500">
                {language === 'hi' ? 'सटीक सहिष्णुता सीमा' : 'Strict Tolerance Bounds'}
              </span>
            </div>

            <div className="border border-slate-300 overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0B2545] text-white text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2 px-3 border-r border-slate-700 w-1/2">
                      {language === 'hi' ? 'मापनीय मीट्रिक' : 'Technical Metric'}
                    </th>
                    <th className="py-2 px-3 border-r border-slate-700 w-1/4">
                      {language === 'hi' ? 'लक्ष्य मान' : 'Target Value'}
                    </th>
                    <th className="py-2 px-3 w-1/4">
                      {language === 'hi' ? 'स्वीकार्य सहिष्णुता' : 'Tolerance'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {brief.measurableBenchmarks.map((bm, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100/70'}
                    >
                      <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900">
                        {bm.metric}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-emerald-800">
                        {bm.targetValue}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 font-medium">
                        {bm.tolerance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maximum Bill of Materials (BOM) Ceiling Card */}
          <div className="bg-amber-50 border-2 border-amber-400 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-950">
                <DollarSign className="w-4 h-4 text-[#7A1B1B]" />
                <span>
                  {language === 'hi'
                    ? 'अधिकतम सामग्री लागत सीमा (BOM Ceiling)'
                    : 'Maximum Bill of Materials (BOM) Ceiling'}
                </span>
              </div>
              <p className="text-[11px] text-amber-900 font-medium">
                {language === 'hi'
                  ? 'धारा 135 सीएसआर सूक्ष्म-अनुदान के तहत प्रति इकाई हार्डवेयर लागत सीमा (अधिकतम ₹2,500)'
                  : 'Hardware cost ceiling per unit under Section 135 CSR micro-grant (Strictly ≤ ₹2,500)'}
              </p>
            </div>

            <div className="text-right shrink-0 bg-white border border-amber-300 px-3.5 py-1.5 shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Unit Cap
              </div>
              <div className="text-xl font-black text-[#7A1B1B] font-mono">
                ₹{brief.maxCostINR.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Guardrail Warning Banner (NEP 2020 Directive) */}
          <div className="bg-slate-900 text-slate-100 p-3 border-l-4 border-l-amber-400 flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-300 block mb-0.5">
                {language === 'hi'
                  ? 'एनईपी 2020 सॉल्वर स्वायत्तता निर्देश:'
                  : 'NEP 2020 Solver Directive:'}
              </span>
              <span>
                {language === 'hi'
                  ? 'छात्र इंजीनियरिंग रचनात्मकता की सुरक्षा के लिए कार्यान्वयन विधियों, कोड, और सर्किट डिज़ाइन को जानबूझकर अनिर्धारित रखा गया है। केवल परिचालन सीमाएँ मान्य हैं।'
                  : 'Implementation methods, programming code, and circuit schematics are strictly unprescribed to protect collegiate student engineering innovation and academic creativity.'}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* MODAL FOOTER ACTIONS */}
        {/* ================================================================== */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            {brief.fieldEvidenceSummary.district} / {brief.fieldEvidenceSummary.block}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'बंद करें' : 'Dismiss / Close'}
            </button>

            {onSaveToChallengeBoard && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className="px-4 py-2 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'hi' ? 'बोर्ड में सहेजा गया!' : 'Saved to Board!'}</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4 text-amber-300" />
                    <span>
                      {isSaving
                        ? language === 'hi'
                          ? 'सहेजा जा रहा है...'
                          : 'Saving...'
                        : language === 'hi'
                        ? 'चुनौती बोर्ड में सहेजें'
                        : 'Save to Challenge Board'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemBriefModal;

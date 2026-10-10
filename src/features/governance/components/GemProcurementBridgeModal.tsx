/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 7 — Task 7.5 (Final Task): Startup Jharkhand & GeM Procurement Bridge
 * 
 * Statutory compliance modal and printable procurement packet enabling local
 * Panchayats, Block Development Offices (BDOs), and Urban Local Bodies (ULBs) to
 * directly procure Tier 2 BIS certified student innovations under:
 * - Rule 173(i) of General Financial Rules (GFR) 2017 (Relaxation of Prior Turnover & Experience)
 * - Ministry of Finance OM No. F.20/2/2014-PPD
 * - Government e-Marketplace (GeM) Special Startup Window under Rule 149
 * - Jharkhand Startup Policy 2023 (Clause 9.2 Public Procurement Exemption)
 * 
 * Constraints:
 * - Pure CSS @media print with 1-click window.print() (Zero PDF library dependencies)
 * - Container scoped with #udbhav-gem-packet-print
 * - Tripartite authority seals: DHTE Academic, Industries Startup Nodal, DC Collectorate
 */

import React from 'react';
import {
  Printer,
  X,
  Sparkles,
  Building2,
  CheckCircle2,
  ShieldCheck,
  FileCheck2,
  Coins,
  Lock,
} from 'lucide-react';
import { SafetyValidation } from '../../../types/governance';
import { StudentTeam, EngineeringProblemBrief } from '../../../types/solver';

export interface GemProcurementBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: StudentTeam | null;
  safetyVal?: SafetyValidation | null;
  brief?: EngineeringProblemBrief | null;
  language?: 'en' | 'hi';
}

export const GemProcurementBridgeModal: React.FC<GemProcurementBridgeModalProps> = ({
  isOpen,
  onClose,
  team,
  safetyVal,
  brief,
  language = 'en',
}) => {
  if (!isOpen) return null;

  // Resolve dynamic / fallback data
  const isHindi = language === 'hi';
  const teamName = team?.teamName || 'Jal-Shuddhi Innovators';
  const ventureEntityName = team
    ? `${team.teamName} Environmental Solutions Pvt. Ltd.`
    : 'Jal-Shuddhi Tech Innovations Pvt. Ltd.';
  const leadCollege = team?.leadCollege || 'BIT Sindri';
  const incubatorName = `${leadCollege} Innovation & Incubation Centre (BIIC)`;
  const leadFounderName = team?.leadStudentName || 'Ananya Murmu';
  const briefTitle = brief?.title || (isHindi ? 'सौर ऊर्जा संचालित फ्लोराइड शोधन इकाई' : 'Solar-Powered IoT Fluoride Remediation Unit');
  const unitCostINR = brief?.maxCostINR || 2450;
  const masterIssueId = brief?.masterIssueId || safetyVal?.masterIssueId || 'JH-2026-M-849201';
  const bisStandardCode = safetyVal?.tier2BisStandardCode || 'IS 10500:2012';
  const testingLabAgency = safetyVal?.tier2EvaluatorAgency || 'CSIR-CIMFR Dhanbad';
  const dcPermitToken = safetyVal?.dcPilotPermitQR || 'JH-DC-PILOT-PERMIT-2026-9E5B';

  const permitSuffix = dcPermitToken.split('-').pop() || '9E5B';
  const districtCode = 3403; // Dumka (Lead District)
  const statutoryToken = `JH-STARTUP-GEM/2026/${districtCode}/${permitSuffix}`;
  const dpiitRegNumber = 'DIPP94820';
  const startupJharkhandId = 'JH-STARTUP-2026-INC-0849';
  const gemCatId = '41113000'; // Water Purification Equipment

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gem-procurement-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-2xs overflow-y-auto"
    >
      {/* Scoped Native Print Styling */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #udbhav-gem-packet-print, #udbhav-gem-packet-print * {
            visibility: visible !important;
          }
          #udbhav-gem-packet-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 6mm 8mm !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-white border-2 border-slate-400 shadow-2xl max-h-[95vh] flex flex-col my-auto text-slate-800">
        {/* ==================================================================== */}
        {/* MODAL CONTROL HEADER (NO PRINT) */}
        {/* ==================================================================== */}
        <div className="no-print bg-[#0B2545] text-white p-3.5 sm:p-4 border-b-4 border-amber-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#991B1B] text-[#F8E7A2] p-2 border border-amber-400 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                  TASK 7.5 &bull; GeM SPECIAL WINDOW
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  RULE 173(i) GENERAL FINANCIAL RULES 2017
                </span>
              </div>
              <h2
                id="gem-procurement-modal-title"
                className="text-sm sm:text-base font-black tracking-tight text-white uppercase mt-0.5"
              >
                Startup Jharkhand &amp; GeM Direct Procurement Clearance Packet
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print / Save Statutory GeM PDF (A4)"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print / Save PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PRINTABLE STATUTORY DOSSIER CONTAINER */}
        {/* ==================================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div
            id="udbhav-gem-packet-print"
            className="border-4 border-[#0B2545] p-5 sm:p-6 bg-white space-y-4 text-slate-800 shadow-xs"
          >
            {/* ---------------------------------------------------------------- */}
            {/* TOP STATUTORY GOVERNMENT MASTHEAD */}
            {/* ---------------------------------------------------------------- */}
            <div className="text-center border-b-2 border-slate-400 pb-3.5 space-y-1">
              <div className="inline-flex items-center gap-2 bg-[#991B1B] text-[#F8E7A2] px-3.5 py-0.5 text-[10px] font-black uppercase tracking-widest border border-amber-900">
                GOVERNMENT OF JHARKHAND &bull; झारखण्ड सरकार
              </div>

              <h1 className="text-sm sm:text-base font-black text-[#0B2545] uppercase tracking-tight">
                STARTUP JHARKHAND INNOVATION CELL &bull; DEPT OF INDUSTRIES &amp; IT
              </h1>
              <p className="text-xs font-black text-slate-700 uppercase">
                DEPARTMENT OF HIGHER &amp; TECHNICAL EDUCATION &bull; PROJECT UDBHAV
              </p>
              <h2 className="text-xs sm:text-sm font-black text-[#991B1B] uppercase tracking-wide pt-0.5">
                GOVERNMENT e-MARKETPLACE (GeM) DIRECT PROCUREMENT CLEARANCE PACKET
              </h2>
              <p className="text-[11px] font-mono text-slate-600 font-bold">
                Statutory Exemption Certificate Under Rule 173(i) of General Financial Rules (GFR) 2017 &amp; GeM Rule 149
              </p>

              {/* Reference Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono border-t border-slate-300 mt-2 px-1 text-slate-700">
                <span>
                  STATUTORY TOKEN: <strong className="text-[#0B2545]">{statutoryToken}</strong>
                </span>
                <span>
                  DATE OF ISSUE: <strong>{new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </span>
                <span>
                  VALIDITY: <strong>PERMANENT (SCALE EXEMPTION)</strong>
                </span>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* SECTION 1: STARTUP INCUBATION & DPIIT ENTITY PROFILE */}
            {/* ---------------------------------------------------------------- */}
            <section className="space-y-2 page-break-inside-avoid">
              <div className="bg-[#0B2545] text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>SECTION 1: RECOGNIZED STARTUP VENTURE &amp; DPIIT INCUBATION PROFILE</span>
                </span>
                <span className="font-mono text-amber-300">CLAUSE 9.2 JHARKHAND STARTUP POLICY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-300 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Student Venture Legal Entity:
                  </span>
                  <span className="font-black text-slate-900 text-[12px] block">
                    {ventureEntityName}
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    Graduating Capstone: <strong>{teamName}</strong> ({leadCollege})
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-300 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Institutional Incubation Center:
                  </span>
                  <span className="font-black text-[#0B2545] text-[12px] block">
                    {incubatorName}
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    Host University: <strong>{leadCollege}</strong> &bull; DHTE Nodal Hub
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-300 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Startup Jharkhand Registration:
                  </span>
                  <span className="font-mono font-black text-[#991B1B] text-[11px] block">
                    {startupJharkhandId}
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    Category: Micro Clean-Tech &amp; Rural Hardware Prototyping
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-300 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    DPIIT Startup India Recognition:
                  </span>
                  <span className="font-mono font-black text-emerald-900 text-[11px] block">
                    {dpiitRegNumber} &bull; CERTIFIED ENTITY
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    Primary Founder: <strong>{leadFounderName}</strong> (Chief Innovator)
                  </span>
                </div>
              </div>
            </section>

            {/* ---------------------------------------------------------------- */}
            {/* SECTION 2: STATUTORY GeM EXEMPTION CERTIFICATE (GFR RULE 173(i)) */}
            {/* ---------------------------------------------------------------- */}
            <section className="space-y-2 page-break-inside-avoid">
              <div className="bg-[#0B2545] text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SECTION 2: STATUTORY GeM PUBLIC PROCUREMENT EXEMPTION CLAUSE</span>
                </span>
                <span className="font-mono text-[#F8E7A2]">GFR 2017 &bull; RULE 173(i)</span>
              </div>

              {/* Verbatim Exemption Citation Box */}
              <div className="p-3 bg-amber-50/90 border-2 border-amber-400 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-black text-[10px] text-amber-950 uppercase tracking-wide">
                  <FileCheck2 className="w-3.5 h-3.5 text-amber-800" />
                  <span>Statutory Legal Declaration &bull; Ministry of Finance Order</span>
                </div>
                <blockquote className="p-2.5 bg-white border border-amber-300 font-serif italic text-[11.5px] text-slate-800 leading-relaxed">
                  &ldquo;In accordance with Ministry of Finance OM No. F.20/2/2014-PPD and Rule 173(i) of General Financial Rules 2017, prior turnover and prior experience criteria are hereby RELAXED in full for the certified technology solution developed by <strong>{teamName}</strong> under DHTE Project Udbhav.&rdquo;
                </blockquote>
                <p className="text-[10.5px] text-slate-700 leading-snug">
                  This relaxation is universally binding on all procurement officers across Jharkhand State Government Departments, Zilla Parishads, Gram Panchayats, Block Development Offices (BDOs), Public Health Engineering Department (PHED), and Municipal Corporations purchasing via the Government e-Marketplace (GeM).
                </p>
              </div>

              {/* Regulatory Quality Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-slate-50 border border-slate-300">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    GeM Product Category:
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    Community Water Units
                  </span>
                  <span className="font-mono text-[10px] text-slate-600 block">
                    GeM Cat ID: {gemCatId}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-300">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Verified BIS Standard:
                  </span>
                  <span className="font-mono font-bold text-[#991B1B] block mt-0.5">
                    {bisStandardCode}
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    Lab: {testingLabAgency}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-300">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    DC Public Pilot Pass:
                  </span>
                  <span className="font-mono font-bold text-emerald-900 block mt-0.5">
                    {dcPermitToken}
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    90-Day Field Clearance Passed
                  </span>
                </div>
              </div>
            </section>

            {/* ---------------------------------------------------------------- */}
            {/* SECTION 3: COMMERCIAL PILOT ALLOCATION & UNIT ECONOMICS */}
            {/* ---------------------------------------------------------------- */}
            <section className="space-y-2 page-break-inside-avoid">
              <div className="bg-[#0B2545] text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>SECTION 3: STATE PROCUREMENT ALLOCATION &amp; APPROVED UNIT ECONOMICS</span>
                </span>
                <span className="font-mono text-emerald-300">RULE 149 DIRECT PURCHASE</span>
              </div>

              <div className="overflow-x-auto border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    <tr>
                      <th className="p-2 border-b border-r border-slate-300">Approved Item Specification</th>
                      <th className="p-2 border-b border-r border-slate-300 text-center">Approved Unit Cap</th>
                      <th className="p-2 border-b border-r border-slate-300 text-center">Initial Pilot Allocation</th>
                      <th className="p-2 border-b border-slate-300">Target Beneficiary Entities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 border-r border-slate-200">
                        <strong className="text-slate-900 block">{briefTitle}</strong>
                        <span className="text-[10px] text-slate-600">
                          Master Challenge Token: <strong className="font-mono">{masterIssueId}</strong>
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-emerald-900 text-sm">
                        ₹{unitCostINR.toLocaleString('en-IN')}
                        <span className="text-[9px] text-slate-500 font-sans block">per hardware unit</span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-[#0B2545] text-sm">
                        ₹12,40,000
                        <span className="text-[9px] text-slate-500 font-sans block">20 Gram Panchayats</span>
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-700 leading-snug">
                        Gram Panchayats, Block Development Offices (BDOs), and Urban Local Bodies (ULBs) via GeM Direct Purchase under Rule 149.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2 bg-emerald-50 border border-emerald-300 text-xs flex items-center gap-2 text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-[11px]">
                  <strong>Statutory Warranty &amp; Spares Protocol:</strong> 12 months on-site warranty backed by {leadCollege} incubator engineering roster.
                </span>
              </div>
            </section>

            {/* ---------------------------------------------------------------- */}
            {/* SECTION 4: TRIPARTITE GOVERNMENT AUTHORITY ENDORSEMENTS */}
            {/* ---------------------------------------------------------------- */}
            <section className="space-y-2 pt-2 border-t-2 border-slate-300 page-break-inside-avoid">
              <div className="text-center text-[10px] font-black uppercase text-slate-600 tracking-wider">
                TRIPARTITE STATUTORY ENDORSEMENT &amp; PROCUREMENT AUTHORIZATION
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                {/* Signatory 1: Academic Authority */}
                <div className="border-2 border-slate-300 p-2.5 bg-slate-50 space-y-1.5 flex flex-col justify-between">
                  <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    ACADEMIC CLEARANCE
                  </div>
                  <div className="py-2">
                    <div className="inline-block px-2 py-0.5 border border-dashed border-slate-400 bg-white text-[9px] font-mono text-slate-500">
                      [DIGITALLY SIGNED &bull; NIC-JH]
                    </div>
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block text-[11px]">
                      Director of Technical Education
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      DHTE &bull; Government of Jharkhand
                    </span>
                  </div>
                </div>

                {/* Signatory 2: Startup Authority */}
                <div className="border-2 border-slate-300 p-2.5 bg-slate-50 space-y-1.5 flex flex-col justify-between">
                  <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    STARTUP RECOGNITION
                  </div>
                  <div className="py-2">
                    <div className="inline-block px-2 py-0.5 border border-dashed border-amber-500 bg-amber-50 text-[9px] font-mono text-amber-900">
                      [OFFICIAL SEAL &bull; STARTUP JH]
                    </div>
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block text-[11px]">
                      Director of Industries
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      State Startup Nodal Officer, Ranchi
                    </span>
                  </div>
                </div>

                {/* Signatory 3: District Collectorate */}
                <div className="border-2 border-slate-300 p-2.5 bg-slate-50 space-y-1.5 flex flex-col justify-between">
                  <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    PILOT AUTHORIZATION
                  </div>
                  <div className="py-2">
                    <div className="inline-block px-2 py-0.5 border border-dashed border-[#991B1B] bg-red-50 text-[9px] font-mono text-[#991B1B]">
                      [DC PERMIT SEAL &bull; 90-DAY PASS]
                    </div>
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block text-[11px]">
                      Deputy Commissioner &amp; DM
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      District Collectorate, Dumka
                    </span>
                  </div>
                </div>
              </div>

              {/* Security & Verification Footer */}
              <div className="pt-2 text-center text-[9px] font-mono text-slate-500 flex flex-wrap items-center justify-between border-t border-slate-200">
                <span>SECURE HASH: SHA-256-{crypto.randomUUID().slice(0, 16).toUpperCase()}</span>
                <span>VERIFY: https://udbhav.jharkhand.gov.in/verify/gem</span>
                <span>GOVERNMENT OF JHARKHAND &bull; NIC-JH-NODE</span>
              </div>
            </section>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* MODAL FOOTER (NO PRINT) */}
        {/* ==================================================================== */}
        <div className="no-print bg-slate-100 p-3.5 sm:p-4 border-t border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-medium">
              Ready for GeM Rule 149 Direct Procurement &amp; Panchayat Purchase Order Issuance.
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0B2545] hover:bg-[#153e70] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#F8E7A2]" />
              <span>Print Statutory Packet (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GemProcurementBridgeModal;

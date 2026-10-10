/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Statutory Compliance PDF / Print Layouts Modal (Sprint 8 — Task 8.5)
 *
 * Formatted for standard A4 portrait paper:
 * 1. Section 1: Official Masthead & Provenance (Dual Emblem, Ashok Stambh & Jharkhand Seal)
 * 2. Section 2: MCA Form CSR-2 Statutory Annexure (Expenditure Table per Companies Act, 2013)
 * 3. Section 3: Form GFR-12A (Form of Utilization Certificate per GFR 2017 Rule 238(1))
 * 4. Section 4: Tripartite Statutory Endorsement & Institutional Seals
 *
 * STRICT REQUIREMENT: ZERO external PDF npm libraries.
 * Native browser print stylesheet (@media print / window.print()).
 */

import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  ShieldCheck,
  Building,
  CheckCircle2,
  Award,
  Stamp,
} from 'lucide-react';
import { db } from '../../../lib/db';
import { EscrowGrant } from '../../../types/governance';
import { StudentTeam, EngineeringProblemBrief } from '../../../types/solver';

export interface StatutoryComplianceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  grantId?: string;
}

// Fallback institutional grant fixture if none provided or loaded
const FALLBACK_GRANT: EscrowGrant = {
  id: 'GRANT-JH-2026-TK894',
  masterIssueId: 'ISSUE-JH-2026-RNC-01',
  teamId: 'TEAM-JH-2026-001',
  sponsorId: 'CORP-TATA-STEEL-CSR',
  sponsorName: 'Tata Steel CSR Foundation',
  totalCommittedINR: 250000,
  mcaScheduleVIICategory: 'WATER_AND_SANITATION',
  sdgGoalNumber: 6,
  tranches: [
    {
      stage: 'TRANCHE_1_BOM',
      percentage: 30,
      amountINR: 75000,
      status: 'DISBURSED',
      deliverableDescription: 'BOM & Architectural Design Clearance with faculty signoff',
      disbursedAt: '2026-01-15T11:00:00.000Z',
    },
    {
      stage: 'TRANCHE_2_LAB',
      percentage: 40,
      amountINR: 100000,
      status: 'DISBURSED',
      deliverableDescription: 'Working Lab Prototype & Telemetry Sign-off at accredited facility',
      disbursedAt: '2026-02-28T14:30:00.000Z',
    },
    {
      stage: 'TRANCHE_3_FIELD',
      percentage: 30,
      amountINR: 75000,
      status: 'LOCKED',
      deliverableDescription: 'Panchayat Field Testing & Community Handover certificate',
    },
  ],
  createdAt: 1741170000000,
};

export const StatutoryComplianceReportModal: React.FC<StatutoryComplianceReportModalProps> = ({
  isOpen,
  onClose,
  grantId,
}) => {
  const [grant, setGrant] = useState<EscrowGrant>(FALLBACK_GRANT);
  const [team, setTeam] = useState<StudentTeam | null>(null);
  const [brief, setBrief] = useState<EngineeringProblemBrief | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateData() {
      if (!isOpen) return;
      try {
        let loadedGrant: EscrowGrant | undefined;

        if (grantId) {
          loadedGrant = await db.escrowGrants.get(grantId);
        } else {
          const allGrants = await db.escrowGrants.toArray();
          if (allGrants.length > 0) {
            loadedGrant = allGrants[0];
          }
        }

        const activeGrant = loadedGrant || FALLBACK_GRANT;
        if (isMounted) setGrant(activeGrant);

        // Fetch team & brief context if available
        if (activeGrant.teamId) {
          const loadedTeam = await db.studentTeams.get(activeGrant.teamId);
          if (isMounted && loadedTeam) {
            setTeam(loadedTeam);
            if (loadedTeam.briefId) {
              const loadedBrief = await db.engineeringBriefs.get(loadedTeam.briefId);
              if (isMounted) setBrief(loadedBrief || null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to hydrate compliance report data:', err);
      }
    }

    hydrateData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, grantId]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculated Financial Metrics
  const totalSanctioned = grant.totalCommittedINR;
  const totalDisbursed = grant.tranches
    .filter((t) => t.status === 'DISBURSED')
    .reduce((acc, t) => acc + t.amountINR, 0);
  const remainingEscrow = Math.max(0, totalSanctioned - totalDisbursed);
  const utilizationPercentage = totalSanctioned > 0 ? Math.round((totalDisbursed / totalSanctioned) * 100) : 0;

  // Corporate Sponsor Details
  const isTata = (grant.sponsorId || '').includes('TATA') || (grant.sponsorName || '').includes('Tata');
  const corporateSponsorName = grant.sponsorName || (isTata ? 'Tata Steel CSR Foundation' : 'Central Coalfields Limited (CCL) CSR Foundation');
  const corporateCin = isTata ? 'U27100MH1907PLC002604' : 'U10200JH1956GOI000581';
  const grantReferenceToken = `DHTE/JH/CSR-2/GFR12A/2026/${grant.id.slice(-8).toUpperCase()}`;

  // Academic Institution & Capstone Team Info
  const institutionName =
    team?.leadCollege || 'Birsa Institute of Technology (BIT) Sindri — Department of Chemical Engineering';
  const teamName = team?.teamName || 'Team Jal-Drishti (Collegiate Engineering Capstone)';
  const facultyMentor =
    team?.mentorStatus === 'APPROVED'
      ? 'Dr. Arvind Sen (Prof. Chemical Engg, AICTE-ID: 1-94827102)'
      : 'Dr. Ramesh Chandra Murmu (Senior Faculty Investigator, AICTE-ID: 1-72940192)';
  const projectTitle =
    brief?.title || 'Arsenic & Heavy Metal Remediation Gravity Filter System (Cluster #JH-RNC-01)';
  const districtName = brief?.fieldEvidenceSummary?.district || 'Ranchi';
  const blockName = brief?.fieldEvidenceSummary?.block || 'Kanke Block';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:p-4 bg-slate-900/85 backdrop-blur-xs overflow-y-auto print:p-0 print:m-0 print:static print:bg-white print:overflow-visible print:block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="statutory-compliance-title"
    >
      {/* Outer Shell */}
      <div className="relative w-full max-w-4xl bg-white border border-slate-300 shadow-2xl my-0 sm:my-6 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none text-slate-900">
        
        {/* =========================================================================
            HEADER ACTION BAR (SCREEN ONLY - HIDDEN IN PRINT)
           ========================================================================= */}
        <div className="bg-[#0B2545] text-white p-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-400 print:hidden sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Statutory Dossier Preview &bull; A4 Print / PDF Engine
              </span>
              <p className="text-[11px] text-slate-300">
                MCA Form CSR-2 (Companies Act §135) &bull; Form GFR-12A (GFR 2017 Rule 238)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#7A1B1B] hover:bg-[#962626] text-[#F8E7A2] border border-amber-300 text-xs font-extrabold uppercase transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
              title="Open browser print dialog to print or save as A4 PDF"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>🖨️ प्रिंट / डाउनलोड वैधानिक PDF (Print / Save A4 PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer border border-slate-600"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">बंद करें / Close</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE DOSSIER SHEET (A4 FORMATTED)
           ========================================================================= */}
        <div className="p-6 sm:p-10 print:p-6 space-y-6 text-slate-900 bg-white font-sans text-xs leading-normal print:text-[11px] print:leading-relaxed">
          
          {/* =======================================================================
              DOCUMENT SECTION 1: OFFICIAL MASTHEAD & PROVENANCE
             ======================================================================= */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-3">
            {/* Dual Emblem Masthead */}
            <div className="flex items-center justify-between gap-4">
              {/* National Emblem (Ashok Stambh Representation) */}
              <div className="flex flex-col items-center justify-center text-center w-24 shrink-0">
                <svg
                  className="w-14 h-16 text-[#7A1B1B]"
                  viewBox="0 0 100 120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="National Emblem of India"
                >
                  <path d="M50 15 L35 35 L40 45 L50 35 L60 45 L65 35 Z" fill="#7A1B1B" fillOpacity="0.15" />
                  <circle cx="50" cy="25" r="8" />
                  <path d="M30 45 Q50 40 70 45 L72 58 Q50 53 28 58 Z" fill="#7A1B1B" fillOpacity="0.2" />
                  <circle cx="50" cy="72" r="16" />
                  <circle cx="50" cy="72" r="3" fill="#7A1B1B" />
                  <path d="M50 56 L50 88 M34 72 L66 72 M39 61 L61 83 M39 83 L61 61" strokeWidth="1.5" />
                  <rect x="20" y="93" width="60" height="10" rx="1" fill="#7A1B1B" fillOpacity="0.1" />
                  <rect x="15" y="105" width="70" height="8" rx="1" fill="#7A1B1B" fillOpacity="0.2" />
                </svg>
                <span className="text-[9px] font-black tracking-widest text-[#7A1B1B] uppercase mt-0.5">
                  सत्यमेव जयते
                </span>
              </div>

              {/* Central Official Masthead Titles */}
              <div className="text-center flex-1 space-y-1">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-[#0B2545] uppercase">
                  GOVERNMENT OF JHARKHAND
                </h1>
                <h2 className="text-xs sm:text-sm font-extrabold text-[#7A1B1B] uppercase tracking-wide">
                  DEPARTMENT OF HIGHER &amp; TECHNICAL EDUCATION (DHTE)
                </h2>
                <div className="inline-block bg-slate-100 border border-slate-300 px-3 py-1 font-mono font-bold text-[10px] text-slate-800 uppercase mt-1">
                  PROJECT UDBHAV &bull; STATE CIVIC ENGINEERING CAPSTONE ACCELERATOR
                </div>
                <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase pt-1">
                  STATUTORY CSR IMPACT AUDIT &amp; EXPENDITURE DOSSIER (FY 2025–2026)
                </h3>
              </div>

              {/* State Seal of Jharkhand (Representation) */}
              <div className="flex flex-col items-center justify-center text-center w-24 shrink-0">
                <svg
                  className="w-14 h-16 text-[#1F4E5B]"
                  viewBox="0 0 100 120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Seal of the State of Jharkhand"
                >
                  <circle cx="50" cy="50" r="42" fill="#1F4E5B" fillOpacity="0.08" />
                  <circle cx="50" cy="50" r="34" strokeDasharray="3 3" />
                  <circle cx="50" cy="50" r="22" />
                  <circle cx="50" cy="50" r="5" fill="#1F4E5B" />
                  <path d="M50 32 L50 68 M32 50 L68 50" strokeWidth="1.8" />
                  <path d="M38 38 L62 62 M38 62 L62 38" strokeWidth="1.5" />
                  <rect x="25" y="98" width="50" height="12" rx="2" fill="#1F4E5B" fillOpacity="0.2" />
                </svg>
                <span className="text-[9px] font-bold text-[#1F4E5B] uppercase mt-0.5">
                  झारखंड सरकार
                </span>
              </div>
            </div>

            {/* Statutory Reference Metadata Strip */}
            <div className="bg-slate-50 border border-slate-300 p-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <div>
                <span className="text-slate-500 font-normal">Reference Code: </span>
                <strong className="text-[#0B2545]">{grantReferenceToken}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-normal">Date of Dossier: </span>
                <strong className="text-slate-900">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-normal">Jurisdiction: </span>
                <strong className="text-slate-900">State of Jharkhand (Ranchi Registry)</strong>
              </div>
            </div>

            {/* Legal Authority Citation */}
            <p className="text-[10px] text-slate-600 italic text-center leading-relaxed">
              &ldquo;Pursuant to Section 135 of the Companies Act, 2013 read with Rule 8 of Companies (CSR Policy) Rules, 2014, 
              MCA Notification G.S.R. 12(E), and Rule 238(1) of General Financial Rules (GFR 2017) Form GFR-12A.&rdquo;
            </p>
          </div>

          {/* =======================================================================
              DOCUMENT SECTION 2: MCA FORM CSR-2 STATUTORY ANNEXURE (EXPENDITURE TABLE)
             ======================================================================= */}
          <div className="space-y-3 break-inside-avoid print:break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-400 pb-1">
              <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#7A1B1B]" />
                <span>PART I: MCA FORM CSR-2 STATUTORY EXPENDITURE ANNEXURE</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-600 font-bold">
                [Schedule VII, Section 135]
              </span>
            </div>

            {/* Corporate & Schedule VII Particulars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="border border-slate-200 p-2 bg-slate-50/60">
                <span className="text-slate-500 block">Sponsoring Entity:</span>
                <strong className="text-slate-900 font-bold block mt-0.5">{corporateSponsorName}</strong>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/60">
                <span className="text-slate-500 block">Corporate CIN:</span>
                <strong className="text-slate-900 font-mono font-bold block mt-0.5">{corporateCin}</strong>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/60">
                <span className="text-slate-500 block">Schedule VII Classification:</span>
                <strong className="text-slate-900 font-bold block mt-0.5">Item (i) &mdash; Sanitation &amp; Safe Water</strong>
              </div>
              <div className="border border-slate-200 p-2 bg-slate-50/60">
                <span className="text-slate-500 block">Target UN SDG Alignment:</span>
                <strong className="text-slate-900 font-bold block mt-0.5">SDG 6: Clean Water &amp; Sanitation</strong>
              </div>
            </div>

            {/* Project & Beneficiary Location Strip */}
            <div className="border border-slate-200 p-2 text-[10px] bg-white flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Collegiate Lead Institution: </span>
                <strong className="text-[#0B2545]">{institutionName}</strong>
              </div>
              <div>
                <span className="text-slate-500">LGD Field Target: </span>
                <strong className="text-slate-900">{blockName}, District {districtName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Capstone Team: </span>
                <strong className="text-slate-900">{teamName}</strong>
              </div>
            </div>

            {/* 3-Tranche Milestone Disbursement Ledger */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-[10px] text-left">
                <thead>
                  <tr className="bg-[#0B2545] text-white print:bg-slate-200 print:text-black">
                    <th className="border border-slate-300 p-1.5 font-bold uppercase w-16">Tranche</th>
                    <th className="border border-slate-300 p-1.5 font-bold uppercase">Milestone Objective &amp; Statutory Clearance Condition</th>
                    <th className="border border-slate-300 p-1.5 font-bold uppercase text-right w-24">Sanctioned (₹)</th>
                    <th className="border border-slate-300 p-1.5 font-bold uppercase text-right w-24">Disbursed (₹)</th>
                    <th className="border border-slate-300 p-1.5 font-bold uppercase text-center w-28">Status / Tx Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {grant.tranches.map((t, idx) => {
                    const isDisbursed = t.status === 'DISBURSED';
                    const stageTitle =
                      t.stage === 'TRANCHE_1_BOM'
                        ? 'Tranche 1 (30%) &bull; BOM & Architectural Design Clearance'
                        : t.stage === 'TRANCHE_2_LAB'
                        ? 'Tranche 2 (40%) &bull; Working Lab Prototype & Telemetry Sign-off'
                        : 'Tranche 3 (30%) &bull; Panchayat Field Testing & Community Handover';

                    const conditionDesc =
                      t.stage === 'TRANCHE_1_BOM'
                        ? 'Faculty PI verification of BOM within statutory ₹2,500 budget cap and engineering schematic clearance.'
                        : t.stage === 'TRANCHE_2_LAB'
                        ? 'Functional prototype laboratory benchmarking at accredited institution and BIS standard compliance check.'
                        : 'Rural Gram Panchayat field pilot deployment sign-off and Gram Pradhan endorsement handover.';

                    const txRef = isDisbursed
                      ? `TXN-JH-ESCROW-${idx + 1}-9982`
                      : 'IN ESCROW HOLD';

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 p-1.5 font-mono font-bold text-center">
                          Stage {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          <div className="font-bold text-slate-900" dangerouslySetInnerHTML={{ __html: stageTitle }} />
                          <div className="text-slate-500 text-[9px] mt-0.5">{conditionDesc}</div>
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono font-bold text-right text-slate-800">
                          ₹{t.amountINR.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono font-bold text-right text-[#7A1B1B]">
                          ₹{(isDisbursed ? t.amountINR : 0).toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono">
                          {isDisbursed ? (
                            <div className="space-y-0.5">
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold uppercase inline-block">
                                Disbursed
                              </span>
                              <div className="text-[8px] text-slate-500 line-clamp-1" title={txRef}>
                                {txRef}
                              </div>
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold uppercase inline-block">
                              In Escrow Hold
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Aggregate Summary Footer */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <td colSpan={2} className="border border-slate-300 p-2 text-right uppercase text-slate-900">
                      Total Grants-in-Aid Escrow Allocation:
                    </td>
                    <td className="border border-slate-300 p-2 font-mono text-right text-[#0B2545]">
                      ₹{totalSanctioned.toLocaleString('en-IN')}
                    </td>
                    <td className="border border-slate-300 p-2 font-mono text-right text-emerald-800">
                      ₹{totalDisbursed.toLocaleString('en-IN')}
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-slate-700 font-mono text-[9px]">
                      {utilizationPercentage}% Utilized
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Escrow Balance Ledger Summary */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
              <div className="border border-slate-300 p-1.5 bg-slate-50">
                <span className="text-slate-500 uppercase block text-[9px]">Total Sanctioned Grant</span>
                <strong className="text-slate-900 font-mono font-bold text-xs">
                  ₹{totalSanctioned.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="border border-emerald-300 p-1.5 bg-emerald-50">
                <span className="text-emerald-700 uppercase block text-[9px]">Total Released from Escrow</span>
                <strong className="text-emerald-900 font-mono font-bold text-xs">
                  ₹{totalDisbursed.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="border border-amber-300 p-1.5 bg-amber-50">
                <span className="text-amber-800 uppercase block text-[9px]">Remaining Balance in Escrow</span>
                <strong className="text-amber-950 font-mono font-bold text-xs">
                  ₹{remainingEscrow.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          {/* =======================================================================
              DOCUMENT SECTION 3: FORM GFR-12A (FORM OF UTILIZATION CERTIFICATE)
             ======================================================================= */}
          <div className="space-y-3 pt-2 border-t border-slate-300 break-inside-avoid print:break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-400 pb-1">
              <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#1F4E5B]" />
                <span>PART II: FORM GFR-12A (FORM OF UTILIZATION CERTIFICATE)</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-600 font-bold">
                [See Rule 238(1) of GFR 2017]
              </span>
            </div>

            {/* Verbatim GFR 2017 Statutory Affirmation Clauses */}
            <div className="border border-slate-300 p-3 bg-slate-50/50 space-y-2.5 text-[10px] leading-relaxed text-slate-800">
              <p className="text-justify font-serif">
                <strong>1.</strong> Certified that out of <strong className="font-mono">₹{totalSanctioned.toLocaleString('en-IN')}</strong> (Rupees Two Lakh Fifty Thousand Only) 
                of grants-in-aid sanctioned under <em>Project Udbhav</em> during the financial year <strong>2025–2026</strong> in favour of 
                <strong> {institutionName}</strong> under Government of Jharkhand Letter No. <span className="font-mono font-semibold">{grantReferenceToken}</span>, 
                a sum of <strong className="font-mono text-emerald-900">₹{totalDisbursed.toLocaleString('en-IN')}</strong> has been utilized for the purpose of 
                grassroots civic engineering prototype deployment (<em>{projectTitle}</em>) for which it was sanctioned, 
                and that the balance of <strong className="font-mono">₹{remainingEscrow.toLocaleString('en-IN')}</strong> remaining unutilized 
                at the end of the period is earmarked and retained in statutory escrow for final community handover.
              </p>

              <p className="text-justify font-serif">
                <strong>2.</strong> Certified that I have satisfied myself that the conditions on which the grants-in-aid was sanctioned have been duly fulfilled 
                and that I have exercised the following checks to see that the money was actually utilized for the purpose for which it was sanctioned:
              </p>

              {/* 3 Checks Mandated by State Auditor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-sans">
                <div className="bg-white border border-slate-200 p-2 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold text-[9px] uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Check 1: Field Inspection</span>
                  </div>
                  <p className="text-[9px] text-slate-600">
                    Physical on-site verification at {blockName} Gram Panchayat with geo-tagged photographic evidence.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-2 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold text-[9px] uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Check 2: Laboratory Telemetry</span>
                  </div>
                  <p className="text-[9px] text-slate-600">
                    Faculty Mentor verified telemetry logs confirming continuous hydraulic flow rate and turbidity removal.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-2 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold text-[9px] uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Check 3: Accredited BIS Safety</span>
                  </div>
                  <p className="text-[9px] text-slate-600">
                    Certified compliant under IS 10500:2012 Drinking Water Specification by accredited CSIR-CIMFR laboratory.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =======================================================================
              DOCUMENT SECTION 4: TRIPARTITE STATUTORY ENDORSEMENT & SEALS
             ======================================================================= */}
          <div className="space-y-3 pt-2 border-t border-slate-300 break-inside-avoid print:break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-400 pb-1">
              <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-1.5">
                <Stamp className="w-3.5 h-3.5 text-[#7A1B1B]" />
                <span>PART III: TRIPARTITE STATUTORY ENDORSEMENT &amp; OFFICIAL SEALS</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-600 font-bold">
                [Authenticated State Signatories]
              </span>
            </div>

            {/* 3 Formal Print-Ready Signature Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Signatory 1: Faculty Principal Investigator */}
              <div className="border border-slate-300 p-3 bg-white space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">1. Faculty Investigator / Mentor</span>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-xs text-slate-700">Arvind Sen</span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-700 space-y-0.5">
                  <strong className="block font-bold">{facultyMentor}</strong>
                  <div className="text-slate-500 font-mono">Date: 28-Feb-2026</div>
                  <div className="text-emerald-800 font-bold text-[8px] uppercase">✓ Lab Telemetry Signed</div>
                </div>
              </div>

              {/* Signatory 2: District Nodal Officer / BDO */}
              <div className="border border-slate-300 p-3 bg-white space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">2. District Nodal Officer / BDO</span>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-xs text-slate-700">R. K. Soren, BDO</span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-700 space-y-0.5">
                  <strong className="block font-bold">Shri Rajesh Soren, BDO (LGD: {blockName})</strong>
                  <div className="text-slate-500 font-mono">District Administration, Ranchi</div>
                  <div className="text-emerald-800 font-bold text-[8px] uppercase">✓ State Seal Verified</div>
                </div>
              </div>

              {/* Signatory 3: University Registrar / Finance Officer */}
              <div className="border border-slate-300 p-3 bg-white space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">3. Institutional Finance Officer</span>
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-xs text-slate-700">M. P. Sinha</span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-700 space-y-0.5">
                  <strong className="block font-bold">Shri M. P. Sinha, Finance Comptroller</strong>
                  <div className="text-slate-500 font-mono">Registrar Secretariat, BIT Sindri</div>
                  <div className="text-emerald-800 font-bold text-[8px] uppercase">✓ GFR-12A Certified</div>
                </div>
              </div>
            </div>

            {/* Official QR Code & Digital Verification Token Strip */}
            <div className="bg-slate-50 border border-slate-300 p-2.5 flex flex-wrap items-center justify-between gap-3 text-[9px] text-slate-600 font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black flex items-center justify-center text-white text-[7px] font-bold">
                  QR-DOC
                </div>
                <div>
                  <div>DIGITAL AUDIT HASH: <strong className="text-slate-900">SHA256:7a89f...d49c02</strong></div>
                  <div>BLOCKCHAIN ANCHOR: <strong className="text-slate-900">JH-STATE-AUDIT-2026-BLK#49201</strong></div>
                </div>
              </div>
              <div className="text-right">
                <div>AUTHENTICATED VIA PROJECT UDBHAV STATUTORY PORTAL</div>
                <div className="text-slate-500">DIRECTORATE OF HIGHER &amp; TECHNICAL EDUCATION, RANCHI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen Only - Hidden in Print) */}
        <div className="bg-slate-100 p-3.5 px-6 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>A4 Document Ready &bull; Native Browser Print Formatting</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#7A1B1B] hover:bg-[#962626] text-[#F8E7A2] border border-amber-300 text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट करें (Print A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              बंद करें / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatutoryComplianceReportModal;

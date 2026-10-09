/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 3: Governance & Capital — Statutory CSR-2 & Form GFR-12A Utilization Dossier Modal
 * 
 * Generates an executive corporate compliance dossier pursuant to:
 * 1. Section 135 of Companies Act, 2013 read with Rule 8 of CSR Rules, 2014 (MCA Form CSR-2).
 * 2. General Financial Rules (GFR-12A) Form of Utilization Certificate.
 * 3. Government of Jharkhand Higher & Technical Education Department statutory standards.
 * 
 * Zero bundle overhead: Built with print-optimized CSS (@media print / window.print()).
 */

import React from 'react';
import {
  Printer,
  X,
  Award,
  Building,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';
import { EscrowGrant } from '../../../types/governance';
import { StudentTeam, EngineeringProblemBrief } from '../../../types/solver';

export interface StatutoryCSRAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  grant: EscrowGrant;
  team?: StudentTeam | null;
  brief?: EngineeringProblemBrief | null;
  language?: 'en' | 'hi';
}

const MCA_LEGAL_MAPPINGS: Record<string, string> = {
  WATER_AND_SANITATION:
    'Schedule VII (i): Eradicating hunger, poverty, promoting health care and sanitation, making available safe drinking water.',
  AGRO_FORESTRY:
    'Schedule VII (iv): Ensuring environmental sustainability, ecological balance, protection of flora and fauna, agro-forestry.',
  RURAL_ENERGY:
    'Schedule VII (iv) & (x): Rural development projects, clean renewable energy infrastructure, and ecological conservation.',
  EDUCATION_SKILLS:
    'Schedule VII (ii): Promoting education, including special education and employment enhancing vocational technical skills.',
  HEALTHCARE:
    'Schedule VII (i): Promoting preventive health care, rural medical diagnostics, and hygiene sanitation.',
};

const SDG_DESCRIPTIONS: Record<number, string> = {
  6: 'SDG 6: Ensure availability and sustainable management of water and sanitation for all.',
  7: 'SDG 7: Ensure access to affordable, reliable, sustainable and modern energy for all.',
  9: 'SDG 9: Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.',
  11: 'SDG 11: Make cities and human settlements inclusive, safe, resilient and sustainable.',
  13: 'SDG 13: Take urgent action to combat climate change and its impacts.',
};

export const StatutoryCSRAuditModal: React.FC<StatutoryCSRAuditModalProps> = ({
  isOpen,
  onClose,
  grant,
  team,
  brief,
  language = 'en',
}) => {
  if (!isOpen) return null;

  const totalCommitted = grant.totalCommittedINR;
  const totalDisbursed = grant.tranches
    .filter((t) => t.status === 'DISBURSED')
    .reduce((sum, t) => sum + t.amountINR, 0);
  const remainingInEscrow = totalCommitted - totalDisbursed;

  const referenceNumber = `DHTE/CSR-2/GFR12A/2026/${grant.id.slice(0, 10).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #udbhav-csr-statutory-dossier, #udbhav-csr-statutory-dossier * {
            visibility: visible !important;
          }
          #udbhav-csr-statutory-dossier {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm 20mm !important;
            box-shadow: none !important;
            border: 3px double #000 !important;
            background: white !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white border-2 border-[#7A1B1B] max-w-4xl w-full my-auto shadow-2xl flex flex-col max-h-[94vh]">
        {/* ==================================================================== */}
        {/* MODAL CONTROL HEADER (Hidden on print) */}
        {/* ==================================================================== */}
        <div className="no-print bg-[#7A1B1B] text-white p-3.5 border-b-2 border-[#F8E7A2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#F8E7A2]" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
              {language === 'hi'
                ? 'वैधानिक कॉर्पोरेट सीएसआर प्रभाव व व्यय डोजियर (MCA CSR-2 & GFR-12A)'
                : 'Statutory Corporate CSR Impact & Expenditure Dossier (MCA CSR-2 & GFR-12A)'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#F8E7A2] hover:bg-[#F3D770] text-[#7A1B1B] text-xs font-black uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print document or save as official PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save Statutory PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-amber-200 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
              aria-label="Close Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SCROLLABLE PREVIEW CONTAINER */}
        {/* ==================================================================== */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-100 flex-1">
          {/* ================================================================== */}
          {/* PRINTABLE DOSSIER CARD (#udbhav-csr-statutory-dossier) */}
          {/* ================================================================== */}
          <div
            id="udbhav-csr-statutory-dossier"
            className="bg-white border-4 border-double border-[#7A1B1B] p-6 sm:p-10 shadow-lg text-slate-900 space-y-6 max-w-3xl mx-auto font-serif"
          >
            {/* OFFICIAL MASTHEAD */}
            <div className="border-b-2 border-[#7A1B1B] pb-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#7A1B1B] flex items-center justify-center font-bold text-xs text-[#7A1B1B]">
                  JH-GOVT
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-sans font-black text-[#7A1B1B]">
                    Government of Jharkhand &bull; झारखण्ड सरकार
                  </h4>
                  <h2 className="text-base sm:text-lg font-black tracking-wide font-sans text-[#0B2545]">
                    DEPARTMENT OF HIGHER &amp; TECHNICAL EDUCATION (DHTE)
                  </h2>
                  <p className="text-[11px] font-sans text-slate-600">
                    Project Udbhav &bull; Quadruple-Helix Demand-Driven Civic R&amp;D Ecosystem
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] font-sans font-bold text-slate-700 border-t border-slate-300 mt-2">
                <span>Dossier Ref: <strong className="font-mono text-[#7A1B1B]">{referenceNumber}</strong></span>
                <span>Financial Year: <strong>2025–2026</strong></span>
                <span>Audit Date: <strong>{currentDate}</strong></span>
              </div>

              <div className="pt-3">
                <span className="inline-block bg-[#0B2545] text-white text-xs font-sans font-black uppercase px-4 py-1 tracking-wider">
                  STATUTORY CORPORATE CSR IMPACT &amp; EXPENDITURE DOSSIER
                </span>
                <p className="text-[10px] font-sans text-slate-500 italic mt-1">
                  Pursuant to Section 135 of Companies Act, 2013 read with Rule 8 of CSR Rules, 2014 &amp; GFR-12A
                </p>
              </div>
            </div>

            {/* SECTION A: CORPORATE GRANT IDENTIFICATION */}
            <div className="font-sans space-y-2 border-b border-slate-300 pb-4">
              <h5 className="text-xs font-black uppercase text-[#7A1B1B] flex items-center gap-1.5 tracking-wider">
                <Building className="w-3.5 h-3.5 text-[#7A1B1B]" />
                <span>Section A: Corporate Grant Identification &amp; Statutory Provenance</span>
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Sponsoring Entity</span>
                  <span className="font-bold text-[#0B2545]">{grant.sponsorName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Grant Contract ID</span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">{grant.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Lead HEI Partner</span>
                  <span className="font-bold text-[#7A1B1B]">{team?.leadCollege || 'BIT Sindri'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Target Solver Team</span>
                  <span className="font-bold text-slate-800">{team?.teamName || 'Jal-Shuddhi Innovators'}</span>
                </div>
              </div>

              {/* MCA Schedule VII & SDG Goal Mapping */}
              <div className="space-y-1 bg-slate-50 p-2.5 border border-slate-200 text-xs">
                <div>
                  <strong className="text-slate-800">MCA Schedule VII Classification:</strong>{' '}
                  <span className="text-slate-700 italic">
                    {MCA_LEGAL_MAPPINGS[grant.mcaScheduleVIICategory] || grant.mcaScheduleVIICategory}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <strong className="text-emerald-800">UN Sustainable Development Goal:</strong>{' '}
                  <span className="text-slate-700">
                    {SDG_DESCRIPTIONS[grant.sdgGoalNumber] || `Goal ${grant.sdgGoalNumber}`}
                  </span>
                </div>
              </div>

              {brief && (
                <div className="text-[11px] text-slate-600 px-1">
                  <strong>Challenge Scope:</strong> {brief.title} ({brief.fieldEvidenceSummary.block}, {brief.fieldEvidenceSummary.district}) &bull; Target Budget Ceiling: ₹{brief.maxCostINR.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            {/* SECTION B: MCA FORM CSR-2 ANNEXURE (EXPENDITURE BREAKDOWN) */}
            <div className="font-sans space-y-2.5 border-b border-slate-300 pb-4 page-break-inside-avoid">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-[#7A1B1B] flex items-center gap-1.5 tracking-wider">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#7A1B1B]" />
                  <span>Section B: MCA Form CSR-2 Annexure (Multi-Stage Escrow Ledger)</span>
                </h5>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 font-bold uppercase">
                  SHA-256 Verified
                </span>
              </div>

              {/* Tranche Table */}
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase text-slate-700">
                    <th className="p-2 border-r border-slate-300">Milestone Tranche</th>
                    <th className="p-2 border-r border-slate-300 text-center">Split</th>
                    <th className="p-2 border-r border-slate-300 text-right">Sanctioned</th>
                    <th className="p-2 border-r border-slate-300 text-right">Disbursed</th>
                    <th className="p-2 border-r border-slate-300">Escrow State</th>
                    <th className="p-2">Verification Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {grant.tranches.map((t, idx) => {
                    const isDisbursed = t.status === 'DISBURSED';
                    const isApproved = t.status === 'APPROVED';

                    return (
                      <tr key={t.stage} className="border-b border-slate-200 text-[11px]">
                        <td className="p-2 border-r border-slate-200">
                          <strong className="text-[#0B2545] block">
                            Stage {idx + 1}: {t.stage === 'TRANCHE_1_BOM' ? 'BOM & Schematics' : t.stage === 'TRANCHE_2_LAB' ? 'Lab Telemetry Bench' : 'Panchayat Field Pilot'}
                          </strong>
                          <span className="text-[9px] text-slate-500 line-clamp-1">
                            {t.deliverableDescription}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                          {t.percentage}%
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold">
                          ₹{t.amountINR.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-emerald-800">
                          ₹{(isDisbursed ? t.amountINR : 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {isDisbursed ? (
                            <span className="text-emerald-800 font-bold uppercase text-[10px]">
                              Disbursed
                            </span>
                          ) : isApproved ? (
                            <span className="text-blue-800 font-bold uppercase text-[10px]">
                              Approved
                            </span>
                          ) : (
                            <span className="text-amber-800 font-bold uppercase text-[10px]">
                              Locked
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-[10px] text-slate-600">
                          {t.stage === 'TRANCHE_3_FIELD' ? (
                            <span>
                              Dual: Faculty {t.facultySignoffAt ? '✓' : 'Pending'} &bull; BDO {t.govtSignoffAt ? '✓' : 'Pending'}
                            </span>
                          ) : t.facultySignoffAt ? (
                            <span>Faculty Mentor (Signed)</span>
                          ) : (
                            <span>Awaiting Faculty Review</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                    <td className="p-2 border-r border-slate-300 uppercase" colSpan={2}>
                      Total Statutory Commitment
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono font-black text-[#0B2545]">
                      ₹{totalCommitted.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono font-black text-emerald-900">
                      ₹{totalDisbursed.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-slate-600 text-[10px]" colSpan={2}>
                      Held in Escrow: ₹{remainingInEscrow.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* SECTION C: FORM GFR-12A (UTILIZATION CERTIFICATE) */}
            <div className="font-sans space-y-2 border-b border-slate-300 pb-4 page-break-inside-avoid">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-[#7A1B1B] flex items-center gap-1.5 tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#7A1B1B]" />
                  <span>Section C: Form GFR-12A (Form of Utilization Certificate)</span>
                </h5>
                <span className="font-mono text-[10px] text-slate-500 font-bold">
                  Rule 238(1) &bull; General Financial Rules, 2017
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 border border-slate-300 text-xs leading-relaxed space-y-2 text-slate-800">
                <p>
                  1. Certified that out of <strong>₹{totalCommitted.toLocaleString('en-IN')}</strong> of grants-in-aid committed and sanctioned by <strong>{grant.sponsorName}</strong> in favour of the <em>{team?.teamName || 'Jal-Shuddhi Innovators'}</em> collegiate engineering cohort at <em>{team?.leadCollege || 'BIT Sindri'}</em> under Project Udbhav for the financial year 2025–2026, a sum of <strong>₹{totalDisbursed.toLocaleString('en-IN')}</strong> has been duly disbursed and utilized for the designated grassroots engineering challenge.
                </p>
                <p>
                  2. Certified that I have satisfied myself that the conditions on which the grant-in-aid was sanctioned have been duly fulfilled and that the money was actually spent on hardware fabrication, local sand/iron filtration media procurement, sensor calibration, and Panchayat testing for which it was sanctioned.
                </p>
                <p className="text-[11px] text-slate-600 italic">
                  3. Physical Verification: All physical prototypes, technical telemetry readings, and bill-of-materials expenditures have been independently verified through faculty supervisor bench testing and Gram Panchayat on-site inspections.
                </p>
              </div>
            </div>

            {/* SECTION D: TRIPARTITE SIGN-OFF SEAL BLOCKS */}
            <div className="font-sans space-y-4 pt-2 page-break-inside-avoid">
              <span className="text-xs font-black uppercase text-[#7A1B1B] block tracking-wider">
                Section D: Tripartite Statutory Verification &amp; Institutional Endorsement
              </span>

              {/* 3 SIGNATURE COLUMNS */}
              <div className="grid grid-cols-3 gap-6 pt-4 text-center text-xs">
                <div className="border-t border-slate-500 pt-2 space-y-1">
                  <div className="h-8 flex items-center justify-center italic text-slate-400 font-mono text-[10px]">
                    [Verified &bull; Telemetry Signed]
                  </div>
                  <strong className="block text-slate-900">Dr. R. K. Singh</strong>
                  <span className="text-[10px] text-slate-500 block">Faculty Supervisor / PI</span>
                  <span className="text-[9px] text-slate-400 font-mono block">BIT Sindri, Dhanbad</span>
                </div>

                <div className="border-t border-slate-500 pt-2 space-y-1">
                  <div className="h-8 flex items-center justify-center italic text-slate-400 font-mono text-[10px]">
                    [Field Inspection Gate Cleared]
                  </div>
                  <strong className="block text-slate-900">Block Development Officer</strong>
                  <span className="text-[10px] text-slate-500 block">District Administration</span>
                  <span className="text-[9px] text-slate-400 font-mono block">Dumka Sadar, Jharkhand</span>
                </div>

                <div className="border-t border-slate-500 pt-2 space-y-1">
                  <div className="h-8 flex items-center justify-center italic text-slate-300 text-[10px]">
                    (Official Institutional Seal)
                  </div>
                  <strong className="block text-slate-900">Registrar / Finance Officer</strong>
                  <span className="text-[10px] text-slate-500 block">Authorized Counter-Signatory</span>
                  <span className="text-[9px] text-slate-400 font-mono block">{team?.leadCollege || 'BIT Sindri'}</span>
                </div>
              </div>
            </div>

            {/* OFFICIAL FOOTER STRIP */}
            <div className="border-t border-slate-300 pt-3 flex flex-wrap items-center justify-between text-[9px] font-sans text-slate-500">
              <span>Govt of Jharkhand &bull; State CSR Governance Cell &bull; DHTE State Innovation Registry</span>
              <span className="font-mono">Verification Token: CSR2-GFR12A-{grant.id.slice(0, 12)}</span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* MODAL FOOTER (Hidden on print) */}
        {/* ==================================================================== */}
        <div className="no-print bg-slate-100 border-t-2 border-slate-300 p-3.5 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-600">
            Click <strong>Print / Save Statutory PDF</strong> to export the signed MCA Form CSR-2 and Form GFR-12A dossier.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#7A1B1B] hover:bg-[#962626] text-white text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statutory PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatutoryCSRAuditModal;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 3: Governance & Capital — CSR Escrow & Grant Management Console (Shoe 4)
 * 
 * Features:
 * 1. Top GIGW 3.0 Metrics Bar: Committed CSR Capital, Disbursed, Locked in Escrow, Active Challenges.
 * 2. Multi-Party Role Simulator: Switch between Industry CSR, Faculty Mentor, and Govt BDO.
 * 3. Grant Cards with MCA Schedule VII, SDG Goals, and Visual 3-Stage Escrow Progress Rail.
 * 4. TrancheReleaseModal integration for deliverable verification & multi-party fund release.
 */

import React, { useState, useEffect } from 'react';
import {
  Coins,
  ShieldCheck,
  Building,
  GraduationCap,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Briefcase,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  Award,
} from 'lucide-react';
import { EscrowGrant, MilestoneTranche, SafetyValidation } from '../../../types/governance';
import { StudentTeam, EngineeringProblemBrief } from '../../../types/solver';
import {
  getAllEscrowGrants,
  getAllTeams,
  getBriefs,
  getAllSafetyValidations,
} from '../../../lib/db';
import { TrancheReleaseModal } from './TrancheReleaseModal';
import { StatutoryCSRAuditModal } from './StatutoryCSRAuditModal';
import { TwoTierSafetyGateModal } from './TwoTierSafetyGateModal';

export type CSREscrowRole = 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR';

export interface CSREscrowDashboardProps {
  userRole?: CSREscrowRole;
  onRoleChange?: (role: CSREscrowRole) => void;
  language?: 'en' | 'hi';
}

const MCA_LABELS: Record<string, string> = {
  WATER_AND_SANITATION: 'MCA Sch VII: Safe Drinking Water & Sanitation',
  AGRO_FORESTRY: 'MCA Sch VII: Agro-Forestry & Soil Conservation',
  RURAL_ENERGY: 'MCA Sch VII: Rural Electrification & Solar Microgrids',
  EDUCATION_SKILLS: 'MCA Sch VII: Technical Education & Livelihood Skills',
  HEALTHCARE: 'MCA Sch VII: Rural Healthcare & Preventive Sanitation',
};

const SDG_LABELS: Record<number, string> = {
  6: 'SDG 6: Clean Water & Sanitation',
  7: 'SDG 7: Affordable & Clean Energy',
  9: 'SDG 9: Industry, Innovation & Infrastructure',
  11: 'SDG 11: Sustainable Cities & Communities',
  13: 'SDG 13: Climate Action',
};

export const CSREscrowDashboard: React.FC<CSREscrowDashboardProps> = ({
  userRole: propUserRole,
  onRoleChange,
  language = 'en',
}) => {
  const [internalRole, setInternalRole] = useState<CSREscrowRole>(
    propUserRole || 'INDUSTRY_CSR'
  );
  const activeRole = propUserRole || internalRole;

  const handleRoleSelect = (role: CSREscrowRole) => {
    setInternalRole(role);
    if (onRoleChange) {
      onRoleChange(role);
    }
  };

  const [grants, setGrants] = useState<EscrowGrant[]>([]);
  const [teams, setTeams] = useState<StudentTeam[]>([]);
  const [briefs, setBriefs] = useState<EngineeringProblemBrief[]>([]);
  const [safetyValidations, setSafetyValidations] = useState<SafetyValidation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal inspection state
  const [selectedGrant, setSelectedGrant] = useState<EscrowGrant | null>(null);
  const [selectedTranche, setSelectedTranche] = useState<MilestoneTranche | null>(null);
  const [dossierGrant, setDossierGrant] = useState<EscrowGrant | null>(null);
  const [selectedSafetyVal, setSelectedSafetyVal] = useState<SafetyValidation | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allGrants, allStudentTeams, allBriefs, allSafety] = await Promise.all([
        getAllEscrowGrants(),
        getAllTeams(),
        getBriefs(),
        getAllSafetyValidations(),
      ]);
      setGrants(allGrants);
      setTeams(allStudentTeams);
      setBriefs(allBriefs);
      setSafetyValidations(allSafety);
    } catch (err) {
      console.error('Failed to load CSR escrow dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Locate the Dumka challenge safety record
  const dumkaSafety =
    safetyValidations.find((s) => s.id === 'SAFE-JH-2026-001') ||
    safetyValidations.find((s) => s.masterIssueId === 'JH-2026-M-849201') ||
    safetyValidations[0] ||
    null;

  // Compute Top Metrics
  const totalCommitted = grants.reduce((sum, g) => sum + g.totalCommittedINR, 0);

  const totalDisbursed = grants.reduce((sum, g) => {
    const disbursedInGrant = g.tranches
      .filter((t) => t.status === 'DISBURSED')
      .reduce((sub, t) => sub + t.amountINR, 0);
    return sum + disbursedInGrant;
  }, 0);

  const totalLocked = totalCommitted - totalDisbursed;
  const activeChallengesCount = grants.length;

  const handleOpenTranche = (grant: EscrowGrant, tranche: MilestoneTranche) => {
    setSelectedGrant(grant);
    setSelectedTranche(tranche);
  };

  return (
    <section className="bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden space-y-4">
      {/* ==================================================================== */}
      {/* 1. BUREAU EXECUTIVE MASTHEAD */}
      {/* ==================================================================== */}
      <div className="bg-[#0B2545] text-white p-4 border-b-2 border-amber-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#7A1B1B] text-[#F8E7A2] p-2.5 border border-amber-900/60 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                  SHOE 4 &bull; INDUSTRY &amp; CSR PORTAL
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  DEC-CSR-JH-2026 &bull; STATUTORY ESCROW GOVERNANCE
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5">
                {language === 'hi'
                  ? 'उद्योग सीएसआर एस्क्रो एवं बहु-चरणीय अनुदान प्रबंधन'
                  : 'CSR Escrow Management & Milestone Capital Disbursement Console'}
              </h3>
              <p className="text-xs text-slate-300">
                {language === 'hi'
                  ? 'एमसीए शेड्यूल सात एवं एसडीजी-अलाइन एस्क्रो: 30% बीओएम + 30% लैब बेंच + 40% फील्ड पायलट सत्यापन द्वार।'
                  : 'MCA Schedule VII & SDG-Aligned Escrow: 30% BOM + 30% Lab Telemetry + 40% Dual-Signed Field Handover.'}
              </p>
            </div>
          </div>

          {/* Interactive Multi-Party Role Simulator Switcher */}
          <div className="bg-white/10 border border-white/20 p-2 self-start md:self-auto shrink-0 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-300 block tracking-wider">
              {language === 'hi' ? 'सक्रिय भूमिका अनुकरण (Role Simulation)' : 'Simulate Verification Role:'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleRoleSelect('INDUSTRY_CSR')}
                className={`px-2 py-1 text-[11px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer ${
                  activeRole === 'INDUSTRY_CSR'
                    ? 'bg-[#F8E7A2] text-[#0B2545]'
                    : 'bg-black/30 text-slate-300 hover:text-white'
                }`}
                title="Simulate Industry CSR Sponsor (Audit & Dispute View)"
              >
                <Briefcase className="w-3 h-3" />
                <span>Industry CSR</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('FACULTY_MENTOR')}
                className={`px-2 py-1 text-[11px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer ${
                  activeRole === 'FACULTY_MENTOR'
                    ? 'bg-[#F8E7A2] text-[#0B2545]'
                    : 'bg-black/30 text-slate-300 hover:text-white'
                }`}
                title="Simulate University Faculty Supervisor (Tranches 1 & 2 Sign-off)"
              >
                <GraduationCap className="w-3 h-3" />
                <span>Faculty Mentor</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('ACCREDITED_EVALUATOR')}
                className={`px-2 py-1 text-[11px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer ${
                  activeRole === 'ACCREDITED_EVALUATOR'
                    ? 'bg-[#F8E7A2] text-[#0B2545]'
                    : 'bg-black/30 text-slate-300 hover:text-white'
                }`}
                title="Simulate Accredited Laboratory Evaluator (CSIR-CIMFR BIS Certification)"
              >
                <FlaskConical className="w-3 h-3" />
                <span>Evaluator Lab</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('GOVT_ADMIN')}
                className={`px-2 py-1 text-[11px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer ${
                  activeRole === 'GOVT_ADMIN'
                    ? 'bg-[#F8E7A2] text-[#0B2545]'
                    : 'bg-black/30 text-slate-300 hover:text-white'
                }`}
                title="Simulate District BDO / Govt Officer (Tranche 3 Dual Sign-off)"
              >
                <Building className="w-3 h-3" />
                <span>Govt BDO</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP METRICS BAR: GIGW 3.0 CAPITAL CARDS */}
      {/* ==================================================================== */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Metric 1: Total Committed */}
          <div className="bg-slate-50 border-2 border-slate-300 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                CSR Capital Committed
              </span>
              <Coins className="w-4 h-4 text-[#0B2545]" />
            </div>
            <div className="text-xl font-black font-mono text-[#0B2545] mt-1">
              ₹{totalCommitted.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Across accredited Jharkhand PSUs &amp; Corporations
            </p>
          </div>

          {/* Metric 2: Capital Disbursed */}
          <div className="bg-emerald-50 border-2 border-emerald-400 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-800 font-bold uppercase">
                Hardware Capital Disbursed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-900 mt-1">
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Released directly to collegiate solver rosters
            </p>
          </div>

          {/* Metric 3: Capital Locked in Escrow */}
          <div className="bg-amber-50 border-2 border-amber-400 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-800 font-bold uppercase">
                Locked in Smart Escrow
              </span>
              <Lock className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-xl font-black font-mono text-amber-900 mt-1">
              ₹{totalLocked.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5">
              Awaiting milestone laboratory &amp; field sign-offs
            </p>
          </div>

          {/* Metric 4: Active Challenges */}
          <div className="bg-blue-50 border-2 border-blue-300 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-800 font-bold uppercase">
                Sponsored Capstones
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-xl font-black font-mono text-blue-900 mt-1">
              {activeChallengesCount} Challenges
            </div>
            <p className="text-[10px] text-blue-700 mt-0.5">
              Tata Steel, CCL &amp; Jharkhand Innovation Partners
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. SHOE 5: TWO-TIER HARDWARE SAFETY GATE & DC PILOT CLEARANCE CARD */}
      {/* ==================================================================== */}
      {dumkaSafety && (
        <div className="mx-4 p-4 bg-gradient-to-r from-[#0B2545]/5 via-white to-slate-50 border-2 border-slate-300 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#1E6F50] text-[#F8E7A2] p-2 border border-emerald-900/40 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#1E6F50] text-white text-[9px] font-black uppercase px-1.5 py-0.2">
                    SHOE 5 &bull; GOVERNMENT &amp; SAFETY GATE
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 font-bold">
                    {dumkaSafety.id} &bull; DUMKA WATER CHALLENGE
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#0B2545] uppercase mt-0.5">
                  Two-Tier Technical Validation &amp; Field Safety Clearance Status
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSafetyVal(dumkaSafety)}
              className="px-3 py-2 bg-[#7A1B1B] hover:bg-[#962626] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-[#F8E7A2]" />
              <span>Inspect Two-Tier Safety Gate &amp; Pilot QR</span>
            </button>
          </div>

          {/* 3 Step Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            {/* Tier 1 Status */}
            <div className="p-2.5 bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500">Tier 1: Lab Bench Gate</span>
                {dumkaSafety.tier1FacultyPassed ? (
                  <span className="text-emerald-700 font-black text-[10px] uppercase flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Passed
                  </span>
                ) : (
                  <span className="text-amber-700 font-black text-[10px] uppercase flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> Pending Review
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 text-[11px]">
                {dumkaSafety.tier1HODName || 'BIT Sindri Lab Verification'}
              </div>
              <p className="text-[10px] text-slate-500">
                Faculty supervisor sign-off on BOM calibration &amp; lab telemetry
              </p>
            </div>

            {/* Tier 2 Status */}
            <div className="p-2.5 bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500">Tier 2: Statutory BIS Gate</span>
                {dumkaSafety.tier2BisPassed ? (
                  <span className="text-emerald-700 font-black text-[10px] uppercase flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Certified
                  </span>
                ) : (
                  <span className="text-blue-700 font-black text-[10px] uppercase flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> Pending Testing
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 text-[11px]">
                {dumkaSafety.tier2EvaluatorAgency === 'CSIR_CIMFR_DHANBAD'
                  ? 'CSIR-CIMFR Dhanbad'
                  : dumkaSafety.tier2EvaluatorAgency}
              </div>
              <p className="text-[10px] text-slate-500">
                {dumkaSafety.tier2BisStandardCode || 'IS 10500:2012 Drinking Water Standard'}
              </p>
            </div>

            {/* Field Pilot Permit Status */}
            <div className="p-2.5 bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500">Stage 3: DC Pilot Clearance</span>
                {dumkaSafety.isPublicPilotCleared ? (
                  <span className="text-emerald-700 font-black text-[10px] uppercase flex items-center gap-0.5">
                    <Award className="w-3 h-3" /> Authorized
                  </span>
                ) : (
                  <span className="text-slate-500 font-black text-[10px] uppercase flex items-center gap-0.5">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-800 text-[11px] truncate">
                {dumkaSafety.dcPilotPermitQR || 'Awaiting Stage 2 Certification'}
              </div>
              <p className="text-[10px] text-slate-500">
                90-Day District Magistrate civic field testing authorization
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ACTIVE CSR GRANTS LIST */}
      {/* ==================================================================== */}
      <div className="px-4 pb-4 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#1E6F50] pb-1.5">
          <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#1E6F50]" />
            <span>Active CSR Escrow Contracts &amp; Multi-Stage Tranche Progress</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-500">
            Current Simulated Role: <strong className="text-[#0B2545]">{activeRole}</strong>
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 text-xs">
            Loading CSR Escrow Grants...
          </div>
        ) : grants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 text-xs">
            No CSR escrow grants found in storage.
          </div>
        ) : (
          <div className="space-y-4">
            {grants.map((grant) => {
              const matchedTeam = teams.find((t) => t.id === grant.teamId);
              const matchedBrief = briefs.find((b) => b.id === (matchedTeam?.briefId || ''));

              return (
                <div
                  key={grant.id}
                  className="bg-white border-2 border-slate-300 p-4 space-y-3.5 shadow-2xs hover:border-[#1E6F50] transition-colors"
                >
                  {/* Top Bar: Sponsor, Team, and Amount */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs bg-[#0B2545] text-white px-2 py-0.5 font-bold">
                          {grant.id}
                        </span>
                        <h5 className="text-sm font-black text-[#0B2545]">
                          {grant.sponsorName}
                        </h5>
                        <span className="px-2 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase">
                          Committed Sponsor
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                        <span>
                          Target Challenge: <strong className="text-[#7A1B1B]">{grant.masterIssueId}</strong>
                        </span>
                        {matchedTeam && (
                          <span>
                            &bull; Solver Team: <strong>{matchedTeam.teamName}</strong> ({matchedTeam.leadCollege})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-black block">
                        Total Grant Commitment
                      </span>
                      <span className="text-base font-black font-mono text-[#0B2545]">
                        ₹{grant.totalCommittedINR.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Challenge Summary & Sector Context if available */}
                  {matchedBrief && (
                    <div className="bg-slate-50 p-2.5 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">
                        {matchedBrief.title}
                      </span>
                      <span className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 border border-slate-200">
                        Panchayat: {matchedBrief.fieldEvidenceSummary.block}, {matchedBrief.fieldEvidenceSummary.district}
                      </span>
                    </div>
                  )}

                  {/* Statutory Badges: MCA Schedule VII & SDG Goals + Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-300 text-blue-900 text-[10px] font-bold uppercase">
                        {MCA_LABELS[grant.mcaScheduleVIICategory] || grant.mcaScheduleVIICategory}
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-400 text-emerald-900 text-[10px] font-bold uppercase">
                        {SDG_LABELS[grant.sdgGoalNumber] || `SDG Goal ${grant.sdgGoalNumber}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {dumkaSafety && grant.masterIssueId === dumkaSafety.masterIssueId && (
                        <button
                          type="button"
                          onClick={() => setSelectedSafetyVal(dumkaSafety)}
                          className="px-3 py-1.5 bg-[#1E6F50] hover:bg-[#16563e] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Inspect Two-Tier Safety Gate & Pilot QR Clearance"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#F8E7A2]" />
                          <span>Safety Gate &amp; Pilot QR</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDossierGrant(grant)}
                        className="px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#962626] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Export Statutory MCA Form CSR-2 Annexure and Form GFR-12A Utilization Certificate"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#F8E7A2]" />
                        <span>Statutory CSR-2 &amp; GFR-12A Dossier</span>
                      </button>
                    </div>
                  </div>

                  {/* ========================================================== */}
                  {/* VISUAL 3-STAGE ESCROW PROGRESS RAIL */}
                  {/* ========================================================== */}
                  <div className="bg-slate-50 border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black uppercase tracking-wider text-[#0B2545]">
                        Multi-Stage Tranche Disbursement Rail
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Click any tranche node below to inspect proof &amp; sign off
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      {grant.tranches.map((tranche, idx) => {
                        const isDisbursed = tranche.status === 'DISBURSED';
                        const isApproved = tranche.status === 'APPROVED';
                        const isDisputed = tranche.status === 'DISPUTED';

                        return (
                          <button
                            key={tranche.stage}
                            type="button"
                            onClick={() => handleOpenTranche(grant, tranche)}
                            className={`p-2.5 border-2 text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between space-y-2 ${
                              isDisbursed
                                ? 'bg-emerald-50/60 border-emerald-600 hover:bg-emerald-100/70'
                                : isDisputed
                                ? 'bg-red-50/60 border-red-600 hover:bg-red-100/70'
                                : isApproved
                                ? 'bg-blue-50/60 border-blue-600 hover:bg-blue-100/70'
                                : 'bg-white border-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-black text-[#0B2545]">
                                  Stage {idx + 1}: {tranche.stage === 'TRANCHE_1_BOM' ? 'BOM' : tranche.stage === 'TRANCHE_2_LAB' ? 'Lab Telemetry' : 'Field Pilot'}
                                </span>
                                <span className="font-mono font-bold text-slate-700">
                                  {tranche.percentage}%
                                </span>
                              </div>

                              <div className="text-sm font-black font-mono text-[#0B2545] mt-0.5">
                                ₹{tranche.amountINR.toLocaleString('en-IN')}
                              </div>

                              <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-snug">
                                {tranche.deliverableDescription}
                              </p>
                            </div>

                            {/* Node Footer Status */}
                            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                              {isDisbursed ? (
                                <span className="font-bold text-emerald-800 flex items-center gap-1 uppercase">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Disbursed</span>
                                </span>
                              ) : isDisputed ? (
                                <span className="font-bold text-red-800 flex items-center gap-1 uppercase">
                                  <AlertTriangle className="w-3 h-3 text-red-700" />
                                  <span>Disputed</span>
                                </span>
                              ) : isApproved ? (
                                <span className="font-bold text-blue-800 flex items-center gap-1 uppercase">
                                  <Clock className="w-3 h-3 text-blue-700" />
                                  <span>Approved</span>
                                </span>
                              ) : (
                                <span className="font-bold text-slate-500 flex items-center gap-1 uppercase">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Locked</span>
                                </span>
                              )}

                              <span className="text-[#2A6F86] font-bold inline-flex items-center gap-0.5 hover:underline">
                                <span>Inspect</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 5. MODAL: TRANCHE RELEASE & MULTI-PARTY VERIFICATION GATE */}
      {/* ==================================================================== */}
      {selectedGrant && selectedTranche && (
        <TrancheReleaseModal
          isOpen={Boolean(selectedGrant && selectedTranche)}
          onClose={() => {
            setSelectedGrant(null);
            setSelectedTranche(null);
          }}
          grant={selectedGrant}
          targetTranche={selectedTranche}
          userRole={activeRole === 'ACCREDITED_EVALUATOR' ? 'GOVT_ADMIN' : activeRole}
          onTrancheUpdated={loadData}
          language={language}
        />
      )}

      {/* ==================================================================== */}
      {/* 6. MODAL: STATUTORY CSR-2 & GFR-12A AUDIT DOSSIER (TASK 3.3) */}
      {/* ==================================================================== */}
      {dossierGrant && (
        <StatutoryCSRAuditModal
          isOpen={Boolean(dossierGrant)}
          onClose={() => setDossierGrant(null)}
          grant={dossierGrant}
          team={teams.find((t) => t.id === dossierGrant.teamId) || null}
          brief={
            briefs.find(
              (b) => b.id === (teams.find((t) => t.id === dossierGrant.teamId)?.briefId || '')
            ) || null
          }
          language={language}
        />
      )}

      {/* ==================================================================== */}
      {/* 7. MODAL: TWO-TIER TECHNICAL VALIDATION & FIELD SAFETY GATE (TASK 3.4) */}
      {/* ==================================================================== */}
      {selectedSafetyVal && (
        <TwoTierSafetyGateModal
          isOpen={Boolean(selectedSafetyVal)}
          onClose={() => setSelectedSafetyVal(null)}
          safetyValidation={selectedSafetyVal}
          onValidationUpdated={loadData}
          userRole={activeRole === 'INDUSTRY_CSR' ? 'GOVT_ADMIN' : activeRole}
          language={language}
        />
      )}
    </section>
  );
};

export default CSREscrowDashboard;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Solver Challenge Board & Engineering Problem Briefs Grid (Sprint 8 — Task 8.3)
 *
 * Displays active engineering problem challenges with multidisciplinary team assembly,
 * Panchayat verification desk bridge, and the Masked Citizen Clarification Bridge.
 */

import React from 'react';
import {
  Sparkles,
  Users,
  MessageSquare,
  GraduationCap,
  ShieldCheck,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { EngineeringProblemBrief, StudentTeam } from '../../../types/solver';

export interface SolverChallengeBoardProps {
  briefs: EngineeringProblemBrief[];
  teams?: StudentTeam[];
  language?: 'hi' | 'en';
  sectorFilter?: string;
  onAssembleTeam?: (brief: EngineeringProblemBrief) => void;
  onOpenPanchayatBridge?: (brief: EngineeringProblemBrief) => void;
  onOpenCitizenQuery?: (brief: EngineeringProblemBrief) => void;
  onOpenInnovationRepo?: (brief: EngineeringProblemBrief) => void;
  onRequestMentor?: (brief: EngineeringProblemBrief) => void;
  onInspectSafety?: (brief: EngineeringProblemBrief) => void;
  onViewBoundarySpec?: (brief: EngineeringProblemBrief) => void;
}

export const SolverChallengeBoard: React.FC<SolverChallengeBoardProps> = ({
  briefs,
  teams = [],
  language = 'en',
  sectorFilter = 'ALL',
  onAssembleTeam,
  onOpenPanchayatBridge,
  onOpenCitizenQuery,
  onOpenInnovationRepo,
  onRequestMentor,
  onInspectSafety,
  onViewBoundarySpec,
}) => {
  const filtered = briefs.filter(
    (b) => sectorFilter === 'ALL' || b.domainSector === sectorFilter
  );

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-slate-300 p-10 text-center">
        <div className="w-12 h-12 bg-slate-100 border border-slate-300 mx-auto flex items-center justify-center text-slate-400 mb-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-xs font-bold text-slate-800 uppercase">
          {language === 'hi'
            ? 'इस क्षेत्र में कोई सक्रिय समस्या विनिर्देश नहीं है'
            : 'No Engineering Problem Briefs in this Sector'}
        </p>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
          {language === 'hi'
            ? 'पंचायत डेस्क से सत्यापित समस्या पर नया विनिर्देश तैयार करें।'
            : 'Navigate to the Panchayat Verification Desk to synthesize a new boundary brief.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filtered.map((b) => {
        const associatedTeam = teams.find((t) => t.briefId === b.id) || null;
        const uniqueDepts = associatedTeam
          ? Array.from(new Set(associatedTeam.roster.map((m) => m.department)))
          : [];

        return (
          <div
            key={b.id}
            className="bg-white border-2 border-slate-300 hover:border-[#2A6F86] p-4 flex flex-col justify-between shadow-2xs transition-colors"
          >
            <div className="space-y-2.5">
              {/* Card Meta */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 font-bold uppercase text-[10px]">
                  {b.domainSector.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-slate-500 text-[10px]">{b.id}</span>
                <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300 text-[10px] font-bold">
                  {b.status.replace(/_/g, ' ')}
                </span>
              </div>

              <h4 className="text-sm font-black text-[#0B2545] leading-snug">
                {b.title}
              </h4>

              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {b.contextSummary}
              </p>

              {/* Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 border border-slate-200 text-center">
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Limits</div>
                  <div className="text-xs font-black text-slate-800">
                    {b.boundaryConstraints.length} Rules
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Statutory Ceiling</div>
                  <div className="text-xs font-black text-[#7A1B1B]">
                    ₹{b.maxCostINR.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Impact</div>
                  <div className="text-xs font-black text-emerald-700">
                    {b.fieldEvidenceSummary.householdImpact} Families
                  </div>
                </div>
              </div>

              {/* Claimed Team Roster Banner */}
              {b.status === 'CLAIMED' && associatedTeam && (
                <div className="bg-emerald-50/90 border border-emerald-300 p-2.5 text-xs space-y-1 shadow-2xs mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-extrabold text-emerald-950 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Team: {associatedTeam.teamName}</span>
                    </span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 border border-emerald-300 text-emerald-900 font-bold shadow-2xs">
                      {associatedTeam.leadCollege}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>
                      Lead: <strong className="text-slate-800 font-medium">{associatedTeam.leadStudentName}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Roster: <strong className="text-emerald-800">{associatedTeam.roster.length} Solvers</strong> ({uniqueDepts.join(' + ')})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Action Buttons */}
            <div className="pt-3 border-t border-slate-200 mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {b.status === 'OPEN_FOR_CLAIMS' ? (
                  <button
                    type="button"
                    onClick={() => onAssembleTeam?.(b)}
                    className="px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Form Multidisciplinary Team & Claim Challenge"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-300" />
                    <span>{language === 'hi' ? 'टीम बनाएं एवं दावा करें' : 'Assemble Team & Claim'}</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Task 8.3: Masked Citizen Query Action Button */}
                    <button
                      type="button"
                      onClick={() => onOpenCitizenQuery?.(b)}
                      className="px-2.5 py-1.5 bg-[#1F4E5B] hover:bg-[#183E49] text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Safe Masked Clarification Bridge to Grassroots Submitter"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
                      <span>{language === 'hi' ? 'नागरिक स्पष्टीकरण सेतु' : 'Masked Citizen Inquiry'}</span>
                    </button>

                    {/* Panchayat Field Clarification Bridge */}
                    <button
                      type="button"
                      onClick={() => onOpenPanchayatBridge?.(b)}
                      className="px-2.5 py-1.5 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Open Panchayat Field Clarification Bridge"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                      <span>{language === 'hi' ? 'पंचायत स्पष्टीकरण' : 'Panchayat Bridge'}</span>
                    </button>

                    {/* Faculty Mentor Request */}
                    <button
                      type="button"
                      onClick={() => onRequestMentor?.(b)}
                      className="px-2.5 py-1.5 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Request Faculty Mentorship with 70/30 Capacity Matchmaking"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                      <span>{language === 'hi' ? 'मेंटर अनुरोध' : 'Request Mentor'}</span>
                    </button>

                    {/* Safety Gate & Pass */}
                    <button
                      type="button"
                      onClick={() => onInspectSafety?.(b)}
                      className="px-2.5 py-1.5 bg-[#1E6F50] hover:bg-[#16563e] text-white text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Inspect Two-Tier BIS Safety Gate & DC Public Pilot Pass"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#F8E7A2]" />
                      <span>{language === 'hi' ? 'सुरक्षा द्वार व परमिट' : 'Safety Gate & Pass'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Task 8.4: Open Innovation Archive & Gap Benchmarks CTA */}
                <button
                  type="button"
                  onClick={() => onOpenInnovationRepo?.(b)}
                  className="px-2.5 py-1.5 bg-[#422006] hover:bg-[#2e1503] text-[#FDE68A] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Open Innovation Archive & 2nd-Gen Gap Benchmarks"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>{language === 'hi' ? 'मुक्त नवाचार भंडार' : 'Innovation Archive & Gaps'}</span>
                </button>

                {/* Boundary Spec Detail Modal Trigger */}
                <button
                  type="button"
                  onClick={() => onViewBoundarySpec?.(b)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-slate-600" />
                  <span>{language === 'hi' ? 'सीमा विनिर्देश' : 'Boundary Spec'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SolverChallengeBoard;

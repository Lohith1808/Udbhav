/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Academic Challenge Board (Workspace Route: #/academic)
 *
 * Student-owned workspace: browse endorsed Engineering Problem Briefs,
 * assemble multidisciplinary teams, request mentors, and query the
 * endorsing Panchayat. All board state and student-specific logic live here.
 */

import React, { useState } from 'react';
import { EngineeringProblemBrief, StudentTeam } from '../../types/solver';
import { WorkspacePageProps } from '../shared/workspacePageProps';
import {
  Sparkles,
  MapPin,
  Users,
  CheckCircle2,
  MessageSquare,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

const ProblemBriefModal = React.lazy(
  () => import('../../features/solver/components/ProblemBriefModal')
);
const TeamAssemblyModal = React.lazy(
  () => import('../../features/solver/components/TeamAssemblyModal')
);
const PanchayatQueryModal = React.lazy(
  () => import('../../features/solver/components/PanchayatQueryModal')
);
const FacultyMatchmakerModal = React.lazy(
  () => import('../../features/mentor/components/FacultyMatchmakerModal')
);

const SECTOR_FILTERS = [
  'ALL',
  'WATER_RESOURCES',
  'AGRITECH',
  'RURAL_ENERGY',
  'SANITATION',
  'HEALTHCARE',
  'CIVIL_INFRA',
] as const;

export interface AcademicChallengePageProps extends WorkspacePageProps {
  allBriefs: EngineeringProblemBrief[];
  allTeams: StudentTeam[];
}

export const AcademicChallengePage: React.FC<AcademicChallengePageProps> = (props) => {
  const { language, notify, allBriefs, allTeams } = props;

  // ---- Board state (page-owned) ----
  const [briefSectorFilter, setBriefSectorFilter] = useState<string>('ALL');
  const [selectedBriefForView, setSelectedBriefForView] = useState<EngineeringProblemBrief | null>(null);
  const [selectedBriefForTeam, setSelectedBriefForTeam] = useState<EngineeringProblemBrief | null>(null);
  const [selectedBriefForQuery, setSelectedBriefForQuery] = useState<EngineeringProblemBrief | null>(null);
  const [selectedTeamForMentor, setSelectedTeamForMentor] = useState<{
    brief: EngineeringProblemBrief;
    team: StudentTeam | null;
  } | null>(null);

  const filtered = (allBriefs || []).filter(
    (b) => briefSectorFilter === 'ALL' || b.domainSector === briefSectorFilter
  );

  return (
    <section className="bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden">
      {/* Bureau Masthead Banner */}
      <div className="bg-[#0B2545] text-white py-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-amber-500">
        <div className="flex items-center gap-3">
          <div className="bg-[#2A6F86] text-white p-2 border border-sky-400/30 shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                GOVERNMENT OF JHARKHAND
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                DHTE &bull; QUADRUPLE-HELIX INNOVATION NETWORK (SHOE 2)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5">
              {language === 'hi'
                ? 'अकादमिक इंजीनियरिंग समस्या विनिर्देश एवं चुनौती बोर्ड'
                : 'Academic Engineering Problem Briefs & Challenge Board'}
            </h3>
            <p className="text-xs text-slate-300">
              {language === 'hi'
                ? 'सत्यापित पंचायती समस्याओं से उत्पन्न गैर-परक्राम्य इंजीनियरिंग सीमाएँ व मापनीय बेंचमार्क।'
                : 'Non-negotiable operational boundary briefs and measurable benchmarks synthesized from endorsed civic challenges.'}
            </p>
          </div>
        </div>

        {/* Counter badges */}
        <div className="flex items-center gap-2 font-mono text-xs self-start md:self-auto">
          <div className="bg-white/10 border border-white/20 px-3 py-1.5 text-center">
            <div className="text-[10px] text-amber-300 uppercase font-sans font-bold">
              Active Briefs
            </div>
            <div className="text-base font-black text-white">
              {allBriefs ? allBriefs.length : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="font-bold text-slate-700 uppercase text-[11px] shrink-0 mr-1">
            Sector:
          </span>
          {SECTOR_FILTERS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setBriefSectorFilter(sec)}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-none transition-colors shrink-0 cursor-pointer ${
                briefSectorFilter === sec
                  ? 'bg-[#2A6F86] text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sec.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Showing {filtered.length} Registered Briefs
        </div>
      </div>

      {/* Briefs Grid */}
      <div className="p-4 bg-slate-50">
        {filtered.length === 0 ? (
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
                ? 'पंचायत डेस्क से सत्यापित समस्या पर "AI Brief" बटन दबाकर नया सीमा विनिर्देश तैयार करें।'
                : 'Navigate to the Panchayat Verification Desk, select any endorsed report, and click "AI Brief" to synthesize a new boundary brief.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="bg-white border-2 border-slate-300 hover:border-[#2A6F86] p-4 flex flex-col justify-between shadow-2xs transition-colors"
              >
                <div className="space-y-2.5">
                  {/* Card Top Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 font-bold uppercase text-[10px]">
                      {b.domainSector.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      {b.id}
                    </span>
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

                  {/* Quick Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 border border-slate-200 text-center">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">
                        Limits
                      </div>
                      <div className="text-xs font-black text-slate-800">
                        {b.boundaryConstraints.length} Rules
                      </div>
                    </div>
                    <div className="border-x border-slate-200">
                      <div className="text-[9px] font-bold text-slate-500 uppercase">
                        Benchmarks
                      </div>
                      <div className="text-xs font-black text-slate-800">
                        {b.measurableBenchmarks.length} Targets
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-[#7A1B1B] uppercase">
                        Max BOM
                      </div>
                      <div className="text-xs font-black text-[#7A1B1B] font-mono">
                        ₹{b.maxCostINR.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Field Provenance */}
                  <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#7A1B1B]" />
                      <span>
                        {b.fieldEvidenceSummary.block}, {b.fieldEvidenceSummary.district}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 font-bold text-emerald-800">
                      <Users className="w-3 h-3 text-emerald-700" />
                      <span>{b.fieldEvidenceSummary.householdImpact} Families</span>
                    </span>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="pt-3 border-t border-slate-200 mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {b.status === 'OPEN_FOR_CLAIMS' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedBriefForTeam(b)}
                        className="px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Form Multidisciplinary Team & Claim Challenge"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-300" />
                        <span>
                          {language === 'hi'
                            ? 'टीम बनाएं एवं दावा करें'
                            : 'Assemble Team & Claim'}
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Claimed / In Roster</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedBriefForQuery(b)}
                          className="px-2.5 py-1 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-[11px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Open Panchayat Field Clarification Bridge"
                        >
                          <MessageSquare className="w-3 h-3 text-amber-300" />
                          <span>
                            {language === 'hi'
                              ? 'पंचायत स्पष्टीकरण'
                              : 'Panchayat Bridge'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const associatedTeam = (allTeams || []).find((t) => t.briefId === b.id) || null;
                            setSelectedTeamForMentor({ brief: b, team: associatedTeam });
                          }}
                          className="px-2.5 py-1 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-[11px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Request Faculty Mentorship with 70/30 Capacity Matchmaking"
                        >
                          <GraduationCap className="w-3 h-3 text-amber-300" />
                          <span>{language === 'hi' ? 'मेंटर अनुरोध' : 'Request Mentor'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedBriefForView(b)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-600" />
                    <span>
                      {language === 'hi' ? 'सीमा विनिर्देश' : 'Boundary Spec'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engineering Problem Boundary Brief Modal (view mode) */}
      {selectedBriefForView && (
        <React.Suspense fallback={null}>
          <ProblemBriefModal
            brief={selectedBriefForView}
            language={language}
            onClose={() => setSelectedBriefForView(null)}
          />
        </React.Suspense>
      )}

      {/* Multidisciplinary Team Assembly Modal */}
      {selectedBriefForTeam && (
        <React.Suspense fallback={null}>
          <TeamAssemblyModal
            brief={selectedBriefForTeam}
            language={language}
            onClose={() => setSelectedBriefForTeam(null)}
            onSuccess={(team) => {
              setSelectedBriefForTeam(null);
              notify(
                language === 'hi'
                  ? `टीम "${team.teamName}" का सफलतापूर्वक गठन हुआ और चुनौती का दावा किया गया!`
                  : `Team "${team.teamName}" successfully assembled and claimed challenge!`,
                'success'
              );
            }}
          />
        </React.Suspense>
      )}

      {/* Panchayat Field Clarification Bridge Modal */}
      {selectedBriefForQuery && (
        <React.Suspense fallback={null}>
          <PanchayatQueryModal
            brief={selectedBriefForQuery}
            team={(allTeams || []).find((t) => t.briefId === selectedBriefForQuery.id) || null}
            language={language}
            onClose={() => setSelectedBriefForQuery(null)}
          />
        </React.Suspense>
      )}

      {/* Faculty 70/30 Matchmaker Modal */}
      {selectedTeamForMentor && (
        <React.Suspense fallback={null}>
          <FacultyMatchmakerModal
            brief={selectedTeamForMentor.brief}
            initialTeam={selectedTeamForMentor.team}
            language={language}
            onClose={() => setSelectedTeamForMentor(null)}
            onSuccess={() => {
              setSelectedTeamForMentor(null);
              notify(
                language === 'hi'
                  ? 'संकाय मेंटर अनुरोध सफलतापूर्वक समीक्षा हेतु प्रेषित किया गया!'
                  : 'Faculty mentorship request submitted for review!',
                'success'
              );
            }}
          />
        </React.Suspense>
      )}
    </section>
  );
};

export default AcademicChallengePage;

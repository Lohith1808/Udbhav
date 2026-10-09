/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — Faculty 70/30 Matchmaker Modal
 * 
 * Enforces Faculty Mentorship Guardrails:
 * 1. 70% Core Competency vs 30% Wildcard Exploratory slot tagging.
 * 2. Hard capacity cap: Max 3 active projects per faculty mentor.
 * 3. Hard queue ceiling: Max 5 pending review proposals per faculty mentor.
 */

import React, { useState, useEffect, useId } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  Compass,
  Award,
} from 'lucide-react';
import {
  FacultyMentorProfile,
  StudentTeam,
  EngineeringProblemBrief,
} from '../../../types/solver';
import {
  db,
  assignMentorToTeam,
  getFacultyMentors,
} from '../../../lib/db';

export interface FacultyMatchmakerModalProps {
  initialTeam?: StudentTeam | null;
  brief?: EngineeringProblemBrief | null;
  language?: 'en' | 'hi';
  onClose: () => void;
  onSuccess: (teamId: string, mentorId: string) => void;
}

export const FacultyMatchmakerModal: React.FC<FacultyMatchmakerModalProps> = ({
  initialTeam,
  brief,
  language = 'en',
  onClose,
  onSuccess,
}) => {
  const modalTitleId = useId();
  const [teams, setTeams] = useState<StudentTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeam?.id || '');
  const [mentors, setMentors] = useState<FacultyMentorProfile[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [slotFilter, setSlotFilter] = useState<'ALL' | 'CORE_COMPETENCY' | 'WILDCARD_EXPLORATORY'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Load active student teams and faculty mentors from IndexedDB
  useEffect(() => {
    const fetchData = async () => {
      try {
        const facultyList = await getFacultyMentors();
        setMentors(facultyList);

        const teamList = await db.studentTeams.toArray();
        setTeams(teamList);

        if (!selectedTeamId && teamList.length > 0) {
          // Default to the first team that does not have an approved mentor
          const unassigned = teamList.find((t) => t.mentorStatus !== 'APPROVED') || teamList[0];
          setSelectedTeamId(unassigned.id);
        }
      } catch (err) {
        console.error('Error fetching matchmaking data:', err);
      }
    };
    fetchData();
  }, [selectedTeamId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || initialTeam;

  const handleRequestMentorship = async (mentor: FacultyMentorProfile) => {
    if (!selectedTeamId) {
      setResultMessage({
        text: 'Please select a student team first.',
        isError: true,
      });
      return;
    }

    if (mentor.activeProjectsCount >= 3) {
      setResultMessage({
        text: 'Mentorship Capacity Reached — Slot Locked (Max 3 Active Teams).',
        isError: true,
      });
      return;
    }

    if (mentor.pendingReviewQueueCount >= 5) {
      setResultMessage({
        text: 'Faculty Pending Review Queue Full (Max 5 Proposals).',
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await assignMentorToTeam(selectedTeamId, mentor.id);

      if (!res.success) {
        setResultMessage({ text: res.message, isError: true });
        setIsSubmitting(false);
      } else {
        setResultMessage({ text: res.message, isError: false });
        setTimeout(() => {
          onSuccess(selectedTeamId, mentor.id);
        }, 1200);
      }
    } catch (err) {
      console.error('Error requesting mentorship:', err);
      setResultMessage({
        text: err instanceof Error ? err.message : 'Failed to request mentorship.',
        isError: true,
      });
      setIsSubmitting(false);
    }
  };

  const filteredMentors = mentors.filter(
    (m) => slotFilter === 'ALL' || m.slotType === slotFilter
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div className="bg-white border-2 border-[#7A1B1B] max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================== */}
        {/* MODAL HEADER */}
        {/* ================================================================== */}
        <div className="bg-[#7A1B1B] text-white p-3.5 sm:p-4 flex items-start justify-between gap-3 border-b-2 border-[#5E1414] shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white text-[#7A1B1B] border border-amber-300 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-6 h-6 text-[#7A1B1B]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1 shadow-2xs">
                  <Award className="w-3 h-3 text-[#7A1B1B]" />
                  <span>70/30 Hybrid Allocation Engine</span>
                </span>
                <span className="text-[11px] font-mono text-amber-200 bg-[#5E1414] px-2 py-0.5 border border-amber-300/30">
                  DHTE Faculty Registry
                </span>
              </div>
              <h2
                id={modalTitleId}
                className="text-base sm:text-lg font-black text-[#F8E7A2] leading-snug"
              >
                {language === 'hi'
                  ? 'संकाय मेंटर मिलान एवं क्षमता गेट'
                  : 'Faculty Mentorship Matchmaker & Capacity Gate'}
              </h2>
              <p className="text-[11px] text-amber-100/90 font-medium">
                {language === 'hi'
                  ? '70% कोर विशेषज्ञता कोटा + 30% वाइल्डकार्ड क्रॉस-डिसिप्लिनरी स्लॉट (अधिकतम 3 सक्रिय परियोजनाएँ)'
                  : '70% Core Competency Quota + 30% Wildcard Exploratory Slots (Hard Cap: Max 3 Active Teams)'}
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

        {/* Selected Team Target Strip */}
        <div className="bg-[#0B2545] text-white px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 shrink-0">
              Target Team
            </span>

            {teams.length > 0 ? (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="bg-white/10 text-white border border-white/30 text-xs px-2 py-1 outline-none font-bold"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-900 bg-white">
                    {t.teamName} ({t.leadCollege} • Status: {t.mentorStatus})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-amber-200">
                {selectedTeam?.teamName || 'No Team Registered Yet'}
              </span>
            )}
          </div>

          {selectedTeam && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              {brief && (
                <span className="text-amber-300 font-bold truncate max-w-xs">
                  Challenge: {brief.title}
                </span>
              )}
              {brief && <span>&bull;</span>}
              <span className="text-slate-300">
                Roster: {selectedTeam.roster?.length || 0} Solvers
              </span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-bold">
                Status: {selectedTeam.mentorStatus}
              </span>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* MODAL BODY (SCROLLABLE) */}
        {/* ================================================================== */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#FCFDFE]">
          {resultMessage && (
            <div
              className={`p-3 text-xs font-bold border flex items-center gap-2 ${
                resultMessage.isError
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              {resultMessage.isError ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span>{resultMessage.text}</span>
            </div>
          )}

          {/* 70/30 Allocation Rule Explainer Banner */}
          <div className="bg-slate-100 border border-slate-300 p-3 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <span className="font-black text-[#0B2545] uppercase text-[11px] block flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#2A6F86]" />
                <span>Statutory 70/30 Quota Balance Directive</span>
              </span>
              <p className="text-[11px] text-slate-600">
                70% slots are mapped to direct departmental competencies; 30% wildcard exploratory slots
                support high-risk interdisciplinary student innovation.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-300 p-0.5 text-[11px]">
              {(['ALL', 'CORE_COMPETENCY', 'WILDCARD_EXPLORATORY'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSlotFilter(filter)}
                  className={`px-2.5 py-1 font-bold uppercase rounded-none transition-colors cursor-pointer ${
                    slotFilter === filter
                      ? 'bg-[#0B2545] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All Faculty'
                    : filter === 'CORE_COMPETENCY'
                    ? '70% Core'
                    : '30% Wildcard'}
                </button>
              ))}
            </div>
          </div>

          {/* Faculty Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMentors.map((mentor) => {
              const isCore = mentor.slotType === 'CORE_COMPETENCY';
              const isAtCapacity = mentor.activeProjectsCount >= 3;
              const isQueueFull = mentor.pendingReviewQueueCount >= 5;
              const isAvailable = !isAtCapacity && !isQueueFull;
              const isAssigned = selectedTeam?.assignedMentorId === mentor.id;

              return (
                <div
                  key={mentor.id}
                  className={`bg-white border-2 p-4 flex flex-col justify-between shadow-2xs transition-all ${
                    isAssigned
                      ? 'border-emerald-600 ring-2 ring-emerald-200'
                      : selectedMentorId === mentor.id
                      ? 'border-[#2A6F86]'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  onClick={() => setSelectedMentorId(mentor.id)}
                >
                  <div className="space-y-3">
                    {/* Top Identity & 70/30 Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-[#0B2545]">{mentor.name}</h3>
                          {isAssigned && (
                            <span className="px-1.5 py-0.2 bg-emerald-700 text-white text-[9px] font-black uppercase">
                              Your Mentor
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{mentor.designation}</p>
                        <p className="text-[11px] text-slate-500">
                          {mentor.department} &bull; <strong>{mentor.institution}</strong>
                        </p>
                      </div>

                      {/* 70/30 Slot Type Pill */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                          isCore
                            ? 'bg-blue-50 text-blue-900 border-blue-400'
                            : 'bg-purple-50 text-purple-900 border-purple-400'
                        }`}
                      >
                        {isCore ? '70% Core' : '30% Wildcard'}
                      </span>
                    </div>

                    {/* Competency Tags */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Domain Competencies:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {mentor.coreCompetencyTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Real-time Capacity Guardrail Meters */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 border border-slate-200 text-xs">
                      {/* Active Load Meter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-600 uppercase">Active Cap</span>
                          <span
                            className={`font-mono font-black ${
                              isAtCapacity ? 'text-red-700' : 'text-slate-800'
                            }`}
                          >
                            {mentor.activeProjectsCount} / 3 Teams
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5">
                          <div
                            className={`h-1.5 transition-all ${
                              mentor.activeProjectsCount >= 3
                                ? 'bg-red-600 w-full'
                                : mentor.activeProjectsCount === 2
                                ? 'bg-amber-500 w-2/3'
                                : mentor.activeProjectsCount === 1
                                ? 'bg-emerald-600 w-1/3'
                                : 'bg-slate-300 w-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Pending Review Queue Meter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-600 uppercase">Review Queue</span>
                          <span
                            className={`font-mono font-black ${
                              isQueueFull ? 'text-amber-700' : 'text-slate-800'
                            }`}
                          >
                            {mentor.pendingReviewQueueCount} / 5 Queue
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5">
                          <div
                            className={`h-1.5 transition-all ${
                              mentor.pendingReviewQueueCount >= 5
                                ? 'bg-red-600 w-full'
                                : mentor.pendingReviewQueueCount >= 3
                                ? 'bg-amber-500 w-3/5'
                                : mentor.pendingReviewQueueCount > 0
                                ? 'bg-emerald-600 w-1/5'
                                : 'bg-slate-300 w-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Capacity Alert Banner */}
                    {isAtCapacity && (
                      <div className="p-1.5 bg-red-50 border border-red-300 text-red-800 text-[10px] font-bold flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-red-700 shrink-0" />
                        <span>Mentorship Capacity Reached — Slot Locked (Max 3 Active)</span>
                      </div>
                    )}
                    {!isAtCapacity && isQueueFull && (
                      <div className="p-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>Review Queue Full (Max 5 Proposals Pending)</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="pt-3 border-t border-slate-200 mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">ID: {mentor.id}</span>

                    <button
                      type="button"
                      disabled={!isAvailable || isSubmitting || isAssigned}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestMentorship(mentor);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 shadow-2xs ${
                        isAssigned
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                          : isAvailable
                          ? 'bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] cursor-pointer'
                          : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {isAssigned ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Assigned Mentor</span>
                        </>
                      ) : isAvailable ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                          <span>Request Mentorship</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Capacity Cap Locked</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================== */}
        {/* MODAL FOOTER */}
        {/* ================================================================== */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-300 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-600 font-medium">
            Section 135 CSR Faculty Appraisal Guidelines &bull; Max 3 Active Capstones
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacultyMatchmakerModal;

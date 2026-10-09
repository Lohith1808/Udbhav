/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — Faculty Mentor Appraisal Console (Shoe 3)
 * 
 * Enforces Faculty Mentorship Governance:
 * 1. 70/30 Hybrid Quota Balance (Core vs Wildcard Exploratory).
 * 2. Hard Capacity Cap: Max 3 Active Teams.
 * 3. 7-Day Review Expiration countdown with automated rerouting.
 * 4. Milestone 1-4 Capstone Sign-off verification.
 */

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  RotateCcw,
  FileText,
  School,
  Sparkles,
  GitCommit,
} from 'lucide-react';
import {
  FacultyMentorProfile,
  StudentTeam,
  MilestoneNumber,
  EngineeringProblemBrief,
} from '../../../types/solver';
import {
  db,
  getFacultyMentors,
  approveTeamMentorship,
  declineTeamMentorship,
  advanceTeamMilestone,
} from '../../../lib/db';
import { ContributionTelemetryModal } from './ContributionTelemetryModal';
import { NaacDossierModal } from './NaacDossierModal';

export interface FacultyMentorDashboardProps {
  language?: 'en' | 'hi';
}

const MILESTONE_DEFINITIONS: Record<
  MilestoneNumber,
  { title: string; percentage: number; description: string }
> = {
  1: {
    title: 'Milestone 1: Problem Brief & Constraints',
    percentage: 25,
    description: 'Literature validation, operating constraints sign-off, problem definition.',
  },
  2: {
    title: 'Milestone 2: CAD / BOM Architecture',
    percentage: 50,
    description: 'Detailed mechanical/circuit schematics, ₹2,500 BOM itemization.',
  },
  3: {
    title: 'Milestone 3: Lab Prototype & Bench Testing',
    percentage: 75,
    description: 'Hardware bench prototype, tolerance benchmark validation in university lab.',
  },
  4: {
    title: 'Milestone 4: Field Pilot & Panchayat Handover',
    percentage: 100,
    description: 'On-site deployment at village, BDO inspection sign-off, public pilot.',
  },
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const FacultyMentorDashboard: React.FC<FacultyMentorDashboardProps> = ({
  language = 'en',
}) => {
  const [mentors, setMentors] = useState<FacultyMentorProfile[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [allTeams, setAllTeams] = useState<StudentTeam[]>([]);
  const [allBriefs, setAllBriefs] = useState<EngineeringProblemBrief[]>([]);
  const [notification, setNotification] = useState<{ text: string; isError: boolean } | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState<Record<string, string>>({});
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [selectedTeamForTelemetry, setSelectedTeamForTelemetry] = useState<StudentTeam | null>(null);
  const [showNaacDossier, setShowNaacDossier] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const facultyList = await getFacultyMentors();
      setMentors(facultyList);

      if (!selectedMentorId && facultyList.length > 0) {
        setSelectedMentorId(facultyList[0].id);
      }

      const teamList = await db.studentTeams.toArray();
      setAllTeams(teamList);

      const briefList = await db.engineeringBriefs.toArray();
      setAllBriefs(briefList);
    } catch (err) {
      console.error('Error loading mentor dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMentorId]);

  const currentFaculty = mentors.find((m) => m.id === selectedMentorId) || mentors[0];

  // Teams waiting for this faculty's review
  const pendingTeams = allTeams.filter(
    (t) =>
      t.mentorStatus === 'PENDING_APPROVAL' &&
      (t.assignedMentorId === currentFaculty?.id || !t.assignedMentorId)
  );

  // Active teams supervised by this faculty
  const activeTeams = allTeams.filter(
    (t) => t.mentorStatus === 'APPROVED' && t.assignedMentorId === currentFaculty?.id
  );

  // 1-Click Endorse
  const handleApprove = async (teamId: string) => {
    if (!currentFaculty) return;
    try {
      const res = await approveTeamMentorship(teamId, currentFaculty.id);
      if (res.success) {
        setNotification({ text: 'Team Mentorship Approved Successfully!', isError: false });
        await loadData();
      } else {
        setNotification({ text: res.message, isError: true });
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Approval failed',
        isError: true,
      });
    }
  };

  // Decline / Reroute
  const handleDecline = async (teamId: string) => {
    if (!currentFaculty) return;
    try {
      const res = await declineTeamMentorship(teamId, currentFaculty.id);
      setNotification({
        text: res.message,
        isError: false,
      });
      await loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Decline failed',
        isError: true,
      });
    }
  };

  // Advance milestone
  const handleAdvanceMilestone = async (team: StudentTeam) => {
    const nextMilestone = (Math.min(4, team.currentMilestone + 1)) as MilestoneNumber;
    try {
      await advanceTeamMilestone(team.id, nextMilestone);
      setNotification({
        text: `Milestone advanced to Stage ${nextMilestone} for team "${team.teamName}"!`,
        isError: false,
      });
      await loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Milestone sign-off failed',
        isError: true,
      });
    }
  };

  const getBriefForTeam = (briefId: string) => {
    return allBriefs.find((b) => b.id === briefId);
  };

  // 7-day review timer calculator
  const calculateRemainingWindow = (requestTimestamp?: number) => {
    if (!requestTimestamp) return { remainingDays: 7, remainingHours: 0, isExpired: false };
    const elapsed = Date.now() - requestTimestamp;
    const remainingMs = SEVEN_DAYS_MS - elapsed;

    if (remainingMs <= 0) {
      return { remainingDays: 0, remainingHours: 0, isExpired: true };
    }

    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor(
      (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
    );

    return { remainingDays, remainingHours, isExpired: false };
  };

  if (!currentFaculty) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white border border-slate-300">
        Loading Faculty Registry...
      </div>
    );
  }

  const isCore = currentFaculty.slotType === 'CORE_COMPETENCY';
  const isAtCapacity = currentFaculty.activeProjectsCount >= 3;

  return (
    <section className="bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden">
      {/* ==================================================================== */}
      {/* MASTHEAD BANNER */}
      {/* ==================================================================== */}
      <div className="bg-[#0B2545] text-white py-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-amber-500">
        <div className="flex items-center gap-3">
          <div className="bg-[#7A1B1B] text-[#F8E7A2] p-2 border border-amber-900/60 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                GOVERNMENT OF JHARKHAND
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                DHTE &bull; FACULTY MENTORSHIP & CAPSTONE APPRAISAL DESK (SHOE 3)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5">
              {language === 'hi'
                ? 'संकाय मेंटर मूल्यांकन एवं समीक्षा डेस्क'
                : 'Faculty Mentorship Appraisal & Review Desk'}
            </h3>
            <p className="text-xs text-slate-300">
              {language === 'hi'
                ? '70/30 आवंटन संतुलन, 7-दिवसीय समीक्षा समयसीमा, एवं 4-चरणीय कैपस्टोन मील का पत्थर सत्यापन।'
                : '70/30 Quota allocation balance, 7-day review timer, and 4-stage capstone milestone sign-off.'}
            </p>
          </div>
        </div>

        {/* Faculty Switcher Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-white/10 p-1.5 border border-white/20">
          <School className="w-4 h-4 text-amber-300" />
          <span className="text-xs font-bold uppercase text-slate-200">Faculty:</span>
          <select
            value={selectedMentorId}
            onChange={(e) => setSelectedMentorId(e.target.value)}
            className="bg-[#0B2545] text-white border border-slate-600 text-xs px-2 py-1 outline-none font-bold cursor-pointer"
          >
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.institution} • {m.slotType === 'CORE_COMPETENCY' ? '70% Core' : '30% Wildcard'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 text-xs font-bold border flex items-center gap-2 ${
            notification.isError
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {notification.isError ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FACULTY PROFILE OVERVIEW & LOAD METERS */}
      {/* ==================================================================== */}
      <div className="bg-slate-50 border-b border-slate-300 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Identity & Institution */}
          <div className="md:col-span-6 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black text-[#0B2545]">{currentFaculty.name}</h4>
              <span
                className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                  isCore
                    ? 'bg-blue-50 text-blue-900 border-blue-400'
                    : 'bg-purple-50 text-purple-900 border-purple-400'
                }`}
              >
                {isCore ? '70% Core Competency Slot' : '30% Wildcard Exploratory Slot'}
              </span>
              <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 border border-slate-200">
                {currentFaculty.id}
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium">
              {currentFaculty.designation} &bull; {currentFaculty.department}
            </p>
            <p className="text-xs text-slate-600 font-semibold">
              Institution: <strong className="text-[#7A1B1B]">{currentFaculty.institution}</strong>
            </p>

            <div className="flex flex-wrap gap-1 pt-1">
              {currentFaculty.coreCompetencyTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 text-[10px] font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Real-time Load & Capacity Meters */}
          <div className="md:col-span-6 grid grid-cols-2 gap-3">
            {/* Active Load Meter */}
            <div className="bg-white border-2 border-slate-300 p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-700 uppercase">Active Capstones</span>
                <span
                  className={`font-mono font-black ${
                    isAtCapacity ? 'text-red-700' : 'text-[#7A1B1B]'
                  }`}
                >
                  {currentFaculty.activeProjectsCount} / 3 Teams
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2">
                <div
                  className={`h-2 transition-all ${
                    currentFaculty.activeProjectsCount >= 3
                      ? 'bg-red-600 w-full'
                      : currentFaculty.activeProjectsCount === 2
                      ? 'bg-amber-500 w-2/3'
                      : currentFaculty.activeProjectsCount === 1
                      ? 'bg-emerald-600 w-1/3'
                      : 'bg-slate-300 w-0'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {isAtCapacity
                  ? 'Capacity reached. Cannot accept new teams.'
                  : `${3 - currentFaculty.activeProjectsCount} slots available for mentorship.`}
              </p>
            </div>

            {/* Pending Queue Meter */}
            <div className="bg-white border-2 border-slate-300 p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-700 uppercase">Review Queue</span>
                <span className="font-mono font-black text-slate-800">
                  {currentFaculty.pendingReviewQueueCount} / 5 Proposals
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2">
                <div
                  className={`h-2 transition-all ${
                    currentFaculty.pendingReviewQueueCount >= 5
                      ? 'bg-red-600 w-full'
                      : currentFaculty.pendingReviewQueueCount >= 3
                      ? 'bg-amber-500 w-3/5'
                      : currentFaculty.pendingReviewQueueCount > 0
                      ? 'bg-emerald-600 w-1/5'
                      : 'bg-slate-300 w-0'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {currentFaculty.pendingReviewQueueCount >= 5
                  ? 'Queue full. Proposals auto-rerouted.'
                  : `${5 - currentFaculty.pendingReviewQueueCount} proposals can enter queue.`}
              </p>
            </div>
          </div>
        </div>

        {/* Institutional Statutory Dossier Bar */}
        <div className="pt-3 mt-3 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Award className="w-4 h-4 text-[#7A1B1B]" />
            <span>
              <strong>NAAC Criterion 3.6 & UGC API Category III:</strong> Extension Activities & Rural Field R&D Supervision
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowNaacDossier(true)}
            className="px-3.5 py-1.5 bg-[#7A1B1B] hover:bg-[#962626] text-white text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Generate and print statutory NAAC Criterion 3.6 / UGC API Promotion Dossier"
          >
            <FileText className="w-3.5 h-3.5 text-[#F8E7A2]" />
            <span>Export NAAC / UGC API Dossier</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2-SECTION DASHBOARD BODY: PENDING REVIEW QUEUE & ACTIVE CAPSTONES */}
      {/* ==================================================================== */}
      <div className="p-4 space-y-6">
        {/* SECTION 1: STAGED REVIEW QUEUE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#7A1B1B] pb-1.5">
            <h4 className="text-sm font-black uppercase tracking-wider text-[#7A1B1B] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                1. Staged Review Queue ({pendingTeams.length} Pending Proposals)
              </span>
            </h4>
            <span className="text-[11px] font-bold text-slate-500">
              7-Day Expiration Guardrail Active
            </span>
          </div>

          {pendingTeams.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-300">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 uppercase">
                Review Queue Clear
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                No collegiate solver teams are currently awaiting proposal review from this faculty.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {pendingTeams.map((team) => {
                const targetBrief = getBriefForTeam(team.briefId);
                const timer = calculateRemainingWindow(team.mentorRequestTimestamp);

                return (
                  <div
                    key={team.id}
                    className="bg-white border-2 border-slate-300 p-4 space-y-3 shadow-2xs"
                  >
                    {/* Header Strip with 7-Day Timer Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-[#0B2545] text-white px-2 py-0.5 font-bold">
                          {team.id}
                        </span>
                        <h5 className="text-sm font-black text-[#0B2545]">{team.teamName}</h5>
                        <span className="text-xs text-slate-500">({team.leadCollege})</span>
                      </div>

                      {/* Visual 7-Day Review Countdown Badge */}
                      <div
                        className={`px-2.5 py-1 text-xs font-black uppercase flex items-center gap-1.5 border ${
                          timer.isExpired
                            ? 'bg-red-50 text-red-900 border-red-400'
                            : timer.remainingDays <= 2
                            ? 'bg-amber-50 text-amber-900 border-amber-400 animate-pulse'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-400'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {timer.isExpired
                            ? 'Expired: Auto-Reroute Pending'
                            : `${timer.remainingDays}d ${timer.remainingHours}h remaining before auto-reroute`}
                        </span>
                      </div>
                    </div>

                    {/* Challenge Context & Provenance */}
                    {targetBrief && (
                      <div className="bg-slate-50 p-2.5 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0B2545]">
                            {targetBrief.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-600 bg-white px-1.5 py-0.2 border border-slate-200">
                            Cap: ₹{targetBrief.maxCostINR.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">
                          {targetBrief.contextSummary}
                        </p>
                      </div>
                    )}

                    {/* Team Multidisciplinary Roster Strip */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Multidisciplinary Team Roster:
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {team.roster.map((member, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-100 border border-slate-300 px-2 py-1 text-[11px]"
                          >
                            <span className="font-bold text-slate-800">{member.name}</span>{' '}
                            <span className="text-slate-500">
                              ({member.department} &bull; Yr {member.year})
                            </span>
                            <span className="text-[10px] text-slate-600 block italic">
                              {member.roleDescription}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Optional Revision Input */}
                    {activeRevisionId === team.id && (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 space-y-1.5">
                        <label className="text-[11px] font-bold text-amber-950 block">
                          Faculty Feedback / Revision Note:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Please refine mechanical filter casing CAD models to adhere strictly to the 1.0 sq.m platform footprint limit."
                          value={revisionFeedback[team.id] || ''}
                          onChange={(e) =>
                            setRevisionFeedback({
                              ...revisionFeedback,
                              [team.id]: e.target.value,
                            })
                          }
                          className="w-full text-xs p-2 bg-white border border-amber-400 outline-none"
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-mono text-slate-500">
                        Requested: {new Date(team.mentorRequestTimestamp || Date.now()).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Request Revision */}
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRevisionId(activeRevisionId === team.id ? null : team.id)
                          }
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-400 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>
                            {activeRevisionId === team.id ? 'Hide Note' : 'Request Revision'}
                          </span>
                        </button>

                        {/* Decline / Route to Peer */}
                        <button
                          type="button"
                          onClick={() => handleDecline(team.id)}
                          className="px-3 py-1.5 bg-white hover:bg-red-50 border border-red-300 text-red-800 text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Decline / Route to Peer</span>
                        </button>

                        {/* 1-Click Endorse */}
                        <button
                          type="button"
                          disabled={isAtCapacity}
                          onClick={() => handleApprove(team.id)}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-300" />
                          <span>1-Click Endorse Mentorship</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: ACTIVE SUPERVISED CAPSTONES & MILESTONE ADVANCEMENT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#2A6F86] pb-1.5">
            <h4 className="text-sm font-black uppercase tracking-wider text-[#0B2545] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#2A6F86]" />
              <span>
                2. Active Supervised Capstones ({activeTeams.length} of 3 Max)
              </span>
            </h4>
            <span className="text-[11px] font-bold text-slate-500">
              4-Stage Capstone Verification
            </span>
          </div>

          {activeTeams.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-300">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 uppercase">
                No Active Supervised Teams
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Endorse pending proposals above to begin active capstone mentorship.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTeams.map((team) => {
                const targetBrief = getBriefForTeam(team.briefId);
                const currentMilestoneInfo =
                  MILESTONE_DEFINITIONS[team.currentMilestone] || MILESTONE_DEFINITIONS[1];

                return (
                  <div
                    key={team.id}
                    className="bg-white border-2 border-[#2A6F86] p-4 flex flex-col justify-between shadow-2xs space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-sm font-black text-[#0B2545]">{team.teamName}</h5>
                            <span className="px-1.5 py-0.2 bg-emerald-700 text-white text-[9px] font-black uppercase">
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Lead: <strong>{team.leadStudentName}</strong> ({team.leadCollege})
                          </p>
                        </div>

                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200">
                          {team.id}
                        </span>
                      </div>

                      {targetBrief && (
                        <div className="bg-slate-50 p-2 border border-slate-200 text-xs">
                          <span className="font-bold text-[#0B2545] block truncate">
                            {targetBrief.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Domain: {targetBrief.domainSector.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}

                      {/* 4-Stage Milestone Progress Bar */}
                      <div className="space-y-1.5 bg-slate-50 p-2.5 border border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-[#0B2545]">
                            {currentMilestoneInfo.title}
                          </span>
                          <span className="font-mono font-black text-emerald-800">
                            {currentMilestoneInfo.percentage}% Completed
                          </span>
                        </div>

                        {/* Progress track */}
                        <div className="w-full bg-slate-200 h-2.5">
                          <div
                            className="bg-emerald-600 h-2.5 transition-all"
                            style={{ width: `${currentMilestoneInfo.percentage}%` }}
                          />
                        </div>

                        <p className="text-[10px] text-slate-600 italic">
                          {currentMilestoneInfo.description}
                        </p>

                        {/* Milestone indicators */}
                        <div className="grid grid-cols-4 gap-1 pt-1 text-center font-mono text-[9px] font-bold">
                          {([1, 2, 3, 4] as const).map((mNum) => (
                            <span
                              key={mNum}
                              className={`py-0.5 border ${
                                team.currentMilestone >= mNum
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-white text-slate-400 border-slate-200'
                              }`}
                            >
                              M{mNum} {team.currentMilestone >= mNum ? '✓' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Milestone Sign-off CTA */}
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTeamForTelemetry(team)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="View individual git contribution telemetry and free-rider audit"
                      >
                        <GitCommit className="w-3.5 h-3.5 text-[#7A1B1B]" />
                        <span>Contribution Telemetry</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {team.currentMilestone < 4 ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceMilestone(team)}
                            className="px-3 py-1.5 bg-[#0B2545] hover:bg-[#1E3A5F] text-[#F8E7A2] text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Sign-Off Milestone {team.currentMilestone}</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-black uppercase inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Capstone Complete</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contribution Telemetry & Free-Rider Audit Modal (Task 2.5) */}
      {selectedTeamForTelemetry && (
        <ContributionTelemetryModal
          team={selectedTeamForTelemetry}
          brief={getBriefForTeam(selectedTeamForTelemetry.briefId)}
          language={language}
          onClose={() => setSelectedTeamForTelemetry(null)}
        />
      )}

      {/* NAAC Criterion 3.6 & UGC API Dossier Modal (Task 2.5) */}
      {showNaacDossier && currentFaculty && (
        <NaacDossierModal
          faculty={currentFaculty}
          supervisedTeams={activeTeams}
          briefs={allBriefs}
          language={language}
          onClose={() => setShowNaacDossier(false)}
        />
      )}
    </section>
  );
};

export default FacultyMentorDashboard;

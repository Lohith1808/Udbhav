/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — Multidisciplinary Team Assembly Modal
 * 
 * Enforces NEP 2020 Multidisciplinary Capstone Criteria:
 * Solver teams MUST contain members from at least 2 distinct engineering departments
 * (e.g. CSE + Civil / Mechanical / Chemical) to qualify for state micro-grant endorsement.
 */

import React, { useState, useId } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  School,
  Briefcase,
  Lock,
} from 'lucide-react';
import {
  EngineeringProblemBrief,
  StudentTeam,
  TeamMember,
  AcademicDepartment,
} from '../../../types/solver';
import { createTeam, saveEngineeringBrief } from '../../../lib/db';
import { useSession } from '../../../context/SessionContext';
import { centralSyncService } from '../../../services/centralSyncService';

export interface TeamAssemblyModalProps {
  brief: EngineeringProblemBrief;
  language?: 'en' | 'hi';
  onClose: () => void;
  onSuccess: (team: StudentTeam) => void;
}

const JHARKHAND_HEIS = [
  'BIT Sindri',
  'BIT Mesra',
  'NIT Jamshedpur',
  'IIIT Ranchi',
  'VBU Hazaribagh',
  'BAU Ranchi',
] as const;

const DEPARTMENTS: { value: AcademicDepartment; label: string }[] = [
  { value: 'CSE', label: 'Computer Science & Engineering (CSE)' },
  { value: 'ECE', label: 'Electronics & Communication (ECE)' },
  { value: 'MECHANICAL', label: 'Mechanical Engineering (ME)' },
  { value: 'CIVIL', label: 'Civil & Environmental Engineering (CE)' },
  { value: 'ELECTRICAL', label: 'Electrical Engineering (EE)' },
  { value: 'AGRICULTURE', label: 'Agricultural Engineering (AGRI)' },
  { value: 'CHEMICAL', label: 'Chemical Engineering (CHEM)' },
];

export const TeamAssemblyModal: React.FC<TeamAssemblyModalProps> = ({
  brief,
  language = 'en',
  onClose,
  onSuccess,
}) => {
  const modalTitleId = useId();
  const { session, openVerificationModal } = useSession();

  // Enforce Verified Student Solver Role (Sprint 6 - Task 6.4)
  const isSolverVerified = session.role === 'STUDENT_SOLVER' && session.isVerified === true;

  // Lead Student details
  const [teamName, setTeamName] = useState('');
  const [leadName, setLeadName] = useState(session.fullName || '');
  const [leadCollege, setLeadCollege] = useState<string>(
    (session.institutionOrOrg as typeof JHARKHAND_HEIS[number]) || JHARKHAND_HEIS[0]
  );
  const [leadDept, setLeadDept] = useState<AcademicDepartment>('CSE');
  const [leadYear, setLeadYear] = useState<number>(3);
  const [leadRole, setLeadRole] = useState('Team Lead & Systems Architect');

  // Peer Roster (1 to 3 additional members, making total roster 2 to 4)
  const [peerMembers, setPeerMembers] = useState<TeamMember[]>([
    {
      studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      department: 'CIVIL',
      year: 3,
      roleDescription: 'Subsystem Hardware Lead',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute set of all departments represented in the entire team
  const allDepartments = Array.from(
    new Set([leadDept, ...peerMembers.map((m) => m.department)])
  );
  const isMultidisciplinary = allDepartments.length >= 2;

  // Validation
  const isTeamNameValid = teamName.trim().length >= 3;
  const isLeadValid = leadName.trim().length >= 2 && leadRole.trim().length >= 2;
  const arePeersValid =
    peerMembers.length >= 1 &&
    peerMembers.every(
      (m) => m.name.trim().length >= 2 && m.roleDescription.trim().length >= 2
    );
  const canSubmit =
    isSolverVerified &&
    isTeamNameValid &&
    isLeadValid &&
    arePeersValid &&
    isMultidisciplinary &&
    !isSubmitting;

  const handleAddMember = () => {
    if (peerMembers.length >= 3) return; // Max 4 total (lead + 3)
    const availableDepts = DEPARTMENTS.map((d) => d.value).filter(
      (dept) => !allDepartments.includes(dept)
    );
    const nextDept: AcademicDepartment = availableDepts[0] || 'MECHANICAL';

    setPeerMembers([
      ...peerMembers,
      {
        studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        department: nextDept,
        year: 3,
        roleDescription: 'Validation & Testing Engineer',
      },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    if (peerMembers.length <= 1) return; // Min 2 total (lead + 1)
    setPeerMembers(peerMembers.filter((_, idx) => idx !== index));
  };

  const handleUpdateMember = (
    index: number,
    field: keyof TeamMember,
    value: string | number
  ) => {
    setPeerMembers(
      peerMembers.map((m, idx) => (idx === index ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const generatedTeamId = `TEAM-JH-${Date.now().toString(36).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`;
      const fallbackLeadId = `LEAD-${leadCollege.replace(/\s+/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      const leadStudentId =
        isSolverVerified && session.maskedIdentifier
          ? session.maskedIdentifier
          : fallbackLeadId;

      const completeRoster: TeamMember[] = [
        {
          studentId: leadStudentId,
          name: leadName.trim(),
          department: leadDept,
          year: leadYear,
          roleDescription: leadRole.trim(),
        },
        ...peerMembers.map((m) => ({
          ...m,
          name: m.name.trim(),
          roleDescription: m.roleDescription.trim(),
        })),
      ];

      const newTeam: StudentTeam = {
        id: generatedTeamId,
        briefId: brief.id,
        teamName: teamName.trim(),
        leadStudentId,
        leadStudentName: leadName.trim(),
        leadCollege,
        roster: completeRoster,
        mentorStatus: 'UNASSIGNED',
        currentMilestone: 1, // 1: Problem Brief
      };

      // 1. Persist new team into Dexie studentTeams table
      await createTeam(newTeam);

      // 2. Transition brief status to 'CLAIMED'
      const updatedBrief: EngineeringProblemBrief = {
        ...brief,
        status: 'CLAIMED',
      };
      await saveEngineeringBrief(updatedBrief);

      // 3. Publish lifecycle events across network (Sprint 6 - Task 6.4)
      centralSyncService.publish('RECORD_UPDATED', {
        type: 'brief',
        id: brief.id,
        briefId: brief.id,
        status: 'CLAIMED',
        brief: updatedBrief,
      });

      centralSyncService.publish('TEAM_CLAIMED', {
        team: newTeam,
        briefId: brief.id,
      });

      onSuccess(newTeam);
    } catch (err) {
      console.error('Error claiming challenge:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to register team. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div className="bg-white border-2 border-[#7A1B1B] max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================== */}
        {/* MODAL HEADER */}
        {/* ================================================================== */}
        <div className="bg-[#7A1B1B] text-white p-3.5 sm:p-4 flex items-start justify-between gap-3 border-b-2 border-[#5E1414] shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white text-[#7A1B1B] border border-amber-300 flex items-center justify-center shrink-0 shadow-xs font-serif font-black text-sm">
              <span className="text-center leading-tight">
                <span className="block text-[8px] tracking-widest text-slate-600">NEP</span>
                <span className="block text-[11px] font-black text-[#7A1B1B]">2020</span>
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#7A1B1B]" />
                  <span>Capstone Teaming Gate</span>
                </span>
                <span className="text-[11px] font-mono text-amber-200 bg-[#5E1414] px-2 py-0.5 border border-amber-300/30">
                  {brief.id}
                </span>
              </div>
              <h2
                id={modalTitleId}
                className="text-base sm:text-lg font-black text-[#F8E7A2] leading-snug"
              >
                {language === 'hi'
                  ? 'अंतःविषय टीम गठन एवं चुनौती दावा'
                  : 'Form Interdisciplinary Capstone Team'}
              </h2>
              <p className="text-[11px] text-amber-100/90 font-medium">
                {language === 'hi'
                  ? 'एनईपी 2020 अधिदेश: कम से कम 2 अलग-अलग इंजीनियरिंग विभागों का समावेश अनिवार्य है।'
                  : 'Mandatory NEP 2020 Directive: Teams must bridge at least 2 distinct engineering departments.'}
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

        {/* Selected Challenge Context Banner */}
        <div className="bg-[#0B2545] text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold uppercase text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 shrink-0">
              Target Challenge
            </span>
            <span className="font-bold text-white truncate max-w-md">{brief.title}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 shrink-0">
            BOM Cap: ₹{brief.maxCostINR.toLocaleString('en-IN')}
          </span>
        </div>

        {/* ================================================================== */}
        {/* FORM BODY (SCROLLABLE) */}
        {/* ================================================================== */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#FCFDFE]">
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* RBAC Verification Gate Banner (Sprint 6 - Task 6.4) */}
          {!isSolverVerified && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-xs uppercase tracking-wide">
                    {language === 'hi'
                      ? 'सत्यापित छात्र अन्वेषक क्रेडेंशियल आवश्यक'
                      : 'Verified Student Solver Role Required (RBAC Gate)'}
                  </div>
                  <div className="text-[11px] text-amber-900 mt-0.5">
                    {language === 'hi'
                      ? 'केवल सत्यापित छात्र दल (B.Tech Capstone Leads) ही राज्य कैपस्टोन चुनौती का दावा कर सकते हैं। परीक्षण टोकन: AICTE-STUDENT-JH-2026'
                      : 'Under SIH PS ID 26043 governance, only verified collegiate Student Solvers can claim state capstone briefs. Enter institutional passkey in Profile Verification (e.g. AICTE-STUDENT-JH-2026).'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={openVerificationModal}
                className="px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#601515] text-[#F8E7A2] text-xs font-bold uppercase shrink-0 transition-colors cursor-pointer shadow-xs"
              >
                {language === 'hi' ? 'आईडी सत्यापित करें' : 'Verify Solver ID'}
              </button>
            </div>
          )}

          {/* NEP 2020 Multidisciplinary Criteria Indicator Pill */}
          <div
            className={`p-3 border-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs ${
              isMultidisciplinary
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : 'bg-red-50 border-red-500 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {isMultidisciplinary ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
              )}
              <div>
                <span className="font-black text-xs uppercase block">
                  {isMultidisciplinary
                    ? `NEP 2020 Multidisciplinary Criteria Satisfied (${allDepartments.length} Departments)`
                    : 'NEP 2020 Mandate: Teams must include members from at least 2 distinct engineering departments.'}
                </span>
                <span className="text-[11px] text-slate-700">
                  {isMultidisciplinary
                    ? `Departments represented: ${allDepartments.join(' + ')}`
                    : 'Teams must bridge multiple engineering disciplines (e.g., CSE + Civil or Mechanical or Electrical).'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 font-mono text-[10px] font-bold shrink-0">
              {allDepartments.map((dept) => (
                <span
                  key={dept}
                  className="px-2 py-0.5 bg-white border border-slate-300 text-slate-800 shadow-2xs"
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>

          {/* Team Basic Info Box */}
          <div className="bg-white border border-slate-300 p-3.5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Users className="w-3.5 h-3.5 text-[#2A6F86]" />
              <span>1. Team Identity & Collegiate Institution</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Team Name / दल का नाम <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jal Rakshak BIT-S"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-400 focus:border-[#7A1B1B] focus:ring-1 focus:ring-[#7A1B1B] outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  Must be unique and descriptive (min 3 characters).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Collegiate Institution / महाविद्यालय <span className="text-red-600">*</span>
                </label>
                <select
                  value={leadCollege}
                  onChange={(e) => setLeadCollege(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-400 focus:border-[#7A1B1B] focus:ring-1 focus:ring-[#7A1B1B] outline-none bg-white font-medium"
                >
                  {JHARKHAND_HEIS.map((hei) => (
                    <option key={hei} value={hei}>
                      {hei} (Jharkhand)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500">
                  Affiliated Higher Education Institution.
                </span>
              </div>
            </div>
          </div>

          {/* Lead Student Profile */}
          <div className="bg-white border border-slate-300 p-3.5 space-y-3 shadow-2xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <School className="w-3.5 h-3.5 text-[#2A6F86]" />
              <span>2. Lead Student Solver / टीम लीडर</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Full Name / पूरा नाम <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Murmu"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-400 focus:border-[#7A1B1B] focus:ring-1 focus:ring-[#7A1B1B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Department / विभाग <span className="text-red-600">*</span>
                </label>
                <select
                  value={leadDept}
                  onChange={(e) => setLeadDept(e.target.value as AcademicDepartment)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-400 focus:border-[#7A1B1B] outline-none bg-white font-bold text-[#7A1B1B]"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.value} - {dept.label.split('(')[0].trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Year / वर्ष <span className="text-red-600">*</span>
                </label>
                <select
                  value={leadYear}
                  onChange={(e) => setLeadYear(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-400 focus:border-[#7A1B1B] outline-none bg-white font-medium"
                >
                  <option value={2}>Year 2 (Sophomore)</option>
                  <option value={3}>Year 3 (Pre-Final)</option>
                  <option value={4}>Year 4 (Final Capstone)</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Subsystem Responsibility / उप-प्रणाली भूमिका{' '}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team Lead & Systems Architecture"
                  value={leadRole}
                  onChange={(e) => setLeadRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-400 focus:border-[#7A1B1B] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Multidisciplinary Peer Roster (1 to 3 additional members) */}
          <div className="bg-white border border-slate-300 p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#2A6F86]" />
                <span>
                  3. Peer Roster ({peerMembers.length + 1} of 4 Students)
                </span>
              </h3>

              {peerMembers.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-2 py-1 bg-[#2A6F86] hover:bg-[#205769] text-white text-[11px] font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Peer Member</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {peerMembers.map((member, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-700">
                      Peer Solver #{idx + 2}
                    </span>
                    {peerMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-slate-400 hover:text-red-700 p-0.5 transition-colors cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Full Name / नाम <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Kumari"
                        value={member.name}
                        onChange={(e) => handleUpdateMember(idx, 'name', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 focus:border-[#7A1B1B] outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Department / विभाग <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={member.department}
                        onChange={(e) =>
                          handleUpdateMember(
                            idx,
                            'department',
                            e.target.value as AcademicDepartment
                          )
                        }
                        className="w-full px-1.5 py-1 text-xs border border-slate-300 focus:border-[#7A1B1B] outline-none bg-white font-bold text-[#0B2545]"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept.value} value={dept.value}>
                            {dept.value} - {dept.label.split('(')[0].trim()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Year / वर्ष
                      </label>
                      <select
                        value={member.year}
                        onChange={(e) => handleUpdateMember(idx, 'year', Number(e.target.value))}
                        className="w-full px-1.5 py-1 text-xs border border-slate-300 focus:border-[#7A1B1B] outline-none bg-white"
                      >
                        <option value={2}>Year 2</option>
                        <option value={3}>Year 3</option>
                        <option value={4}>Year 4</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Subsystem Specialization / उप-प्रणाली भूमिका{' '}
                        <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gravity Filtration Medium & Scour Analysis"
                        value={member.roleDescription}
                        onChange={(e) =>
                          handleUpdateMember(idx, 'roleDescription', e.target.value)
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-300 focus:border-[#7A1B1B] outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================ */}
          {/* MODAL FOOTER */}
          {/* ================================================================ */}
          <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="text-[11px] text-slate-600 font-medium">
              {isMultidisciplinary ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Multidisciplinary eligibility verified</span>
                </span>
              ) : (
                <span className="text-amber-800 font-bold inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Cross-department member required</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-2 bg-[#7A1B1B] hover:bg-[#631515] disabled:bg-slate-400 text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {isSubmitting
                    ? language === 'hi'
                      ? 'पंजीकरण जारी है...'
                      : 'Claiming Challenge...'
                    : !isSolverVerified
                    ? language === 'hi'
                      ? 'छात्र सत्यापन आवश्यक (RBAC)'
                      : 'Solver Verification Required'
                    : !isMultidisciplinary
                    ? language === 'hi'
                      ? 'एनईपी 2020: 2 विभाग आवश्यक'
                      : 'NEP 2020: 2 Departments Required'
                    : language === 'hi'
                    ? 'रोस्टर पुष्टि करें एवं दावा करें'
                    : 'Submit Capstone Claim'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamAssemblyModal;

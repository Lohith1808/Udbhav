/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — Solver Briefs & Faculty Mentorship
 * 
 * Strict alignment with Jharkhand Higher & Technical Education Department standards,
 * Quadruple-Helix Innovation Network, and GIGW 3.0 governance rules.
 */

/**
 * Domain sectors priority taxonomy for Jharkhand grassroots engineering challenges
 */
export type DomainSector =
  | 'WATER_RESOURCES'
  | 'AGRITECH'
  | 'RURAL_ENERGY'
  | 'SANITATION'
  | 'HEALTHCARE'
  | 'CIVIL_INFRA';

/**
 * Lifecycle status of an academic engineering problem brief
 */
export type BriefStatus =
  | 'OPEN_FOR_CLAIMS'
  | 'CLAIMED'
  | 'IN_DEVELOPMENT'
  | 'PILOT_READY'
  | 'DEPLOYED';

/**
 * Measurable technical benchmark with strict tolerance bounds
 */
export interface MeasurableBenchmark {
  metric: string;
  targetValue: string;
  tolerance: string;
}

/**
 * Field evidence summary extracted from grassroots citizen & Panchayat endorsements
 */
export interface FieldEvidenceSummary {
  photoCount: number;
  audioNotePresent: boolean;
  householdImpact: number;
  panchayatNote: string;
  district: string;
  block: string;
}

/**
 * Curated engineering problem brief converted from endorsed citizen challenges
 */
export interface EngineeringProblemBrief {
  id: string; // UUID
  masterIssueId: string; // references master issue tracking token, e.g. 'JH-2026-M-XXXXXX'
  title: string;
  domainSector: DomainSector;
  contextSummary: string;
  boundaryConstraints: string[]; // non-negotiable operating limits
  measurableBenchmarks: MeasurableBenchmark[];
  maxCostINR: number; // strict ceiling <= ₹2,500
  fieldEvidenceSummary: FieldEvidenceSummary;
  status: BriefStatus;
  createdAt: number;
}

/**
 * Academic engineering departments participating in solver rosters
 */
export type AcademicDepartment =
  | 'CSE'
  | 'ECE'
  | 'MECHANICAL'
  | 'CIVIL'
  | 'ELECTRICAL'
  | 'AGRICULTURE'
  | 'CHEMICAL';

/**
 * Mentorship status progression for a student team
 */
export type MentorStatus =
  | 'UNASSIGNED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'REROUTED';

/**
 * Official 4-stage Capstone Milestone number
 */
export type MilestoneNumber = 1 | 2 | 3 | 4;

/**
 * Student member profile inside a solver team roster
 */
export interface TeamMember {
  studentId: string;
  name: string;
  department: AcademicDepartment;
  year: number;
  roleDescription: string;
}

/**
 * Registered collegiate student solver team
 */
export interface StudentTeam {
  id: string; // UUID
  briefId: string;
  teamName: string;
  leadStudentId: string;
  leadStudentName: string;
  leadCollege: string; // e.g. 'BIT Sindri', 'BIT Mesra', 'NIT Jamshedpur'
  roster: TeamMember[];
  assignedMentorId?: string;
  mentorStatus: MentorStatus;
  mentorRequestTimestamp?: number;
  repoUrl?: string;
  currentMilestone: MilestoneNumber; // 1: Problem Brief, 2: CAD/BOM, 3: Lab Prototype, 4: Field Pilot
}

/**
 * Faculty mentor slot allocation category enforcing 70/30 hybrid allocation
 * (70% domain core competency, 30% exploratory cross-disciplinary wildcard)
 */
export type FacultySlotType = 'CORE_COMPETENCY' | 'WILDCARD_EXPLORATORY';

/**
 * Verified faculty mentor profile from accredited Jharkhand Higher Education Institutions
 */
export interface FacultyMentorProfile {
  id: string;
  name: string;
  designation: string;
  department: string;
  institution: string;
  coreCompetencyTags: string[]; // e.g., ['water-filtration', 'embedded-iot', 'solar-microgrids']
  activeProjectsCount: number; // Hard capacity cap: max 3
  maxCapacity: number; // Default: 3
  pendingReviewQueueCount: number; // Hard ceiling: max 5
  slotType: FacultySlotType; // 70/30 hybrid allocation
}

/**
 * Academic capstone milestone evaluation record
 */
export interface CapstoneMilestone {
  milestoneNumber: MilestoneNumber;
  title: string;
  percentage: number; // 25, 50, 75, 100
  deliverableSummary: string;
  proofUrl?: string;
  facultyVerified: boolean;
  facultyFeedback?: string;
  verifiedAt?: number;
}

/**
 * Status of a technical query submitted by student solvers to Panchayat administration
 */
export type TechnicalQueryStatus = 'PENDING_OFFICER' | 'ANSWERED';

/**
 * Bi-directional grassroots technical inquiry from student teams to ground Panchayat officers
 */
export interface PanchayatTechnicalQuery {
  id: string;
  teamId: string;
  masterIssueId: string;
  queryText: string;
  responseNote?: string;
  status: TechnicalQueryStatus;
  createdAt: number;
}

/**
 * Statutory guardrail constants
 */
export const MAX_BRIEF_BUDGET_INR = 2500;
export const FACULTY_MAX_ACTIVE_PROJECTS = 3;
export const FACULTY_MAX_PENDING_QUEUE = 5;

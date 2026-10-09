/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Central Workspace Route & Role-Based Access Configuration
 *
 * Single source of truth for:
 * - Workspace "route" definitions (the application is a view-based SPA;
 *   each workspace view is addressable via a URL hash such as #/report).
 * - Role → permitted workspace mapping (strict, one primary workspace per role).
 * - Login-page role selector options.
 *
 * To add or modify a role's access, update ROLE_VIEW_ACCESS below —
 * navigation surfaces, route guards, and landing-page resolution all
 * derive from this configuration.
 */

import {
  FileText,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Coins,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types/ingestion';

/**
 * Workspace view identifiers (used as URL hash routes: #/<id>)
 */
export type WorkspaceViewId = 'report' | 'panchayat' | 'academic' | 'faculty' | 'csr' | 'gis';

export interface WorkspaceViewDef {
  id: WorkspaceViewId;
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  icon: LucideIcon;
}

export const WORKSPACE_VIEWS: Record<WorkspaceViewId, WorkspaceViewDef> = {
  report: {
    id: 'report',
    labelEn: 'Citizen Ingestion Terminal',
    labelHi: 'नागरिक इनटेक टर्मिनल',
    descriptionEn: 'Report civic issues with voice, photo evidence and LGD geotagging.',
    icon: FileText,
  },
  panchayat: {
    id: 'panchayat',
    labelEn: 'Panchayat Verification Desk',
    labelHi: 'पंचायत सत्यापन डेस्क',
    descriptionEn: 'Statutory field inspection, endorsement and quality gate review.',
    icon: ShieldCheck,
  },
  academic: {
    id: 'academic',
    labelEn: 'Academic Challenge Board',
    labelHi: 'अकादमिक चुनौती बोर्ड',
    descriptionEn: 'Claim endorsed engineering briefs and assemble solver teams.',
    icon: Sparkles,
  },
  faculty: {
    id: 'faculty',
    labelEn: 'Faculty Mentorship Dashboard',
    labelHi: 'संकाय मेंटरशिप डैशबोर्ड',
    descriptionEn: '70/30 matchmaking, milestone review and NAAC dossier telemetry.',
    icon: GraduationCap,
  },
  csr: {
    id: 'csr',
    labelEn: 'CSR Funding & Milestone Dashboard',
    labelHi: 'सीएसआर फंडिंग एवं मील पत्थर डैशबोर्ड',
    descriptionEn: 'Milestone-gated escrow tranches and statutory CSR-2 audit dossiers.',
    icon: Coins,
  },
  gis: {
    id: 'gis',
    labelEn: 'Government Command Dashboard',
    labelHi: 'सरकारी कमान डैशबोर्ड',
    descriptionEn: 'Statewide GIS command heatmap across 24 districts of Jharkhand.',
    icon: MapPin,
  },
};

/**
 * Strict role → permitted workspace routes.
 * Each stakeholder role maps to exactly one primary workspace.
 * PANCHAYAT_OFFICER and ACCREDITED_EVALUATOR remain first-class internal
 * roles (reachable via official verification keys) so existing verification
 * workflows keep functioning.
 */
export const ROLE_VIEW_ACCESS: Record<UserRole, WorkspaceViewId[]> = {
  CITIZEN: ['report'],
  PANCHAYAT_OFFICER: ['panchayat'],
  STUDENT_SOLVER: ['academic'],
  FACULTY_MENTOR: ['faculty'],
  INDUSTRY_CSR: ['csr'],
  GOVT_ADMIN: ['gis'],
  ACCREDITED_EVALUATOR: ['gis'],
};

/**
 * The five stakeholder roles offered on the login page role selector,
 * in the order specified by the product requirements.
 */
export const LOGIN_ROLE_OPTIONS: Array<{
  role: UserRole;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
}> = [
  {
    role: 'CITIZEN',
    titleEn: 'Citizen / Grassroots Submitter',
    titleHi: 'नागरिक / जमीनी स्तर सूचनादाता',
    descriptionEn: 'Report local civic issues via voice, photo and location evidence.',
  },
  {
    role: 'STUDENT_SOLVER',
    titleEn: 'Student / Academic Solver',
    titleHi: 'छात्र / शैक्षणिक समाधानकर्ता',
    descriptionEn: 'Claim engineering challenges and build capstone solutions.',
  },
  {
    role: 'FACULTY_MENTOR',
    titleEn: 'Faculty / Academic Mentor',
    titleHi: 'संकाय / शैक्षणिक मार्गदर्शक',
    descriptionEn: 'Mentor student teams and review project milestones.',
  },
  {
    role: 'INDUSTRY_CSR',
    titleEn: 'Industry / CSR Partner',
    titleHi: 'उद्योग / सीएसआर भागीदार',
    descriptionEn: 'Fund milestone-gated CSR grants and track disbursements.',
  },
  {
    role: 'GOVT_ADMIN',
    titleEn: 'Government Administrator / Evaluator',
    titleHi: 'सरकारी प्रशासक / मूल्यांकक',
    descriptionEn: 'Oversee the statewide command dashboard and safety gates.',
  },
];

export function isWorkspaceViewId(value: string): value is WorkspaceViewId {
  return Object.prototype.hasOwnProperty.call(WORKSPACE_VIEWS, value);
}

export function getAllowedViews(role: UserRole): WorkspaceViewDef[] {
  return ROLE_VIEW_ACCESS[role].map((id) => WORKSPACE_VIEWS[id]);
}

export function getLandingViewForRole(role: UserRole): WorkspaceViewId {
  return ROLE_VIEW_ACCESS[role][0];
}

export function isViewAllowedForRole(role: UserRole, view: WorkspaceViewId): boolean {
  return ROLE_VIEW_ACCESS[role].includes(view);
}

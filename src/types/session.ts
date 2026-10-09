/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * System-Wide User Session, Tamper-Resistant RBAC & Verification Types (Sprint 5 — Task 5.3)
 * 
 * Rectifies Bug 1 (Cosmetic profile verification & console role bypass):
 * - Removed plain-text verification secrets from client-exposed types.
 * - Added tamper-resistant session signature (SHA-256(role + verifiedAt + salt)).
 * - Enforces zero-trust cross-device verification.
 */

import { UserRole } from './ingestion';

export interface UserSession {
  userId?: string;
  role: UserRole;
  isVerified: boolean;
  maskedIdentifier: string; // e.g., 'Citizen #JH-8492' or 'Officer #JH-SEC-104'
  fullName?: string;
  institutionOrOrg?: string;
  institutionOrPanchayat?: string; // Backwards-compatible alias
  verifiedAt?: number;
  sessionSignature?: string; // SHA-256(role + verifiedAt + salt)
  verificationBadge?: string;
  competencies?: string[];
  activeProjectsCount?: number;
}

export interface RoleCredentialMetadata {
  targetRole: UserRole;
  officialTitle: string;
  issuingAuthority: string;
  badge: string;
  sampleHolder: string;
}

/**
 * Public institutional role metadata (Zero plain-text verification secrets exposed)
 */
export const ROLE_CREDENTIAL_METADATA: Record<UserRole, RoleCredentialMetadata> = {
  CITIZEN: {
    targetRole: 'CITIZEN',
    officialTitle: 'Gramin Citizen / Grassroots Reporter',
    issuingAuthority: 'UIDAI / Aadhaar Mobile WebOTP Gateway',
    badge: 'AADHAAR_WEBOTP_VERIFIED',
    sampleHolder: 'Ramesh Munda',
  },
  PANCHAYAT_OFFICER: {
    targetRole: 'PANCHAYAT_OFFICER',
    officialTitle: 'Panchayat Secretary (Gram Sachiv)',
    issuingAuthority: 'Department of Panchayati Raj, Govt of Jharkhand',
    badge: 'OFFICIAL_PANCHAYAT_KEY_VALIDATED',
    sampleHolder: 'Sanjay Soren',
  },
  STUDENT_SOLVER: {
    targetRole: 'STUDENT_SOLVER',
    officialTitle: 'B.Tech Capstone Team Lead',
    issuingAuthority: 'Birla Institute of Technology (BIT) Mesra / AICTE Portal',
    badge: 'AICTE_STUDENT_ID_VERIFIED',
    sampleHolder: 'Aman Verma',
  },
  FACULTY_MENTOR: {
    targetRole: 'FACULTY_MENTOR',
    officialTitle: 'Associate Professor & Capstone Supervisor',
    issuingAuthority: 'National Institute of Technology (NIT) Jamshedpur',
    badge: 'AICTE_FACULTY_CREDENTIAL_VERIFIED',
    sampleHolder: 'Dr. Arvind Kumar',
  },
  INDUSTRY_CSR: {
    targetRole: 'INDUSTRY_CSR',
    officialTitle: 'Head of Corporate Social Responsibility',
    issuingAuthority: 'Ministry of Corporate Affairs (MCA) / Tata Steel CSR Foundation',
    badge: 'MCA_CSR_SECTION_135_VALIDATED',
    sampleHolder: 'Rohit Singhania',
  },
  GOVT_ADMIN: {
    targetRole: 'GOVT_ADMIN',
    officialTitle: 'State Nodal Officer & Joint Secretary',
    issuingAuthority: 'Department of Higher & Technical Education (DHTE), Ranchi',
    badge: 'GOVT_JHARKHAND_STATE_SECRETARIAT_VALIDATED',
    sampleHolder: 'Smt. Priyanka Jha, IAS',
  },
  ACCREDITED_EVALUATOR: {
    targetRole: 'ACCREDITED_EVALUATOR',
    officialTitle: 'Chief Scientist & NABL Signatory',
    issuingAuthority: 'CSIR - Central Institute of Mining & Fuel Research (CIMFR), Dhanbad',
    badge: 'BIS_NABL_INDEPENDENT_EVALUATOR_CERTIFIED',
    sampleHolder: 'Dr. P. K. Singh',
  },
};

/**
 * Baseline initial unverified session prototypes for Quadruple-Helix stakeholders
 */
export const BASELINE_UNVERIFIED_SESSIONS: Record<UserRole, UserSession> = {
  CITIZEN: {
    userId: 'user-cit-7492',
    role: 'CITIZEN',
    maskedIdentifier: 'Citizen #JH-8492',
    fullName: 'Ramesh Munda',
    institutionOrOrg: 'Gram Panchayat Angara, Ranchi',
    institutionOrPanchayat: 'Gram Panchayat Angara, Ranchi',
    isVerified: false,
    activeProjectsCount: 1,
  },
  PANCHAYAT_OFFICER: {
    userId: 'user-pan-012',
    role: 'PANCHAYAT_OFFICER',
    maskedIdentifier: 'Officer #JH-SEC-104',
    fullName: 'Sanjay Soren (Panchayat Sachiv)',
    institutionOrOrg: 'Arsande Gram Panchayat, Kanke, Ranchi',
    institutionOrPanchayat: 'Arsande Gram Panchayat, Kanke, Ranchi',
    isVerified: false,
    activeProjectsCount: 3,
  },
  STUDENT_SOLVER: {
    userId: 'user-sol-2024',
    role: 'STUDENT_SOLVER',
    maskedIdentifier: 'Solver #JH-ENG-2024',
    fullName: 'Aman Verma (Team Lead)',
    institutionOrOrg: 'BIT Mesra, Ranchi',
    institutionOrPanchayat: 'BIT Mesra, Ranchi',
    isVerified: false,
    activeProjectsCount: 1,
  },
  FACULTY_MENTOR: {
    userId: 'user-fac-88',
    role: 'FACULTY_MENTOR',
    maskedIdentifier: 'Mentor #JH-FAC-88',
    fullName: 'Dr. Arvind Kumar (Associate Professor)',
    institutionOrOrg: 'NIT Jamshedpur (Mechanical Engg)',
    institutionOrPanchayat: 'NIT Jamshedpur (Mechanical Engg)',
    isVerified: false,
    activeProjectsCount: 2,
  },
  INDUSTRY_CSR: {
    userId: 'user-csr-01',
    role: 'INDUSTRY_CSR',
    maskedIdentifier: 'CSR #JH-TATA-01',
    fullName: 'Rohit Singhania (CSR Lead)',
    institutionOrOrg: 'Tata Steel Foundation, Jamshedpur',
    institutionOrPanchayat: 'Tata Steel Foundation, Jamshedpur',
    isVerified: false,
    activeProjectsCount: 2,
  },
  GOVT_ADMIN: {
    userId: 'user-adm-01',
    role: 'GOVT_ADMIN',
    maskedIdentifier: 'Admin #JH-DHTE-01',
    fullName: 'Smt. Priyanka Jha, IAS (Director)',
    institutionOrOrg: 'Dept. of Higher & Technical Education, Ranchi',
    institutionOrPanchayat: 'Dept. of Higher & Technical Education, Ranchi',
    isVerified: false,
    activeProjectsCount: 0,
  },
  ACCREDITED_EVALUATOR: {
    userId: 'user-eval-01',
    role: 'ACCREDITED_EVALUATOR',
    maskedIdentifier: 'Evaluator #JH-BIS-01',
    fullName: 'Dr. P. K. Singh (Chief Scientist)',
    institutionOrOrg: 'CSIR-CIMFR Dhanbad',
    institutionOrPanchayat: 'CSIR-CIMFR Dhanbad',
    isVerified: false,
    activeProjectsCount: 1,
  },
};

export const PRESET_USER_SESSIONS = BASELINE_UNVERIFIED_SESSIONS;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * CSR Funding & Milestone Dashboard (Workspace Route: #/csr)
 *
 * Industry/CSR-owned workspace. The escrow dashboard component and all
 * CSR-specific logic live in features/governance; this page is the
 * workspace boundary that lazy-loads it inside the role-guarded shell.
 */

import React from 'react';
import { WorkspacePageProps } from '../shared/workspacePageProps';

const CSREscrowDashboard = React.lazy(
  () => import('../../features/governance/components/CSREscrowDashboard')
);

export interface CsrEscrowPageProps extends WorkspacePageProps {
  /** Locally simulated governance persona for the dashboard's role switcher. */
  simulatedRole: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR';
  onSimulatedRoleChange: (
    role: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR'
  ) => void;
}

export const CsrEscrowPage: React.FC<CsrEscrowPageProps> = ({
  language,
  simulatedRole,
  onSimulatedRoleChange,
}) => {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 bg-white border border-slate-300">
          Loading CSR Escrow Console...
        </div>
      }
    >
      <CSREscrowDashboard
        userRole={simulatedRole}
        onRoleChange={onSimulatedRoleChange}
        language={language}
      />
    </React.Suspense>
  );
};

export default CsrEscrowPage;

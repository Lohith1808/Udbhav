/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Government Command Dashboard (Workspace Route: #/gis)
 *
 * Government Administrator / Evaluator-owned workspace. The statewide GIS
 * command dashboard component and all governance-specific logic live in
 * features/governance; this page is the workspace boundary that lazy-loads
 * it inside the role-guarded shell.
 */

import React from 'react';
import { WorkspacePageProps } from '../shared/workspacePageProps';

const StatewideGISCommandDashboard = React.lazy(
  () => import('../../features/governance/components/StatewideGISCommandDashboard')
);

export interface GovernmentCommandPageProps extends WorkspacePageProps {
  /** Locally simulated governance persona for the dashboard's role switcher. */
  simulatedRole: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR';
  onSimulatedRoleChange: (
    role: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR'
  ) => void;
}

export const GovernmentCommandPage: React.FC<GovernmentCommandPageProps> = ({
  language,
  simulatedRole,
  onSimulatedRoleChange,
}) => {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 bg-white border border-slate-300">
          Loading Statewide GIS Command Portal...
        </div>
      }
    >
      <StatewideGISCommandDashboard
        userRole={simulatedRole}
        onRoleChange={onSimulatedRoleChange}
        language={language}
      />
    </React.Suspense>
  );
};

export default GovernmentCommandPage;

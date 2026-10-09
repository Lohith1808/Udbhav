/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Faculty Mentorship Dashboard (Workspace Route: #/faculty)
 *
 * Faculty-owned workspace. The dashboard component and all faculty-specific
 * logic live in features/mentor; this page is the workspace boundary that
 * lazy-loads it inside the role-guarded shell.
 */

import React from 'react';
import { WorkspacePageProps } from '../shared/workspacePageProps';

const FacultyMentorDashboard = React.lazy(
  () => import('../../features/mentor/components/FacultyMentorDashboard')
);

export const FacultyMentorPage: React.FC<WorkspacePageProps> = ({ language }) => {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 bg-white border border-slate-300">
          Loading Faculty Mentor Desk...
        </div>
      }
    >
      <FacultyMentorDashboard language={language} />
    </React.Suspense>
  );
};

export default FacultyMentorPage;

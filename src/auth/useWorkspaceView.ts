/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Workspace View Router & Role Route Guard
 *
 * The application is a view-based SPA: each stakeholder workspace is a
 * "route" addressable by URL hash (e.g. #/report, #/academic). This hook:
 *
 * - Resolves the current route from location.hash and keeps it in sync
 *   with browser back/forward navigation (hashchange events).
 * - Enforces role-based route protection: a route that is not permitted for
 *   the signed-in role resolves to that role's landing route, and the URL is
 *   normalized via replaceState (no extra history entries).
 * - Returns a null view for unauthenticated users, which the shell renders
 *   as the login screen.
 *
 * All role/route rules live in src/config/roleRoutes.ts.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserSession } from '../types/session';
import {
  WorkspaceViewId,
  isWorkspaceViewId,
  isViewAllowedForRole,
  getLandingViewForRole,
} from '../config/roleRoutes';

function parseWorkspaceViewFromHash(hash: string): WorkspaceViewId | null {
  const raw = hash.replace(/^#\/?/, '').split('?')[0].split('#')[0];
  if (!raw) return null;
  return isWorkspaceViewId(raw) ? raw : null;
}

export interface WorkspaceViewResolution {
  /** The current permitted workspace view, or null when logged out. */
  view: WorkspaceViewId | null;
  /** Navigate to a workspace route (adds a history entry for back/forward). */
  navigateTo: (view: WorkspaceViewId) => void;
}

export function useWorkspaceView(session: UserSession | null): WorkspaceViewResolution {
  const [hashView, setHashView] = useState<WorkspaceViewId | null>(() =>
    typeof window !== 'undefined' ? parseWorkspaceViewFromHash(window.location.hash) : null
  );

  useEffect(() => {
    const onHashChange = () => {
      setHashView(parseWorkspaceViewFromHash(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = useCallback((view: WorkspaceViewId) => {
    window.location.hash = view;
  }, []);

  const landing = session ? getLandingViewForRole(session.role) : null;
  const effective =
    session && hashView && isViewAllowedForRole(session.role, hashView) ? hashView : landing;

  // Normalize the URL when it points at a route the role may not access
  // (replaceState does not fire hashchange, so this cannot loop).
  useEffect(() => {
    if (effective && effective !== hashView && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${effective}`);
    }
  }, [effective, hashView]);

  // Unauthenticated → no workspace view (login screen)
  if (!session || !effective) {
    return { view: null, navigateTo };
  }

  return { view: effective, navigateTo };
}

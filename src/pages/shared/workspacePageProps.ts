/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shared Workspace Page Contract
 *
 * Typed data contract passed from the application shell to each independent
 * stakeholder workspace page. Pages own their own state, mock data, and
 * business logic; only these cross-cutting concerns are shared explicitly.
 */

import { UserSession } from '../../types/session';

export type UILanguage = 'hi' | 'en';

export interface StatusNotificationState {
  text: string;
  type: 'success' | 'info' | 'error';
}

export interface WorkspacePageProps {
  /** The authenticated session (non-null inside the workspace shell). */
  session: UserSession;
  /** Portal-wide UI language selection. */
  language: UILanguage;
  /** Dynamic root font scale class driven by the accessibility controls. */
  fontScaleClass: string;
  /** Shell-level status toast (set by sync events and page handlers). */
  statusNotification: StatusNotificationState | null;
  /** Fire a status toast (auto-dismisses in the shell). */
  notify: (text: string, type: StatusNotificationState['type']) => void;
  /** Open the Gemini Flash API key configuration modal. */
  onOpenAiSettings: () => void;
  /** Whether a batch sync to the Central Master is running. */
  isSyncing: boolean;
  /** Trigger a batch sync of queued reports. */
  onSyncTrigger: () => void;
}

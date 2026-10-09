/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
<<<<<<< HEAD
 * Verified Session & Role-Based Access Control (RBAC) Context (Sprint 5 — Task 5.3)
 * 
 * Rectifies Bug 1 (Cosmetic profile verification & console role bypass):
 * - Tamper-resistant cryptographic session verification with sessionSignature
 * - Zero-trust verification against salted SHA-256 role passkeys
 * - Automatic session downgrade on localStorage tampering
 * - Cross-device and cross-tab multi-window synchronization
=======
 * Verified Session, Mock Authentication & Role-Based Access Control Context
 *
 * Rectifies Bug 1 (No Profile Verification) & Bug 4 (Cross-Device/Tab Session Desync)
 *
 * PROTOTYPE NOTE: Authentication here is a front-end mock for SIH demonstration
 * purposes only. It is NOT secure production authentication — there is no
 * server-side verification, and the session is stored in localStorage.
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole } from '../types/ingestion';
import {
  UserSession,
  ROLE_CREDENTIAL_METADATA,
  BASELINE_UNVERIFIED_SESSIONS,
} from '../types/session';
import {
  verifyRolePasscode,
  identifyRoleFromPasscode,
  generateSessionSignature,
  verifySessionSignature,
} from '../lib/security';
import { centralSyncService, SyncEventMessage } from '../services/centralSyncService';

interface SessionContextType {
  /** Active user profile, or null when logged out. */
  session: UserSession | null;
  /** True only after an explicit mock login (or a persisted login session). */
  isAuthenticated: boolean;
  /** Derived convenience flag: the active session profile is verified. */
  isVerified: boolean;
  /** Mock login: establishes an authenticated demo session. */
  login: (displayName: string, role: UserRole) => void;
  /** Flags the current (e.g. verification-key derived) session as authenticated. */
  markAuthenticated: () => void;
  /** Clears the session and persisted auth state. */
  logout: () => void;
  switchRole: (role: UserRole) => void;
  verifyWithToken: (
<<<<<<< HEAD
    tokenCode: string,
    targetRole?: UserRole
  ) => Promise<{ success: boolean; message: string; badge?: string }>;
=======
    tokenCode: string
  ) => Promise<{ success: boolean; message: string; badge?: string; role?: UserRole }>;
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)
  updateSession: (partial: Partial<UserSession>) => void;
  isAuthorized: (allowedRoles: UserRole[]) => boolean;
  isVerificationModalOpen: boolean;
  openVerificationModal: () => void;
  closeVerificationModal: () => void;
  resetSessionToDefaults: () => void;
}

const STORAGE_KEY = 'udbhav_user_session';

interface PersistedAuthState {
  session: UserSession;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

<<<<<<< HEAD
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from storage or default to unverified Citizen
  const [session, setSession] = useState<UserSession>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as UserSession;
          if (parsed && parsed.role) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    return BASELINE_UNVERIFIED_SESSIONS['CITIZEN'];
  });

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

  // Anti-tamper verification on mount and storage changes
  useEffect(() => {
    const validateIntegrity = async () => {
      if (session.isVerified) {
        const isValid = await verifySessionSignature(session);
        if (!isValid) {
          console.warn(
            '[SessionContext] Tampered or unsigned session detected. Reverting to unverified state to prevent console role bypass.'
          );
          const sanitized: UserSession = {
            ...session,
            isVerified: false,
            sessionSignature: undefined,
            verifiedAt: undefined,
          };
          setSession(sanitized);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          }
        }
      }
    };
    validateIntegrity();
  }, [session.isVerified, session.sessionSignature, session.role]);

  // Sync to localStorage on update
=======
function readPersistedAuthState(): PersistedAuthState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<PersistedAuthState> & { userId?: string };
    // New format: { session, isAuthenticated }
    if (parsed && typeof parsed === 'object' && parsed.session && parsed.session.userId) {
      return {
        session: parsed.session,
        isAuthenticated: Boolean(parsed.isAuthenticated),
      };
    }
    // Legacy format: a bare UserSession persisted by an earlier prototype build.
    if (parsed && parsed.userId) {
      return { session: parsed as UserSession, isAuthenticated: true };
    }
    return null;
  } catch {
    return null;
  }
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() => readPersistedAuthState()?.session ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => readPersistedAuthState()?.isAuthenticated ?? false
  );

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

  // Sync auth state to localStorage on update (logout clears it entirely)
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (session && isAuthenticated) {
        const payload: PersistedAuthState = { session, isAuthenticated };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage may be unavailable (private mode) — session still works in-memory.
    }
  }, [session, isAuthenticated]);

  // Subscribe to cross-tab session broadcasts via centralSyncService
  useEffect(() => {
<<<<<<< HEAD
    const unsubscribe = centralSyncService.subscribe(async (msg: SyncEventMessage) => {
      if (msg.type === 'SESSION_CHANGED' && msg.payload) {
        const remoteSession = msg.payload as UserSession;
        if (remoteSession && remoteSession.role) {
          if (remoteSession.isVerified) {
            const isValid = await verifySessionSignature(remoteSession);
            if (isValid) {
              setSession(remoteSession);
            }
          } else {
            setSession(remoteSession);
          }
=======
    const unsubscribe = centralSyncService.subscribe((msg: SyncEventMessage) => {
      if (msg.type === 'SESSION_CHANGED') {
        const remoteSession = msg.payload as UserSession | null;
        if (!remoteSession) {
          // Remote tab logged out
          setSession(null);
          setIsAuthenticated(false);
        } else if (remoteSession.userId) {
          setSession(remoteSession);
          setIsAuthenticated(true);
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)
        }
      }
    });
    return unsubscribe;
  }, []);

<<<<<<< HEAD
  // Switch stakeholder role (initially unverified until authentic passkey provided)
=======
  const login = useCallback((displayName: string, role: UserRole) => {
    const preset = PRESET_USER_SESSIONS[role];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const nextSession: UserSession = {
      ...preset,
      userId: `user-${role.toLowerCase().replace(/_/g, '-')}-${suffix}`,
      maskedIdentifier: `${displayName} #JH-${suffix}`,
      fullName: displayName,
      isVerified: true,
      verificationBadge: 'MOCK_PROTOTYPE_LOGIN',
    };
    setSession(nextSession);
    setIsAuthenticated(true);
    centralSyncService.publish('SESSION_CHANGED', nextSession);
  }, []);

  const markAuthenticated = useCallback(() => {
    setIsAuthenticated((prev) => {
      if (!prev && session) {
        centralSyncService.publish('SESSION_CHANGED', session);
      }
      return true;
    });
  }, [session]);

  const logout = useCallback(() => {
    setSession(null);
    setIsAuthenticated(false);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors on logout
    }
    centralSyncService.publish('SESSION_CHANGED', null);
  }, []);

>>>>>>> 98e16bb (fixed speech-to-text and login workflow)
  const switchRole = useCallback((newRole: UserRole) => {
    const baseProfile = BASELINE_UNVERIFIED_SESSIONS[newRole] || {
      userId: `user-${newRole.toLowerCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      role: newRole,
      maskedIdentifier: `${newRole.charAt(0) + newRole.slice(1).toLowerCase()} #JH-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: 'Registered User',
      institutionOrOrg: 'Jharkhand State Node',
      institutionOrPanchayat: 'Jharkhand State Node',
      isVerified: false,
      activeProjectsCount: 0,
    };

    setSession(baseProfile);
    centralSyncService.publish('SESSION_CHANGED', baseProfile);
  }, []);

  // Authentic profile verification using salted SHA-256 passkey validation
  const verifyWithToken = useCallback(
    async (
<<<<<<< HEAD
      tokenCode: string,
      targetRole?: UserRole
    ): Promise<{ success: boolean; message: string; badge?: string }> => {
      const cleanToken = tokenCode.trim().toUpperCase();
      if (!cleanToken) {
        return { success: false, message: 'Please enter a valid credential authorization token.' };
      }

      // Identify target role either from parameter or from token analysis
      const detectedRole = targetRole || (await identifyRoleFromPasscode(cleanToken)) || session.role;
=======
      tokenCode: string
    ): Promise<{ success: boolean; message: string; badge?: string; role?: UserRole }> => {
      const cleanToken = tokenCode.trim().toUpperCase();
      const base = session ?? PRESET_USER_SESSIONS['CITIZEN'];

      // Check against official government verification keys
      const matchedKey = OFFICIAL_VERIFICATION_KEYS[cleanToken];
      if (matchedKey) {
        const updated: UserSession = {
          ...base,
          role: matchedKey.targetRole,
          fullName: `${matchedKey.sampleHolder} (${matchedKey.officialTitle})`,
          institutionOrPanchayat: matchedKey.issuingAuthority,
          isVerified: true,
          verificationBadge: matchedKey.badge,
        };

        setSession(updated);
        centralSyncService.publish('SESSION_CHANGED', updated);
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)

      // Verify passkey against salted SHA-256 database
      const isValid = await verifyRolePasscode(detectedRole, cleanToken);
      if (!isValid) {
        return {
<<<<<<< HEAD
          success: false,
          message: `Authorization key rejected. Invalid passkey for role: ${detectedRole.replace('_', ' ')}.`,
        };
      }

      // Generate tamper-resistant cryptographic session signature
      const verifiedAt = Date.now();
      const sessionSignature = await generateSessionSignature(detectedRole, verifiedAt);
      const metadata = ROLE_CREDENTIAL_METADATA[detectedRole];

      const updatedSession: UserSession = {
        ...session,
        userId: session.userId || `user-${detectedRole.toLowerCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
        role: detectedRole,
        isVerified: true,
        maskedIdentifier:
          session.role === detectedRole && session.maskedIdentifier
            ? session.maskedIdentifier
            : `${detectedRole.charAt(0) + detectedRole.slice(1).toLowerCase()} #${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: metadata ? `${metadata.sampleHolder} (${metadata.officialTitle})` : session.fullName,
        institutionOrOrg: metadata ? metadata.issuingAuthority : session.institutionOrOrg,
        institutionOrPanchayat: metadata ? metadata.issuingAuthority : session.institutionOrPanchayat,
        verifiedAt,
        sessionSignature,
        verificationBadge: metadata ? metadata.badge : 'OFFICIAL_ROLE_KEY_VALIDATED',
      };

      setSession(updatedSession);
      centralSyncService.publish('SESSION_CHANGED', updatedSession);
=======
          success: true,
          badge: matchedKey.badge,
          role: updated.role,
          message: `Credential Verified: Authenticated as ${matchedKey.officialTitle} (${matchedKey.issuingAuthority}).`,
        };
      }

      // Citizen Aadhaar WebOTP simulation (6 digits)
      if (/^\d{6}$/.test(cleanToken)) {
        const updated: UserSession = {
          ...base,
          role: 'CITIZEN',
          isVerified: true,
          verificationBadge: 'AADHAAR_WEBOTP_VERIFIED',
        };
        setSession(updated);
        centralSyncService.publish('SESSION_CHANGED', updated);
        return {
          success: true,
          badge: 'AADHAAR_WEBOTP_VERIFIED',
          role: updated.role,
          message: 'Citizen Mobile WebOTP Verified successfully via UIDAI Gateway simulation.',
        };
      }
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)

      return {
        success: true,
        badge: updatedSession.verificationBadge,
        message: `Credential Authenticated: Verified as ${metadata?.officialTitle || detectedRole} (${metadata?.issuingAuthority || 'Jharkhand Gov Gateway'}). Cryptographic session signature generated.`,
      };
    },
    [session]
  );

  const updateSession = useCallback(
    (partial: Partial<UserSession>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        centralSyncService.publish('SESSION_CHANGED', next);
        return next;
      });
    },
    []
  );

  const isAuthorized = useCallback(
    (allowedRoles: UserRole[]): boolean => {
<<<<<<< HEAD
      if (!session.isVerified || !session.sessionSignature) return false;
=======
      if (!session?.isVerified) return false;
>>>>>>> 98e16bb (fixed speech-to-text and login workflow)
      return allowedRoles.includes(session.role);
    },
    [session]
  );

  const openVerificationModal = useCallback(() => {
    setIsVerificationModalOpen(true);
  }, []);

  const closeVerificationModal = useCallback(() => {
    setIsVerificationModalOpen(false);
  }, []);

  const resetSessionToDefaults = useCallback(() => {
    const defaultCitizen = BASELINE_UNVERIFIED_SESSIONS['CITIZEN'];
    setSession(defaultCitizen);
    centralSyncService.publish('SESSION_CHANGED', defaultCitizen);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        isAuthenticated,
        isVerified: session?.isVerified ?? false,
        login,
        markAuthenticated,
        logout,
        switchRole,
        verifyWithToken,
        updateSession,
        isAuthorized,
        isVerificationModalOpen,
        openVerificationModal,
        closeVerificationModal,
        resetSessionToDefaults,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionContext;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Verified Session & Role-Based Access Control (RBAC) Context (Sprint 5 — Task 5.3)
 * 
 * Rectifies Bug 1 (Cosmetic profile verification & console role bypass):
 * - Tamper-resistant cryptographic session verification with sessionSignature
 * - Zero-trust verification against salted SHA-256 role passkeys
 * - Automatic session downgrade on localStorage tampering
 * - Cross-device and cross-tab multi-window synchronization
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
  session: UserSession;
  isVerified: boolean;
  switchRole: (role: UserRole) => void;
  verifyWithToken: (
    tokenCode: string,
    targetRole?: UserRole
  ) => Promise<{ success: boolean; message: string; badge?: string }>;
  updateSession: (partial: Partial<UserSession>) => void;
  isAuthorized: (allowedRoles: UserRole[]) => boolean;
  isVerificationModalOpen: boolean;
  openVerificationModal: () => void;
  closeVerificationModal: () => void;
  resetSessionToDefaults: () => void;
}

const STORAGE_KEY = 'udbhav_user_session';

const SessionContext = createContext<SessionContextType | undefined>(undefined);

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
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  // Subscribe to cross-tab session broadcasts via centralSyncService
  useEffect(() => {
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
        }
      }
    });
    return unsubscribe;
  }, []);

  // Switch stakeholder role (initially unverified until authentic passkey provided)
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
      tokenCode: string,
      targetRole?: UserRole
    ): Promise<{ success: boolean; message: string; badge?: string }> => {
      const cleanToken = tokenCode.trim().toUpperCase();
      if (!cleanToken) {
        return { success: false, message: 'Please enter a valid credential authorization token.' };
      }

      // Identify target role either from parameter or from token analysis
      const detectedRole = targetRole || (await identifyRoleFromPasscode(cleanToken)) || session.role;

      // Verify passkey against salted SHA-256 database
      const isValid = await verifyRolePasscode(detectedRole, cleanToken);
      if (!isValid) {
        return {
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
        const next = { ...prev, ...partial };
        centralSyncService.publish('SESSION_CHANGED', next);
        return next;
      });
    },
    []
  );

  const isAuthorized = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!session.isVerified || !session.sessionSignature) return false;
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
        isVerified: session.isVerified,
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

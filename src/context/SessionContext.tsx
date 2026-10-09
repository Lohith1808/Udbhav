/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Verified Session & Role-Based Access Control (RBAC) Context
 * 
 * Rectifies Bug 1 (No Profile Verification) & Bug 4 (Cross-Device/Tab Session Desync)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole } from '../types/ingestion';
import {
  UserSession,
  OFFICIAL_VERIFICATION_KEYS,
  PRESET_USER_SESSIONS,
} from '../types/session';
import { centralSyncService, SyncEventMessage } from '../services/centralSyncService';

interface SessionContextType {
  session: UserSession;
  isVerified: boolean;
  switchRole: (role: UserRole) => void;
  verifyWithToken: (tokenCode: string) => Promise<{ success: boolean; message: string; badge?: string }>;
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
  const [session, setSession] = useState<UserSession>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as UserSession;
          if (parsed && parsed.userId && parsed.role) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    // Default to Citizen persona as required by SIH blueprint
    return PRESET_USER_SESSIONS['CITIZEN'];
  });

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

  // Sync to localStorage on update
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  // Subscribe to cross-tab session broadcasts via centralSyncService
  useEffect(() => {
    const unsubscribe = centralSyncService.subscribe((msg: SyncEventMessage) => {
      if (msg.type === 'SESSION_CHANGED' && msg.payload) {
        const remoteSession = msg.payload as UserSession;
        if (remoteSession && remoteSession.userId) {
          setSession(remoteSession);
        }
      }
    });
    return unsubscribe;
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    const baseProfile = PRESET_USER_SESSIONS[newRole] || {
      userId: `user-${newRole.toLowerCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      role: newRole,
      maskedIdentifier: `${newRole.charAt(0) + newRole.slice(1).toLowerCase()} #JH-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: 'Registered User',
      institutionOrPanchayat: 'Jharkhand State Node',
      isVerified: true,
      activeProjectsCount: 0,
    };

    setSession(baseProfile);
    centralSyncService.publish('SESSION_CHANGED', baseProfile);
  }, []);

  const verifyWithToken = useCallback(
    async (
      tokenCode: string
    ): Promise<{ success: boolean; message: string; badge?: string }> => {
      const cleanToken = tokenCode.trim().toUpperCase();

      // Check against official government verification keys
      const matchedKey = OFFICIAL_VERIFICATION_KEYS[cleanToken];
      if (matchedKey) {
        const updated: UserSession = {
          ...session,
          role: matchedKey.targetRole,
          fullName: `${matchedKey.sampleHolder} (${matchedKey.officialTitle})`,
          institutionOrPanchayat: matchedKey.issuingAuthority,
          isVerified: true,
          verificationBadge: matchedKey.badge,
        };

        setSession(updated);
        centralSyncService.publish('SESSION_CHANGED', updated);

        return {
          success: true,
          badge: matchedKey.badge,
          message: `Credential Verified: Authenticated as ${matchedKey.officialTitle} (${matchedKey.issuingAuthority}).`,
        };
      }

      // Citizen Aadhaar WebOTP simulation (6 digits)
      if (/^\d{6}$/.test(cleanToken)) {
        const updated: UserSession = {
          ...session,
          role: 'CITIZEN',
          isVerified: true,
          verificationBadge: 'AADHAAR_WEBOTP_VERIFIED',
        };
        setSession(updated);
        centralSyncService.publish('SESSION_CHANGED', updated);
        return {
          success: true,
          badge: 'AADHAAR_WEBOTP_VERIFIED',
          message: 'Citizen Mobile WebOTP Verified successfully via UIDAI Gateway simulation.',
        };
      }

      return {
        success: false,
        message: 'Invalid authorization token or expired credential key.',
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
      if (!session.isVerified) return false;
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
    const defaultCitizen = PRESET_USER_SESSIONS['CITIZEN'];
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

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Verified Profile, Credential Validation & Cross-Device Sync Modal
 * 
 * Solves:
 * - Bug 1: Profile Verification & Official Government Credentials
 * - Bug 4: Cross-Device State Sync & Multi-Tab Synchronization
 */

import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { UserRole } from '../../types/ingestion';
import { OFFICIAL_VERIFICATION_KEYS, PRESET_USER_SESSIONS } from '../../types/session';
import { centralSyncService } from '../../services/centralSyncService';
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  RefreshCw,
  Check,
  X,
  Share2,
  Download,
  Upload,
  AlertCircle,
  Building2,
  Radio,
} from 'lucide-react';

export interface ProfileVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'hi' | 'en';
}

export const ProfileVerificationModal: React.FC<ProfileVerificationModalProps> = ({
  isOpen,
  onClose,
  language = 'en',
}) => {
  const { session, switchRole, verifyWithToken, isVerified } = useSession();
  const [tokenInput, setTokenInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'VERIFY' | 'SWITCH' | 'SYNC'>('VERIFY');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [snapshotJson, setSnapshotJson] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [pairingCode] = useState<string>(() => centralSyncService.generatePairingCode());

  if (!isOpen) return null;

  const handleVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) return;

    setFeedback(null);
    const result = await verifyWithToken(tokenInput.trim());
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTokenInput('');
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleApplyPresetKey = async (code: string) => {
    setTokenInput(code);
    const result = await verifyWithToken(code);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleExportSnapshot = async () => {
    try {
      setIsSyncing(true);
      const snapshot = await centralSyncService.exportCentralSnapshot();
      const serialized = JSON.stringify(snapshot, null, 2);
      setSnapshotJson(serialized);
      await navigator.clipboard.writeText(serialized);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      setFeedback({
        type: 'success',
        message: 'Database snapshot exported and copied to clipboard successfully!',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Failed to export snapshot to clipboard.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportSnapshot = async () => {
    if (!snapshotJson.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please paste a valid JSON snapshot into the text area.',
      });
      return;
    }
    try {
      setIsSyncing(true);
      const parsed = JSON.parse(snapshotJson);
      const res = await centralSyncService.importCentralSnapshot(parsed);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Invalid JSON format. Please verify the snapshot syntax.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerCrossTabSync = () => {
    centralSyncService.publish('DATABASE_FULL_SYNC', { timestamp: Date.now() });
    setFeedback({
      type: 'success',
      message: 'Cross-tab broadcast dispatched. All open tabs synchronized!',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xs"
    >
      <div className="relative w-full max-w-2xl bg-white border-2 border-[#0F2537] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header Strip */}
        <div className="bg-[#0F2537] text-white px-5 py-3.5 flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-bold">
                NIC / DHTE JHARKHAND SECURE IDENTITY GATE
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                {language === 'hi'
                  ? 'सत्यापित प्रोफ़ाइल व केंद्रीय सिंक गेटवे'
                  : 'Verified Session & Central Sync Gateway'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Verified Profile Banner */}
        <div className="bg-[#F8FAFC] border-b border-slate-300 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0F2537] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-amber-400/50">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{session.fullName}</span>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 px-1.5 py-0.2 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-700" />
                  <span>{session.verificationBadge || 'VERIFIED'}</span>
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono flex items-center gap-2 mt-0.5">
                <span className="font-bold text-[#7A1B1B]">{session.maskedIdentifier}</span>
                <span>&bull;</span>
                <span>{session.institutionOrPanchayat}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Active Authority Role</div>
            <span className="bg-[#7A1B1B] text-white px-2 py-0.5 text-xs font-black uppercase tracking-wider inline-block mt-0.5">
              {session.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-300 bg-slate-100 px-5 pt-2 gap-2 text-xs font-black uppercase">
          <button
            type="button"
            onClick={() => {
              setActiveTab('VERIFY');
              setFeedback(null);
            }}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'VERIFY'
                ? 'border-[#7A1B1B] text-[#7A1B1B] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'प्रमाणपत्र सत्यापन' : 'Credential Token'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SWITCH');
              setFeedback(null);
            }}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'SWITCH'
                ? 'border-[#7A1B1B] text-[#7A1B1B] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'भूमिका बदलें' : 'Switch Persona'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SYNC');
              setFeedback(null);
            }}
            className={`px-3 py-2 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'SYNC'
                ? 'border-[#7A1B1B] text-[#7A1B1B] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'केंद्रीय सिंक (Bug 4 Fix)' : 'Cross-Device Sync'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-3 p-2.5 text-xs font-semibold flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
                : 'bg-red-50 text-red-900 border-red-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: Token Credential Verification */}
        {activeTab === 'VERIFY' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  {language === 'hi'
                    ? 'आधिकारिक सत्यापन कुंजी दर्ज करें'
                    : 'Enter Official Government Authorization Key / Passkey'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="e.g. JH-PANCHAYAT-SEC-2026 or 6-digit OTP"
                    className="flex-1 px-3 py-2 border border-slate-300 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[#0F2537]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F2537] hover:bg-[#1a3a54] text-white font-bold text-xs uppercase cursor-pointer"
                  >
                    {language === 'hi' ? 'सत्यापित करें' : 'Verify Key'}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Demo Preset Keys for SIH Jury Defense */}
            <div className="border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="text-[11px] font-black uppercase text-slate-700 flex items-center justify-between">
                <span>Recognized Official Keys (1-Tap Simulation):</span>
                <span className="text-[10px] text-amber-700 font-mono font-bold">SIH PS-26043 VALIDATED</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {Object.values(OFFICIAL_VERIFICATION_KEYS).map((k) => (
                  <button
                    key={k.code}
                    type="button"
                    onClick={() => handleApplyPresetKey(k.code)}
                    className="text-left p-2 border border-slate-300 bg-white hover:border-[#7A1B1B] hover:bg-red-50/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#7A1B1B] font-mono group-hover:underline">
                        {k.code}
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-700 px-1 font-mono font-bold">
                        {k.targetRole}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 truncate mt-0.5">{k.officialTitle}</div>
                    <div className="text-[9px] text-slate-400 truncate">{k.issuingAuthority}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Switch Persona */}
        {activeTab === 'SWITCH' && (
          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            <div className="text-xs text-slate-600">
              Select one of the 5 Core Quadruple-Helix Personas to simulate that stakeholder's dashboard:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(PRESET_USER_SESSIONS) as UserRole[]).map((r) => {
                const profile = PRESET_USER_SESSIONS[r];
                const isCurrent = session.role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      switchRole(r);
                      setFeedback({
                        type: 'success',
                        message: `Switched session to ${profile.fullName} (${r}).`,
                      });
                    }}
                    className={`text-left p-3 border transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-2 border-[#7A1B1B] bg-red-50/50 shadow-xs'
                        : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{profile.fullName}</span>
                      {isCurrent && (
                        <span className="bg-[#7A1B1B] text-white text-[9px] font-bold px-1.5 py-0.2">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#7A1B1B] font-mono font-bold mt-0.5">
                      {profile.maskedIdentifier}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {profile.institutionOrPanchayat}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Cross-Device State Sync (Bug 4 Resolution) */}
        {activeTab === 'SYNC' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="p-3 bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
              <Radio className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold">Real-time Cross-Device &amp; Cross-Tab Synchronization:</span>
                <span className="ml-1">
                  Open multiple browser windows or mobile devices. State changes (endorsements, grants, teams)
                  synchronize via BroadcastChannel and storage replication.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Device Pairing Code</div>
                <div className="text-base font-black font-mono text-[#0F2537]">{pairingCode}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerCrossTabSync}
                  className="px-3 py-1.5 bg-[#0F2537] hover:bg-[#1a3a54] text-white text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Broadcast Sync</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportSnapshot}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-[#7A1B1B] hover:bg-[#912020] text-white text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Snapshot!' : 'Export & Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                Database JSON Snapshot (Import / Export):
              </label>
              <textarea
                value={snapshotJson}
                onChange={(e) => setSnapshotJson(e.target.value)}
                rows={4}
                placeholder="Paste database JSON snapshot here to replicate records across devices..."
                className="w-full p-2.5 font-mono text-[11px] border border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#0F2537]"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleImportSnapshot}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import &amp; Merge Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            STATUS: {isVerified ? 'VERIFIED_SESSION' : 'GUEST_UNVERIFIED'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0F2537] text-white font-bold uppercase cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

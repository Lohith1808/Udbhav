/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 4 — Task 4.5: Escrow Tranches & Two-Tier Safety Multi-Party Locks
 * 
 * Hardened Multi-Role Escrow Disbursement & Sign-Off Gate:
 * - Tranche 1 (30% BOM): Strictly locked to verified FACULTY_MENTOR.
 * - Tranche 2 (40% Lab Telemetry): Strictly locked to verified FACULTY_MENTOR with mandatory deliverable telemetry URL.
 * - Tranche 3 (30% Field Handover): Sequential Dual-Sign-Off:
 *     * Step A: Faculty Mentor sign-off.
 *     * Step B: Panchayat Secretary / BDO sign-off confirming community deployment.
 *     * Release button remains STRICTLY DISABLED until BOTH signatures are registered.
 * - Central Sync Broadcast:
 *     * Dispatches 'TRANCHE_DISBURSED' and 'RECORD_UPDATED' via centralSyncService.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ExternalLink,
  Building,
  GraduationCap,
  FileCheck2,
  Coins,
  Send,
  Lock,
  UserCheck,
  Check,
} from 'lucide-react';
import { EscrowGrant, MilestoneTranche, TrancheStage } from '../../../types/governance';
import { updateTrancheStatus, getEscrowGrantById } from '../../../lib/db';
import { useSession } from '../../../context/SessionContext';
import { centralSyncService } from '../../../services/centralSyncService';

export interface TrancheReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  grant: EscrowGrant;
  targetTranche: MilestoneTranche;
  userRole?: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'PANCHAYAT_OFFICER';
  onTrancheUpdated: () => void;
  language?: 'en' | 'hi';
}

const STAGE_LABELS: Record<TrancheStage, { title: string; subtitle: string; targetRole: string }> = {
  TRANCHE_1_BOM: {
    title: 'Tranche 1: Architecture & BOM Procurement',
    subtitle: '30% Release • Bill-of-Materials verification under ₹2,500 budget limit',
    targetRole: 'Faculty Mentor (Verified)',
  },
  TRANCHE_2_LAB: {
    title: 'Tranche 2: Lab Bench Prototype & Telemetry',
    subtitle: '40% Release • Laboratory testing & sensor telemetry benchmark sign-off',
    targetRole: 'Faculty Mentor (Verified) + Telemetry URL',
  },
  TRANCHE_3_FIELD: {
    title: 'Tranche 3: Field Deployment & Panchayat Handover',
    subtitle: '30% Release • On-site Gram Sabha installation & Dual-Signature Gate',
    targetRole: 'Faculty Mentor + Panchayat Secretary / BDO (Dual)',
  },
};

export const TrancheReleaseModal: React.FC<TrancheReleaseModalProps> = ({
  isOpen,
  onClose,
  grant,
  targetTranche: initialTranche,
  onTrancheUpdated,
  language = 'en',
}) => {
  const { session, switchRole, openVerificationModal } = useSession();

  // Local state for active tranche to reflect live multi-party sign-offs
  const [currentTranche, setCurrentTranche] = useState<MilestoneTranche>(initialTranche);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Tranche 2 telemetry proof URL state
  const [telemetryUrl, setTelemetryUrl] = useState<string>(
    initialTranche.deliverableProofUrl ||
      'https://udbhav.jharkhand.gov.in/proofs/bit-sindri-lab-telemetry.pdf'
  );

  // Industry CSR dispute state
  const [disputeNote, setDisputeNote] = useState<string>('');
  const [showDisputeInput, setShowDisputeInput] = useState<boolean>(false);

  // Keep local tranche in sync with prop updates
  useEffect(() => {
    setCurrentTranche(initialTranche);
    if (initialTranche.deliverableProofUrl) {
      setTelemetryUrl(initialTranche.deliverableProofUrl);
    }
  }, [initialTranche]);

  if (!isOpen) return null;

  // RBAC Capability Evaluation via verified SessionContext
  const isVerified = session.isVerified;
  const isFaculty = session.role === 'FACULTY_MENTOR' && isVerified;
  const isPanchayat = session.role === 'PANCHAYAT_OFFICER' && isVerified;
  const isPanchayatOrGovt = (session.role === 'PANCHAYAT_OFFICER' || session.role === 'GOVT_ADMIN') && isVerified;
  const isCSR = session.role === 'INDUSTRY_CSR' && isVerified;

  const stageInfo = STAGE_LABELS[currentTranche.stage];
  const isDisbursed = currentTranche.status === 'DISBURSED';
  const isDisputed = currentTranche.status === 'DISPUTED';

  // Tranche 3 Dual Sign-Off Evaluation
  const hasFacultySignoff = Boolean(currentTranche.facultySignoffAt);
  const hasPanchayatSignoff = Boolean(currentTranche.panchayatSignoffAt || currentTranche.govtSignoffAt);
  const hasDualSignoffs = hasFacultySignoff && hasPanchayatSignoff;

  // Helper to refresh tranche from DB
  const refreshTrancheData = async () => {
    try {
      const refreshedGrant = await getEscrowGrantById(grant.id);
      if (refreshedGrant) {
        const found = refreshedGrant.tranches.find((t) => t.stage === currentTranche.stage);
        if (found) {
          setCurrentTranche(found);
        }
      }
    } catch {
      // Ignore refresh error
    }
  };

  // ---------------------------------------------------------------------------
  // TRANCHE 1: Faculty Mentor BOM Release (30%)
  // ---------------------------------------------------------------------------
  const handleApproveTranche1 = async () => {
    if (!isFaculty) {
      setErrorMessage(
        'PANEL RESTRICTED: Tranche 1 (BOM) strictly requires verified University Faculty Mentor credentials.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const signatory = `${session.fullName} (${session.maskedIdentifier})`;
      await updateTrancheStatus(
        grant.id,
        'TRANCHE_1_BOM',
        'DISBURSED',
        'FACULTY',
        undefined,
        signatory
      );

      // Central Sync Broadcast
      centralSyncService.publish('TRANCHE_DISBURSED', {
        grantId: grant.id,
        stage: 'TRANCHE_1_BOM',
        amountINR: currentTranche.amountINR,
        disbursedTo: grant.teamId,
        signatory,
        timestamp: Date.now(),
      });
      centralSyncService.publish('RECORD_UPDATED', {
        type: 'escrow_grant',
        id: grant.id,
        stage: 'TRANCHE_1_BOM',
      });

      // Dispatch native toast notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? 'किस्त 1 (बीओएम): संकाय संरक्षक द्वारा स्वीकृत और जारी!'
                  : `Tranche 1 (₹${currentTranche.amountINR.toLocaleString('en-IN')}) verified & disbursed by Faculty Mentor!`,
              type: 'success',
            },
          })
        );
      }

      setSuccessNotice('Tranche 1 (BOM) disbursed successfully to hardware roster!');
      await refreshTrancheData();
      onTrancheUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disburse Tranche 1.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TRANCHE 2: Faculty Mentor Lab Demonstration (40%) with Telemetry URL Check
  // ---------------------------------------------------------------------------
  const handleApproveTranche2 = async () => {
    if (!isFaculty) {
      setErrorMessage(
        'PANEL RESTRICTED: Tranche 2 (Lab Bench) strictly requires verified University Faculty Mentor credentials.'
      );
      return;
    }

    if (!telemetryUrl.trim()) {
      setErrorMessage(
        'Mandatory Deliverable Missing: A verified laboratory telemetry test report URL is strictly required before sign-off.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const signatory = `${session.fullName} (${session.maskedIdentifier})`;
      await updateTrancheStatus(
        grant.id,
        'TRANCHE_2_LAB',
        'DISBURSED',
        'FACULTY',
        undefined,
        signatory,
        telemetryUrl.trim()
      );

      // Central Sync Broadcast
      centralSyncService.publish('TRANCHE_DISBURSED', {
        grantId: grant.id,
        stage: 'TRANCHE_2_LAB',
        amountINR: currentTranche.amountINR,
        disbursedTo: grant.teamId,
        deliverableProofUrl: telemetryUrl.trim(),
        signatory,
        timestamp: Date.now(),
      });
      centralSyncService.publish('RECORD_UPDATED', {
        type: 'escrow_grant',
        id: grant.id,
        stage: 'TRANCHE_2_LAB',
      });

      // Dispatch native toast notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? 'किस्त 2 (प्रयोगशाला टेलीमेट्री): संकाय संरक्षक द्वारा अनुमोदित और जारी!'
                  : `Tranche 2 (₹${currentTranche.amountINR.toLocaleString('en-IN')}) validated with telemetry URL and disbursed!`,
              type: 'success',
            },
          })
        );
      }

      setSuccessNotice('Tranche 2 (Lab Bench Prototype) disbursed successfully with telemetry URL!');
      await refreshTrancheData();
      onTrancheUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disburse Tranche 2.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TRANCHE 3: Step A — Faculty Supervisor Sign-Off
  // ---------------------------------------------------------------------------
  const handleSignTranche3Faculty = async () => {
    if (!isFaculty) {
      setErrorMessage(
        'PANEL RESTRICTED: Step A sign-off requires verified University Faculty Mentor credentials.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const signatory = `${session.fullName} (${session.maskedIdentifier})`;
      await updateTrancheStatus(
        grant.id,
        'TRANCHE_3_FIELD',
        'LOCKED', // Keeps locked until Step B completes
        'FACULTY',
        undefined,
        signatory
      );

      centralSyncService.publish('RECORD_UPDATED', {
        type: 'escrow_grant',
        id: grant.id,
        stage: 'TRANCHE_3_FIELD',
        step: 'FACULTY_SIGNED',
        signatory,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? 'चरण 1/2: संकाय पर्यवेक्षक हस्ताक्षर दर्ज! पंचायत सचिव सत्यापन प्रतीक्षित।'
                  : 'Step 1 of 2: Faculty Supervisor sign-off recorded! Awaiting Panchayat Secretary / BDO sign-off.',
              type: 'info',
            },
          })
        );
      }

      setSuccessNotice('Step A (Faculty Supervisor) signed successfully. Awaiting Step B (Panchayat / BDO).');
      await refreshTrancheData();
      onTrancheUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register Faculty sign-off for Tranche 3.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TRANCHE 3: Step B — Panchayat Secretary / BDO Sign-Off
  // ---------------------------------------------------------------------------
  const handleSignTranche3Panchayat = async () => {
    if (!isPanchayatOrGovt) {
      setErrorMessage(
        'PANEL RESTRICTED: Step B sign-off requires verified Panchayat Secretary or District BDO credentials.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const signatory = `${session.fullName} (${session.maskedIdentifier})`;
      await updateTrancheStatus(
        grant.id,
        'TRANCHE_3_FIELD',
        'LOCKED', // Keeps locked until release button triggers disbursement
        isPanchayat ? 'PANCHAYAT' : 'GOVT',
        undefined,
        signatory
      );

      centralSyncService.publish('RECORD_UPDATED', {
        type: 'escrow_grant',
        id: grant.id,
        stage: 'TRANCHE_3_FIELD',
        step: 'PANCHAYAT_SIGNED',
        signatory,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? 'चरण 2/2: पंचायत सचिव/बीडीओ सत्यापन दर्ज! द्विपक्षीय गेट खुला।'
                  : 'Step 2 of 2: Panchayat Secretary / BDO community deployment sign-off recorded!',
              type: 'info',
            },
          })
        );
      }

      setSuccessNotice('Step B (Panchayat / BDO) signed successfully. Dual locks cleared!');
      await refreshTrancheData();
      onTrancheUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register Panchayat sign-off for Tranche 3.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TRANCHE 3: Master Release Action (Strictly disabled until BOTH Step A & B signed)
  // ---------------------------------------------------------------------------
  const handleDisburseTranche3 = async () => {
    if (!hasDualSignoffs) {
      setErrorMessage(
        'Guardrail Violation: Tranche 3 disbursement is strictly locked until BOTH Faculty Mentor and Panchayat Secretary / BDO sign-offs are stamped.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const signatory = `${session.fullName} (${session.maskedIdentifier})`;
      await updateTrancheStatus(
        grant.id,
        'TRANCHE_3_FIELD',
        'DISBURSED',
        isFaculty ? 'FACULTY' : 'GOVT',
        undefined,
        signatory
      );

      // Central Sync Broadcast
      centralSyncService.publish('TRANCHE_DISBURSED', {
        grantId: grant.id,
        stage: 'TRANCHE_3_FIELD',
        amountINR: currentTranche.amountINR,
        disbursedTo: grant.teamId,
        facultySignoffBy: currentTranche.facultySignoffBy,
        panchayatSignoffBy: currentTranche.panchayatSignoffBy || currentTranche.govtSignoffBy,
        signatory,
        timestamp: Date.now(),
      });
      centralSyncService.publish('RECORD_UPDATED', {
        type: 'escrow_grant',
        id: grant.id,
        stage: 'TRANCHE_3_FIELD',
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('udbhav:toast', {
            detail: {
              text:
                language === 'hi'
                  ? 'किस्त 3 (क्षेत्र परिनियोजन): द्विपक्षीय अनुमोदन पूर्ण! ₹ राशि जारी!'
                  : `Tranche 3 (₹${currentTranche.amountINR.toLocaleString('en-IN')}) successfully disbursed upon Dual Sign-off!`,
              type: 'success',
            },
          })
        );
      }

      setSuccessNotice('Tranche 3 (Field Deployment) disbursed successfully upon dual verification!');
      await refreshTrancheData();
      onTrancheUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release Tranche 3 funds.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CSR Sponsor Dispute Flagging
  // ---------------------------------------------------------------------------
  const handleFlagDispute = async () => {
    if (!disputeNote.trim()) {
      setErrorMessage('A detailed statutory objection note is required to flag an audit dispute.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updateTrancheStatus(
        grant.id,
        currentTranche.stage,
        'DISPUTED',
        'INDUSTRY_CSR',
        disputeNote.trim(),
        `${session.fullName} (${session.maskedIdentifier})`
      );

      centralSyncService.publish('RECORD_UPDATED', {
        type: 'escrow_grant',
        id: grant.id,
        stage: currentTranche.stage,
        status: 'DISPUTED',
        reason: disputeNote.trim(),
      });

      setSuccessNotice('Statutory audit dispute registered on central ledger.');
      await refreshTrancheData();
      onTrancheUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to flag dispute.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border-2 border-[#7A1B1B] max-w-2xl w-full my-auto shadow-2xl flex flex-col max-h-[92vh]">
        {/* ==================================================================== */}
        {/* HEADER: GIGW 3.0 SARKARI MASTHEAD */}
        {/* ==================================================================== */}
        <div className="bg-[#0B2545] text-white p-4 border-b-4 border-[#F8E7A2] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-[#7A1B1B] text-[#F8E7A2] text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                SHOE 4 &bull; CSR ESCROW DISBURSEMENT GATE
              </span>
              <span className="font-mono text-[11px] text-[#F8E7A2]">
                {grant.sponsorName}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{stageInfo.title}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">{stageInfo.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
            aria-label="Close Tranche Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================================================================== */}
        {/* SUB-HEADER: AMOUNT & CURRENT STATUS BADGE */}
        {/* ==================================================================== */}
        <div className="bg-slate-50 border-b border-slate-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Tranche Value
              </span>
              <span className="text-lg font-black font-mono text-[#0B2545]">
                ₹{currentTranche.amountINR.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-500 ml-1">
                ({currentTranche.percentage}% of ₹{grant.totalCommittedINR.toLocaleString('en-IN')})
              </span>
            </div>
          </div>

          {/* Current Status Pill */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Escrow State:</span>
            {isDisbursed ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Disbursed to Hardware Roster</span>
              </span>
            ) : isDisputed ? (
              <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                <span>Disputed / Audit Hold</span>
              </span>
            ) : currentTranche.status === 'APPROVED' ? (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Approved &bull; Release Imminent</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Locked in Escrow</span>
              </span>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* ACTIVE SESSION STATUS & PERSONA SWITCHER QUICK BAR */}
        {/* ==================================================================== */}
        <div className="bg-[#0F2537] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-700">
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-[#F8E7A2]" />
            <span className="text-slate-300">Signed in as:</span>
            <strong className="text-white font-medium">{session.fullName}</strong>
            <span className="bg-slate-700 text-slate-200 text-[10px] font-mono px-1.5 py-0.2">
              {session.role}
            </span>
            {session.isVerified ? (
              <span className="bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-black px-1.5 py-0.2 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                <span>VERIFIED</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={openVerificationModal}
                className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 transition-colors cursor-pointer"
              >
                Verify Profile
              </button>
            )}
          </div>

          {/* Quick Persona Switcher for Jury Testing */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 text-[10px] hidden sm:inline">Simulate Persona:</span>
            <button
              type="button"
              onClick={() => switchRole('FACULTY_MENTOR')}
              className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                session.role === 'FACULTY_MENTOR'
                  ? 'bg-[#F8E7A2] text-[#0B2545]'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Faculty
            </button>
            <button
              type="button"
              onClick={() => switchRole('PANCHAYAT_OFFICER')}
              className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                session.role === 'PANCHAYAT_OFFICER'
                  ? 'bg-[#F8E7A2] text-[#0B2545]'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Panchayat
            </button>
            <button
              type="button"
              onClick={() => switchRole('GOVT_ADMIN')}
              className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                session.role === 'GOVT_ADMIN'
                  ? 'bg-[#F8E7A2] text-[#0B2545]'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              BDO / Govt
            </button>
            <button
              type="button"
              onClick={() => switchRole('INDUSTRY_CSR')}
              className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                session.role === 'INDUSTRY_CSR'
                  ? 'bg-[#F8E7A2] text-[#0B2545]'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              CSR
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* BODY */}
        {/* ==================================================================== */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Statutory Objections or Error Notifications */}
          {errorMessage && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-100 border border-emerald-400 text-emerald-950 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {isDisputed && currentTranche.rejectionReason && (
            <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Corporate Sponsor Audit Objection on Record:</span>
              </div>
              <p className="italic text-slate-800 bg-white p-2 border border-red-200">
                "{currentTranche.rejectionReason}"
              </p>
            </div>
          )}

          {/* Section 1: Challenge & Statutory Sponsor Context */}
          <div className="bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#0B2545]">
                Master Challenge Token:{' '}
                <strong className="font-mono text-[#7A1B1B]">{grant.masterIssueId}</strong>
              </span>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold">
                Assigned Team: {grant.teamId}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
              <span>
                MCA Category: <strong>{grant.mcaScheduleVIICategory.replace(/_/g, ' ')}</strong>
              </span>
              <span>&bull;</span>
              <span>
                SDG Goal: <strong className="text-emerald-800">Goal {grant.sdgGoalNumber}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Required Authority: <strong className="text-[#0B2545]">{stageInfo.targetRole}</strong>
              </span>
            </div>
          </div>

          {/* Section 2: Deliverable Specification & Telemetry Proof */}
          <div className="border border-slate-300 p-3.5 space-y-2.5">
            <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wide flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#2A6F86]" />
              <span>Milestone Deliverable Specification</span>
            </h4>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
              {currentTranche.deliverableDescription}
            </p>

            {/* Tranche 2 Mandatory Telemetry URL Input */}
            {currentTranche.stage === 'TRANCHE_2_LAB' && !isDisbursed && (
              <div className="bg-blue-50/60 border border-blue-200 p-3 space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-[#0B2545]">
                  Mandatory Laboratory Telemetry Report URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={telemetryUrl}
                    onChange={(e) => setTelemetryUrl(e.target.value)}
                    placeholder="https://udbhav.jharkhand.gov.in/proofs/lab-telemetry.pdf"
                    className="flex-1 p-2 text-xs border border-slate-300 bg-white font-mono focus:border-[#0B2545] focus:outline-none"
                  />
                  {telemetryUrl && (
                    <a
                      href={telemetryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-2 bg-white hover:bg-slate-100 text-[#2A6F86] border border-slate-300 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Mandated by DHTE safety protocol: Faculty sign-off requires verified lab telemetry link.
                </span>
              </div>
            )}

            {/* Tranche 1 or 3 Proof Link Inspection */}
            {currentTranche.stage !== 'TRANCHE_2_LAB' && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-600 font-semibold">Verification Proof Asset:</span>
                {currentTranche.deliverableProofUrl ? (
                  <a
                    href={currentTranche.deliverableProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#2A6F86] border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Inspect Audit File</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-amber-800 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 border border-amber-200">
                    Pending Deployment Artifact
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ================================================================== */}
          {/* Section 3: STAGE-SPECIFIC SIGN-OFF & RELEASE CONTROLS */}
          {/* ================================================================== */}
          <div className="border border-slate-300 p-3.5 space-y-3">
            <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Multi-Party Sign-Off Governance</span>
            </h4>

            {/* ================================================================ */}
            {/* STAGE 1: BOM PROCUREMENT SIGN-OFF (FACULTY MENTOR) */}
            {/* ================================================================ */}
            {currentTranche.stage === 'TRANCHE_1_BOM' && (
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#7A1B1B]" />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        University Faculty Supervisor Verification
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Accredited HEI Mentor Sign-off (BOM limit validation &lt;= ₹2,500)
                      </span>
                    </div>
                  </div>

                  {currentTranche.facultySignoffAt ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>
                        Signed {new Date(currentTranche.facultySignoffAt).toLocaleDateString()}
                      </span>
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>Pending Faculty Review</span>
                    </span>
                  )}
                </div>

                {/* If signed, show signatory */}
                {currentTranche.facultySignoffBy && (
                  <div className="text-[11px] text-slate-600 bg-slate-100 px-3 py-1.5 border border-slate-200">
                    Signatory on Record:{' '}
                    <strong className="text-[#0B2545]">{currentTranche.facultySignoffBy}</strong>
                  </div>
                )}

                {/* RBAC Restriction Alert if not verified faculty */}
                {!isDisbursed && !isFaculty && (
                  <div className="bg-amber-50 border-l-4 border-amber-600 p-3 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>PANEL RESTRICTED: Requires Verified Faculty Mentor Credentials</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Tranche 1 BOM release is strictly guarded and can only be authorized by an
                      accredited University Faculty Mentor. Your active persona is{' '}
                      <strong>{session.role}</strong> ({session.isVerified ? 'Verified' : 'Unverified'}).
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => switchRole('FACULTY_MENTOR')}
                        className="px-2.5 py-1 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-[10px] font-bold uppercase transition-colors cursor-pointer"
                      >
                        Switch to Faculty Mentor Persona
                      </button>
                      {!session.isVerified && (
                        <button
                          type="button"
                          onClick={openVerificationModal}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          Verify Current Session
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button for verified Faculty */}
                {!isDisbursed && isFaculty && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleApproveTranche1}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Sign &amp; Disburse Tranche 1 (₹
                      {currentTranche.amountINR.toLocaleString('en-IN')})
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* STAGE 2: LAB BENCH TELEMETRY SIGN-OFF (FACULTY MENTOR) */}
            {/* ================================================================ */}
            {currentTranche.stage === 'TRANCHE_2_LAB' && (
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#7A1B1B]" />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Lab Prototype &amp; Telemetry Sign-Off
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Requires verified laboratory testing metrics and active telemetry dossier URL
                      </span>
                    </div>
                  </div>

                  {currentTranche.facultySignoffAt ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>
                        Signed {new Date(currentTranche.facultySignoffAt).toLocaleDateString()}
                      </span>
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>Pending Telemetry Review</span>
                    </span>
                  )}
                </div>

                {currentTranche.facultySignoffBy && (
                  <div className="text-[11px] text-slate-600 bg-slate-100 px-3 py-1.5 border border-slate-200">
                    Signatory on Record:{' '}
                    <strong className="text-[#0B2545]">{currentTranche.facultySignoffBy}</strong>
                  </div>
                )}

                {/* RBAC Restriction Alert if not verified faculty */}
                {!isDisbursed && !isFaculty && (
                  <div className="bg-amber-50 border-l-4 border-amber-600 p-3 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>PANEL RESTRICTED: Requires Verified Faculty Mentor Credentials</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Tranche 2 Lab release requires accredited Faculty Mentor approval with
                      verified telemetry test data.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => switchRole('FACULTY_MENTOR')}
                        className="px-2.5 py-1 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-[10px] font-bold uppercase transition-colors cursor-pointer"
                      >
                        Switch to Faculty Mentor
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Button for verified Faculty */}
                {!isDisbursed && isFaculty && (
                  <button
                    type="button"
                    disabled={isSubmitting || !telemetryUrl.trim()}
                    onClick={handleApproveTranche2}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Validate Telemetry &amp; Disburse Tranche 2 (₹
                      {currentTranche.amountINR.toLocaleString('en-IN')})
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* STAGE 3: DUAL-SIGNATURE GATE (FACULTY + PANCHAYAT SECRETARY / BDO) */}
            {/* ================================================================ */}
            {currentTranche.stage === 'TRANCHE_3_FIELD' && (
              <div className="space-y-3">
                {/* Dual-Lock Status Banner */}
                <div
                  className={`p-3 border text-xs space-y-1.5 ${
                    hasDualSignoffs
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : hasFacultySignoff || hasPanchayatSignoff
                      ? 'bg-blue-50 border-blue-400 text-blue-950'
                      : 'bg-amber-50 border-amber-400 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-black uppercase">
                    <span className="flex items-center gap-1.5">
                      {hasDualSignoffs ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Lock className="w-4 h-4 text-amber-700" />
                      )}
                      <span>Dual-Signature Regulatory Protocol</span>
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-white border border-slate-300">
                      {hasDualSignoffs ? '2 / 2 SIGNED' : hasFacultySignoff || hasPanchayatSignoff ? '1 / 2 SIGNED' : '0 / 2 SIGNED'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {hasDualSignoffs
                      ? 'Dual Gate Cleared: Both Faculty Mentor and Panchayat Secretary/BDO signatures are stamped on the decentralized ledger. Funds are unlocked for release.'
                      : hasFacultySignoff
                      ? 'Partial Clearance: Faculty sign-off stamped. Awaiting Panchayat Secretary / BDO field deployment confirmation.'
                      : hasPanchayatSignoff
                      ? 'Partial Clearance: Panchayat confirmation stamped. Awaiting University Faculty Mentor academic clearance.'
                      : 'Dual-Lock Enforced: Release button remains strictly disabled until BOTH Faculty Mentor and Panchayat Secretary / BDO sign-offs are registered.'}
                  </p>
                </div>

                {/* 2-Column Sequential Sign-Off Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Step A: Faculty Supervisor */}
                  <div className="bg-slate-50 p-3 border-2 border-slate-300 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#0B2545] flex items-center gap-1">
                          <GraduationCap className="w-4 h-4 text-[#7A1B1B]" />
                          <span>Step A: Faculty Supervisor</span>
                        </span>
                        {hasFacultySignoff ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Verifies structural integrity and student capstone completion.
                      </p>
                      {currentTranche.facultySignoffBy && (
                        <p className="text-[10px] font-mono text-emerald-800 mt-1">
                          Signed by: {currentTranche.facultySignoffBy}
                        </p>
                      )}
                    </div>

                    {!hasFacultySignoff && !isDisbursed && (
                      <div>
                        {isFaculty ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSignTranche3Faculty}
                            className="w-full py-1.5 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-[11px] font-bold uppercase transition-colors cursor-pointer shadow-2xs"
                          >
                            Sign as Faculty Supervisor
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchRole('FACULTY_MENTOR')}
                            className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            Switch to Faculty to Sign
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step B: Panchayat Secretary / District BDO */}
                  <div className="bg-slate-50 p-3 border-2 border-slate-300 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#0B2545] flex items-center gap-1">
                          <Building className="w-4 h-4 text-[#1E6F50]" />
                          <span>Step B: Panchayat / BDO</span>
                        </span>
                        {hasPanchayatSignoff ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Confirms verified community deployment and citizen receipt.
                      </p>
                      {(currentTranche.panchayatSignoffBy || currentTranche.govtSignoffBy) && (
                        <p className="text-[10px] font-mono text-emerald-800 mt-1">
                          Signed by:{' '}
                          {currentTranche.panchayatSignoffBy || currentTranche.govtSignoffBy}
                        </p>
                      )}
                    </div>

                    {!hasPanchayatSignoff && !isDisbursed && (
                      <div>
                        {isPanchayatOrGovt ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSignTranche3Panchayat}
                            className="w-full py-1.5 bg-[#1E6F50] hover:bg-[#16563e] text-white text-[11px] font-bold uppercase transition-colors cursor-pointer shadow-2xs"
                          >
                            Sign as Panchayat / BDO
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchRole('PANCHAYAT_OFFICER')}
                            className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            Switch to Panchayat to Sign
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Master Release Button (Disabled until BOTH Step A & Step B are signed) */}
                {!isDisbursed && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting || !hasDualSignoffs}
                      onClick={handleDisburseTranche3}
                      className={`w-full py-2.5 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs ${
                        hasDualSignoffs
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer ring-2 ring-emerald-400'
                          : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                      }`}
                      title={
                        !hasDualSignoffs
                          ? 'Disabled: Requires both Faculty and Panchayat/BDO signatures'
                          : 'Execute Tranche 3 Escrow Release'
                      }
                    >
                      {hasDualSignoffs ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>
                            Authorize &amp; Disburse Tranche 3 (₹
                            {currentTranche.amountINR.toLocaleString('en-IN')})
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>
                            Tranche 3 Locked (Awaiting {hasFacultySignoff ? 'Panchayat' : hasPanchayatSignoff ? 'Faculty' : 'Dual'} Sign-off)
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* INDUSTRY CSR DISPUTE / AUDIT CONTROLS */}
            {/* ================================================================ */}
            {isCSR && !isDisbursed && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Sponsor Compliance &amp; Audit Oversight
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDisputeInput(!showDisputeInput)}
                    className="text-xs text-red-700 hover:text-red-900 font-bold underline cursor-pointer"
                  >
                    {showDisputeInput ? 'Cancel Dispute' : 'Flag Statutory Dispute'}
                  </button>
                </div>

                {showDisputeInput && (
                  <div className="bg-red-50 border border-red-300 p-3 space-y-2">
                    <label className="block text-[11px] font-bold text-red-900">
                      Mandatory Dispute / Audit Hold Rationale:
                    </label>
                    <textarea
                      rows={2}
                      value={disputeNote}
                      onChange={(e) => setDisputeNote(e.target.value)}
                      placeholder="e.g. Telemetry reports indicate incomplete sensor calibration at Dumka handpump..."
                      className="w-full p-2 text-xs border border-red-300 bg-white rounded-none focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFlagDispute}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold uppercase transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Submit Dispute to Audit Ledger</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* FOOTER */}
        {/* ==================================================================== */}
        <div className="bg-slate-100 border-t-2 border-slate-300 p-3.5 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-600 font-mono">
            Verified Role: <strong className="text-[#0B2545]">{session.role}</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrancheReleaseModal;

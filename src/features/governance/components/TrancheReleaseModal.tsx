/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 3: Governance & Capital — Tranche Release & Verification Modal
 * 
 * Enforces Role-Based Escrow Release Guardrails:
 * - Tranche 1 (30% BOM): Requires Faculty Mentor verification.
 * - Tranche 2 (30% LAB): Requires Faculty Mentor sign-off with verified telemetry proof.
 * - Tranche 3 (40% FIELD): Enforces DUAL-SIGNATURE (Faculty Supervisor + District BDO / Govt).
 * - Industry CSR: Audit view with statutory dispute/objection flagging.
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { EscrowGrant, MilestoneTranche, TrancheStage } from '../../../types/governance';
import { updateTrancheStatus } from '../../../lib/db';

export interface TrancheReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  grant: EscrowGrant;
  targetTranche: MilestoneTranche;
  userRole: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR';
  onTrancheUpdated: () => void;
  language?: 'en' | 'hi';
}

const STAGE_LABELS: Record<TrancheStage, { title: string; subtitle: string }> = {
  TRANCHE_1_BOM: {
    title: 'Tranche 1: Architecture & BOM Procurement',
    subtitle: '30% Release • Bill-of-Materials verification under ₹2,500 budget limit',
  },
  TRANCHE_2_LAB: {
    title: 'Tranche 2: Lab Bench Prototype & Telemetry',
    subtitle: '30% Release • Laboratory testing & sensor telemetry benchmark sign-off',
  },
  TRANCHE_3_FIELD: {
    title: 'Tranche 3: Field Deployment & Panchayat Handover',
    subtitle: '40% Release • On-site Gram Sabha installation & Dual-Signature Gate',
  },
};

export const TrancheReleaseModal: React.FC<TrancheReleaseModalProps> = ({
  isOpen,
  onClose,
  grant,
  targetTranche,
  userRole,
  onTrancheUpdated,
  language = 'en',
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState<string>('');
  const [showDisputeInput, setShowDisputeInput] = useState<boolean>(false);

  if (!isOpen) return null;

  const stageInfo = STAGE_LABELS[targetTranche.stage];
  const isFaculty = userRole === 'FACULTY_MENTOR';
  const isGovt = userRole === 'GOVT_ADMIN';
  const isCSR = userRole === 'INDUSTRY_CSR';

  // Handle single sign-off (Tranche 1 or 2)
  const handleApproveTranche = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (targetTranche.stage === 'TRANCHE_1_BOM' || targetTranche.stage === 'TRANCHE_2_LAB') {
        await updateTrancheStatus(grant.id, targetTranche.stage, 'DISBURSED', 'FACULTY');
      } else if (targetTranche.stage === 'TRANCHE_3_FIELD') {
        const role = isFaculty ? 'FACULTY' : 'GOVT';
        await updateTrancheStatus(grant.id, targetTranche.stage, 'DISBURSED', role);
      }
      onTrancheUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release tranche funds.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Tranche 3 dual signatures individually
  const handleSignTranche3 = async (role: 'FACULTY' | 'GOVT') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // If the other signature is already present, it will disburse; otherwise records timestamp
      await updateTrancheStatus(grant.id, 'TRANCHE_3_FIELD', 'DISBURSED', role);
      onTrancheUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign Tranche 3.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSR dispute flagging
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
        targetTranche.stage,
        'DISPUTED',
        'INDUSTRY_CSR',
        disputeNote.trim()
      );
      onTrancheUpdated();
      onClose();
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
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#7A1B1B] text-[#F8E7A2] text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                SHOE 4 &bull; CSR ESCROW DISBURSEMENT
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
                ₹{targetTranche.amountINR.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-500 ml-1">
                ({targetTranche.percentage}% of ₹{grant.totalCommittedINR.toLocaleString('en-IN')})
              </span>
            </div>
          </div>

          {/* Current Status Pill */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Escrow State:</span>
            {targetTranche.status === 'DISBURSED' ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Disbursed to Hardware Roster</span>
              </span>
            ) : targetTranche.status === 'APPROVED' ? (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Approved &bull; Release Imminent</span>
              </span>
            ) : targetTranche.status === 'DISPUTED' ? (
              <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-400 text-xs font-black uppercase inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                <span>Disputed / Audit Hold</span>
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

          {targetTranche.status === 'DISPUTED' && targetTranche.rejectionReason && (
            <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Corporate Sponsor Audit Objection on Record:</span>
              </div>
              <p className="italic text-slate-800 bg-white p-2 border border-red-200">
                "{targetTranche.rejectionReason}"
              </p>
            </div>
          )}

          {/* Section 1: Challenge & Statutory Sponsor Context */}
          <div className="bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#0B2545]">
                Master Challenge Token: <strong className="font-mono text-[#7A1B1B]">{grant.masterIssueId}</strong>
              </span>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold">
                Team: {grant.teamId}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
              <span>MCA Category: <strong>{grant.mcaScheduleVIICategory.replace(/_/g, ' ')}</strong></span>
              <span>&bull;</span>
              <span>SDG Goal: <strong className="text-emerald-800">Goal {grant.sdgGoalNumber}</strong></span>
              <span>&bull;</span>
              <span>Escrow Contract: <strong>SHA-256 Escrow Protected</strong></span>
            </div>
          </div>

          {/* Section 2: Deliverable Verification & Telemetry Proof */}
          <div className="border border-slate-300 p-3.5 space-y-2.5">
            <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wide flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#2A6F86]" />
              <span>Milestone Deliverable Specification</span>
            </h4>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
              {targetTranche.deliverableDescription}
            </p>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-600 font-semibold">Verification Proof Asset:</span>
              {targetTranche.deliverableProofUrl ? (
                <a
                  href={targetTranche.deliverableProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#2A6F86] border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Inspect Audit File</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-amber-800 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 border border-amber-200">
                  No External Artifact Uploaded Yet
                </span>
              )}
            </div>
          </div>

          {/* Section 3: Sign-Off Controls by Stage */}
          <div className="border border-slate-300 p-3.5 space-y-3">
            <h4 className="text-xs font-black uppercase text-[#0B2545] tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Multi-Party Sign-Off Governance</span>
            </h4>

            {/* STAGE 1 OR 2: SINGLE SIGN-OFF BY ACCREDITED FACULTY */}
            {(targetTranche.stage === 'TRANCHE_1_BOM' || targetTranche.stage === 'TRANCHE_2_LAB') && (
              <div className="space-y-2">
                <div className="bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#7A1B1B]" />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        University Faculty Supervisor Verification
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Accredited HEI Mentor Sign-off (BIT Sindri / NIT Jamshedpur)
                      </span>
                    </div>
                  </div>

                  {targetTranche.facultySignoffAt ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>Signed {new Date(targetTranche.facultySignoffAt).toLocaleDateString()}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>Pending Faculty Review</span>
                    </span>
                  )}
                </div>

                {/* Action button if role is FACULTY */}
                {targetTranche.status !== 'DISBURSED' && isFaculty && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleApproveTranche}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Unlock Tranche (₹{targetTranche.amountINR.toLocaleString('en-IN')})</span>
                  </button>
                )}

                {!isFaculty && targetTranche.status !== 'DISBURSED' && (
                  <p className="text-[11px] text-slate-500 italic text-center">
                    Note: Tranche 1 &amp; 2 approval requires accredited University Faculty Mentor sign-off. (Current Role: <strong>{userRole}</strong>). Switch role above to test sign-off.
                  </p>
                )}
              </div>
            )}

            {/* STAGE 3: DUAL-SIGNATURE PROGRESS INDICATOR */}
            {targetTranche.stage === 'TRANCHE_3_FIELD' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Gate 1: Faculty Sign-off */}
                  <div className="bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#7A1B1B]" />
                        <span>1. Faculty Supervisor</span>
                      </span>
                      {targetTranche.facultySignoffAt ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {targetTranche.facultySignoffAt
                        ? `Signed on ${new Date(targetTranche.facultySignoffAt).toLocaleDateString()}`
                        : 'Awaiting Faculty sign-off'}
                    </p>

                    {isFaculty && !targetTranche.facultySignoffAt && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSignTranche3('FACULTY')}
                        className="w-full mt-1 py-1.5 bg-[#0B2545] hover:bg-[#1E3A5F] text-white text-[11px] font-bold uppercase transition-colors"
                      >
                        Sign as Faculty
                      </button>
                    )}
                  </div>

                  {/* Gate 2: Government BDO Sign-off */}
                  <div className="bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-blue-700" />
                        <span>2. District BDO / Govt</span>
                      </span>
                      {targetTranche.govtSignoffAt ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {targetTranche.govtSignoffAt
                        ? `Signed on ${new Date(targetTranche.govtSignoffAt).toLocaleDateString()}`
                        : 'Awaiting BDO field verification'}
                    </p>

                    {isGovt && !targetTranche.govtSignoffAt && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSignTranche3('GOVT')}
                        className="w-full mt-1 py-1.5 bg-[#7A1B1B] hover:bg-[#962626] text-white text-[11px] font-bold uppercase transition-colors"
                      >
                        Sign as District BDO
                      </button>
                    )}
                  </div>
                </div>

                {/* Release notice */}
                <div className="bg-blue-50 border border-blue-200 p-2 text-[11px] text-blue-950">
                  <strong>Dual-Signature Protocol:</strong> Tranche 3 field funds are strictly disbursed only when both Faculty and District BDO signatures are stamped on the decentralized ledger.
                </div>
              </div>
            )}

            {/* INDUSTRY CSR DISPUTE CONTROLS */}
            {isCSR && (
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
            Active Role: <strong className="text-[#0B2545]">{userRole}</strong>
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

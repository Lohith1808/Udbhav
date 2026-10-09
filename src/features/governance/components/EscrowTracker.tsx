/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 4 — Task 4.5: Escrow Tranches & Two-Tier Safety Multi-Party Locks
 * 
 * EscrowTracker:
 * Reusable visual escrow tracker component displaying the multi-stage milestone disbursement rail,
 * sequential sign-off progress, dual-party lock status, and instant tranche release triggers.
 */

import React, { useState } from 'react';
import {
  Coins,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Building,
} from 'lucide-react';
import { EscrowGrant, MilestoneTranche } from '../../../types/governance';
import { EscrowDisbursementModal } from './EscrowDisbursementModal';

export interface EscrowTrackerProps {
  grant: EscrowGrant;
  onTrancheUpdated?: () => void;
  language?: 'en' | 'hi';
  compact?: boolean;
}

export const EscrowTracker: React.FC<EscrowTrackerProps> = ({
  grant,
  onTrancheUpdated = () => {},
  language = 'en',
  compact = false,
}) => {
  const [selectedTranche, setSelectedTranche] = useState<MilestoneTranche | null>(null);

  // Financial aggregation
  const totalCommitted = grant.totalCommittedINR;
  const totalDisbursed = grant.tranches
    .filter((t) => t.status === 'DISBURSED')
    .reduce((sum, t) => sum + t.amountINR, 0);
  const totalLocked = totalCommitted - totalDisbursed;
  const disbursedPercent = totalCommitted > 0 ? Math.round((totalDisbursed / totalCommitted) * 100) : 0;

  const handleOpenTranche = (tranche: MilestoneTranche) => {
    setSelectedTranche(tranche);
  };

  const handleModalClose = () => {
    setSelectedTranche(null);
  };

  const handleUpdated = () => {
    onTrancheUpdated();
  };

  return (
    <div className="bg-white border-2 border-slate-300 shadow-xs">
      {/* Tracker Header */}
      {!compact && (
        <div className="bg-[#0B2545] text-white p-3 sm:p-4 border-b-2 border-[#F8E7A2] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#F8E7A2]">
                  {grant.sponsorName}
                </span>
                <span className="bg-[#7A1B1B] text-[#F8E7A2] text-[9px] font-black uppercase px-1.5 py-0.2 tracking-wider">
                  MCA SCH VII
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black uppercase text-white tracking-tight">
                {language === 'hi' ? 'एस्क्रो मील का पत्थर ट्रैकर' : 'Milestone Escrow Disbursement Rail'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Committed</span>
              <span className="text-white font-bold">₹{totalCommitted.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-emerald-400 block text-[10px] uppercase font-sans">Disbursed</span>
              <span className="text-emerald-300 font-bold">₹{totalDisbursed.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-amber-400 block text-[10px] uppercase font-sans">Locked</span>
              <span className="text-amber-300 font-bold">₹{totalLocked.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-slate-100 p-2.5 sm:p-3 border-b border-slate-200">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
          <span>Overall Escrow Release: {disbursedPercent}%</span>
          <span className="text-slate-500 font-normal">
            ₹{totalDisbursed.toLocaleString('en-IN')} of ₹{totalCommitted.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="w-full bg-slate-300 h-2.5 rounded-none overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300"
            style={{ width: `${disbursedPercent}%` }}
          />
        </div>
      </div>

      {/* Tranche Cards Grid */}
      <div className="p-3 sm:p-4 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {grant.tranches.map((tranche, idx) => {
            const isDisbursed = tranche.status === 'DISBURSED';
            const isDisputed = tranche.status === 'DISPUTED';
            const isApproved = tranche.status === 'APPROVED';

            const isTranche3 = tranche.stage === 'TRANCHE_3_FIELD';
            const hasFacultySignoff = Boolean(tranche.facultySignoffAt);
            const hasPanchayatSignoff = Boolean(tranche.panchayatSignoffAt || tranche.govtSignoffAt);
            const hasDualSignoffs = hasFacultySignoff && hasPanchayatSignoff;

            return (
              <button
                key={tranche.stage}
                type="button"
                onClick={() => handleOpenTranche(tranche)}
                className={`p-3 border-2 text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between space-y-2.5 ${
                  isDisbursed
                    ? 'bg-emerald-50/70 border-emerald-600 hover:bg-emerald-100/80'
                    : isDisputed
                    ? 'bg-red-50/70 border-red-600 hover:bg-red-100/80'
                    : isApproved
                    ? 'bg-blue-50/70 border-blue-600 hover:bg-blue-100/80'
                    : 'bg-white border-slate-300 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-[#0B2545] uppercase tracking-wide">
                      Stage {idx + 1}:{' '}
                      {tranche.stage === 'TRANCHE_1_BOM'
                        ? '30% BOM'
                        : tranche.stage === 'TRANCHE_2_LAB'
                        ? '40% Lab'
                        : '30% Field Pilot'}
                    </span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.2 border border-slate-200">
                      {tranche.percentage}%
                    </span>
                  </div>

                  <div className="text-base font-black font-mono text-[#0B2545] mt-1">
                    ₹{tranche.amountINR.toLocaleString('en-IN')}
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-snug">
                    {tranche.deliverableDescription}
                  </p>

                  {/* Dual-Lock Sign-Off Badges for Tranche 3 */}
                  {isTranche3 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-700 font-bold">
                          <GraduationCap className="w-3 h-3 text-[#7A1B1B]" />
                          <span>Faculty:</span>
                        </span>
                        {hasFacultySignoff ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Signed</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">Pending</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-700 font-bold">
                          <Building className="w-3 h-3 text-[#1E6F50]" />
                          <span>Panchayat:</span>
                        </span>
                        {hasPanchayatSignoff ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Signed</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">Pending</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Node Footer Status */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  {isDisbursed ? (
                    <span className="font-black text-emerald-800 flex items-center gap-1 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Disbursed</span>
                    </span>
                  ) : isDisputed ? (
                    <span className="font-black text-red-800 flex items-center gap-1 uppercase">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                      <span>Disputed</span>
                    </span>
                  ) : isApproved ? (
                    <span className="font-black text-blue-800 flex items-center gap-1 uppercase">
                      <Clock className="w-3.5 h-3.5 text-blue-700" />
                      <span>Approved</span>
                    </span>
                  ) : isTranche3 ? (
                    <span className="font-bold text-amber-800 flex items-center gap-1 uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>{hasDualSignoffs ? 'Dual Cleared' : 'Dual Locked'}</span>
                    </span>
                  ) : (
                    <span className="font-bold text-slate-500 flex items-center gap-1 uppercase">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Locked</span>
                    </span>
                  )}

                  <span className="text-[#2A6F86] font-bold inline-flex items-center gap-0.5 hover:underline">
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal Integration */}
      {selectedTranche && (
        <EscrowDisbursementModal
          isOpen={Boolean(selectedTranche)}
          onClose={handleModalClose}
          grant={grant}
          targetTranche={selectedTranche}
          onTrancheUpdated={handleUpdated}
          language={language}
        />
      )}
    </div>
  );
};

export default EscrowTracker;

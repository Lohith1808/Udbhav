/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 4 — Task 4.5: Escrow Tranches & Two-Tier Safety Multi-Party Locks
 * 
 * EscrowDisbursementModal:
 * Dedicated alias export for the multi-party Escrow Disbursement Modal,
 * adhering to GIGW 3.0 standards and verified RBAC session protocols.
 */

import React from 'react';
import {
  TrancheReleaseModal,
  TrancheReleaseModalProps,
} from './TrancheReleaseModal';

export type EscrowDisbursementModalProps = TrancheReleaseModalProps;

export const EscrowDisbursementModal: React.FC<EscrowDisbursementModalProps> = (props) => {
  return <TrancheReleaseModal {...props} />;
};

export default EscrowDisbursementModal;

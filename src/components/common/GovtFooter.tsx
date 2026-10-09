/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Formal NIC Standard Civic Footer (Government of Jharkhand)
 * 
 * Features:
 * - Dark Navy Background #0B192C with slate borders
 * - Structured 4-Column Statutory & Technical Compliance Layout
 * - Bottom Copyright & Digital Sovereignty Strip
 */

import React from 'react';
import {
  Building2,
  Scale,
  ShieldCheck,
  Cpu,
  MapPin,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export interface GovtFooterProps {
  language?: 'hi' | 'en';
}

export const GovtFooter: React.FC<GovtFooterProps> = ({ language = 'en' }) => {
  return (
    <footer className="w-full bg-[#0B192C] text-slate-200 border-t-4 border-[#7A1B1B] mt-auto select-none">
      {/* 4-Column Structured Technical & Administrative Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Nodal Department */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-700/80 pb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#FF9933]" aria-hidden="true" />
              <span>
                {language === 'hi' ? 'नोडल विभाग' : 'Nodal Department'}
              </span>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
              <p className="font-semibold text-white">
                {language === 'hi'
                  ? 'उच्च एवं तकनीकी शिक्षा विभाग'
                  : 'Department of Higher & Technical Education'}
              </p>
              <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Yojana Bhawan, Nepal House, Doranda, Ranchi, Jharkhand - 834002
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>LGD Master Directory Synchronized</span>
              </div>
            </div>
          </div>

          {/* Column 2: Statutory Notice */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-700/80 pb-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>
                {language === 'hi' ? 'वैधानिक नोटिस' : 'Statutory Notice'}
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                <span>
                  <strong>NEP 2020 Capstone:</strong> Academic credits for rural engineering solvers.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                <span>
                  <strong>Section 135 MCA CSR:</strong> Form CSR-2 and GFR-12A utilization tracking.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                <span>
                  <strong>Two-Tier BIS Gate:</strong> Mandatory laboratory &amp; certified testing.
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Security & Anti-Fraud */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-700/80 pb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>
                {language === 'hi' ? 'सुरक्षा एवं धोखाधड़ी रोकथाम' : 'Security & Anti-Fraud'}
              </span>
            </div>
            <div className="text-[11px] space-y-2">
              <div className="p-2 bg-red-950/40 border border-red-700/60 text-red-200 rounded-none leading-relaxed">
                <strong>{language === 'hi' ? 'नागरिक सुरक्षा:' : 'Zero Payment Policy:'}</strong>{' '}
                {language === 'hi'
                  ? 'यह पोर्टल कोई शुल्क या ओटीपी नहीं मांगता।'
                  : 'This portal NEVER requests bank fees, UPI, or OTPs.'}
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>SHA-256 PII Cryptographic Isolation</span>
              </div>
              <div className="text-slate-400">
                <span>SSL 256-Bit &bull; Web Push VAPID Enabled</span>
              </div>
            </div>
          </div>

          {/* Column 4: NIC / Digital India Standards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-700/80 pb-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>
                {language === 'hi' ? 'एनआईसी एवं डिजिटल मानक' : 'NIC & Digital India'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>
                Designed &amp; Developed for Department of Higher &amp; Technical Education (DHTE), Government of Jharkhand.
              </p>
              <div className="p-2 bg-slate-900/90 border border-slate-800 text-slate-400 text-[10px]">
                <div>&bull; National Informatics Centre (NIC) Standards</div>
                <div>&bull; GIGW 3.0 Compliant (WCAG 2.1 AA)</div>
                <div>&bull; Smart India Hackathon (SIH PS: 26043)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="border-t border-slate-800 bg-[#050D17] text-slate-400 text-[11px] py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>
            &copy; 2026 Government of Jharkhand. All Rights Reserved. Official Portal of DHTE Jharkhand.
          </p>
          <div className="flex items-center gap-3 text-slate-500 text-[10px]">
            <span>Privacy Policy</span>
            <span>&bull;</span>
            <span>Terms of Use</span>
            <span>&bull;</span>
            <span>Hyperlink Policy</span>
            <span>&bull;</span>
            <span>Helpdesk: 1800-XXX-XXXX</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GovtFooter;

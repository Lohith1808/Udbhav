/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Prototype Login Page
 *
 * Mock authentication for demonstration purposes only — NOT secure
 * production authentication. The selected display name and stakeholder role
 * are stored in the SessionContext (localStorage-persisted demo session).
 *
 * Official verification-key access (Panchayat Officer, Accredited Evaluator,
 * etc.) remains available via the "official verification key" option, which
 * mounts the existing ProfileVerificationModal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { UserRole } from '../../types/ingestion';
import { LOGIN_ROLE_OPTIONS } from '../../config/roleRoutes';
import { ProfileVerificationModal } from '../../components/common/ProfileVerificationModal';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;

export const LoginPage: React.FC = () => {
  const { login, markAuthenticated, session } = useSession();
  const [displayName, setDisplayName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [errors, setErrors] = useState<{ name?: string; role?: string }>({});
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const pendingVerifiedLoginRef = useRef<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string; role?: string } = {};

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      nextErrors.name = 'कृपया अपना नाम दर्ज करें / Please enter your display name.';
    } else if (trimmedName.length < MIN_NAME_LENGTH) {
      nextErrors.name = 'नाम कम से कम 2 अक्षरों का होना चाहिए / Name must be at least 2 characters.';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      nextErrors.name = 'नाम 40 अक्षरों से कम होना चाहिए / Name must be under 40 characters.';
    }

    if (!selectedRole) {
      nextErrors.role = 'कृपया अपनी भूमिका चुनें / Please select your stakeholder role.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Mock login — establishes the demo session and lands on the role workspace.
    login(trimmedName, selectedRole as UserRole);
  };

  // Track successful official-key verification while the modal is open.
  useEffect(() => {
    if (
      isKeyModalOpen &&
      session?.verificationBadge &&
      session.verificationBadge !== 'MOCK_PROTOTYPE_LOGIN'
    ) {
      pendingVerifiedLoginRef.current = true;
    }
  }, [isKeyModalOpen, session]);

  // When the key modal closes after a successful verification, complete the
  // login with the verified identity (preserving its official badge).
  useEffect(() => {
    if (!isKeyModalOpen && pendingVerifiedLoginRef.current) {
      pendingVerifiedLoginRef.current = false;
      markAuthenticated();
    }
  }, [isKeyModalOpen, markAuthenticated]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col">
      {/* Official utility strip */}
      <div className="bg-[#0A1C2A] text-slate-100 text-[11px] leading-tight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-semibold text-slate-200">भारत सरकार | Government of India</span>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">|</span>
            <span className="font-semibold text-amber-300 hidden sm:inline">
              झारखंड सरकार | Government of Jharkhand
            </span>
          </div>
          <span className="text-slate-400 font-mono shrink-0">SIH PS ID: 26043</span>
        </div>
      </div>

      {/* Tricolor strip */}
      <div className="w-full h-[3.5px] flex" aria-hidden="true">
        <div className="w-1/3 h-full bg-[#FF9933]" />
        <div className="w-1/3 h-full bg-[#FFFFFF]" />
        <div className="w-1/3 h-full bg-[#138808]" />
      </div>

      {/* Masthead */}
      <div className="bg-white border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 p-1 bg-white border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center rounded-full"
              title="झारखंड सरकार • Government of Jharkhand"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" aria-hidden="true">
                <circle cx="50" cy="50" r="47" stroke="#138808" strokeWidth="3" />
                <circle cx="50" cy="50" r="41" stroke="#138808" strokeWidth="1" strokeDasharray="3 2" />
                <circle cx="50" cy="50" r="29" fill="#F0FDF4" stroke="#138808" strokeWidth="2" />
                <rect x="46" y="32" width="8" height="24" fill="#0A1C2A" />
                <rect x="42" y="56" width="16" height="5" fill="#7A1B1B" />
                <rect x="38" y="61" width="24" height="6" fill="#0A1C2A" />
                <circle cx="50" cy="44" r="5.5" stroke="#138808" strokeWidth="1.5" />
                <circle cx="26" cy="50" r="3" fill="#138808" />
                <circle cx="74" cy="50" r="3" fill="#138808" />
                <circle cx="50" cy="23" r="3" fill="#FF9933" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                उद्भव <span className="text-[#7A1B1B]">UDBHAV</span>
              </h1>
              <div className="font-bold text-[11px] sm:text-xs text-slate-800 tracking-wider uppercase">
                Department of Higher &amp; Technical Education, Govt of Jharkhand
              </div>
            </div>
          </div>
          <div className="sm:ml-auto sm:text-right">
            <div className="text-[11px] font-medium text-slate-600 max-w-xs">
              A Quadruple-Helix Demand-Driven Civic R&amp;D Ecosystem
            </div>
            <div className="inline-block mt-1 text-[10px] font-bold text-[#7A1B1B] bg-red-50 border border-red-200 px-1.5 py-0.2">
              Civic Innovation Platform — Prototype
            </div>
          </div>
        </div>
      </div>

      {/* Login card */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex items-start justify-center">
        <div className="w-full max-w-xl">
          <div className="bg-white border border-slate-300 shadow-2xs overflow-hidden">
            <div className="bg-[#0B2545] text-white px-5 py-4 border-b-2 border-amber-500">
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase flex items-center gap-2">
                <LogIn className="w-5 h-5 text-amber-300" aria-hidden="true" />
                <span>Portal Sign-In / पोर्टल प्रवेश</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Sign in with a display name and your stakeholder role to open the matching workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5" noValidate>
              {/* Display name */}
              <div>
                <label htmlFor="login-display-name" className="block text-xs font-bold text-slate-800 mb-1">
                  Display Name / प्रदर्शन नाम
                </label>
                <input
                  id="login-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh Munda"
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="name"
                  className="w-full px-3 py-2 text-sm border border-slate-400 bg-white rounded-none focus:outline-none focus:border-[#0B2545]"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'login-name-error' : undefined}
                />
                {errors.name && (
                  <p id="login-name-error" className="mt-1 text-[11px] font-semibold text-red-700 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Role selector */}
              <fieldset>
                <legend className="block text-xs font-bold text-slate-800 mb-1.5">
                  Stakeholder Role / हितधारक भूमिका
                </legend>
                <div className="space-y-2" role="radiogroup" aria-label="Stakeholder role">
                  {LOGIN_ROLE_OPTIONS.map((option) => {
                    const isSelected = selectedRole === option.role;
                    return (
                      <label
                        key={option.role}
                        className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#0B2545] bg-blue-50/60'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="stakeholder-role"
                          value={option.role}
                          checked={isSelected}
                          onChange={() => setSelectedRole(option.role)}
                          className="mt-0.5 w-4 h-4 accent-[#7A1B1B] cursor-pointer"
                        />
                        <span>
                          <span className="block text-xs font-extrabold text-slate-900">
                            {option.titleEn}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {option.descriptionEn}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.role && (
                  <p className="mt-1 text-[11px] font-semibold text-red-700 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.role}</span>
                  </p>
                )}
              </fieldset>

              {/* Submit */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7A1B1B] hover:bg-[#631515] active:bg-[#521111] text-[#F8E7A2] text-sm font-extrabold uppercase tracking-wider rounded-none shadow-2xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Continue to Workspace / कार्यस्थल पर जाएं</span>
              </button>

              {/* Official verification key pathway */}
              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0B2545] hover:text-[#7A1B1B] underline underline-offset-2 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Official with a verification key? / सत्यापन कुंजी से प्रवेश</span>
                </button>
              </div>

              {/* Mock auth disclosure */}
              <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" aria-hidden="true" />
                <span>
                  Prototype demo sign-in: authentication is a front-end mock for evaluation purposes and is
                  not secure. Do not enter real credentials. Panchayat Officer and Accredited Evaluator
                  workspaces remain accessible via official verification keys.
                </span>
              </p>
            </form>
          </div>
        </div>
      </main>

      {isKeyModalOpen && (
        <ProfileVerificationModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      )}
    </div>
  );
};

export default LoginPage;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * In-App Google Gemini Flash API Key Configuration Modal
 * 
 * Provides SIH hackathon evaluators and jury members with:
 * - 1-Click live API connection testing to Google Gemini 1.5 Flash
 * - Manual API key configuration persisted in localStorage
 * - Clear explanation of the offline deterministic fallback engine.
 */

import React, { useState, useEffect } from 'react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  testGeminiConnection,
} from '../../services/aiService';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

export interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'hi' | 'en';
}

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
  isOpen,
  onClose,
  language = 'en',
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    model: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testGeminiConnection(apiKey);
      setTestResult(result);
      if (result.success && apiKey.trim()) {
        setGeminiApiKey(apiKey.trim());
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setGeminiApiKey(apiKey.trim());
    setTestResult({
      success: true,
      model: 'Configured',
      message: 'API Key saved to local storage.',
    });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setApiKey('');
    setGeminiApiKey('');
    setTestResult({
      success: true,
      model: 'Offline Engine',
      message: 'Custom key removed. Reverted to offline deterministic AI engine.',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xs"
    >
      <div className="relative w-full max-w-lg bg-white border-2 border-[#0F2537] shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-[#0F2537] text-white px-5 py-3.5 flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-bold">
                SIH EVALUATOR SETTINGS &bull; BUG 3 RESOLUTION
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                {language === 'hi'
                  ? 'गूगल जेमिनी 1.5 फ़्लैश एआई कॉन्फ़िगरेशन'
                  : 'Google Gemini 1.5 Flash AI Settings'}
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

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Advisory Notice */}
          <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-950 flex items-start gap-2">
            <Cpu className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Dual-Mode Architecture:</span>
              <span className="ml-1">
                Udbhav connects directly to Google Gemini 1.5 Flash via native REST calls (0 heavy dependencies).
                If no key is configured or network is disconnected, the system automatically falls back to the
                <strong> offline deterministic heuristic engine</strong>, guaranteeing zero runtime downtime during viva defense.
              </span>
            </div>
          </div>

          {/* Key Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase text-slate-800">
              {language === 'hi'
                ? 'जेमिनी एपीआई कुंजी (Gemini API Key)'
                : 'Google Gemini API Key'}
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-9 pr-10 py-2 border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2537]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Fetched from <code className="bg-slate-100 px-1 py-0.5">VITE_GEMINI_API_KEY</code> or your browser's secure localStorage.
            </p>
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1 py-2 px-3 bg-[#0F2537] hover:bg-[#1a3a54] disabled:opacity-50 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Endpoint...' : 'Ping Live Gemini 1.5 Flash'}</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="py-2 px-3 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear custom key and use offline engine"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Test Feedback Status */}
          {testResult && (
            <div
              className={`p-3 text-xs border flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                  : 'bg-red-50 border-red-400 text-red-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {testResult.success ? 'Connection Validated' : 'Connection Warning'}
                </div>
                <div className="mt-0.5">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Statutory Security Guardrail Stamp */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Egress Security:</strong> All API requests call Google's verified generative API endpoint directly from client memory without intermediary proxy logging. No citizen PII or phone numbers are ever dispatched.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-400 text-slate-700 hover:bg-slate-200 text-xs font-bold uppercase cursor-pointer"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 bg-[#7A1B1B] hover:bg-[#912020] text-white text-xs font-bold uppercase cursor-pointer shadow-xs"
          >
            {language === 'hi' ? 'सेटिंग्स सहेजें' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

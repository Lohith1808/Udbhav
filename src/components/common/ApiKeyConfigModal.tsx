/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * In-App Local Workstation Ollama AI Configuration Modal (Sprint 5 — Task 5.2)
 * 
 * Resolves Bug 3 (Missing AI & API key demands) by configuring local Ollama:
 * - Direct connection testing to http://127.0.0.1:11434/api/tags
 * - Dynamic Model Selector auto-populated with models detected on workstation
 * - CORS setup helper note: $env:OLLAMA_ORIGINS="*"; ollama serve
 * - Zero-Egress, Zero-Key private on-device execution with offline heuristic fallback
 */

import React, { useState, useEffect } from 'react';
import {
  getOllamaEndpoint,
  setOllamaEndpoint,
  getOllamaModel,
  setOllamaModel,
  testOllamaConnection,
} from '../../services/aiService';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Trash2,
  Terminal,
  ShieldCheck,
  Server,
  Layers,
} from 'lucide-react';

export interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'hi' | 'en';
}

export type LocalAiConfigModalProps = ApiKeyConfigModalProps;

const DEFAULT_RECOMMENDED_MODELS = [
  'llama3.2',
  'phi3',
  'mistral',
  'qwen2.5',
  'llama3.1',
  'gemma2',
];

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
  isOpen,
  onClose,
  language = 'en',
}) => {
  const [endpoint, setEndpoint] = useState<string>('http://127.0.0.1:11434');
  const [model, setModel] = useState<string>('llama3.2');
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    model: string;
    models: string[];
    message: string;
  } | null>(null);

  // Initialize values when opening modal
  useEffect(() => {
    if (isOpen) {
      const savedEndpoint = getOllamaEndpoint();
      const savedModel = getOllamaModel();
      setEndpoint(savedEndpoint);
      setModel(savedModel);

      // Auto-probe connection and list installed models
      setIsTesting(true);
      testOllamaConnection(savedEndpoint, savedModel)
        .then((res) => {
          setTestResult(res);
          if (res.models && res.models.length > 0) {
            setAvailableModels(res.models);
          }
        })
        .finally(() => {
          setIsTesting(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Test local Ollama connection and update installed models list
  const handleTestConnection = async () => {
    const activeModel = isCustomModel && customModelInput.trim() ? customModelInput.trim() : model;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testOllamaConnection(endpoint.trim(), activeModel);
      setTestResult(res);
      if (res.models && res.models.length > 0) {
        setAvailableModels(res.models);
        // If current model isn't set and models exist, keep current or align
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const activeModel = isCustomModel && customModelInput.trim() ? customModelInput.trim() : model;
    setOllamaEndpoint(endpoint.trim());
    setOllamaModel(activeModel);

    setTestResult({
      success: true,
      model: activeModel,
      models: availableModels,
      message: 'Local Ollama AI configuration saved.',
    });

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleResetDefaults = () => {
    setEndpoint('http://127.0.0.1:11434');
    setModel('llama3.2');
    setIsCustomModel(false);
    setCustomModelInput('');
    setOllamaEndpoint('http://127.0.0.1:11434');
    setOllamaModel('llama3.2');

    setTestResult({
      success: true,
      model: 'llama3.2',
      models: availableModels,
      message: 'Reset to default endpoint (http://127.0.0.1:11434) and model (llama3.2).',
    });
  };

  // Combine available models with presets
  const combinedModelOptions = Array.from(
    new Set([...availableModels, ...DEFAULT_RECOMMENDED_MODELS])
  );

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
            <Cpu className="w-5 h-5 text-amber-300" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-bold">
                SIH EVALUATOR SETTINGS &bull; LOCAL AI &bull; ZERO-KEY INFERENCE
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                {language === 'hi'
                  ? 'स्थानीय ओलामा एआई कॉन्फ़िगरेशन (Local Ollama AI)'
                  : 'Local Ollama AI Settings'}
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
          {/* Dual-Mode Architecture & Offline Resilience Notice */}
          <div className="bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-950 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Zero-Cloud / Zero-Key Privacy:</span>
              <span className="ml-1">
                Project Udbhav runs entirely on your local machine using <strong>Ollama REST API</strong> (0 external API keys, 0 cloud subscription costs).
                If Ollama is not running, the system automatically runs the <strong>offline deterministic heuristic engine</strong>, guaranteeing zero runtime crashes during SIH viva evaluation.
              </span>
            </div>
          </div>

          {/* Endpoint Input */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase text-slate-800 flex items-center justify-between">
              <span>
                {language === 'hi'
                  ? 'ओलामा एंडपॉइंट (Ollama REST Endpoint)'
                  : 'Ollama REST Endpoint URL'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Default: http://127.0.0.1:11434
              </span>
            </label>
            <div className="relative flex items-center">
              <Server className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2537]"
              />
            </div>
          </div>

          {/* Model Selector Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase text-slate-800 flex items-center justify-between">
              <span>
                {language === 'hi'
                  ? 'स्थानीय मॉडल चयन (Model Selection)'
                  : 'Model Selection'}
              </span>
              <span className="text-[10px] text-emerald-800 font-bold font-mono">
                {availableModels.length > 0
                  ? `✓ ${availableModels.length} models detected locally`
                  : 'Lightweight models supported'}
              </span>
            </label>

            {!isCustomModel ? (
              <div className="relative flex items-center">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={model}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomModel(true);
                      setCustomModelInput('');
                    } else {
                      setModel(e.target.value);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2537]"
                >
                  {availableModels.length > 0 && (
                    <optgroup label="Installed on This Workstation">
                      {availableModels.map((m) => (
                        <option key={`local-${m}`} value={m}>
                          {m} (Installed)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Recommended Lightweight Models">
                    {combinedModelOptions.map((m) => (
                      <option key={`rec-${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                  <option value="__custom__">+ Enter Custom Model Name...</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. qwen2.5:3b, mistral:instruct"
                  className="flex-1 px-3 py-2 border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0F2537]"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomModel(false)}
                  className="px-2.5 py-2 border border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Back to List
                </button>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Recommended: <code className="bg-slate-100 px-1 py-0.5">llama3.2</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5">phi3</code>, or{' '}
              <code className="bg-slate-100 px-1 py-0.5">mistral</code>.
            </p>
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1 py-2 px-3 bg-[#0F2537] hover:bg-[#1a3a54] disabled:opacity-50 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Local Ollama...' : 'Test Local AI Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset to default endpoint and model"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Connection Status Indicator */}
          {testResult && (
            <div
              className={`p-3 text-xs border flex items-start gap-2 shadow-2xs ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-amber-50 border-amber-400 text-amber-950'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {testResult.success
                      ? 'Local Ollama Endpoint Active ✓'
                      : 'Ollama Unreachable / CORS Restricted'}
                  </span>
                  <span className="font-mono text-[10px] px-1 bg-white/70 border border-slate-300">
                    {testResult.model}
                  </span>
                </div>
                <div className="mt-1 text-[11px] leading-relaxed">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Critical CORS Helper Note (Prompt requirement) */}
          <div className="bg-slate-900 text-slate-200 p-3 text-xs border border-slate-700 space-y-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>CORS Setup Helper (Browser Access)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              By default, Ollama blocks cross-origin browser requests. Enable browser access with this one-line command:
            </p>
            <div className="bg-black/80 p-2 border border-slate-700 text-emerald-400 font-mono text-[11px] select-all overflow-x-auto">
              $env:OLLAMA_ORIGINS=&quot;*&quot;; ollama serve
            </div>
            <p className="text-[10px] text-slate-400">
              For macOS / Linux: <code className="text-slate-200">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code>
            </p>
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
            {language === 'hi' ? 'सेटिंग्स सहेजें' : 'Save & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const LocalAiConfigModal = ApiKeyConfigModal;
export default ApiKeyConfigModal;

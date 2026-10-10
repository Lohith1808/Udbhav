/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Speech-to-Text Control for the Citizen Ingestion Terminal
 *
 * Uses the browser-native Web Speech API (SpeechRecognition /
 * webkitSpeechRecognition) to transcribe spoken vernacular input into the
 * citizen issue description field.
 *
 * Guardrails:
 * - Feature-detection before any recognition attempt (unsupported browsers
 *   render an explanatory notice instead of failing silently).
 * - Microphone permission is requested through the browser's normal
 *   permission flow when recognition starts.
 * - Explicit Idle / Listening / Processing / Error states.
 * - Final transcripts are emitted via onTranscript so the parent can append
 *   them to the editable description field; interim results are shown live.
 * - Duplicate recognition sessions are prevented via refs; the recognition
 *   instance is aborted and dereferenced on unmount.
 * - Language follows the portal's global हिंदी/English selection and maps to
 *   BCP-47 tags. Only languages the selected browser speech service actually
 *   supports can be transcribed — the UI states this honestly.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, RefreshCw, AlertCircle, Loader2, Radio } from 'lucide-react';

export interface SpeechToTextControlProps {
  /**
   * Called with each finalized transcript segment. The parent is responsible
   * for appending it to the editable issue-description field.
   */
  onTranscript: (text: string) => void;
  /** Portal-wide UI language; mapped to a BCP-47 recognition tag. */
  language?: 'hi' | 'en';
  /** Optional callback fired when user toggles recognition language inside control */
  onLanguageChange?: (lang: 'hi' | 'en') => void;
  /** Optional callback fired when speech recognition listening state changes */
  onListeningChange?: (isListening: boolean) => void;
  /** Optional reset trigger to abort active recognition session */
  resetKey?: number | string;
  className?: string;
}

type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

/**
 * Extensible language table. Add entries here to expose more recognition
 * languages; availability still depends on the browser's speech service.
 */
export const SPEECH_LANGUAGE_OPTIONS: Array<{ ui: 'hi' | 'en'; bcp47: string; label: string }> = [
  { ui: 'hi', bcp47: 'hi-IN', label: 'हिंदी (Hindi)' },
  { ui: 'en', bcp47: 'en-IN', label: 'English (India)' },
];

const UI_LANGUAGE_TO_BCP47: Record<'hi' | 'en', string> = {
  hi: 'hi-IN',
  en: 'en-IN',
};

/** Safety cap for automatic restarts after the engine stops on silence. */
const MAX_AUTO_RESTARTS = 10;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = (): boolean => getRecognitionConstructor() !== null;

export const SpeechToTextControl: React.FC<SpeechToTextControlProps> = ({
  onTranscript,
  language = 'en',
  onLanguageChange,
  onListeningChange,
  resetKey,
  className = '',
}) => {
  const [internalLang, setInternalLang] = useState<'hi' | 'en'>(language);
  const [state, setState] = useState<SpeechState>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isMountedRef = useRef<boolean>(true);
  /** True while the user wants the mic open; drives auto-restart on silence. */
  const shouldListenRef = useRef<boolean>(false);
  const autoRestartCountRef = useRef<number>(0);
  /** Guards against overlapping start() calls (duplicate sessions). */
  const startingRef = useRef<boolean>(false);

  // Sync internal language if parent language prop changes
  useEffect(() => {
    setInternalLang(language);
  }, [language]);

  const activeLang = internalLang;
  const langTag = UI_LANGUAGE_TO_BCP47[activeLang] ?? 'hi-IN';
  const isSupported = isSpeechRecognitionSupported();

  // Notify parent of listening state
  useEffect(() => {
    onListeningChange?.(state === 'listening');
  }, [state, onListeningChange]);

  // Track mount status so async callbacks never setState after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearErrorMessage = useCallback(() => {
    if (isMountedRef.current) setErrorMessage(null);
  }, []);

  const teardownRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch {
        // Ignore — engine may already be stopped
      }
    }
  }, []);

  // Abort any active recognition when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined) {
      shouldListenRef.current = false;
      teardownRecognition();
      if (isMountedRef.current) {
        setState('idle');
        setInterimTranscript('');
        setErrorMessage(null);
      }
    }
  }, [resetKey, teardownRecognition]);

  // Abort any active recognition when the component unmounts
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      teardownRecognition();
    };
  }, [teardownRecognition]);

  const buildErrorMessage = useCallback(
    (code: string): string => {
      const hi = activeLang === 'hi';
      switch (code) {
        case 'not-allowed':
        case 'service-not-allowed':
          return hi
            ? 'माइक्रोफ़ोन की अनुमति अस्वीकृत हुई। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन अनुमति दें और पुनः प्रयास करें।'
            : 'Microphone permission was denied. Please allow microphone access in your browser settings and retry.';
        case 'no-speech':
          return hi
            ? 'कोई आवाज़ नहीं सुनाई दी। कृपया माइक्रोफ़ोन के पास धीरे-धीरे बोलें।'
            : 'No speech was detected. Please speak clearly and a little closer to the microphone.';
        case 'audio-capture':
          return hi
            ? 'माइक्रोफ़ोन डिवाइस नहीं मिला। कृपया माइक्रोफ़ोन जुड़ा है या नहीं जांचें।'
            : 'No microphone device was found. Please check that a microphone is connected.';
        case 'network':
          return hi
            ? 'स्पीच सेवा नेटवर्क त्रुटि। इस ब्राउज़र में पहचान के लिए इंटरनेट कनेक्शन आवश्यक है — कृपया कनेक्टिविटी जांचें और पुनः प्रयास करें।'
            : 'Speech service network error. Recognition requires an internet connection in this browser — please check connectivity and retry.';
        case 'aborted':
          return '';
        default:
          return hi
            ? 'भाषण पहचान में त्रुटि हुई। कृपया पुनः प्रयास करें।'
            : 'A speech recognition error occurred. Please try again.';
      }
    },
    [activeLang]
  );

  const handleError = useCallback(
    (code: string) => {
      if (!isMountedRef.current) return;
      if (code === 'aborted') return; // manual stop — not an error
      shouldListenRef.current = false;
      setState('error');
      setErrorMessage(buildErrorMessage(code));
    },
    [buildErrorMessage]
  );

  const handleResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          if (transcript.trim()) {
            onTranscript(transcript.trim());
          }
          autoRestartCountRef.current = 0;
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
    },
    [onTranscript]
  );

  const handleEnd = useCallback(() => {
    if (!isMountedRef.current) return;
    // Chrome/Edge stop recognition after a short silence; transparently
    // restart while the user still wants the mic open.
    if (shouldListenRef.current && autoRestartCountRef.current < MAX_AUTO_RESTARTS) {
      const recognition = recognitionRef.current;
      if (recognition) {
        autoRestartCountRef.current += 1;
        try {
          recognition.start();
          return;
        } catch {
          // Fall through to idle if the engine refuses to restart
        }
      }
    }
    shouldListenRef.current = false;
    // Never clobber a surfaced error state — the error message and Retry
    // affordance must remain visible until the user retries or dismisses.
    setState((prev) => (prev === 'error' ? prev : 'idle'));
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(async () => {
    // Prevent duplicate recognition sessions
    if (startingRef.current || recognitionRef.current) return;
    if (!isSupported) {
      setState('error');
      setErrorMessage(
        activeLang === 'hi'
          ? 'इस ब्राउज़र में भाषण पहचान समर्थित नहीं है। कृपया Chrome या Edge उपयोग करें।'
          : 'Speech recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    startingRef.current = true;
    clearErrorMessage();
    setInterimTranscript('');

    try {
      const Ctor = getRecognitionConstructor();
      if (!Ctor) throw new Error('unsupported');
      const recognition = new Ctor();
      recognition.lang = langTag;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = handleResult;
      recognition.onerror = (event) => handleError(event.error);
      recognition.onend = handleEnd;

      recognitionRef.current = recognition;
      shouldListenRef.current = true;
      autoRestartCountRef.current = 0;
      setState('listening');
      // The browser prompts for microphone permission at this point.
      recognition.start();
    } catch (err) {
      if (isMountedRef.current) {
        recognitionRef.current = null;
        shouldListenRef.current = false;
        setState('error');
        setErrorMessage(
          err instanceof Error && err.name === 'NotAllowedError'
            ? buildErrorMessage('not-allowed')
            : buildErrorMessage('audio-capture')
        );
      }
    } finally {
      startingRef.current = false;
    }
  }, [isSupported, langTag, activeLang, clearErrorMessage, handleResult, handleError, handleEnd, buildErrorMessage]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setState('processing');
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop(); // onend fires → returns to idle
      } catch {
        teardownRecognition();
        if (isMountedRef.current) setState('idle');
      }
    } else {
      if (isMountedRef.current) setState('idle');
    }
  }, [teardownRecognition]);

  const handleLanguageSelect = (newLang: 'hi' | 'en') => {
    if (newLang === internalLang) return;
    setInternalLang(newLang);
    onLanguageChange?.(newLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = UI_LANGUAGE_TO_BCP47[newLang] ?? 'hi-IN';
    }
  };

  const handleRetry = useCallback(() => {
    clearErrorMessage();
    setInterimTranscript('');
    void startListening();
  }, [clearErrorMessage, startListening]);

  const stateLabel =
    state === 'listening'
      ? activeLang === 'hi'
        ? 'सुन रहे हैं... बोलिए'
        : 'Listening... speak now'
      : state === 'processing'
      ? activeLang === 'hi'
        ? 'प्रोसेस हो रहा है...'
        : 'Processing...'
      : activeLang === 'hi'
      ? 'बोलकर लिखें'
      : 'Speak to dictate';

  return (
    <div className={`border border-slate-300 bg-slate-50 p-3 sm:p-4 rounded-none select-none ${className}`}>
      {/* Unsupported browser fallback badge */}
      {!isSupported && (
        <div className="p-2.5 bg-amber-100 border-l-4 border-amber-600 text-amber-950 text-xs flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="font-semibold">
            {activeLang === 'hi'
              ? 'इस ब्राउज़र में भाषण पहचान समर्थित नहीं है (इसके बजाय ध्वनि रिकॉर्डिंग का उपयोग करें)'
              : 'Speech recognition not supported on this browser (use voice recording instead)'}
          </span>
        </div>
      )}

      {/* Language Switcher Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200">
        <span className="text-[11px] font-bold text-slate-700 uppercase">
          {activeLang === 'hi' ? 'पहचान भाषा' : 'Speech Language'}:
        </span>
        <div className="inline-flex rounded-none border border-slate-300 bg-white p-0.5">
          {SPEECH_LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.ui}
              type="button"
              onClick={() => handleLanguageSelect(opt.ui)}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                activeLang === opt.ui
                  ? 'bg-[#0B2545] text-[#F8E7A2]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Idle / Error state: push-to-talk button */}
      {state !== 'listening' && state !== 'processing' && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void startListening()}
              disabled={!isSupported}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B2545] hover:bg-slate-800 active:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
              aria-label={activeLang === 'hi' ? 'बोलकर समस्या विवरण लिखें' : 'Dictate the issue description by voice'}
            >
              <Mic className="w-4 h-4 text-amber-300" aria-hidden="true" />
              <span>{stateLabel}</span>
            </button>
            {state === 'error' && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>{activeLang === 'hi' ? 'पुनः प्रयास' : 'Retry'}</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>
              {activeLang === 'hi'
                ? `माइक्रोफ़ोन अनुमति ब्राउज़र द्वारा मांगी जाएगी • भाषा: हिंदी (${langTag})`
                : `Microphone permission is requested by the browser • Language: English (${langTag})`}
            </span>
          </p>
        </div>
      )}

      {/* Listening state: live transcript + stop */}
      {state === 'listening' && (
        <div className="space-y-3 bg-white border-2 border-[#0B2545] p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#0B2545] font-extrabold text-xs uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
              <span>{stateLabel}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5">
              {langTag}
            </span>
          </div>

          {/* Live interim transcript */}
          <div
            className="min-h-[2.5rem] p-2 bg-slate-50 border border-slate-300 text-xs text-slate-800 italic"
            aria-live="polite"
          >
            {interimTranscript ||
              (activeLang === 'hi'
                ? 'आपकी बात यहां लाइव दिखेगी...'
                : 'Your words will appear here as you speak...')}
          </div>

          <button
            type="button"
            onClick={stopListening}
            className="w-full py-2.5 px-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-xs font-extrabold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4 fill-white" aria-hidden="true" />
            <span>{activeLang === 'hi' ? 'रोकें (Stop)' : 'Stop Listening'}</span>
          </button>
        </div>
      )}

      {/* Processing state: finalizing transcript */}
      {state === 'processing' && (
        <div className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-300 text-xs font-bold text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B2545]" aria-hidden="true" />
          <span>{stateLabel}</span>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div
          className="mt-2 p-2 bg-red-100 border border-red-300 text-red-900 text-xs font-semibold flex items-start gap-1.5"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SpeechToTextControl;

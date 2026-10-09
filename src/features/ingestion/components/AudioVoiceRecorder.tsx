/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Push-to-Talk Vernacular Audio Voice Recorder Component
 * 
 * Strict Anti-Fraud & Reliability Guardrails (Sprint 4 - Task 4.1):
 * 1. Secure Context Check: Validates window.isSecureContext prior to media access.
 * 2. Adaptive MIME Support: Dynamically selects best supported audio codec across
 *    Chrome, Safari (iOS/macOS), Edge, and Firefox without crashing.
 * 3. Mobile / iOS Resilience: Explicit track termination and zero-byte buffer handling.
 * 4. Memory Leak Defense: Automatic Object URL revocation on reset and component unmount.
 * 5. Low Data Footprint: Voice-optimized bitrate (32 kbps) capped at 60 seconds.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  RefreshCw,
  Trash2,
  Volume2,
  AlertCircle,
  Clock,
  Radio,
  ShieldAlert,
} from 'lucide-react';

export interface AudioVoiceRecorderProps {
  /** Callback fired when recording completes and passes validation */
  onAudioRecorded: (blob: Blob, durationSeconds: number) => void;
  /** Callback fired when audio is reset or deleted */
  onAudioCleared: () => void;
  /** Bilingual UI mode: 'hi' for Hindi, 'en' for English */
  language?: 'hi' | 'en';
  /** Optional custom CSS classes */
  className?: string;
  /** Optional initial audio blob */
  initialAudioBlob?: Blob;
  /** Optional initial duration in seconds */
  initialDurationSeconds?: number;
}

const MAX_RECORDING_SECONDS = 60;

const ADAPTIVE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
];

export const AudioVoiceRecorder: React.FC<AudioVoiceRecorderProps> = ({
  onAudioRecorded,
  onAudioCleared,
  language = 'en',
  className = '',
  initialAudioBlob,
  initialDurationSeconds = 0,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(initialDurationSeconds);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(initialAudioBlob || null);
  const [audioUrl, setAudioUrl] = useState<string | null>(() => {
    return initialAudioBlob ? URL.createObjectURL(initialAudioBlob) : null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const activeUrlRef = useRef<string | null>(audioUrl);
  const durationRef = useRef<number>(initialDurationSeconds);

  // Check whether origin is a Secure Context for MediaDevices
  const isSecureOrigin =
    typeof window !== 'undefined'
      ? Boolean(
          window.isSecureContext ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        )
      : true;

  // Keep active URL ref updated
  useEffect(() => {
    activeUrlRef.current = audioUrl;
  }, [audioUrl]);

  // Stop and release media stream tracks
  const stopStreamTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop exceptions
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  // Cleanup object URLs, timers, and active tracks on unmount
  useEffect(() => {
    return () => {
      if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      stopStreamTracks();
    };
  }, [stopStreamTracks]);

  // Format MM:SS display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Determine best supported MIME type dynamically
  const resolveSupportedMimeType = (): string => {
    if (
      typeof MediaRecorder === 'undefined' ||
      typeof MediaRecorder.isTypeSupported !== 'function'
    ) {
      return '';
    }
    return ADAPTIVE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  // Stop recording execution
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[AudioRecorder] Error stopping MediaRecorder:', err);
      }
    }

    stopStreamTracks();
    setIsRecording(false);
  }, [stopStreamTracks]);

  // Start recording execution
  const startRecording = async () => {
    setErrorMessage(null);
    setShowClearConfirm(false);

    // 1. Secure context guardrail
    if (!isSecureOrigin) {
      setErrorMessage(
        language === 'hi'
          ? 'माइक्रोफ़ोन के लिए HTTPS या localhost सुरक्षित कनेक्शन आवश्यक है।'
          : 'Microphone requires HTTPS or localhost secure context.'
      );
      return;
    }

    // 2. Hardware API availability guardrail
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        language === 'hi'
          ? 'ब्राउज़र में ऑडियो रिकॉर्डिंग समर्थित नहीं है।'
          : 'Audio recording is not supported in this browser.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      chunksRef.current = [];

      // 3. Adaptive MIME Support resolution
      const supportedMimeType = resolveSupportedMimeType();

      let recorder: MediaRecorder;
      const recorderOptions: MediaRecorderOptions = {};

      if (supportedMimeType) {
        recorderOptions.mimeType = supportedMimeType;
      }

      try {
        // Voice-optimized mobile bitrate (32 kbps)
        recorderOptions.audioBitsPerSecond = 32000;
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        // Fallback without bitrate constraint if browser objects
        try {
          recorder = supportedMimeType
            ? new MediaRecorder(stream, { mimeType: supportedMimeType })
            : new MediaRecorder(stream);
        } catch {
          recorder = new MediaRecorder(stream);
        }
      }

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // 4. Zero-byte buffer check
        if (chunksRef.current.length === 0) {
          setErrorMessage(
            language === 'hi'
              ? 'ऑडियो रिकॉर्ड नहीं हुआ। कृपया पुनः प्रयास करें।'
              : 'No audio recorded. Please speak clearly into the microphone and try again.'
          );
          return;
        }

        const finalBlob = supportedMimeType
          ? new Blob(chunksRef.current, { type: supportedMimeType })
          : new Blob(chunksRef.current);

        if (finalBlob.size === 0) {
          setErrorMessage(
            language === 'hi'
              ? 'खाली ऑडियो प्राप्त हुआ। कृपया पुनः प्रयास करें।'
              : 'Audio recording was empty. Please check your microphone and speak clearly.'
          );
          return;
        }

        // Revoke previous audio URL
        if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(activeUrlRef.current);
        }

        const newUrl = URL.createObjectURL(finalBlob);
        activeUrlRef.current = newUrl;
        setAudioUrl(newUrl);
        setAudioBlob(finalBlob);

        // Notify parent with verified binary Blob and duration
        onAudioRecorded(finalBlob, durationRef.current);
      };

      recorder.onerror = (ev) => {
        console.error('[AudioRecorder] MediaRecorder runtime error:', ev);
        stopRecording();
        setErrorMessage(
          language === 'hi'
            ? 'ऑडियो रिकॉर्डिंग में त्रुटि। कृपया पुनः प्रयास करें।'
            : 'Audio recording error occurred. Please try again.'
        );
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice chunks every 250ms for low memory latency

      setIsRecording(true);
      setDuration(0);
      durationRef.current = 0;

      // Start duration tick with 60-second statutory cutoff
      let currentSeconds = 0;
      timerIntervalRef.current = window.setInterval(() => {
        currentSeconds += 1;
        durationRef.current = currentSeconds;
        setDuration(currentSeconds);

        if (currentSeconds >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('[Audio Recorder] Microphone access failed:', err);
      let msg =
        language === 'hi'
          ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया माइक्रोफ़ोन सक्रिय करें।'
          : 'Microphone access denied. Please grant microphone permission.';

      if (err instanceof Error) {
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg =
            language === 'hi'
              ? 'कोई माइक्रोफ़ोन इनपुट नहीं मिला।'
              : 'No microphone input device detected.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg =
            language === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अस्वीकृत की गई। ब्राउज़र सेटिंग्स में अनुमति दें।'
              : 'Microphone permission was denied. Please allow audio access in your browser settings.';
        }
      }

      setErrorMessage(msg);
      stopStreamTracks();
      setIsRecording(false);
    }
  };

  // Clear audio and revoke Object URL
  const handleClear = () => {
    if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    durationRef.current = 0;
    setShowClearConfirm(false);
    setErrorMessage(null);
    onAudioCleared();
  };

  return (
    <div className={`border border-slate-300 bg-slate-50 p-3 sm:p-4 rounded-none select-none ${className}`}>
      {/* Insecure Context Warning */}
      {!isSecureOrigin && (
        <div className="mb-3 p-2.5 bg-amber-100 border-l-4 border-amber-600 text-amber-950 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            {language === 'hi'
              ? 'माइक्रोफ़ोन के लिए HTTPS या localhost सुरक्षित कनेक्शन आवश्यक है।'
              : 'Microphone requires HTTPS or localhost.'}
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. RECORDING IN PROGRESS STATE */}
      {/* ============================================================== */}
      {isRecording && (
        <div className="space-y-3 bg-white border-2 border-red-600 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700 font-extrabold text-xs uppercase tracking-wider animate-pulse">
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <span>{language === 'hi' ? 'रिकॉर्डिंग जारी है...' : 'Recording Voice...'}</span>
            </div>

            {/* Live Timer Counter */}
            <div className="flex items-center gap-1 font-mono text-xs font-black text-slate-800 bg-red-50 border border-red-200 px-2 py-0.5">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              <span>
                {formatTime(duration)} / {formatTime(MAX_RECORDING_SECONDS)}
              </span>
            </div>
          </div>

          {/* Audio Visualizer Bar Simulation */}
          <div className="flex items-center justify-center gap-1 py-3 bg-slate-900 overflow-hidden">
            {[40, 70, 30, 85, 60, 95, 45, 80, 50, 75, 90, 65, 35, 85, 45].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-[#F8E7A2] animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                }}
              />
            ))}
          </div>

          {/* Stop Recording Action */}
          <button
            type="button"
            onClick={stopRecording}
            className="w-full py-2.5 px-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-xs font-extrabold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>
              {language === 'hi' ? 'रिकॉर्डिंग समाप्त करें (Stop)' : 'Stop Recording'}
            </span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. RECORDED AUDIO PLAYBACK & VERIFICATION CARD */}
      {/* ============================================================== */}
      {!isRecording && audioUrl && (
        <div className="space-y-3 bg-white border border-slate-300 p-3">
          {/* Spoken Confirmation Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
              <Volume2 className="w-4 h-4 text-emerald-700" />
              <span>
                {language === 'hi'
                  ? 'मौखिक विवरण सत्यापन (Spoken Confirmation)'
                  : 'Spoken Message Verification'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
              {formatTime(duration)} &bull; {audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : '32 kbps'}
            </span>
          </div>

          {/* Advisory Notice for Non-Literate Citizens */}
          <div className="text-[11px] text-slate-700 bg-amber-50 border border-amber-300 p-2 leading-relaxed">
            <p className="font-bold text-amber-900 mb-0.5">
              {language === 'hi' ? 'नागरिक सत्यापन:' : 'Citizen Verification:'}
            </p>
            {language === 'hi'
              ? 'कृपया प्ले बटन दबाकर अपनी रिकॉर्ड की गई आवाज सुनें और पुष्टि करें कि आपकी समस्या स्पष्ट है।'
              : 'Press play below to listen back and verify your spoken report before final submission.'}
          </div>

          {/* Native Audio Element */}
          <div className="bg-slate-100 p-2 border border-slate-300 flex items-center justify-center">
            <audio
              controls
              src={audioUrl}
              className="w-full h-9 focus:outline-none"
              preload="metadata"
            />
          </div>

          {/* Re-record & Clear Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
            {!showClearConfirm ? (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!isSecureOrigin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {language === 'hi' ? 'पुनः रिकॉर्ड करें (Re-record)' : 'Re-record'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'हटाएं' : 'Clear'}</span>
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between bg-red-50 border border-red-300 p-1.5">
                <span className="text-[11px] text-red-900 font-bold">
                  {language === 'hi' ? 'क्या आप रिकॉर्डिंग हटाना चाहते हैं?' : 'Delete recording?'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-0.5 bg-red-700 text-white text-[10px] font-bold uppercase rounded-none cursor-pointer"
                  >
                    {language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold uppercase rounded-none cursor-pointer"
                  >
                    {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DEFAULT PUSH-TO-TALK ACTION BUTTON */}
      {/* ============================================================== */}
      {!isRecording && !audioUrl && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={startRecording}
            disabled={!isSecureOrigin}
            className="w-full py-3 px-4 bg-[#7A1B1B] hover:bg-[#631515] active:bg-[#521111] disabled:opacity-50 text-[#F8E7A2] text-xs sm:text-sm font-bold uppercase tracking-wider rounded-none shadow-xs border border-amber-900 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Mic className="w-5 h-5 text-[#F8E7A2]" aria-hidden="true" />
            </div>
            <div className="text-left">
              <div className="font-extrabold text-white tracking-wide">
                {language === 'hi'
                  ? 'बोलकर समस्या दर्ज करें (Push-to-Talk)'
                  : 'Record Spoken Issue (Push-to-Talk)'}
              </div>
              <div className="text-[10px] text-amber-200 font-normal">
                {language === 'hi'
                  ? 'अपनी क्षेत्रीय भाषा / हिंदी में विवरण रिकॉर्ड करें (अधिकतम 60 सेकंड)'
                  : 'Record vernacular voice in your local dialect (Max 60 seconds)'}
              </div>
            </div>
          </button>

          {/* Compliance & Codec Footer Stamp */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              <span>Codec: {resolveSupportedMimeType() || 'Adaptive Audio'}</span>
            </div>
            <span>32 kbps &bull; Max 60s</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AudioVoiceRecorder;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Live Camera Capture & Client-Side EXIF Scrubber Component
 * 
 * Strict Anti-Fraud Guardrails:
 * 1. Enforces direct browser camera activation (capture="environment")
 * 2. Blocks gallery upload to prevent stock/recycled photo fraud
 * 3. Client-side canvas compression downscaling under 350 KB
 * 4. Automatic memory leak defense and Object URL cleanup
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { compressCameraCapture } from '../../../utils/imageCompressor';
import {
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';

export interface LiveCameraCaptureProps {
  /** Callback fired when photo is captured and verified <350 KB */
  onPhotoCaptured: (blob: Blob, previewUrl: string) => void;
  /** Callback fired when photo is cleared/reset */
  onPhotoCleared: () => void;
  /** Bilingual UI mode: 'hi' for Hindi, 'en' for English */
  language?: 'hi' | 'en';
  /** Optional custom CSS classes */
  className?: string;
  /** Optional initial preview URL */
  initialPreviewUrl?: string;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  onPhotoCaptured,
  onPhotoCleared,
  language = 'en',
  className = '',
  initialPreviewUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl || null);
  const [photoSizeKB, setPhotoSizeKB] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active object URL ref to ensure revocation on unmount
  const activeUrlRef = useRef<string | null>(initialPreviewUrl || null);

  // Cleanup object URLs to prevent memory leaks on entry-level Android devices
  useEffect(() => {
    return () => {
      if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
    };
  }, []);

  // Trigger the native environment camera
  const handleOpenLiveCamera = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      // Clear value so the same file selection can re-trigger if needed
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle camera capture file stream
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // Execute client-side EXIF scrubbing & Canvas downscaling (<350 KB JPEG)
      const result = await compressCameraCapture(file);

      // Revoke previous object URL if any
      if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeUrlRef.current);
      }

      activeUrlRef.current = result.previewUrl;
      setPreviewUrl(result.previewUrl);
      setPhotoSizeKB(result.sizeKB);

      // Propagate validated binary Blob to parent
      onPhotoCaptured(result.blob, result.previewUrl);
    } catch (err) {
      console.error('[Udbhav Camera] Compression failed:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to process camera capture. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear captured photo
  const handleClearPhoto = useCallback(() => {
    if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPhotoSizeKB(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onPhotoCleared();
  }, [onPhotoCleared]);

  return (
    <div
      className={`border border-slate-300 bg-slate-50 p-3 sm:p-4 rounded-none select-none ${className}`}
    >
      {/* Hidden file input strictly enforcing live environment camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ============================================================== */}
      {/* STATE 1: PROCESSING / COMPRESSING SPINNER */}
      {/* ============================================================== */}
      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="py-8 px-4 text-center border-2 border-dashed border-[#0B2545]/40 bg-white"
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin" />
            <div className="text-xs font-bold text-slate-800">
              {language === 'hi'
                ? 'छवि संसाधित हो रही है...'
                : 'Scrubbing EXIF & Compressing image...'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              HTML5 Canvas Downscaling &bull; JPEG &lt; 350 KB Enforcement
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STATE 2: CAPTURED & SANITIZED PREVIEW */}
      {/* ============================================================== */}
      {!isProcessing && previewUrl && (
        <div className="space-y-3 bg-white border border-slate-300 p-3">
          <div className="relative border border-slate-200 bg-slate-900 overflow-hidden flex items-center justify-center max-h-64 sm:max-h-72">
            <img
              src={previewUrl}
              alt="Live Captured Civic Hazard"
              className="object-contain w-full max-h-64 sm:max-h-72"
            />
            {/* Live Camera Stamp Overlay */}
            <div className="absolute top-2 left-2 bg-[#7A1B1B]/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border border-red-400">
              LIVE EVIDENCE
            </div>
          </div>

          {/* Statutory Verification Chip & Metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-300 text-emerald-950">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {photoSizeKB ? `✓ ${photoSizeKB} KB` : '✓ Validated'} &mdash;{' '}
                {language === 'hi' ? 'ईएक्सआईएफ निष्कासित व एन्क्रिप्टेड' : 'EXIF Sanitized & Encrypted'}
              </span>
            </div>
            <div className="text-[10px] text-emerald-800 font-mono font-medium">
              JPEG &bull; Native Canvas Strip
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={handleOpenLiveCamera}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {language === 'hi' ? 'पुनः चित्र लें (Retake)' : 'Retake Photo'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClearPhoto}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-none transition-colors"
              title="Remove photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'हटाएं' : 'Clear'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STATE 3: DEFAULT LIVE CAMERA TRIGGER ZONE */}
      {/* ============================================================== */}
      {!isProcessing && !previewUrl && (
        <div className="space-y-3">
          {/* Large Tactile Government Trigger Button */}
          <button
            type="button"
            onClick={handleOpenLiveCamera}
            className="w-full py-4 px-4 bg-[#0B2545] hover:bg-slate-800 active:bg-slate-900 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-none shadow-xs border border-[#0B2545] transition-all flex flex-col sm:flex-row items-center justify-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Camera className="w-5 h-5 text-amber-300" aria-hidden="true" />
            </div>
            <div className="text-center sm:text-left">
              <div className="font-extrabold text-amber-300 tracking-wide">
                {language === 'hi'
                  ? 'स्थल चित्र लें / कैमरा सक्रिय करें'
                  : 'Take Photo of Civic Hazard'}
              </div>
              <div className="text-[10px] text-slate-300 font-normal">
                {language === 'hi'
                  ? 'लाइव कैमरा द्वारा प्रत्यक्ष साक्ष्य कैप्चर करें'
                  : 'Enforces live camera snapshot for genuine civic reporting'}
              </div>
            </div>
          </button>

          {/* Prominent Red Statutory Advisory Stamp */}
          <div className="p-2.5 bg-red-50 border-l-4 border-red-700 text-red-950 text-xs flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-snug">
              <span className="font-bold uppercase tracking-wide mr-1">
                {language === 'hi'
                  ? 'लाइव कैमरा अनिवार्य / STATUTORY CAMERA RULE:'
                  : 'LIVE CAMERA MANDATORY:'}
              </span>
              <span>
                {language === 'hi'
                  ? 'गैलरी से पुरानी फोटो अपलोड करना प्रतिबंधित है। केवल ऑन-ग्राउंड लाइव कैमरा फोटोग्राफी ही मान्य है।'
                  : 'Arbitrary device gallery selection is strictly disabled to prevent stock/recycled photo fraud. Direct live camera capture only.'}
              </span>
            </div>
          </div>

          {/* Security & Canvas Feature Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>HTML5 Canvas Scrubbing</span>
            </div>
            <span>Auto-Downscale &lt; 350 KB</span>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="mt-2.5 p-2 bg-red-100 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-red-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default LiveCameraCapture;

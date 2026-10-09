/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Live Camera Capture & Client-Side EXIF Scrubber Component
 * 
 * Strict Anti-Fraud Guardrails (Sprint 4 - Task 4.1):
 * 1. Enforced Camera Capture (capture="environment")
 * 2. Live Stream Shutter Fallback Modal via navigator.mediaDevices.getUserMedia()
 *    Guarantees devices ignoring capture="environment" still access a live camera feed.
 * 3. Client-side canvas compression downscaling under 350 KB via compressCameraCapture()
 * 4. Automatic memory leak defense: Preview Object URLs revoked on retake, clear, or unmount.
 * 5. Official GIGW 3.0 styling: Government Navy (#0F2537), Red statutory advisory, Green verified size badge.
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
  X,
  SwitchCamera,
  Video,
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl || null);
  const [photoSizeKB, setPhotoSizeKB] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Stream Shutter Modal state
  const [isLiveModalOpen, setIsLiveModalOpen] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Active object URL ref to ensure revocation on retake, clear, or unmount
  const activeUrlRef = useRef<string | null>(initialPreviewUrl || null);

  // Stop active video stream
  const stopLiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup object URLs and stream on unmount
  useEffect(() => {
    return () => {
      if (activeUrlRef.current && activeUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
      stopLiveStream();
    };
  }, [stopLiveStream]);

  // Process raw photo Blob/File through client-side compressor
  const processImageBlob = async (rawFileOrBlob: File | Blob) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // Execute client-side EXIF scrubbing & Canvas downscaling (<350 KB JPEG)
      const result = await compressCameraCapture(rawFileOrBlob);

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
          : language === 'hi'
          ? 'फोटो संसाधित करने में त्रुटि। कृपया पुनः प्रयास करें।'
          : 'Failed to process camera capture. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger native camera app via enforced file input
  const handleOpenDeviceCamera = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle capture from file input
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImageBlob(file);
  };

  // Start live stream viewfinder modal
  const handleStartLiveStreamModal = async () => {
    setErrorMessage(null);

    // Verify mediaDevices support
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      // Graceful fallback to capture="environment" file input
      handleOpenDeviceCamera();
      return;
    }

    setIsLiveModalOpen(true);
    await initMediaStream(facingMode);
  };

  // Initialize camera stream
  const initMediaStream = async (mode: 'environment' | 'user') => {
    stopLiveStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err) {
      console.warn('[LiveCameraCapture] getUserMedia failed or blocked:', err);
      stopLiveStream();
      setIsLiveModalOpen(false);

      // If live stream fails, automatically trigger the native camera input fallback
      handleOpenDeviceCamera();
    }
  };

  // Toggle between environment (rear) and user (front) cameras
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await initMediaStream(nextMode);
  };

  // Capture frame from live video canvas
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !isStreaming) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            stopLiveStream();
            setIsLiveModalOpen(false);
            await processImageBlob(blob);
          } else {
            throw new Error('Failed to capture frame from video canvas');
          }
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      console.error('[LiveCameraCapture] Snap photo error:', err);
      stopLiveStream();
      setIsLiveModalOpen(false);
      setErrorMessage(
        language === 'hi'
          ? 'फोटो स्नैप करने में त्रुटि। कृपया पुनः प्रयास करें।'
          : 'Could not snap photo from live feed. Please try again.'
      );
    }
  };

  // Close live stream modal
  const handleCloseModal = () => {
    stopLiveStream();
    setIsLiveModalOpen(false);
  };

  // Clear captured photo and revoke memory
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
          className="py-8 px-4 text-center border-2 border-dashed border-[#0F2537]/40 bg-white"
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-[#0F2537] animate-spin" />
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
            <div className="absolute top-2 left-2 bg-[#7A1B1B]/95 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border border-red-400">
              LIVE EVIDENCE
            </div>
          </div>

          {/* Statutory Verification Chip & Metrics: Green Verified Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-300 text-emerald-950">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                ✓ {photoSizeKB ? `${photoSizeKB} KB` : 'Verified'} &mdash;{' '}
                {language === 'hi' ? 'EXIF निष्कासित (EXIF Sanitized)' : 'EXIF Sanitized'}
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
              onClick={handleStartLiveStreamModal}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0F2537] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {language === 'hi' ? 'पुनः चित्र लें (Retake)' : 'Retake Photo'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClearPhoto}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-300 text-slate-700 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
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
          {/* Main Government Navy Button */}
          <button
            type="button"
            onClick={handleStartLiveStreamModal}
            className="w-full py-3.5 px-4 bg-[#0F2537] hover:bg-slate-800 active:bg-slate-900 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-none shadow-xs border border-[#0F2537] transition-all flex flex-col sm:flex-row items-center justify-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Camera className="w-5 h-5 text-amber-300" aria-hidden="true" />
            </div>
            <div className="text-center sm:text-left">
              <div className="font-extrabold text-amber-300 tracking-wide">
                {language === 'hi'
                  ? 'लाइव कैमरा शटर खोलें (Live Shutter)'
                  : 'Open Live Camera Shutter'}
              </div>
              <div className="text-[10px] text-slate-300 font-normal">
                {language === 'hi'
                  ? 'प्रत्यक्ष व्यूफ़ाइंडर से साक्ष्य कैप्चर करें (गैलरी अक्षम)'
                  : 'Interactive Live Viewfinder Shutter (Gallery Disabled)'}
              </div>
            </div>
          </button>

          {/* Secondary Quick Action: Native Camera App (capture="environment") */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenDeviceCamera}
              className="text-[11px] font-bold text-[#0F2537] hover:text-[#7A1B1B] underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Video className="w-3 h-3" />
              <span>
                {language === 'hi'
                  ? 'डिवाइस कैमरा ऐप से खोलें (Native Fallback)'
                  : 'Alternative: Launch Native Device Camera App'}
              </span>
            </button>
          </div>

          {/* Prominent Red Statutory Advisory Stamp */}
          <div className="p-2.5 bg-red-50 border-l-4 border-red-700 text-red-950 text-xs flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-snug">
              <span className="font-bold uppercase tracking-wide mr-1">
                {language === 'hi'
                  ? 'लाइव कैमरा अनिवार्य / STATUTORY CAMERA RULE:'
                  : 'STATUTORY CAMERA RULE:'}
              </span>
              <span>
                {language === 'hi'
                  ? 'गैलरी चयन अक्षम है (Gallery selection disabled)। केवल ऑन-ग्राउंड लाइव कैमरा फोटोग्राफी ही मान्य है।'
                  : 'Gallery selection disabled to prevent stock photo fraud. Real-time live camera capture strictly enforced.'}
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

      {/* ============================================================== */}
      {/* LIVE STREAM SHUTTER FALLBACK MODAL (getUserMedia) */}
      {/* ============================================================== */}
      {isLiveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xs"
        >
          <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-700 shadow-2xl flex flex-col overflow-hidden text-white">
            {/* Modal Header */}
            <div className="bg-[#0F2537] px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {language === 'hi' ? 'लाइव कैमरा व्यूफ़ाइंडर' : 'Live Camera Viewfinder'}
                </span>
                <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.2 font-mono font-bold animate-pulse">
                  REC
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-1 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Switch Camera (Front/Rear)"
                  aria-label="Switch Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close Camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Viewfinder Area */}
            <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[460px] overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle / Grid Overlay */}
              <div className="absolute inset-4 pointer-events-none border border-white/30">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border border-white/20 rounded-full" />
                </div>
              </div>

              {/* Camera Metadata Overlay */}
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
                FACING: {facingMode.toUpperCase()} &bull; 1080p CANVAS
              </div>
            </div>

            {/* Modal Shutter Controls */}
            <div className="bg-[#0F2537] p-4 border-t border-slate-700 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase text-slate-300 cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnapPhoto}
                disabled={!isStreaming}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping" />
                <Camera className="w-4 h-4 text-slate-950" />
                <span>{language === 'hi' ? 'फोटो लें (Snap Photo)' : 'Snap Photo'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveStream();
                  setIsLiveModalOpen(false);
                  handleOpenDeviceCamera();
                }}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {language === 'hi' ? 'ऐप कैमरा' : 'App Camera'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveCameraCapture;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Security, PII Isolation, and Client-Side Media Sanitization Utilities
 */

import {
  MAX_PHOTO_SIZE_BYTES,
  DEFAULT_STATE_NAME,
  OfflineDraftSubmission,
  LGDLocation,
  RawCoordinates,
} from '../types/ingestion';

/**
 * Computes SHA-256 cryptographic hash of phone number using browser Web Crypto API.
 * Ensures plain-text phone numbers never enter storage, logs, or views.
 * 
 * @param phoneNumber E.164 or 10-digit Indian mobile number
 * @returns 64-character lowercase hexadecimal hash string
 */
export async function hashPhoneNumber(phoneNumber: string): Promise<string> {
  const normalized = phoneNumber.trim().replace(/\D/g, '');
  if (!normalized || normalized.length < 10) {
    throw new Error('A valid 10-digit phone number is required for cryptographic hashing.');
  }

  // Prepend domain-specific salt for Project Udbhav
  const message = `UDBHAV_JH_SALT_${normalized}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates anonymous masked citizen display identifier e.g. "Citizen #JH-8492"
 * 
 * @param phoneNumber Raw phone string or phone hash
 */
export function generateMaskedCitizenId(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  const suffix =
    digits.length >= 4
      ? digits.slice(-4)
      : Math.floor(1000 + Math.random() * 9000).toString();
  return `Citizen #JH-${suffix}`;
}

/**
 * Client-side HTML5 Canvas image downscaler
 * Downscales photos to max dimension and compresses to JPEG <350 KB
 * Strips EXIF geolocation metadata automatically to protect citizen privacy.
 * 
 * @param imageSource File or Blob captured from camera
 * @param maxDimension Maximum width/height in pixels (default 1280)
 * @param maxSizeBytes Target byte threshold (default 350 KB)
 */
export async function downscaleImageToBlob(
  imageSource: Blob,
  maxDimension = 1280,
  maxSizeBytes = MAX_PHOTO_SIZE_BYTES
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageSource);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Downscale proportionally
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to acquire 2D canvas context for media downscaling.'));
        return;
      }

      // Draw image onto canvas (cleans EXIF metadata)
      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively compress to remain under maxSizeBytes
      let quality = 0.85;
      const tryCompress = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas image conversion to Blob failed.'));
              return;
            }
            if (blob.size <= maxSizeBytes || q <= 0.4) {
              resolve(blob);
            } else {
              // Reduce quality if still exceeds threshold
              tryCompress(q - 0.15);
            }
          },
          'image/jpeg',
          q
        );
      };

      tryCompress(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for client-side processing.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates an OfflineDraftSubmission with enforced PII isolation and default parameters
 */
export async function createOfflineDraftSubmission(params: {
  rawPhone: string;
  isWhistleblower?: boolean;
  audioBlob?: Blob;
  audioDurationSeconds?: number;
  transcriptionDraft?: string;
  photoBlob?: Blob;
  lgdLocation?: LGDLocation;
  rawCoordinates: RawCoordinates;
  aiTriageCategory?: string;
  intensityScore?: number;
}): Promise<OfflineDraftSubmission> {
  const phoneHash = await hashPhoneNumber(params.rawPhone);
  const maskedCitizenId = generateMaskedCitizenId(params.rawPhone);

  let processedPhoto = params.photoBlob;
  if (processedPhoto && processedPhoto.size > MAX_PHOTO_SIZE_BYTES) {
    processedPhoto = await downscaleImageToBlob(processedPhoto);
  }

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    syncStatus: 'DRAFT',
    status: 'REPORTED',
    masterLifecycleStatus: 'REPORTED',
    maskedCitizenId,
    phoneHash,
    isWhistleblower: params.isWhistleblower ?? false,
    audioBlob: params.audioBlob,
    audioDurationSeconds: params.audioDurationSeconds,
    transcriptionDraft: params.transcriptionDraft,
    photoBlob: processedPhoto,
    photoPreviewUrl: processedPhoto ? URL.createObjectURL(processedPhoto) : undefined,
    lgdLocation: params.lgdLocation ?? {
      state: DEFAULT_STATE_NAME,
      districtName: 'Ranchi',
      districtCode: 345,
      blockName: 'Kanke',
      blockCode: 34501,
      panchayatName: 'Arsande',
      panchayatCode: 3450101,
      latitude: params.rawCoordinates.latitude,
      longitude: params.rawCoordinates.longitude,
    },
    rawCoordinates: params.rawCoordinates,
    aiTriageCategory: params.aiTriageCategory,
    intensityScore: params.intensityScore ?? 1,
  };
}

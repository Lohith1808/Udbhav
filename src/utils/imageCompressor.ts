/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Client-Side HTML5 Canvas Image Downscaler & EXIF Metadata Scrubber
 * 
 * Strict Anti-Fraud Guardrails & Security Compliance:
 * 1. Native EXIF Scrubbing: Drawing raw frames to an offscreen HTML5 canvas natively
 *    strips all hardware serials, GPS coordinates, and camera vendor tags.
 * 2. Strict Payload Bounding (<= 350 KB): Iterative quality reduction and resolution
 *    downscaling strictly ensures the final JPEG is <= 350 KB.
 * 3. Explicit Error Handling: Throws explicit exceptions if canvas decoding or export
 *    fails, strictly preventing raw unscrubbed or oversized files from leaking.
 * 4. Memory Leak Defense: Explicit canvas teardown (0x0 buffers) and object URL revocation.
 */

export interface CompressionResult {
  blob: Blob;
  previewUrl: string;
  sizeKB: number;
  width: number;
  height: number;
}

/**
 * Compresses, downscales, and scrubs an image captured from the live camera.
 * 
 * @param file Raw photo File or Blob from camera capture
 * @param maxDimension Maximum bounding dimension for width or height (default 1280px)
 * @param initialQuality Starting JPEG compression quality between 0.0 and 1.0 (default 0.75)
 * @param maxSizeBytes Strict upper threshold for payload (default 358400 bytes = 350 KB)
 * @returns Sanitized Blob, preview Object URL, and image metrics
 */
export async function compressCameraCapture(
  file: File | Blob,
  maxDimension = 1280,
  initialQuality = 0.75,
  maxSizeBytes = 358400
): Promise<CompressionResult> {
  // 1. Strict validation of input payload
  if (!file || !(file instanceof Blob)) {
    throw new Error('Invalid image payload: Input must be a valid File or Blob.');
  }

  // Verify mime type if specified
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error(`Unsupported media type (${file.type}). Live camera input must be an image.`);
  }

  // Create temporary object URL for HTML5 Image element decoding
  const temporarySourceUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        reject(new Error('Failed to decode camera image. The file may be corrupt or unreadable.'));
      };
      image.src = temporarySourceUrl;
    });

    let { width, height } = img;

    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error('Invalid image dimensions: Unable to determine valid image width and height.');
    }

    // Calculate initial proportional bounding box
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // Allocate offscreen HTML5 canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context for client-side processing.');
    }

    // Function to render frame onto canvas with white background
    const renderFrame = (targetW: number, targetH: number) => {
      canvas.width = targetW;
      canvas.height = targetH;
      // White background handles any alpha channel or transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      // Drawing directly onto the canvas strips all EXIF markers, GPS headers, and device IDs
      ctx.drawImage(img, 0, 0, targetW, targetH);
    };

    renderFrame(width, height);

    // Helper promise wrapper for canvas.toBlob with explicit error propagation
    const serializeCanvasToBlob = (quality: number): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        try {
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                reject(new Error('Canvas JPEG encoding failed: Resulting blob is null or empty.'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          reject(new Error(`Canvas export failed: ${err instanceof Error ? err.message : String(err)}`));
        }
      });
    };

    // Step 1: Initial compression attempt
    let currentQuality = initialQuality;
    let finalBlob: Blob;

    try {
      finalBlob = await serializeCanvasToBlob(currentQuality);
    } catch (exportErr) {
      canvas.width = 0;
      canvas.height = 0;
      throw new Error(
        `Failed to scrub and compress image: ${exportErr instanceof Error ? exportErr.message : 'Canvas export failure'}`
      );
    }

    // Step 2: Quality stepping down to 0.3 if payload exceeds maxSizeBytes
    while (finalBlob.size > maxSizeBytes && currentQuality > 0.3) {
      currentQuality = Math.max(0.25, currentQuality - 0.15);
      finalBlob = await serializeCanvasToBlob(currentQuality);
    }

    // Step 3: Resolution downscaling if quality reduction alone is insufficient to meet <= 350 KB
    let currentWidth = width;
    let currentHeight = height;
    while (finalBlob.size > maxSizeBytes && currentWidth > 320 && currentHeight > 240) {
      currentWidth = Math.round(currentWidth * 0.8);
      currentHeight = Math.round(currentHeight * 0.8);
      renderFrame(currentWidth, currentHeight);
      finalBlob = await serializeCanvasToBlob(currentQuality);
    }

    // Step 4: Final boundary check — strictly <= maxSizeBytes (350 KB)
    if (finalBlob.size > maxSizeBytes) {
      // Last-resort attempt with aggressive scale and low quality
      currentWidth = Math.round(currentWidth * 0.7);
      currentHeight = Math.round(currentHeight * 0.7);
      renderFrame(currentWidth, currentHeight);
      finalBlob = await serializeCanvasToBlob(0.2);

      if (finalBlob.size > maxSizeBytes) {
        canvas.width = 0;
        canvas.height = 0;
        throw new Error(
          `Image compression failed: Final payload (${Math.round(finalBlob.size / 1024)} KB) exceeds strict threshold of ${Math.round(maxSizeBytes / 1024)} KB.`
        );
      }
    }

    // Teardown canvas to avoid retaining large pixel buffers on constrained Android hardware
    canvas.width = 0;
    canvas.height = 0;

    const sizeKB = Math.round((finalBlob.size / 1024) * 10) / 10;
    const previewUrl = URL.createObjectURL(finalBlob);

    return {
      blob: finalBlob,
      previewUrl,
      sizeKB,
      width: currentWidth,
      height: currentHeight,
    };
  } finally {
    // Memory leak defense: Revoke raw source object URL immediately after canvas decode
    URL.revokeObjectURL(temporarySourceUrl);
  }
}

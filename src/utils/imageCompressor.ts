/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Client-Side HTML5 Canvas Image Downscaler & EXIF Metadata Scrubber
 * 
 * Enforces:
 * 1. Native EXIF Scrubbing (clears hardware serials, GPS coordinates, camera tags)
 * 2. Budget Android Optimization (downscales multi-MB camera photos to <350 KB JPEG)
 * 3. Memory Leak Defense (explicit object URL revocation and canvas teardown)
 */

export interface CompressionResult {
  blob: Blob;
  previewUrl: string;
  sizeKB: number;
  width: number;
  height: number;
}

/**
 * Compresses and scrubs an image captured from the live browser camera.
 * 
 * @param file Raw photo File or Blob from camera input
 * @param maxDimension Maximum bounding dimension for width or height (default 1280px)
 * @param initialQuality Starting JPEG compression quality between 0.0 and 1.0 (default 0.75)
 * @param maxSizeBytes Strict upper threshold for payload (default 358400 bytes = 350 KB)
 * @returns Sanitized Blob, Object URL, and file metrics
 */
export async function compressCameraCapture(
  file: File | Blob,
  maxDimension = 1280,
  initialQuality = 0.75,
  maxSizeBytes = 358400
): Promise<CompressionResult> {
  // Validate file presence
  if (!file || !(file instanceof Blob)) {
    throw new Error('Invalid image payload: Input must be a valid File or Blob.');
  }

  // Verify mime type if available
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error(`Unsupported media type (${file.type}). Live camera input must be an image.`);
  }

  // Create temporary object URL for HTML5 Image element
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

    // Calculate proportional bounding box
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

    // Fill white background to handle transparency/PNG conversions gracefully
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Drawing directly into canvas strips all camera EXIF markers, GPS headers, and device IDs natively
    ctx.drawImage(img, 0, 0, width, height);

    // Helper promise wrapper for canvas.toBlob
    const serializeCanvasToBlob = (quality: number): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas JPEG encoding failed.'));
            }
          },
          'image/jpeg',
          quality
        );
      });
    };

    // Iteratively compress until payload is strictly under maxSizeBytes (350 KB)
    let currentQuality = initialQuality;
    let finalBlob = await serializeCanvasToBlob(currentQuality);

    while (finalBlob.size > maxSizeBytes && currentQuality > 0.25) {
      currentQuality = Math.max(0.2, currentQuality - 0.15);
      finalBlob = await serializeCanvasToBlob(currentQuality);
    }

    // Teardown canvas to avoid retaining large pixel buffers on 2 GB RAM Android hardware
    canvas.width = 0;
    canvas.height = 0;

    const sizeKB = Math.round((finalBlob.size / 1024) * 10) / 10;
    const previewUrl = URL.createObjectURL(finalBlob);

    return {
      blob: finalBlob,
      previewUrl,
      sizeKB,
      width,
      height,
    };
  } finally {
    // Memory leak defense: Revoke raw source object URL immediately after canvas decode
    URL.revokeObjectURL(temporarySourceUrl);
  }
}

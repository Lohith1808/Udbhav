/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Shared Binary Blob Thumbnail Viewer
 *
 * Renders binary Blobs persisted in client-side IndexedDB with automatic
 * object URL creation and revocation to prevent memory leaks.
 * Genuinely shared UI — contains no stakeholder-specific business logic.
 */

import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

export interface BlobThumbnailProps {
  blob?: Blob;
  previewUrl?: string;
}

export const BlobThumbnail: React.FC<BlobThumbnailProps> = ({ blob, previewUrl }) => {
  const [localUrl, setLocalUrl] = useState<string | null>(previewUrl || null);

  useEffect(() => {
    if (previewUrl) {
      setLocalUrl(previewUrl);
      return;
    }
    if (!blob) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setLocalUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, previewUrl]);

  if (!localUrl) {
    return (
      <div
        className="w-13 h-13 bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0 select-none"
        title="No Live Photo Attached"
      >
        <Camera className="w-4 h-4 text-slate-400" />
        <span className="text-[8px] text-slate-400 font-mono mt-0.5 font-bold">NO PIC</span>
      </div>
    );
  }

  return (
    <div className="relative group shrink-0 select-none">
      <img
        src={localUrl}
        alt="Civic Hazard Evidence"
        className="w-13 h-13 object-cover border border-slate-400 bg-slate-900 shadow-2xs"
      />
      <span className="absolute bottom-0 right-0 bg-[#0B2545] text-[#F8E7A2] text-[8px] font-mono px-1 font-bold">
        LIVE
      </span>
    </div>
  );
};

export default BlobThumbnail;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Low-Bandwidth GPS & LGD Hierarchy Auto-Tagger Component
 * 
 * Enforces:
 * 1. Strict Jharkhand Territorial Perimeter Verification (~Lat 21.9° - 25.3° N, Long 83.3° - 87.9° E)
 * 2. On-Demand GPS Acquisition (zero continuous battery drain)
 * 3. Offline-First Cascading LGD Fallback (District -> Block -> Gram Panchayat)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LGDLocation,
  RawCoordinates,
} from '../../../types/ingestion';
import {
  isWithinJharkhand,
  reverseGeocodeToLGD,
  getDistrictsList,
  getBlocksForDistrict,
  getPanchayatsForBlock,
  getLGDLocationFromCodes,
} from '../../../utils/lgdGeoMapper';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Navigation,
  Globe2,
  Check,
  ShieldCheck,
} from 'lucide-react';

export interface LGDGeoTaggerProps {
  /** Callback fired whenever valid Jharkhand LGD coordinates are resolved */
  onLocationResolved: (location: LGDLocation, rawCoordinates?: RawCoordinates) => void;
  /** Bilingual mode: 'hi' for Hindi, 'en' for English */
  language?: 'hi' | 'en';
  /** Optional custom CSS classes */
  className?: string;
  /** Optional initial location */
  initialLocation?: LGDLocation;
}

export const LGDGeoTagger: React.FC<LGDGeoTaggerProps> = ({
  onLocationResolved,
  language = 'en',
  className = '',
  initialLocation,
}) => {
  // Cascading dropdown state
  const districts = getDistrictsList();
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number>(() => {
    return initialLocation?.districtCode || (districts[0]?.code ?? 351);
  });

  const [blocks, setBlocks] = useState(() => getBlocksForDistrict(selectedDistrictCode));
  const [selectedBlockCode, setSelectedBlockCode] = useState<number>(() => {
    return initialLocation?.blockCode || (blocks[0]?.code ?? 3188);
  });

  const [panchayats, setPanchayats] = useState(() => getPanchayatsForBlock(selectedBlockCode));
  const [selectedPanchayatCode, setSelectedPanchayatCode] = useState<number>(() => {
    return initialLocation?.panchayatCode || (panchayats[0]?.code ?? 114829);
  });

  // GPS auto-detect states
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [outOfStateCoords, setOutOfStateCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsNoticeMessage, setGpsNoticeMessage] = useState<string | null>(null);
  const [isGpsResolved, setIsGpsResolved] = useState<boolean>(false);

  // Synchronize blocks when district changes
  const handleDistrictChange = (newDistrictCode: number) => {
    setSelectedDistrictCode(newDistrictCode);
    const newBlocks = getBlocksForDistrict(newDistrictCode);
    setBlocks(newBlocks);

    const firstBlockCode = newBlocks[0]?.code || 0;
    setSelectedBlockCode(firstBlockCode);

    const newPanchayats = getPanchayatsForBlock(firstBlockCode);
    setPanchayats(newPanchayats);

    const firstPanchayatCode = newPanchayats[0]?.code || 0;
    setSelectedPanchayatCode(firstPanchayatCode);

    setOutOfStateCoords(null);
    setIsGpsResolved(false);

    // Propagate updated manual location
    const loc = getLGDLocationFromCodes(newDistrictCode, firstBlockCode, firstPanchayatCode);
    if (loc) {
      onLocationResolved(loc, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: 50,
      });
    }
  };

  // Synchronize panchayats when block changes
  const handleBlockChange = (newBlockCode: number) => {
    setSelectedBlockCode(newBlockCode);
    const newPanchayats = getPanchayatsForBlock(newBlockCode);
    setPanchayats(newPanchayats);

    const firstPanchayatCode = newPanchayats[0]?.code || 0;
    setSelectedPanchayatCode(firstPanchayatCode);

    setOutOfStateCoords(null);
    setIsGpsResolved(false);

    const loc = getLGDLocationFromCodes(selectedDistrictCode, newBlockCode, firstPanchayatCode);
    if (loc) {
      onLocationResolved(loc, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: 50,
      });
    }
  };

  // Handle panchayat change
  const handlePanchayatChange = (newPanchayatCode: number) => {
    setSelectedPanchayatCode(newPanchayatCode);
    setOutOfStateCoords(null);
    setIsGpsResolved(false);

    const loc = getLGDLocationFromCodes(selectedDistrictCode, selectedBlockCode, newPanchayatCode);
    if (loc) {
      onLocationResolved(loc, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: 50,
      });
    }
  };

  // On-Demand GPS Acquisition (zero continuous tracking)
  const handleAcquireGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsNoticeMessage(
        language === 'hi'
          ? 'ब्राउज़र द्वारा जियोलोकेशन समर्थित नहीं है। कृपया मैन्युअल रूप से चयन करें।'
          : 'Geolocation not supported by browser. Please select manually.'
      );
      return;
    }

    setIsAcquiringGps(true);
    setGpsNoticeMessage(null);
    setOutOfStateCoords(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsAcquiringGps(false);
        const { latitude, longitude, accuracy } = position.coords;

        // Guardrail 1: Validate within Jharkhand State Perimeter
        if (!isWithinJharkhand(latitude, longitude)) {
          setOutOfStateCoords({ lat: latitude, lng: longitude });
          setIsGpsResolved(false);
          return;
        }

        // Reverse geocode to nearest LGD hierarchy
        const resolved = reverseGeocodeToLGD(latitude, longitude);
        if (resolved) {
          // Synchronize dropdowns with resolved location
          setSelectedDistrictCode(resolved.districtCode);

          const matchedBlocks = getBlocksForDistrict(resolved.districtCode);
          setBlocks(matchedBlocks);
          setSelectedBlockCode(resolved.blockCode);

          const matchedPanchayats = getPanchayatsForBlock(resolved.blockCode);
          setPanchayats(matchedPanchayats);
          setSelectedPanchayatCode(resolved.panchayatCode);

          setGpsAccuracy(Math.round(accuracy));
          setIsGpsResolved(true);
          setOutOfStateCoords(null);

          // Emit verified location to caller
          onLocationResolved(resolved, {
            latitude,
            longitude,
            accuracyMeters: Math.round(accuracy),
          });
        }
      },
      (error) => {
        setIsAcquiringGps(false);
        setIsGpsResolved(false);
        let msg =
          language === 'hi'
            ? 'जीपीएस त्रुटि: कृपया नीचे दिए गए ड्रॉपडाउन से पंचायत चुनें।'
            : 'GPS acquisition failed or timed out. Please select from dropdowns below.';

        if (error.code === error.PERMISSION_DENIED) {
          msg =
            language === 'hi'
              ? 'जीपीएस अनुमति अस्वीकृत। कृपया मैन्युअल रूप से अपना जिला व पंचायत चुनें।'
              : 'GPS permission denied. Please select your District and Panchayat manually below.';
        }
        setGpsNoticeMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [language, onLocationResolved]);

  // Initial resolution on mount if none provided
  useEffect(() => {
    if (!initialLocation) {
      const initial = getLGDLocationFromCodes(
        selectedDistrictCode,
        selectedBlockCode,
        selectedPanchayatCode
      );
      if (initial) {
        onLocationResolved(initial, {
          latitude: initial.latitude,
          longitude: initial.longitude,
          accuracyMeters: 50,
        });
      }
    }
  }, []); // Run once on mount

  // Active selected entities for display
  const activeDistrict = districts.find((d) => d.code === selectedDistrictCode);
  const activeBlock = blocks.find((b) => b.code === selectedBlockCode);
  const activePanchayat = panchayats.find((p) => p.code === selectedPanchayatCode);

  return (
    <div className={`space-y-3 select-none ${className}`}>
      {/* 1. Header with On-Demand GPS Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Globe2 className="w-4 h-4 text-emerald-700" />
          <span>
            {language === 'hi'
              ? 'एल.जी.डी. प्रशासनिक क्षेत्राधिकार'
              : 'LGD Spatial Administrative Hierarchy'}
          </span>
        </div>

        {/* On-Demand GPS Auto-Detect Button */}
        <button
          type="button"
          onClick={handleAcquireGps}
          disabled={isAcquiringGps}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-slate-800 active:scale-95 text-[#F8E7A2] text-xs font-bold uppercase tracking-wider rounded-none shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isAcquiringGps ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              <span>
                {language === 'hi'
                  ? 'जीपीएस लॉक प्राप्त हो रहा है...'
                  : 'Acquiring GPS Lock...'}
              </span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {language === 'hi'
                  ? 'स्थान स्वतः प्राप्त करें'
                  : 'Auto-Detect Civic GPS'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* OUT-OF-STATE ERROR WARNING BANNER */}
      {/* ============================================================== */}
      {outOfStateCoords && (
        <div
          role="alert"
          className="p-3 bg-red-100 border-2 border-red-700 text-red-950 text-xs flex items-start gap-2 rounded-none"
        >
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <div className="font-extrabold uppercase tracking-wide text-red-900">
              {language === 'hi'
                ? 'अमान्य क्षेत्राधिकार (झारखंड सीमा से बाहर)'
                : 'JURISDICTION ERROR: Outside Jharkhand Boundary'}
            </div>
            <div className="mt-0.5 text-[11px] text-red-900/90">
              {language === 'hi'
                ? `प्राप्त निर्देशांक (${outOfStateCoords.lat.toFixed(4)}° N, ${outOfStateCoords.lng.toFixed(4)}° E) झारखंड राज्य की भौगोलिक सीमा से बाहर हैं। उद्भव पोर्टल केवल झारखंड क्षेत्राधिकार की समस्याओं को स्वीकार करता है।`
                : `Detected coordinates (${outOfStateCoords.lat.toFixed(4)}° N, ${outOfStateCoords.lng.toFixed(4)}° E) fall outside Jharkhand territorial boundaries. Civic R&D problems are strictly restricted to Jharkhand jurisdiction.`}
            </div>
          </div>
        </div>
      )}

      {/* GPS Notice / Timeout Notification */}
      {gpsNoticeMessage && (
        <div className="p-2 bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{gpsNoticeMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* RESOLVED IN-STATE STATUTORY BADGE */}
      {/* ============================================================== */}
      {isGpsResolved && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-400 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {activePanchayat?.name} GP ({activeBlock?.name}, {activeDistrict?.name})
            </span>
            <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.2 font-mono">
              LGD Code: {selectedPanchayatCode}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-emerald-800 font-mono">
            {gpsAccuracy !== null && <span>Accuracy: &plusmn;{gpsAccuracy}m</span>}
            <span className="border-l border-emerald-300 pl-2 text-emerald-900 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              <span>Perimeter Verified</span>
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CASCADING DROPDOWNS (District -> Block -> Gram Panchayat) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-300 p-2.5">
        {/* District Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
            {language === 'hi' ? 'जिला / District *' : 'District *'}
          </label>
          <select
            value={selectedDistrictCode}
            onChange={(e) => handleDistrictChange(Number(e.target.value))}
            className="w-full text-xs p-1.5 border border-slate-400 bg-white rounded-none focus:outline-none focus:border-[#0B2545] font-sans"
          >
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        {/* Block Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
            {language === 'hi' ? 'प्रखंड / Block *' : 'Block *'}
          </label>
          <select
            value={selectedBlockCode}
            onChange={(e) => handleBlockChange(Number(e.target.value))}
            className="w-full text-xs p-1.5 border border-slate-400 bg-white rounded-none focus:outline-none focus:border-[#0B2545] font-sans"
          >
            {blocks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Gram Panchayat Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
            {language === 'hi' ? 'ग्राम पंचायत / GP *' : 'Gram Panchayat *'}
          </label>
          <select
            value={selectedPanchayatCode}
            onChange={(e) => handlePanchayatChange(Number(e.target.value))}
            className="w-full text-xs p-1.5 border border-slate-400 bg-white rounded-none focus:outline-none focus:border-[#0B2545] font-sans"
          >
            {panchayats.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Official State Boundary Verification Stamp Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500 font-mono px-1">
        <div className="flex items-center gap-1.5 text-slate-600">
          <MapPin className="w-3 h-3 text-[#7A1B1B]" />
          <span>
            State: Jharkhand &bull; LGD Code: {selectedPanchayatCode} &bull; Lat:{' '}
            {activePanchayat?.latitude.toFixed(2)}&deg; N, Lng:{' '}
            {activePanchayat?.longitude.toFixed(2)}&deg; E
          </span>
        </div>
        <div className="text-emerald-700 font-semibold flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-700" />
          <span>LGD 24-District Synchronized</span>
        </div>
      </div>
    </div>
  );
};

export default LGDGeoTagger;

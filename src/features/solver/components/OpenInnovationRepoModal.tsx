/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Open-Source Innovation Repository & Gap Benchmarking Modal (Sprint 8 — Task 8.4)
 *
 * Section A: Prior Generation Archive (Gen-1 Peer Prototypes & Comparative Failure Matrix)
 * Section B: Iterative Gap Analysis & 2nd-Gen Solution Formulation (Dexie IndexedDB + Mesh Sync)
 */

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  X,
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  TableProperties,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Building2,
  Compass,
} from 'lucide-react';
import {
  saveGapBenchmark,
  getGapBenchmarks,
  InnovationGapBenchmark,
  EngineeringShortcoming,
} from '../../../lib/db';
import { centralSyncService } from '../../../services/centralSyncService';

export interface OpenInnovationRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefId: string;
  briefTitle: string;
  domainSector: string;
  targetDistrict: string;
}

export interface PeerPrototypeArchive {
  id: string;
  title: string;
  generation: string;
  institution: string;
  clusterName: string;
  targetThroughput: string;
  observedThroughput: string;
  throughputDeltaPct: number; // e.g. -60%
  powerHeadRequirement: string;
  powerHeadTarget: string;
  bomCostInr: number;
  bomBudgetCapInr: number;
  costDeltaPct: number; // e.g. +36%
  failurePoint: string;
  cadSchematicFilename: string;
  cadSchematicSize: string;
  bomFilename: string;
  bomLineItemsCount: number;
  license: string;
}

const SHORTCOMING_OPTIONS: Array<{
  value: EngineeringShortcoming;
  labelEn: string;
  labelHi: string;
  iconBg: string;
}> = [
  {
    value: 'FILTRATION_CLOGGING',
    labelEn: 'Filtration & Silt Clogging',
    labelHi: 'निस्पंदन एवं तलछट अवरोध',
    iconBg: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    value: 'COST_OVERRUN',
    labelEn: 'BOM Cost Overrun (> Budget Cap)',
    labelHi: 'लागत आधिक्य (> बजट सीमा)',
    iconBg: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  {
    value: 'OFF_GRID_POWER_FAILURE',
    labelEn: 'Off-Grid Power / Inverter Trip',
    labelHi: 'ऑफ-ग्रिड विद्युत विफलता',
    iconBg: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  {
    value: 'MATERIAL_DEGRADATION',
    labelEn: 'Corrosion & Media Degradation',
    labelHi: 'संक्षारण एवं सामग्री क्षरण',
    iconBg: 'bg-purple-100 text-purple-900 border-purple-300',
  },
];

/**
 * Returns collegiate peer prototypes based on the challenge brief's sector.
 */
function getPeerPrototypesForBrief(
  domainSector: string,
  targetDistrict: string,
  briefTitle: string
): PeerPrototypeArchive[] {
  const norm = (domainSector || '').toUpperCase();

  if (norm.includes('WATER')) {
    return [
      {
        id: 'PROTO-BIT-WATER-01',
        title: 'Gravity Sand-Charcoal Bio-Filter v1.2',
        generation: 'Gen-1 (2024)',
        institution: 'BIT Sindri — Dept. of Chemical Engineering',
        clusterName: `Arsenic & Iron Cluster (${targetDistrict} / Kanke)`,
        targetThroughput: '45 L/hr (Gravity Fed)',
        observedThroughput: '18 L/hr (Severe Deficit)',
        throughputDeltaPct: -60,
        powerHeadRequirement: 'Required 0.5 HP Booster Pump',
        powerHeadTarget: 'Zero-Power Gravity Head (< 1.5m)',
        bomCostInr: 3400,
        bomBudgetCapInr: 2500,
        costDeltaPct: 36,
        failurePoint:
          'High iron/ferruginous particulate clogging within 14 days of field deployment; backwash gate valve seized due to mineral incrustation; internal media channeling caused premature turbidity breakthrough.',
        cadSchematicFilename: 'CAD-SAND-CHARCOAL-V1.2.step',
        cadSchematicSize: '4.2 MB',
        bomFilename: 'BOM-BIT-SINDRI-REV3.csv',
        bomLineItemsCount: 24,
        license: 'CC-BY-SA 4.0 (Jharkhand Collegiate Open Archive)',
      },
      {
        id: 'PROTO-NIT-WATER-02',
        title: 'Activated Alumina Fluoride Adsorber Column v1.0',
        generation: 'Gen-1 (2023)',
        institution: 'NIT Jamshedpur — Dept. of Civil & Environmental Engg',
        clusterName: `High Fluoride Ground Table (${targetDistrict})`,
        targetThroughput: '30 L/hr Constant Flow',
        observedThroughput: '12 L/hr (Media Compaction)',
        throughputDeltaPct: -60,
        powerHeadRequirement: '0.2 HP Circulation Pump',
        powerHeadTarget: 'Passive Hydraulic Siphon',
        bomCostInr: 3950,
        bomBudgetCapInr: 2500,
        costDeltaPct: 58,
        failurePoint:
          'Media bed compacted rapidly under silt-laden water; chemical regeneration required corrosive acid washing unsafe for rural Gram Panchayat operators.',
        cadSchematicFilename: 'CAD-ALUMINA-COLUMN-V1.step',
        cadSchematicSize: '3.6 MB',
        bomFilename: 'BOM-NIT-ADSORBER-REV2.csv',
        bomLineItemsCount: 18,
        license: 'CC-BY-SA 4.0 (Open Hardware)',
      },
    ];
  }

  if (norm.includes('INFRASTRUCTURE') || norm.includes('CIVIL')) {
    return [
      {
        id: 'PROTO-NIT-CIVIL-01',
        title: 'Bamboo-Reinforced Modular Culvert Trench v1.0',
        generation: 'Gen-1 (2024)',
        institution: 'NIT Jamshedpur — Dept. of Civil Engineering',
        clusterName: `Monsoon Flash Erosion Cluster (${targetDistrict})`,
        targetThroughput: '1,200 L/min Runoff Clearance',
        observedThroughput: '480 L/min (Debris Choke)',
        throughputDeltaPct: -60,
        powerHeadRequirement: 'Passive Gravity Slope 2.5%',
        powerHeadTarget: 'Self-Cleaning Velocity > 0.8 m/s',
        bomCostInr: 14500,
        bomBudgetCapInr: 10000,
        costDeltaPct: 45,
        failurePoint:
          'Lateral scouring undermined bedding foundation after 72 hours of peak monsoon deluge; untreated bamboo splints rotted within 4 months due to subterranean termite/fungal infestation.',
        cadSchematicFilename: 'CAD-CULVERT-TRENCH-V1.step',
        cadSchematicSize: '6.8 MB',
        bomFilename: 'BOM-NIT-CULVERT-REV2.csv',
        bomLineItemsCount: 19,
        license: 'CC-BY-SA 4.0 (Jharkhand Collegiate Open Archive)',
      },
    ];
  }

  if (norm.includes('ENERGY') || norm.includes('ELECTRICAL')) {
    return [
      {
        id: 'PROTO-ISM-SOLAR-01',
        title: 'MPPT Solar Submersible Surface Controller v2.1',
        generation: 'Gen-1 (2024)',
        institution: 'IIT (ISM) Dhanbad — Dept. of Electrical Engineering',
        clusterName: `Off-Grid Solar Micro-Irrigation (${targetDistrict})`,
        targetThroughput: '60 L/min Discharge at 15m Head',
        observedThroughput: '32 L/min Discharge at 12m Head',
        throughputDeltaPct: -46,
        powerHeadRequirement: 'Requires 1.2 kW Array with Battery',
        powerHeadTarget: 'Direct PV-to-VFD Drive (No Batteries)',
        bomCostInr: 18200,
        bomBudgetCapInr: 15000,
        costDeltaPct: 21,
        failurePoint:
          'Inverter thermal cutout engaged at 44°C ambient noon temperatures; MOSFET switching stage lacked adequate convective heat dissipation; lightning transients caused capacitor burst.',
        cadSchematicFilename: 'CAD-SOLAR-INVERTER-V2.1.step',
        cadSchematicSize: '5.1 MB',
        bomFilename: 'BOM-ISM-SOLAR-REV4.csv',
        bomLineItemsCount: 34,
        license: 'CC-BY-SA 4.0 (Jharkhand Collegiate Open Archive)',
      },
    ];
  }

  // General Fallback
  return [
    {
      id: 'PROTO-JH-GEN1-DEFAULT',
      title: `${briefTitle.split(' ').slice(0, 4).join(' ')} Prototype v1.0`,
      generation: 'Gen-1 (2024)',
      institution: 'BIT Sindri / University Polytechnic Jharkhand',
      clusterName: `${targetDistrict} Cluster Prototype`,
      targetThroughput: '40 Units/hr Nominal Output',
      observedThroughput: '19 Units/hr Sustained Output',
      throughputDeltaPct: -52,
      powerHeadRequirement: 'Requires External Grid Line',
      powerHeadTarget: 'Passive Mechanical / Low Power (< 50W)',
      bomCostInr: 8500,
      bomBudgetCapInr: 6000,
      costDeltaPct: 41,
      failurePoint:
        'Mechanical fatigue observed on welded joints; component cost exceeded statutory grant ceiling; high maintenance dependency on district urban center.',
      cadSchematicFilename: 'CAD-OPEN-SCHEMATIC-V1.step',
      cadSchematicSize: '4.5 MB',
      bomFilename: 'BOM-OPEN-SPEC-REV1.csv',
      bomLineItemsCount: 22,
      license: 'CC-BY-SA 4.0 (Jharkhand Collegiate Open Archive)',
    },
  ];
}

export const OpenInnovationRepoModal: React.FC<OpenInnovationRepoModalProps> = ({
  isOpen,
  onClose,
  briefId,
  briefTitle,
  domainSector,
  targetDistrict,
}) => {
  // State for committed gap benchmarks
  const [benchmarks, setBenchmarks] = useState<InnovationGapBenchmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form State
  const [shortcoming, setShortcoming] = useState<EngineeringShortcoming>('FILTRATION_CLOGGING');
  const [proposedFix, setProposedFix] = useState<string>('');
  const [targetDelta, setTargetDelta] = useState<string>('');
  const [bomCostDeltaInr, setBomCostDeltaInr] = useState<string>('-450');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Peer prototypes
  const peerPrototypes = getPeerPrototypesForBrief(domainSector, targetDistrict, briefTitle);

  // Load existing benchmarks from Dexie
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!isOpen || !briefId) return;
      setIsLoading(true);
      try {
        const stored = await getGapBenchmarks(briefId);
        if (isMounted) {
          setBenchmarks(stored);
        }
      } catch (err) {
        console.error('Failed to load gap benchmarks:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, briefId]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Validation
  const trimmedFix = proposedFix.trim();
  const isFixValid = trimmedFix.length >= 20;
  const isDeltaValid = targetDelta.trim().length >= 8;
  const isFormValid = isFixValid && isDeltaValid && !isSubmitting;

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Form Submission
  const handleSubmitGap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const parsedCostDelta = parseInt(bomCostDeltaInr, 10) || 0;
      const newBenchmark: InnovationGapBenchmark = {
        id: `GAP-JH-${Date.now().toString(36).toUpperCase()}`,
        briefId,
        shortcoming,
        proposedFix: trimmedFix,
        targetDelta: targetDelta.trim(),
        bomCostDeltaInr: parsedCostDelta,
        authorTeam: 'Collegiate Solver Capstone Team',
        authorCollege: 'Jharkhand Technical University Consortia',
        createdAt: new Date().toISOString(),
      };

      // 1. Store into Dexie
      await saveGapBenchmark(newBenchmark);

      // 2. Publish sync message across mesh network
      centralSyncService.publish('RECORD_UPDATED', {
        type: 'GAP_BENCHMARK_COMMITTED',
        briefId,
        benchmark: newBenchmark,
      });

      // 3. Update local state immediately without page reload
      setBenchmarks((prev) => [newBenchmark, ...prev]);

      // 4. Reset form fields
      setProposedFix('');
      setTargetDelta('');
      setBomCostDeltaInr('0');
      showToast('नवाचार अंतराल बेंचमार्क सफलतापूर्वक सहेजा गया! / Gap benchmark committed to repository.');
    } catch (err) {
      console.error('Error saving gap benchmark:', err);
      showToast('त्रुटि: अंतराल बेंचमार्क सहेजने में विफल। / Failed to commit gap benchmark.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill template helper
  const handleApplyPresetFix = (presetFix: string, presetDelta: string, presetCost: string) => {
    setProposedFix(presetFix);
    setTargetDelta(presetDelta);
    setBomCostDeltaInr(presetCost);
  };

  // Handle mock download CAD / BOM
  const handleDownloadAsset = (filename: string, fileType: 'CAD' | 'BOM') => {
    showToast(`📥 [${filename}] ${fileType} फ़ाइल डाउनलोड आरंभ हुई / Download initiated.`);
  };

  const handleCopySpec = (specId: string) => {
    setCopiedLink(specId);
    navigator.clipboard?.writeText?.(specId);
    showToast(`📋 स्पेसिफिकेशन संदर्भ क्लिपबोर्ड पर कॉपी किया गया / Reference ID copied: ${specId}`);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="innovation-repo-modal-title"
    >
      <div className="relative w-full max-w-5xl bg-white border-2 border-[#0B2545] shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Toast Alert */}
        {toastNotification && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-[#0B2545] text-[#F8E7A2] border border-amber-300 px-4 py-2 text-xs font-bold shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastNotification}</span>
          </div>
        )}

        {/* Modal Header (GIGW 3.0 Jharkhand Theme) */}
        <div className="bg-[#7A1B1B] text-white p-4 border-b-2 border-amber-400 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-[#F8E7A2] text-[#7A1B1B] text-[10px] font-black uppercase tracking-wider">
                झारखंड सरकार • DHTE Open Innovation
              </span>
              <span className="px-2 py-0.5 bg-black/30 text-amber-200 text-[10px] font-mono">
                {briefId}
              </span>
              <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-200 text-[10px] font-bold border border-emerald-400/30">
                {domainSector.replace(/_/g, ' ')}
              </span>
            </div>
            <h2
              id="innovation-repo-modal-title"
              className="text-base sm:text-lg font-black text-[#F8E7A2] flex items-center gap-2"
            >
              <FolderOpen className="w-5 h-5 text-amber-300 shrink-0" />
              <span>मुक्त नवाचार भंडार एवं अंतराल बेंचमार्किंग</span>
              <span className="hidden sm:inline text-xs font-normal text-white/80">
                / Open-Source Innovation Repository & Gap Benchmarks
              </span>
            </h2>
            <p className="text-xs text-amber-100/90 leading-snug line-clamp-1">
              {briefTitle} &bull; LGD Cluster: <strong className="text-white">{targetDistrict}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black/20 hover:bg-black/40 text-amber-200 hover:text-white rounded-none border border-amber-400/40 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50">
          {/* Institutional Banner */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
            <Compass className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-900">
                NEP 2020 ओपन-सोर्स नवाचार नीति: विफलता से सीख एवं द्वितीय-पीढ़ी (Gen-2) सुधार
              </p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Prior collegiate capstone iterations (Gen-1) document exact failure modes, throughput bottlenecks, and cost overruns.
                Student solver teams must build upon prior open schematics, fix verified failure points, and commit targeted benchmark deltas.
              </p>
            </div>
          </div>

          {/* =========================================================================
              SECTION A: PRIOR GENERATION ARCHIVE (GEN-1 BENCHMARKS & FAILURE MATRIX)
             ========================================================================= */}
          <div className="bg-white border-2 border-slate-300 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-[#7A1B1B]" />
                <h3 className="text-xs sm:text-sm font-black text-[#0B2545] uppercase tracking-wide">
                  भाग क: पूर्व-पीढ़ी प्रोटोटाइप अभिलेखागार (Gen-1 Peer Benchmarks)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-300">
                {peerPrototypes.length} Archived Collegiate Prototypes
              </span>
            </div>

            <div className="space-y-4">
              {peerPrototypes.map((proto) => (
                <div
                  key={proto.id}
                  className="bg-slate-50 border border-slate-300 p-4 space-y-3 hover:border-[#2A6F86] transition-colors"
                >
                  {/* Prototype Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 border border-blue-300 text-blue-900 text-[10px] font-extrabold uppercase">
                          {proto.generation}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {proto.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {proto.institution}
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-500">{proto.clusterName}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopySpec(proto.id)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Copy Reference ID"
                    >
                      {copiedLink === proto.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>{proto.id}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Comparative Benchmark Matrix Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {/* 1. Throughput Matrix */}
                    <div className="bg-white border border-slate-200 p-2.5 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                        <span>Throughput Performance</span>
                        <span className="text-rose-700 font-extrabold flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" />
                          {proto.throughputDeltaPct}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Observed: <span className="text-rose-700">{proto.observedThroughput}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Target Goal: {proto.targetThroughput}
                      </div>
                    </div>

                    {/* 2. Power / Head Matrix */}
                    <div className="bg-white border border-slate-200 p-2.5 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                        <span>Power / Head Constraint</span>
                        <Cpu className="w-3 h-3 text-amber-600" />
                      </div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1" title={proto.powerHeadRequirement}>
                        Observed: <span className="text-amber-800">{proto.powerHeadRequirement}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium line-clamp-1" title={proto.powerHeadTarget}>
                        Target Goal: {proto.powerHeadTarget}
                      </div>
                    </div>

                    {/* 3. BOM Cost Matrix */}
                    <div className="bg-white border border-slate-200 p-2.5 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                        <span>Unit BOM Cost Overrun</span>
                        <span className="text-rose-700 font-extrabold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          +{proto.costDeltaPct}%
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Observed: <span className="text-[#7A1B1B]">₹{proto.bomCostInr.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Statutory Cap: ₹{proto.bomBudgetCapInr.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Documented Operational Failure Point Banner */}
                  <div className="bg-rose-50 border-l-3 border-rose-600 p-3 text-xs text-rose-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px] uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>प्रलेखित परिचालन विफलता बिंदु (Verified Failure Point):</span>
                    </div>
                    <p className="text-rose-900 text-xs leading-relaxed font-normal">
                      {proto.failurePoint}
                    </p>
                  </div>

                  {/* Open CAD & BOM Download Link Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(proto.cadSchematicFilename, 'CAD')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Download Open CAD 3D Schematic"
                      >
                        <FileCode2 className="w-3.5 h-3.5 text-[#1F4E5B]" />
                        <span>{proto.cadSchematicFilename}</span>
                        <span className="text-[10px] font-normal text-slate-500 font-mono">({proto.cadSchematicSize})</span>
                        <Download className="w-3 h-3 text-slate-400 ml-0.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(proto.bomFilename, 'BOM')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Inspect Open Bill of Materials (BOM)"
                      >
                        <Layers className="w-3.5 h-3.5 text-[#7A1B1B]" />
                        <span>{proto.bomFilename}</span>
                        <span className="text-[10px] font-normal text-slate-500 font-mono">({proto.bomLineItemsCount} Items)</span>
                        <Download className="w-3 h-3 text-slate-400 ml-0.5" />
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      License: {proto.license}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* =========================================================================
              SECTION B: ITERATIVE GAP ANALYSIS & 2ND-GEN SOLUTION FORMULATION
             ========================================================================= */}
          <div className="bg-white border-2 border-slate-300 p-4 sm:p-5 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1F4E5B]" />
                <h3 className="text-xs sm:text-sm font-black text-[#0B2545] uppercase tracking-wide">
                  भाग ख: पुनरावृत्तीय अंतराल विश्लेषण एवं द्वितीय-पीढ़ी (Gen-2) समाधान निर्माण
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300">
                Peer Review & Dexie Mesh Bus Active
              </span>
            </div>

            {/* Gap Submission Form */}
            <form onSubmit={handleSubmitGap} className="space-y-4 bg-slate-50 border border-slate-300 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Identified Engineering Shortcoming */}
                <div className="space-y-1.5">
                  <label htmlFor="gap-shortcoming" className="block text-xs font-bold text-slate-800 uppercase">
                    1. चिह्नित इंजीनियरिंग कमी (Identified Shortcoming) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="gap-shortcoming"
                    value={shortcoming}
                    onChange={(e) => setShortcoming(e.target.value as EngineeringShortcoming)}
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-[#2A6F86] shadow-2xs"
                  >
                    {SHORTCOMING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelHi} ({opt.labelEn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Estimated BOM Cost Delta */}
                <div className="space-y-1.5">
                  <label htmlFor="gap-cost-delta" className="block text-xs font-bold text-slate-800 uppercase">
                    2. अनुमानित बीओएम लागत परिवर्तन (Estimated BOM Cost Delta in ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₹</span>
                    <input
                      id="gap-cost-delta"
                      type="number"
                      step="50"
                      value={bomCostDeltaInr}
                      onChange={(e) => setBomCostDeltaInr(e.target.value)}
                      placeholder="-500 (Cost Saving) or +200"
                      className="w-full bg-white border border-slate-300 pl-7 pr-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:border-[#2A6F86] shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Use negative numbers (e.g. -₹450) if Gen-2 reduces unit BOM cost below prior generation.
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  त्वरित इंजीनियरिंग सुधार सुझाव (Quick Architectural Presets):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetFix(
                        'Upstream cyclonic pre-settling swirl separator to remove >85% heavy iron floc before primary sand bed ingress.',
                        'Reduces iron clogging interval from 14 days to >90 days via cyclonic pre-settling chamber.',
                        '-450'
                      )
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Cyclonic Swirl Pre-Settler (-₹450, &gt;90 Days)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetFix(
                        'Replacement of brass gate valves with locally compression-molded food-grade PVC ball valves and terracotta aeration diffusers.',
                        'Brings unit BOM down by ₹1,050 to ₹2,350 (strictly below ₹2,500 statutory cap).',
                        '-1050'
                      )
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Molded PVC & Terracotta Diffuser (-₹1,050)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetFix(
                        'Passive aluminium heat-pipe chimney with conformal copper potting to ensure continuous inverter operation at 48°C ambient.',
                        'Prevents thermal inverter cutout; sustains continuous pumping down to 180 W/m² solar insolation.',
                        '350'
                      )
                    }
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Passive Convective Heat Pipe (+₹350, 48°C Rated)
                  </button>
                </div>
              </div>

              {/* 3. Proposed 2nd-Gen Architectural Fix */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="gap-proposed-fix" className="block text-xs font-bold text-slate-800 uppercase">
                    3. प्रस्तावित द्वितीय-पीढ़ी स्थापत्य सुधार (Proposed 2nd-Gen Architectural Fix) <span className="text-rose-600">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      trimmedFix.length >= 20 ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {trimmedFix.length}/20 chars min
                  </span>
                </div>
                <textarea
                  id="gap-proposed-fix"
                  rows={3}
                  value={proposedFix}
                  onChange={(e) => setProposedFix(e.target.value)}
                  placeholder="Describe the exact architectural design change (e.g. cyclonic pre-settling chamber, redundant media backwash manifold, passive thermal heat pipe, or terracotta aeration plates)..."
                  className={`w-full bg-white border p-2.5 text-xs text-slate-900 focus:outline-hidden leading-relaxed shadow-2xs ${
                    trimmedFix.length > 0 && trimmedFix.length < 20
                      ? 'border-rose-400 focus:border-rose-600'
                      : 'border-slate-300 focus:border-[#2A6F86]'
                  }`}
                />
              </div>

              {/* 4. Targeted Benchmark Delta */}
              <div className="space-y-1.5">
                <label htmlFor="gap-target-delta" className="block text-xs font-bold text-slate-800 uppercase">
                  4. लक्षित बेंचमार्क डेल्टा (Targeted Benchmark Delta) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="gap-target-delta"
                  type="text"
                  value={targetDelta}
                  onChange={(e) => setTargetDelta(e.target.value)}
                  placeholder="e.g. Reduces iron clogging interval from 14 days to >90 days without active pump"
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#2A6F86] shadow-2xs"
                />
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">
                  Submissions are permanently recorded to client Dexie DB and shared over the Jharkhand sync mesh.
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-none transition-all flex items-center gap-2 shadow-2xs ${
                    isFormValid
                      ? 'bg-[#7A1B1B] hover:bg-[#631515] text-[#F8E7A2] cursor-pointer'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                      <span>दर्ज हो रहा है... / Committing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>नवाचार अंतराल दर्ज करें / Commit Gap Benchmark</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List of Committed 2nd-Gen Gap Benchmarks */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-xs font-black text-slate-800 uppercase">
                  दर्ज अंतराल बेंचमार्क लॉग (Committed Gap Benchmarks Log)
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {benchmarks.length} Records Documented
                </span>
              </div>

              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400 mx-auto mb-1.5" />
                  Loading gap benchmarks from IndexedDB...
                </div>
              ) : benchmarks.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 p-6 text-center text-xs text-slate-500">
                  No 2nd-generation gap benchmarks logged yet. Submit the first architectural fix above.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {benchmarks.map((bm) => {
                    const opt = SHORTCOMING_OPTIONS.find((o) => o.value === bm.shortcoming);
                    return (
                      <div
                        key={bm.id}
                        className="bg-white border-2 border-slate-200 hover:border-slate-400 p-3.5 space-y-2 shadow-2xs transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 border text-[10px] font-extrabold uppercase ${
                                opt?.iconBg || 'bg-slate-100 text-slate-800 border-slate-300'
                              }`}
                            >
                              {opt?.labelEn || bm.shortcoming}
                            </span>
                            <span className="font-mono text-slate-400 text-[10px]">{bm.id}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px]">
                            {bm.bomCostDeltaInr !== 0 && (
                              <span
                                className={`font-mono font-black px-1.5 py-0.5 border ${
                                  bm.bomCostDeltaInr < 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {bm.bomCostDeltaInr < 0
                                  ? `BOM Saving: -₹${Math.abs(bm.bomCostDeltaInr).toLocaleString('en-IN')}`
                                  : `BOM Investment: +₹${bm.bomCostDeltaInr.toLocaleString('en-IN')}`}
                              </span>
                            )}
                            <span className="text-slate-400 font-mono">
                              {new Date(bm.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Proposed Fix */}
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {bm.proposedFix}
                        </p>

                        {/* Targeted Delta Badge */}
                        <div className="bg-emerald-50/70 border border-emerald-200 p-2 text-xs flex items-center gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-[11px] font-bold text-emerald-950">
                            Target Delta: {bm.targetDelta}
                          </span>
                        </div>

                        {/* Author info */}
                        {(bm.authorTeam || bm.authorCollege) && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
                            <span>Author: <strong className="text-slate-700">{bm.authorTeam || 'Solver Team'}</strong></span>
                            <span>&bull;</span>
                            <span>{bm.authorCollege || 'Jharkhand Academic Network'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white p-3.5 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>DHTE Open Innovation Repository &bull; NEP 2020 Academic Capstone R&D</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
          >
            बंद करें / Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenInnovationRepoModal;

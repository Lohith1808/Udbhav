/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — AI Problem Boundary Generator
 * 
 * CRITICAL HACKATHON RULE & NEP 2020 DIRECTIVE:
 * The generator outputs ONLY non-negotiable operational constraints, measurable benchmarks,
 * power bounds, and statutory cost ceilings. It is STRICTLY FORBIDDEN from proposing
 * architectures, prescriptive circuits, software code, or implementation methods,
 * thereby safeguarding student solver engineering autonomy.
 */

import {
  EngineeringProblemBrief,
  DomainSector,
  MeasurableBenchmark,
  MAX_BRIEF_BUDGET_INR,
} from '../../../types/solver';

/**
 * Grassroots endorsed civic issue structure passed into boundary generator
 */
export interface IssueForBoundaryGeneration {
  id: string;
  transcriptionText: string;
  category?: string;
  district: string;
  block: string;
  affectedHouseholds: number;
  panchayatNote: string;
  severity: string;
}

/**
 * Keyword classification taxonomy for Jharkhand grassroots engineering challenges
 */
const SECTOR_KEYWORDS: Record<DomainSector, string[]> = {
  WATER_RESOURCES: [
    'water', 'pani', 'jal', 'tubewell', 'tube-well', 'handpump', 'arsenic',
    'iron', 'borewell', 'fluoride', 'turbid', 'contamination', 'drinking',
    'purification', 'filter', 'tap', 'well', 'pond', 'chuan', 'talab'
  ],
  AGRITECH: [
    'crop', 'harvest', 'vegetable', 'tomato', 'potato', 'cauliflower', 'chili',
    'storage', 'cold storage', 'produce', 'spoilage', 'farmer', 'kisan', 'krishi',
    'mandi', 'pest', 'seed', 'paddy', 'grain', 'dhan', 'sabzi', 'irrigation'
  ],
  RURAL_ENERGY: [
    'solar', 'electricity', 'power', 'light', 'bijli', 'voltage', 'outage',
    'load shedding', 'blackout', 'transformer', 'battery', 'energy', 'grid',
    'lamp', 'street light', 'inverter'
  ],
  SANITATION: [
    'toilet', 'drainage', 'waste', 'sewage', 'drain', 'nala', 'garbage',
    'trash', 'plastic', 'defecation', 'sanitation', 'swachh', 'leachate',
    'solid waste', 'compost'
  ],
  HEALTHCARE: [
    'health', 'clinic', 'medicine', 'vaccine', 'patient', 'disease', 'fever',
    'phc', 'chc', 'infant', 'maternal', 'asha', 'rash', 'dermatological',
    'malaria', 'cold chain', 'serum', 'anti-venom'
  ],
  CIVIL_INFRA: [
    'road', 'sadak', 'bridge', 'pul', 'pulliya', 'culvert', 'pothole',
    'erosion', 'pathway', 'building', 'roof', 'embankment', 'concrete',
    'structure', 'crossing', 'transport'
  ],
};

/**
 * Classifies an endorsed issue into one of the 6 statutory domain sectors
 */
function detectDomainSector(
  transcription: string,
  category?: string,
  panchayatNote?: string
): DomainSector {
  const combinedCorpus = `${transcription} ${category || ''} ${panchayatNote || ''}`.toLowerCase();

  let topSector: DomainSector = 'WATER_RESOURCES';
  let highestScore = -1;

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS) as [DomainSector, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (combinedCorpus.includes(kw)) {
        // Exact category matches receive higher weighting
        score += (category && category.toLowerCase().includes(kw)) ? 3 : 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      topSector = sector;
    }
  }

  return topSector;
}

/**
 * Computes strict statutory cost ceiling under Section 135 CSR micro-grant guidelines.
 * Strictly guarantees maxCostINR <= ₹2,500.
 */
function calculateMaxCostINR(severity: string, households: number): number {
  const baseCost = 1850;
  let severityIncrement = 150;

  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      severityIncrement = 450;
      break;
    case 'HIGH':
      severityIncrement = 320;
      break;
    case 'MEDIUM':
      severityIncrement = 200;
      break;
    default:
      severityIncrement = 100;
  }

  const householdScale = Math.min(180, Math.floor((households || 10) / 25) * 40);
  const rawCost = baseCost + severityIncrement + householdScale;

  // Strict enforcement: strictly <= ₹2,500
  return Math.min(MAX_BRIEF_BUDGET_INR - 10, Math.max(1200, rawCost));
}

/**
 * Synthesizes a formal engineering title for the problem brief
 */
function synthesizeTitle(sector: DomainSector, district: string, block: string): string {
  switch (sector) {
    case 'WATER_RESOURCES':
      return `Decentralized Gravity-Fed Potable Water Filtration & Heavy Metal Remediation Unit (${district})`;
    case 'AGRITECH':
      return `Decentralized Micro-Climate Horticultural Produce Holding & Preservation Chamber (${block})`;
    case 'RURAL_ENERGY':
      return `Resilient Off-Grid Micro-Energy Generation & Fluctuation-Tolerant Power Unit (${district})`;
    case 'SANITATION':
      return `Decentralized Bio-Composting & Vector-Proof Solid Waste Containment Assembly (${block})`;
    case 'HEALTHCARE':
      return `Passive Cold-Chain Biological Transport & Remote Primary Health Diagnostic Pod (${district})`;
    case 'CIVIL_INFRA':
      return `Modular Scour-Resistant Rural Drainage & Local Bio-Composite Erosion Assembly (${block})`;
  }
}

/**
 * Synthesizes formal technical context from citizen transcript and Panchayat inspection
 */
function synthesizeContextSummary(
  sector: DomainSector,
  transcription: string,
  panchayatNote: string,
  district: string,
  block: string,
  households: number
): string {
  const verifiedScope = `Statutory on-site inspection at ${block} Block (${district} District) confirmed critical community distress affecting approximately ${households} households.`;
  const groundProof = panchayatNote
    ? ` Panchayat Officer audit note: "${panchayatNote}".`
    : '';
  const citizenContext = transcription
    ? ` Citizen voice recording highlighted operational impairment: "${transcription}".`
    : '';

  let sectorScope = '';
  switch (sector) {
    case 'WATER_RESOURCES':
      sectorScope = ' Habitations lack three-phase electric reliability for high-pressure reverse osmosis; decentralized gravity-driven or micro-solar purification is essential.';
      break;
    case 'AGRITECH':
      sectorScope = ' Absence of localized pre-cooling forces perishable produce distress sales during peak harvest gluts; passive micro-cooling holding is required.';
      break;
    case 'RURAL_ENERGY':
      sectorScope = ' Persistent rural line voltage sags and frequent transformer burnouts demand autonomous, surge-hardened localized power delivery.';
      break;
    case 'SANITATION':
      sectorScope = ' Monsoon open run-off and lack of localized segregation cause vector proliferation and contamination of nearby groundwater sources.';
      break;
    case 'HEALTHCARE':
      sectorScope = ' Rugged hilly terrain and distance to Community Health Centers risk temperature excursion for temperature-sensitive life-saving serums.';
      break;
    case 'CIVIL_INFRA':
      sectorScope = ' High-velocity surface monsoon run-off repeatedly damages kachha connectivity paths and culvert abutments.';
      break;
  }

  return `${verifiedScope}${groundProof}${citizenContext}${sectorScope}`;
}

/**
 * Generates non-negotiable operational boundary constraints.
 * STRICTLY CONSTRAINTS ONLY — NO ARCHITECTURAL PRESCRIPTION.
 */
function generateBoundaryConstraints(sector: DomainSector): string[] {
  switch (sector) {
    case 'WATER_RESOURCES':
      return [
        'Operating Power Limit: Must operate 100% off-grid via passive hydraulic gravity head or micro-solar PV (<30W)',
        'Physical Footprint: Maximum installation footprint must not exceed 1.0 sq.m at community handpump apron',
        'Material Sourcing: Constructed exclusively from non-corrosive, non-toxic, locally procurable media (graded sand, gravel, biochar)',
        'Service Continuity: Minimum 90 days mean-time-between-servicing without requiring specialized technical personnel',
      ];
    case 'AGRITECH':
      return [
        'Energy Constraint: Must maintain operational thermal differential without reliance on continuous grid power (solar/evaporative only)',
        'Physical Envelope: Usable internal capacity >= 250 Liters; external footprint must not exceed 1.2 sq.m',
        'Ecological Material Limits: Insulation constructed using local bio-composites (paddy husk, bamboo, terracotta clay)',
        'Zero Hazardous Emissions: Strict zero GWP fluorinated refrigerant compliance (100% non-chemical thermal management)',
      ];
    case 'RURAL_ENERGY':
      return [
        'Grid Fluctuation Tolerance: Must tolerate wide rural voltage sags (140V–290V AC single-phase) or operate fully standalone',
        'Ingress Protection: Minimum IP65 environmental rating against laterite red dust, vermin, and high monsoon humidity',
        'Ergonomic Maintenance: Modular plug-and-play field replacement with zero scheduled user maintenance over 180 cycles',
        'Physical Envelope: Mounting footprint <= 0.6 sq.m with pole or wall-bracket structural anchoring',
      ];
    case 'SANITATION':
      return [
        'Power Requirement: 100% zero electrical energy consumption; passive natural aeration and gravity feed only',
        'Vector & Leachate Seal: Positive biological seal preventing surface fly contact and zero soil groundwater leaching',
        'Volumetric Footprint: Maximum footprint <= 1.5 sq.m on natural ground or unreinforced masonry pad',
        'Material Composition: Non-biodegradable components must utilize minimum 70% locally recyclable polymers or local masonry',
      ];
    case 'HEALTHCARE':
      return [
        'Cold-Chain Envelope: Must maintain strict 2°C to 8°C payload temperature for 24+ continuous hours under 42°C external heat waves',
        'Portability Weight Ceiling: Total carry weight including biological payload and thermal buffer must not exceed 4.5 kg',
        'Mechanical Ruggedness: Must survive rural unpaved foot-transit and 1.2-meter drop onto compacted earth without hermetic breach',
        'Visual Excursion Proof: Passive tamper-evident temperature excursion indicator visible without electronic reader',
      ];
    case 'CIVIL_INFRA':
      return [
        'Deployment Velocity: Assembly installable by un-skilled village labor within 4 hours using manual hand tools only',
        'Scour Hydraulic Limit: Must withstand monsoon peak surface hydraulic scour velocity up to 2.5 m/s without displacement',
        'Material Circularity: Minimum 60% locally sourced aggregates, fly ash, or recycled plastic composite binder',
        'Handling Ergonomics: Modular interlocking blocks with individual module weight not exceeding 22 kg for two-person placement',
      ];
  }
}

/**
 * Generates measurable technical benchmarks with explicit tolerance limits
 */
function generateMeasurableBenchmarks(sector: DomainSector): MeasurableBenchmark[] {
  switch (sector) {
    case 'WATER_RESOURCES':
      return [
        {
          metric: 'Continuous Gravity Throughput Flow',
          targetValue: '>= 15 Liters/hour continuous discharge',
          tolerance: '±2.0 L/h',
        },
        {
          metric: 'Suspended Solids & Turbidity Reduction',
          targetValue: '< 1.0 NTU (WHO Drinking Water Standard)',
          tolerance: '±0.2 NTU',
        },
        {
          metric: 'Dissolved Heavy Metal Mitigation (As / Fe)',
          targetValue: '>= 85% reduction from baseline borehole sample',
          tolerance: '±5.0%',
        },
      ];
    case 'AGRITECH':
      return [
        {
          metric: 'Chamber Temperature Depression Below Ambient',
          targetValue: '8°C to 12°C cooler than peak ambient summer temperature',
          tolerance: '±1.5°C',
        },
        {
          metric: 'Internal Relative Humidity (RH) Retention',
          targetValue: '85% to 92% RH for leafy & Solanaceae vegetables',
          tolerance: '±3.0% RH',
        },
        {
          metric: 'Produce Shelf-Life Retention Extension',
          targetValue: '>= 4 days extension before market-grade senescence',
          tolerance: '±1 day',
        },
      ];
    case 'RURAL_ENERGY':
      return [
        {
          metric: 'Sustained Nocturnal Usable Runtime',
          targetValue: '>= 10 hours continuous lighting/power on full daily charge',
          tolerance: '±1.0 hour',
        },
        {
          metric: 'Power Conversion Electrical Efficiency',
          targetValue: '>= 88% overall DC-DC / driver throughput efficiency',
          tolerance: '±3.0%',
        },
        {
          metric: 'Overload & Surge Cutoff Response Time',
          targetValue: '< 50 milliseconds trip time upon surge/short-circuit detection',
          tolerance: '±5 ms',
        },
      ];
    case 'SANITATION':
      return [
        {
          metric: 'Daily Organic Waste Throughput Capacity',
          targetValue: '>= 25 kg/day organic matter decomposition capacity',
          tolerance: '±3.0 kg/day',
        },
        {
          metric: 'Surface Effluent Leaching Elimination',
          targetValue: '0% effluent seepage into adjacent soil matrix',
          tolerance: '0.0%',
        },
        {
          metric: 'Biomass Volume Reduction Index',
          targetValue: '>= 60% mass reduction within 21-day anaerobic cycle',
          tolerance: '±5.0%',
        },
      ];
    case 'HEALTHCARE':
      return [
        {
          metric: 'Thermal Holdover Duration (2°C - 8°C)',
          targetValue: '>= 24 hours under 40°C external exposure',
          tolerance: '±2.0 hours',
        },
        {
          metric: 'Internal Thermal Gradient Homogeneity',
          targetValue: '< 1.5°C variance between top and bottom payload chamber',
          tolerance: '±0.3°C',
        },
        {
          metric: 'Mechanical Drop Impact Survival',
          targetValue: 'Survives 1.2 meter drop onto hard surface without seal breach',
          tolerance: '±0.1 m',
        },
      ];
    case 'CIVIL_INFRA':
      return [
        {
          metric: 'Peak Hydraulic Drainage Flow Throughput',
          targetValue: '>= 120 Liters/second channel throughput',
          tolerance: '±10.0 L/s',
        },
        {
          metric: 'Compressive Load-Bearing Resistance',
          targetValue: '>= 15 kN/sq.m supporting rural tractor & livestock crossing',
          tolerance: '±1.0 kN',
        },
        {
          metric: 'Downstream Silt Sedimentation Reduction',
          targetValue: '>= 70% trap efficiency for suspended silt particles',
          tolerance: '±5.0%',
        },
      ];
  }
}

/**
 * Transforms an endorsed grassroots civic report into an official Engineering Problem Brief
 * with strict non-prescriptive boundary constraints and measurable benchmarks.
 *
 * @param issue Endorsed civic report input with inspection metadata
 * @returns Fully structured EngineeringProblemBrief
 */
export function generateProblemBoundaryBrief(
  issue: IssueForBoundaryGeneration
): EngineeringProblemBrief {
  const domainSector = detectDomainSector(
    issue.transcriptionText,
    issue.category,
    issue.panchayatNote
  );

  const title = synthesizeTitle(domainSector, issue.district, issue.block);
  const contextSummary = synthesizeContextSummary(
    domainSector,
    issue.transcriptionText,
    issue.panchayatNote,
    issue.district,
    issue.block,
    issue.affectedHouseholds
  );

  const boundaryConstraints = generateBoundaryConstraints(domainSector);
  const measurableBenchmarks = generateMeasurableBenchmarks(domainSector);
  const maxCostINR = calculateMaxCostINR(issue.severity, issue.affectedHouseholds);

  const masterIssueId = issue.id.startsWith('JH-')
    ? issue.id
    : `JH-2026-M-${issue.id.slice(0, 8).toUpperCase()}`;

  const generatedBriefId = `BRIEF-JH-${Date.now().toString(36).toUpperCase()}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  return {
    id: generatedBriefId,
    masterIssueId,
    title,
    domainSector,
    contextSummary,
    boundaryConstraints,
    measurableBenchmarks,
    maxCostINR,
    fieldEvidenceSummary: {
      photoCount: 2,
      audioNotePresent: Boolean(issue.transcriptionText),
      householdImpact: Math.max(1, issue.affectedHouseholds || 50),
      panchayatNote: issue.panchayatNote || 'On-site statutory endorsement verified by Gram Panchayat Officer.',
      district: issue.district || 'Jharkhand',
      block: issue.block || 'Administrative Block',
    },
    status: 'OPEN_FOR_CLAIMS',
    createdAt: Date.now(),
  };
}

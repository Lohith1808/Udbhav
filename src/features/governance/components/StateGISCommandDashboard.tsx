/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 7 — Task 7.4: Statewide GIS Executive Command Dashboard
 * 
 * Executive Command Portal for DHTE State Administrators and District Collectors:
 * 1. Top Statutory Executive Masthead (Govt of Jharkhand emblem, live IST clock, sync status)
 * 2. KPI Overview Cards (GIGW 3.0 styling, aggregated counts across live Dexie tables)
 * 3. Interactive Sector Filter Bar (ALL, WATER_SANITATION, AGRITECH, RURAL_ENERGY, HEALTHCARE, INFRASTRUCTURE)
 * 4. Interactive 24-District Jharkhand Vector SVG Map (<JharkhandDistrictSvgMap />)
 *    - Pure vector SVG polygon elements (Zero map bloat - no Leaflet / Mapbox / D3)
 *    - Dynamic distress heat fill colors (ACUTE: #991B1B, HIGH: #C25E2E, MEDIUM: #B47D14, LOW: #1E6F50)
 *    - Adjacent District Deep-Dive Drawer with Lead Institutional Hubs & SLA Bottleneck Flags
 * 5. Statewide Resolution SLA & Bottleneck Table with expedite action triggers.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Users,
  Coins,
  Clock,
  Building2,
  CheckCircle2,
  Search,
  Filter,
  Send,
  Zap,
  Droplets,
  Sprout,
  HeartPulse,
  HardHat,
  Flame,
  Sparkles,
} from 'lucide-react';
import {
  DistrictGISSummary,
  DistressIntensityLevel,
} from '../../../types/governance';
import {
  db,
  getDistrictGISMetrics,
  getAllEscrowGrants,
  getAllSafetyValidations,
  getAllTeams,
  getBriefs,
} from '../../../lib/db';
import { useSession } from '../../../context/SessionContext';

const GemProcurementBridgeModal = React.lazy(
  () => import('./GemProcurementBridgeModal')
);

// ============================================================================
// CONSTANTS & SECTOR TAXONOMY
// ============================================================================

export type CommandSectorFilter =
  | 'ALL'
  | 'WATER_SANITATION'
  | 'AGRITECH'
  | 'RURAL_ENERGY'
  | 'HEALTHCARE'
  | 'INFRASTRUCTURE';

interface SectorChipConfig {
  id: CommandSectorFilter;
  label: string;
  hindiLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTOR_CHIPS: SectorChipConfig[] = [
  { id: 'ALL', label: 'All Sectors', hindiLabel: 'सभी क्षेत्र', icon: Filter },
  { id: 'WATER_SANITATION', label: 'Water & Sanitation', hindiLabel: 'जल एवं स्वच्छता', icon: Droplets },
  { id: 'AGRITECH', label: 'Agritech & Soil', hindiLabel: 'कृषि तकनीक', icon: Sprout },
  { id: 'RURAL_ENERGY', label: 'Rural Energy', hindiLabel: 'ग्रामीण ऊर्जा', icon: Zap },
  { id: 'HEALTHCARE', label: 'Rural Health', hindiLabel: 'स्वास्थ्य सेवाएं', icon: HeartPulse },
  { id: 'INFRASTRUCTURE', label: 'Civil Infra', hindiLabel: 'नागरिक अवसंरचना', icon: HardHat },
];

/**
 * Statutory Distress Color Palette conforming strictly to Task 7.4 Directive
 */
export const DISTRESS_HEAT_COLORS: Record<
  DistressIntensityLevel,
  { fill: string; bg: string; text: string; border: string; label: string }
> = {
  ACUTE: {
    fill: '#991B1B', // Deep Crimson
    bg: 'bg-[#991B1B]',
    text: 'text-[#991B1B]',
    border: 'border-[#991B1B]',
    label: 'Acute Distress (गंभीर)',
  },
  HIGH: {
    fill: '#C25E2E', // Terracotta
    bg: 'bg-[#C25E2E]',
    text: 'text-[#C25E2E]',
    border: 'border-[#C25E2E]',
    label: 'High Distress (उच्च)',
  },
  MEDIUM: {
    fill: '#B47D14', // Ochre Amber
    bg: 'bg-[#B47D14]',
    text: 'text-[#B47D14]',
    border: 'border-[#B47D14]',
    label: 'Medium Distress (मध्यम)',
  },
  LOW: {
    fill: '#1E6F50', // Forest Olive
    bg: 'bg-[#1E6F50]',
    text: 'text-[#1E6F50]',
    border: 'border-[#1E6F50]',
    label: 'Low Distress (संतोषजनक)',
  },
};

/**
 * Academic Lead Institutional Hubs across all 24 Jharkhand Districts
 */
export const DISTRICT_INSTITUTIONAL_HUBS: Record<
  string,
  { leadHub: string; nodalOfficer: string; activeLabs: string[]; division: string }
> = {
  Ranchi: {
    leadHub: 'BIT Mesra & NIFFT Ranchi',
    nodalOfficer: 'Prof. S. K. Mahapatra (Dean R&D)',
    activeLabs: ['Advanced Materials & Nano Lab', 'Environmental Engg Lab', 'IoT Instrumentation'],
    division: 'South Chotanagpur',
  },
  Dhanbad: {
    leadHub: 'BIT Sindri & IIT (ISM) Dhanbad',
    nodalOfficer: 'Dr. Pankaj Rai (Director BIT Sindri / Lead Nodal)',
    activeLabs: ['Chemical Kinetics & Water Lab', 'Mining & Environmental Testing', 'CSIR-CIMFR Cell'],
    division: 'North Chotanagpur',
  },
  Dumka: {
    leadHub: 'Sido Kanhu Murmu University (SKMU Dumka)',
    nodalOfficer: 'Dr. Manoj Kumar (HOD Applied Sciences)',
    activeLabs: ['Water Quality Triage Unit', 'Rural Tech Development Cell'],
    division: 'Santhal Pargana',
  },
  'East Singhbhum': {
    leadHub: 'NIT Jamshedpur',
    nodalOfficer: 'Prof. R. V. Sharma (Dean Academics)',
    activeLabs: ['Mechanical Prototyping Lab', 'Hydraulics & Water Purification Lab'],
    division: 'Kolhan',
  },
  'West Singhbhum': {
    leadHub: 'Kolhan University (Chaibasa Campus)',
    nodalOfficer: 'Dr. P. C. Soren (Nodal Officer Tribal R&D)',
    activeLabs: ['Heavy Metal & Soil Testing Lab', 'Biomedical Field Unit'],
    division: 'Kolhan',
  },
  Bokaro: {
    leadHub: 'Bokaro Steel City College & BIT Sindri Extension',
    nodalOfficer: 'Dr. A. N. Singh (Technical Advisor)',
    activeLabs: ['Industrial Effluent Testing Lab', 'Renewable Microgrid Cell'],
    division: 'North Chotanagpur',
  },
  Hazaribagh: {
    leadHub: 'Vinoba Bhave University (VBU Hazaribagh)',
    nodalOfficer: 'Prof. K. K. Srivastava (Director R&D)',
    activeLabs: ['Geological Remote Sensing Lab', 'Solar Microgrid Prototyping'],
    division: 'North Chotanagpur',
  },
  Deoghar: {
    leadHub: 'AIIMS Deoghar & BIT Deoghar Extension Center',
    nodalOfficer: 'Dr. Saurabh Mishra (Nodal Coordinator)',
    activeLabs: ['Public Health & Sanitation Lab', 'Telemedicine Drone Testbed'],
    division: 'Santhal Pargana',
  },
  Giridih: {
    leadHub: 'Giridih College (VBU Affiliated)',
    nodalOfficer: 'Prof. R. K. Barnwal (Senior Nodal)',
    activeLabs: ['Mica Belt Heavy Metal Testing', 'Rural Water Filter Hub'],
    division: 'North Chotanagpur',
  },
  Palamu: {
    leadHub: 'Nilamber-Pitamber University (Medininagar)',
    nodalOfficer: 'Dr. R. P. Sinha (Director Academic Linkage)',
    activeLabs: ['Drought Resilience Tech Lab', 'Fluoride Remediation Field Facility'],
    division: 'Palamu',
  },
  Garhwa: {
    leadHub: 'Garhwa Engineering College (Govt. of Jharkhand)',
    nodalOfficer: 'Prof. V. K. Gupta (Principal & Nodal Officer)',
    activeLabs: ['Civil Infrastructure & Testing Lab', 'Solar Water Pump Prototyping'],
    division: 'Palamu',
  },
  Chatra: {
    leadHub: 'Chatra College (VBU Engineering Cell)',
    nodalOfficer: 'Dr. B. N. Tiwari (District Academic Nodal)',
    activeLabs: ['Agri-Tool Fabrication Lab', 'Solar Electrification Testbed'],
    division: 'North Chotanagpur',
  },
  Koderma: {
    leadHub: 'JJ College Koderma & Mining Polytech',
    nodalOfficer: 'Prof. S. P. Yadav (Nodal Officer)',
    activeLabs: ['Mining Runoff Analysis Unit', 'Soil Erosion Mitigation Lab'],
    division: 'North Chotanagpur',
  },
  Jamtara: {
    leadHub: 'Jamtara College (SKMU Affiliated)',
    nodalOfficer: 'Dr. Niloy Sen (Coordinator R&D)',
    activeLabs: ['Digital Telemetry & IoT Sensor Lab', 'Water Salinity Testing'],
    division: 'Santhal Pargana',
  },
  Godda: {
    leadHub: 'Godda College (SKMU Extension)',
    nodalOfficer: 'Prof. Arun Kumar (Academic Supervisor)',
    activeLabs: ['Renewable Thermal Power Assessment Lab', 'Micro-Irrigation Tech Cell'],
    division: 'Santhal Pargana',
  },
  Sahibganj: {
    leadHub: 'Sahibganj College (SKMU & River Basin Cell)',
    nodalOfficer: 'Dr. R. S. Mandal (Principal In-charge)',
    activeLabs: ['Ganges River Basin Water Testing', 'Sedimentation Remediation Lab'],
    division: 'Santhal Pargana',
  },
  Pakur: {
    leadHub: 'KKM College Pakur & Govt. Polytechnic',
    nodalOfficer: 'Prof. D. K. Paul (Technical Nodal)',
    activeLabs: ['Stone Crushing Dust Filtration Lab', 'Rural Health Engineering'],
    division: 'Santhal Pargana',
  },
  Ramgarh: {
    leadHub: 'Ramgarh Engineering College (Govt. Run, Techno India Group)',
    nodalOfficer: 'Prof. S. R. Dutta (Dean Innovations)',
    activeLabs: ['Coal Ash Recycling Lab', 'IoT Bridge & Culvert Monitoring'],
    division: 'North Chotanagpur',
  },
  Lohardaga: {
    leadHub: 'B.S. College Lohardaga (DSPMU Linkage)',
    nodalOfficer: 'Dr. Anand Kumar (District Faculty Liaison)',
    activeLabs: ['Bauxite Runoff & Soil Acidity Testing', 'Rainwater Harvesting Cell'],
    division: 'South Chotanagpur',
  },
  Gumla: {
    leadHub: 'Kartik Oraon College Gumla (DSPMU Affiliated)',
    nodalOfficer: 'Prof. M. K. Minz (Nodal In-charge)',
    activeLabs: ['Tribal Agro-Machinery Prototyping', 'Groundwater Arsenic Testing'],
    division: 'South Chotanagpur',
  },
  Simdega: {
    leadHub: 'Simdega College (Govt. Polytechnic Partnership)',
    nodalOfficer: 'Dr. Christopher Toppo (Field Director)',
    activeLabs: ['Off-grid Solar Microgrid Unit', 'Forest Product Processing Lab'],
    division: 'South Chotanagpur',
  },
  Khunti: {
    leadHub: 'Birsa Munda College Khunti & NIFFT Extension',
    nodalOfficer: 'Prof. Joy Tirkey (Nodal Officer Innovations)',
    activeLabs: ['Lac & Minor Forest Produce Processing', 'Spring Water Gravity Filter Cell'],
    division: 'South Chotanagpur',
  },
  Latehar: {
    leadHub: 'Latehar Polytechnic & NPU Extension',
    nodalOfficer: 'Prof. A. K. Choudhary (Academic Nodal)',
    activeLabs: ['Forest Fire Telemetry Testing', 'Solar Mini-Utility Verification'],
    division: 'Palamu',
  },
  'Saraikela-Kharsawan': {
    leadHub: 'NIT Jamshedpur Innovation Hub & Govt Polytechnic Kharsawan',
    nodalOfficer: 'Dr. S. B. Prasad (Regional Industry Liaison)',
    activeLabs: ['Auto Ancillary & Foundry Tech Lab', 'Industrial Effluent Quality Station'],
    division: 'Kolhan',
  },
};

/**
 * 24 Vector Polygons for Jharkhand Districts
 * ViewBox: 0 0 760 480
 */
interface DistrictPolygonDef {
  districtCode: number;
  districtName: string;
  points: string;
  cx: number;
  cy: number;
}

const JHARKHAND_VECTOR_POLYGONS: DistrictPolygonDef[] = [
  // Palamu Division
  { districtCode: 3422, districtName: 'Garhwa', points: '35,75 80,60 125,75 125,120 95,145 50,140 35,100', cx: 78, cy: 100 },
  { districtCode: 3424, districtName: 'Palamu', points: '125,75 165,65 210,75 205,125 170,145 125,120', cx: 165, cy: 102 },
  { districtCode: 3423, districtName: 'Latehar', points: '95,145 170,145 185,185 160,220 110,210 85,175', cx: 138, cy: 178 },

  // North Chotanagpur Division
  { districtCode: 3412, districtName: 'Chatra', points: '210,75 250,65 285,75 280,125 240,140 205,125', cx: 245, cy: 102 },
  { districtCode: 3414, districtName: 'Koderma', points: '285,75 320,50 355,65 350,105 315,110 285,90', cx: 318, cy: 80 },
  { districtCode: 3405, districtName: 'Hazaribagh', points: '240,140 280,125 315,110 335,145 320,195 265,190 240,160', cx: 288, cy: 152 },
  { districtCode: 3413, districtName: 'Giridih', points: '355,65 395,80 430,100 415,155 365,160 335,145 350,105', cx: 380, cy: 118 },
  { districtCode: 3411, districtName: 'Bokaro', points: '335,165 365,160 415,175 410,215 365,225 335,195', cx: 375, cy: 192 },
  { districtCode: 3402, districtName: 'Dhanbad', points: '415,155 450,160 485,175 480,215 440,220 410,215', cx: 450, cy: 188 },
  { districtCode: 3415, districtName: 'Ramgarh', points: '320,195 335,195 355,225 340,240 295,235 290,205', cx: 322, cy: 215 },

  // Santhal Pargana Division
  { districtCode: 3406, districtName: 'Deoghar', points: '430,100 465,75 500,90 490,140 450,145 425,120', cx: 460, cy: 110 },
  { districtCode: 3403, districtName: 'Dumka', points: '500,90 515,90 565,140 550,175 500,170 490,140', cx: 526, cy: 134 },
  { districtCode: 3407, districtName: 'Godda', points: '505,40 545,30 570,55 560,95 515,90 495,65', cx: 532, cy: 62 },
  { districtCode: 3410, districtName: 'Sahibganj', points: '570,55 610,20 650,45 640,85 595,85 565,65', cx: 608, cy: 52 },
  { districtCode: 3409, districtName: 'Pakur', points: '595,85 640,85 645,135 605,155 565,140 560,95', cx: 602, cy: 118 },
  { districtCode: 3408, districtName: 'Jamtara', points: '450,145 490,140 520,165 505,195 460,195 445,170', cx: 482, cy: 168 },

  // South Chotanagpur Division
  { districtCode: 3418, districtName: 'Lohardaga', points: '160,220 205,210 215,245 190,265 150,260 145,230', cx: 180, cy: 236 },
  { districtCode: 3401, districtName: 'Ranchi', points: '205,210 265,190 295,235 315,260 275,285 225,275 215,245', cx: 258, cy: 245 },
  { districtCode: 3416, districtName: 'Gumla', points: '150,260 190,265 195,310 160,340 115,330 105,285', cx: 152, cy: 295 },
  { districtCode: 3419, districtName: 'Simdega', points: '115,330 160,340 185,380 165,425 110,415 95,365', cx: 140, cy: 375 },
  { districtCode: 3417, districtName: 'Khunti', points: '225,275 275,285 290,320 260,345 220,335 215,295', cx: 252, cy: 308 },

  // Kolhan Division
  { districtCode: 3420, districtName: 'West Singhbhum', points: '185,380 220,335 260,345 300,380 280,445 210,450 185,410', cx: 242, cy: 395 },
  { districtCode: 3421, districtName: 'Saraikela-Kharsawan', points: '275,285 325,290 375,320 355,365 300,375 285,335', cx: 330, cy: 332 },
  { districtCode: 3404, districtName: 'East Singhbhum', points: '375,320 420,305 445,340 435,390 385,395 355,365', cx: 402, cy: 350 },
];

// ============================================================================
// SUBCOMPONENT: JHARKHAND DISTRICT SVG VECTOR MAP
// ============================================================================

interface JharkhandDistrictSvgMapProps {
  districts: DistrictGISSummary[];
  selectedDistrictCode: number | null;
  onSelectDistrict: (district: DistrictGISSummary) => void;
  hoveredDistrictCode: number | null;
  onHoverDistrict: (districtCode: number | null) => void;
}

export const JharkhandDistrictSvgMap: React.FC<JharkhandDistrictSvgMapProps> = ({
  districts,
  selectedDistrictCode,
  onSelectDistrict,
  hoveredDistrictCode,
  onHoverDistrict,
}) => {
  // Quick lookup map by districtCode
  const metricsMap = useMemo(() => {
    const map = new Map<number, DistrictGISSummary>();
    districts.forEach((d) => map.set(d.districtCode, d));
    return map;
  }, [districts]);

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox="0 0 760 480"
        className="w-full h-auto drop-shadow-md rounded-none overflow-visible"
        style={{ filter: 'drop-shadow(0px 6px 12px rgba(11,37,69,0.3))' }}
        role="region"
        aria-label="Jharkhand 24-District Interactive Vector Map"
      >
        {/* State Canvas Background with Subtle Boundary */}
        <rect
          x="15"
          y="15"
          width="730"
          height="450"
          fill="#0B2545"
          stroke="#1E3A52"
          strokeWidth="1.5"
          rx="2"
        />

        {/* Telemetry Coordinate Grid Overlay */}
        <line x1="15" y1="160" x2="745" y2="160" stroke="#163248" strokeDasharray="3 3" />
        <line x1="15" y1="310" x2="745" y2="310" stroke="#163248" strokeDasharray="3 3" />
        <line x1="250" y1="15" x2="250" y2="465" stroke="#163248" strokeDasharray="3 3" />
        <line x1="500" y1="15" x2="500" y2="465" stroke="#163248" strokeDasharray="3 3" />

        {/* Administrative Division Labels (Watermark Style) */}
        <text x="35" y="40" fill="#244766" fontSize="10" fontWeight="900" letterSpacing="1">
          PALAMU DIVISION
        </text>
        <text x="270" y="40" fill="#244766" fontSize="10" fontWeight="900" letterSpacing="1">
          NORTH CHOTANAGPUR
        </text>
        <text x="525" y="40" fill="#244766" fontSize="10" fontWeight="900" letterSpacing="1">
          SANTHAL PARGANA
        </text>
        <text x="35" y="450" fill="#244766" fontSize="10" fontWeight="900" letterSpacing="1">
          SOUTH CHOTANAGPUR
        </text>
        <text x="525" y="450" fill="#244766" fontSize="10" fontWeight="900" letterSpacing="1">
          KOLHAN DIVISION
        </text>

        {/* Render 24 Interactive District Polygons */}
        {JHARKHAND_VECTOR_POLYGONS.map((poly) => {
          const metric = metricsMap.get(poly.districtCode);
          const distressLevel: DistressIntensityLevel = metric?.distressIntensityLevel || 'MEDIUM';
          const heatConfig = DISTRESS_HEAT_COLORS[distressLevel];
          const isSelected = selectedDistrictCode === poly.districtCode;
          const isHovered = hoveredDistrictCode === poly.districtCode;

          return (
            <g
              key={poly.districtCode}
              onClick={() => {
                if (metric) onSelectDistrict(metric);
              }}
              onMouseEnter={() => onHoverDistrict(poly.districtCode)}
              onMouseLeave={() => onHoverDistrict(null)}
              className="cursor-pointer transition-all duration-200"
              tabIndex={0}
              role="button"
              aria-label={`${poly.districtName} District: ${distressLevel} Distress, ${metric?.totalIssuesReported || 0} issues`}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && metric) {
                  e.preventDefault();
                  onSelectDistrict(metric);
                }
              }}
            >
              {/* Polygonal District Area Path */}
              <polygon
                points={poly.points}
                fill={heatConfig.fill}
                stroke={isSelected ? '#F8E7A2' : isHovered ? '#FFFFFF' : '#0B2545'}
                strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.2}
                strokeLinejoin="round"
                className="transition-all duration-150"
                style={{
                  filter: isSelected ? 'drop-shadow(0px 0px 8px #F8E7A2)' : undefined,
                  opacity: isHovered || isSelected ? 1 : 0.92,
                }}
              />

              {/* District Name Label */}
              <text
                x={poly.cx}
                y={poly.cy - 3}
                fill="#FFFFFF"
                fontSize="8"
                fontWeight="900"
                textAnchor="middle"
                className="pointer-events-none select-none tracking-tight"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
              >
                {poly.districtName.toUpperCase()}
              </text>

              {/* LGD Code & Issue Count Badge */}
              <text
                x={poly.cx}
                y={poly.cy + 8}
                fill={isSelected ? '#F8E7A2' : '#E2E8F0'}
                fontSize="6.5"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none select-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {metric?.totalIssuesReported || 0} Rep &bull; {poly.districtCode}
              </text>

              {/* High Distress Flame/Indicator Marker */}
              {distressLevel === 'ACUTE' && (
                <circle
                  cx={poly.cx + 28}
                  cy={poly.cy - 8}
                  r="3.5"
                  fill="#FF4444"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================================
// MAIN EXECUTIVE COMMAND DASHBOARD
// ============================================================================

export interface StateGISCommandDashboardProps {
  userRole?: string;
  onRoleChange?: (role: any) => void;
  language?: 'en' | 'hi';
}

export const StateGISCommandDashboard: React.FC<StateGISCommandDashboardProps> = ({
  language = 'en',
}) => {
  const { session } = useSession();

  // State: Clock & Timestamps
  const [liveIstTime, setLiveIstTime] = useState<string>('');
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string>('');

  // Filters & Drawer Selections
  const [selectedSector, setSelectedSector] = useState<CommandSectorFilter>('ALL');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(3403); // Default to Dumka
  const [hoveredDistrictCode, setHoveredDistrictCode] = useState<number | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableSlaOnly, setTableSlaOnly] = useState<boolean>(false);

  // Administrative Expedite State
  const [expeditedNotices, setExpeditedNotices] = useState<
    Array<{ noticeId: string; districtName: string; timestamp: string }>
  >([]);
  const [isGeMModalOpen, setIsGeMModalOpen] = useState<boolean>(false);

  // Live queries from Dexie with reactivity
  const liveDistricts = useLiveQuery(() => getDistrictGISMetrics(), []) || [];
  const liveGrants = useLiveQuery(() => getAllEscrowGrants(), []) || [];
  const liveTeams = useLiveQuery(() => getAllTeams(), []) || [];
  const liveSafety = useLiveQuery(() => getAllSafetyValidations(), []) || [];
  const liveBriefs = useLiveQuery(() => getBriefs(), []) || [];
  const liveDrafts = useLiveQuery(() => db.draftSubmissions.toArray(), []) || [];

  // Featured capstone for GeM bridge
  const featuredSafety = useMemo(() => {
    return (
      liveSafety.find((s) => s.masterIssueId === 'JH-2026-M-849201') ||
      liveSafety[0] ||
      null
    );
  }, [liveSafety]);

  const featuredTeam = useMemo(() => {
    return (
      liveTeams.find((t) => t.briefId === 'JH-BRIEF-2026-001' || t.teamName.includes('Jal-Shuddhi')) ||
      liveTeams[0] ||
      null
    );
  }, [liveTeams]);

  const featuredBrief = useMemo(() => {
    return (
      liveBriefs.find((b) => b.masterIssueId === 'JH-2026-M-849201') ||
      liveBriefs[0] ||
      null
    );
  }, [liveBriefs]);

  // Live Clock (Updating every 1 second in IST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveIstTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
      setLastUpdatedIso(
        now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute Aggregated KPIs
  const totalCivicSubmissions = useMemo(() => {
    if (liveDrafts && liveDrafts.length > 0) {
      return liveDrafts.length;
    }
    return liveDistricts.reduce((sum, d) => sum + d.totalIssuesReported, 0);
  }, [liveDrafts, liveDistricts]);

  const endorsedPanchayatPercentage = useMemo(() => {
    if (liveDrafts && liveDrafts.length > 0) {
      const endorsedCount = liveDrafts.filter(
        (d) => Boolean(d.panchayatEndorsedAt || d.masterLifecycleStatus === 'ENDORSED_MASTER' || d.status === 'ENDORSED_MASTER')
      ).length;
      return Math.round((endorsedCount / liveDrafts.length) * 100);
    }
    const totalRep = liveDistricts.reduce((sum, d) => sum + d.totalIssuesReported, 0);
    const totalEnd = liveDistricts.reduce((sum, d) => sum + d.endorsedMasterCount, 0);
    return totalRep > 0 ? Math.round((totalEnd / totalRep) * 100) : 74;
  }, [liveDrafts, liveDistricts]);

  const activeCollegiateCapstones = useMemo(() => {
    if (liveTeams && liveTeams.length > 0) {
      return liveTeams.length;
    }
    return liveDistricts.reduce((sum, d) => sum + d.activeCapstonesCount, 0);
  }, [liveTeams, liveDistricts]);

  const corporateCsrUnlockedINR = useMemo(() => {
    return liveGrants.reduce((sum, g) => {
      const disbursed = g.tranches
        .filter((t) => t.status === 'DISBURSED')
        .reduce((acc, t) => acc + t.amountINR, 0);
      return sum + (disbursed || 0);
    }, 0);
  }, [liveGrants]);

  const verifiedSafetyDeployments = useMemo(() => {
    const passedLive = liveSafety.filter((s) => s.isPublicPilotCleared).length;
    const fallbackCount = liveDistricts.reduce((sum, d) => sum + d.verifiedDeploymentsCount, 0);
    return Math.max(passedLive, fallbackCount);
  }, [liveSafety, liveDistricts]);

  // Selected District Details
  const selectedDistrictData = useMemo(() => {
    if (!selectedDistrictCode) return null;
    return liveDistricts.find((d) => d.districtCode === selectedDistrictCode) || null;
  }, [selectedDistrictCode, liveDistricts]);

  // Lead Hub for selected district
  const selectedDistrictHub = useMemo(() => {
    if (!selectedDistrictData) return null;
    return (
      DISTRICT_INSTITUTIONAL_HUBS[selectedDistrictData.districtName] || {
        leadHub: `${selectedDistrictData.districtName} Engineering College / University Hub`,
        nodalOfficer: 'District Academic Nodal Officer',
        activeLabs: ['District Testing Cell', 'Rural Hardware Fabrication Lab'],
        division: 'Jharkhand State',
      }
    );
  }, [selectedDistrictData]);

  // Compute pending >14 days tickets for selected district
  const pendingOver14DaysCount = useMemo(() => {
    if (!selectedDistrictData) return 0;
    // Look up in liveDrafts
    const norm = selectedDistrictData.districtName.toLowerCase();
    const matching = liveDrafts.filter(
      (d) =>
        (d.lgdLocation?.districtName?.toLowerCase().includes(norm) ||
          d.lgdLocation?.districtCode === selectedDistrictData.districtCode) &&
        !Boolean(d.panchayatEndorsedAt || d.masterLifecycleStatus === 'ENDORSED_MASTER' || d.status === 'ENDORSED_MASTER')
    );
    if (matching.length > 0) {
      return matching.filter((d) => {
        const days = Math.floor((Date.now() - d.timestamp) / (1000 * 60 * 60 * 24));
        return days > 14;
      }).length;
    }
    // Baseline SLA bottleneck estimation
    return selectedDistrictData.distressIntensityLevel === 'ACUTE'
      ? 5
      : selectedDistrictData.distressIntensityLevel === 'HIGH'
      ? 3
      : 1;
  }, [selectedDistrictData, liveDrafts]);

  // Trigger Administrative Expedite Notice
  const handleIssueExpediteNotice = () => {
    if (!selectedDistrictData) return;
    const noticeId = `JH-EXPEDITE-2026-${selectedDistrictData.districtCode}-${crypto
      .randomUUID()
      .slice(0, 4)
      .toUpperCase()}`;
    const newNotice = {
      noticeId,
      districtName: selectedDistrictData.districtName,
      timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };
    setExpeditedNotices((prev) => [newNotice, ...prev]);

    // Trigger window toast for UI feedback
    const toastEvent = new CustomEvent('udbhav:toast', {
      detail: {
        text: `Statutory Expedite Notice ${noticeId} dispatched to District Collector (${selectedDistrictData.districtName})!`,
        type: 'warning',
      },
    });
    window.dispatchEvent(toastEvent);
  };

  // Statewide Master Issues for Resolution SLA & Bottleneck Table
  interface MasterIssueSlaRow {
    issueId: string;
    districtName: string;
    panchayatName: string;
    sector: string;
    daysInPipeline: number;
    currentMilestone: string;
    mentorReviewTimer: string;
    isOverdue: boolean;
    urgencyLevel: DistressIntensityLevel;
  }

  const statewideSlaRows: MasterIssueSlaRow[] = useMemo(() => {
    // Generate combined list from liveDrafts & briefs
    const rows: MasterIssueSlaRow[] = [];

    // Seeded/Real high urgency items
    const baselineItems: MasterIssueSlaRow[] = [
      {
        issueId: 'JH-2026-M-849201',
        districtName: 'Dumka',
        panchayatName: 'Arsande GP',
        sector: 'WATER_SANITATION',
        daysInPipeline: 21,
        currentMilestone: 'Tier 2 BIS Safety Gate (IS 10500:2012)',
        mentorReviewTimer: 'OVERDUE (7 days past SLA)',
        isOverdue: true,
        urgencyLevel: 'ACUTE',
      },
      {
        issueId: 'JH-2026-M-391842',
        districtName: 'Dhanbad',
        panchayatName: 'Govindpur GP',
        sector: 'RURAL_ENERGY',
        daysInPipeline: 18,
        currentMilestone: 'Milestone 2: Lab Telemetry Proof',
        mentorReviewTimer: 'OVERDUE (4 days past SLA)',
        isOverdue: true,
        urgencyLevel: 'ACUTE',
      },
      {
        issueId: 'JH-2026-M-552190',
        districtName: 'Palamu',
        panchayatName: 'Chainpur GP',
        sector: 'AGRITECH',
        daysInPipeline: 16,
        currentMilestone: 'Panchayat Statutory Endorsement',
        mentorReviewTimer: 'OVERDUE (2 days past SLA)',
        isOverdue: true,
        urgencyLevel: 'HIGH',
      },
      {
        issueId: 'JH-2026-M-661204',
        districtName: 'West Singhbhum',
        panchayatName: 'Tonto GP',
        sector: 'HEALTHCARE',
        daysInPipeline: 15,
        currentMilestone: 'Faculty Capstone Matchmaking (70/30)',
        mentorReviewTimer: 'OVERDUE (1 day past SLA)',
        isOverdue: true,
        urgencyLevel: 'HIGH',
      },
      {
        issueId: 'JH-2026-M-771890',
        districtName: 'East Singhbhum',
        panchayatName: 'Potka GP',
        sector: 'INFRASTRUCTURE',
        daysInPipeline: 9,
        currentMilestone: 'Milestone 1: BOM Procurement (30%)',
        mentorReviewTimer: 'Active (36h remaining)',
        isOverdue: false,
        urgencyLevel: 'MEDIUM',
      },
      {
        issueId: 'JH-2026-M-112340',
        districtName: 'Ranchi',
        panchayatName: 'Kanke GP',
        sector: 'WATER_SANITATION',
        daysInPipeline: 6,
        currentMilestone: 'Student Capstone Assembly',
        mentorReviewTimer: 'Active (54h remaining)',
        isOverdue: false,
        urgencyLevel: 'LOW',
      },
    ];

    rows.push(...baselineItems);

    // Merge in any un-endorsed live drafts from Dexie
    liveDrafts.forEach((d) => {
      if (!rows.find((r) => r.issueId === (d.remoteMasterIssueId || d.id))) {
        const days = Math.max(1, Math.floor((Date.now() - d.timestamp) / (1000 * 60 * 60 * 24)));
        const isOver = days > 14;
        let sec = 'WATER_SANITATION';
        if (d.aiTriageCategory?.toLowerCase().includes('energy') || d.aiTriageCategory?.toLowerCase().includes('solar')) {
          sec = 'RURAL_ENERGY';
        } else if (d.aiTriageCategory?.toLowerCase().includes('farm') || d.aiTriageCategory?.toLowerCase().includes('soil')) {
          sec = 'AGRITECH';
        } else if (d.aiTriageCategory?.toLowerCase().includes('health')) {
          sec = 'HEALTHCARE';
        } else if (d.aiTriageCategory?.toLowerCase().includes('road') || d.aiTriageCategory?.toLowerCase().includes('bridge')) {
          sec = 'INFRASTRUCTURE';
        }

        rows.push({
          issueId: d.remoteMasterIssueId || d.id,
          districtName: d.lgdLocation?.districtName || 'Ranchi',
          panchayatName: d.lgdLocation?.panchayatName || 'Gram Panchayat',
          sector: sec,
          daysInPipeline: days,
          currentMilestone: Boolean(d.panchayatEndorsedAt || d.masterLifecycleStatus === 'ENDORSED_MASTER' || d.status === 'ENDORSED_MASTER')
            ? 'Academic Challenge Brief'
            : 'Panchayat Verification Desk',
          mentorReviewTimer: isOver ? `OVERDUE (${days - 14}d past SLA)` : `${14 - days} days remaining`,
          isOverdue: isOver,
          urgencyLevel: isOver ? 'ACUTE' : days > 10 ? 'HIGH' : 'MEDIUM',
        });
      }
    });

    return rows;
  }, [liveDrafts]);

  // Filtered rows for the table
  const filteredSlaRows = useMemo(() => {
    return statewideSlaRows.filter((r) => {
      // Sector filter
      if (selectedSector !== 'ALL' && r.sector !== selectedSector) {
        return false;
      }
      // SLA filter checkbox
      if (tableSlaOnly && !r.isOverdue) {
        return false;
      }
      // Text search
      if (tableSearchQuery.trim()) {
        const q = tableSearchQuery.toLowerCase();
        return (
          r.issueId.toLowerCase().includes(q) ||
          r.districtName.toLowerCase().includes(q) ||
          r.panchayatName.toLowerCase().includes(q) ||
          r.currentMilestone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statewideSlaRows, selectedSector, tableSlaOnly, tableSearchQuery]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-slate-800 space-y-4 pb-12 font-sans select-text">
      {/* ==================================================================== */}
      {/* 1. TOP STATUTORY EXECUTIVE MASTHEAD */}
      {/* ==================================================================== */}
      <header className="bg-[#0B2545] text-white border-b-4 border-amber-500 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Official State Emblem & Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-[#991B1B] text-[#F8E7A2] border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
                    DHTE JHARKHAND &bull; GIGW 3.0 EXECUTIVE
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold tracking-tight">
                    DEPARTMENT OF HIGHER &amp; TECHNICAL EDUCATION — GOVT OF JHARKHAND
                  </span>
                </div>
                <h1 className="text-base sm:text-xl font-black tracking-tight text-white uppercase mt-0.5 leading-snug">
                  {language === 'hi'
                    ? 'राज्य भू-स्थानिक कमान एवं विश्लेषण केंद्र / Statewide Civic R&D GIS Command'
                    : 'Statewide Civic R&D GIS Command & Analytics Console / राज्य भू-स्थानिक कमान केंद्र'}
                </h1>
                <p className="text-xs text-slate-300">
                  {language === 'hi'
                    ? 'झारखंड के २४ जिलों में जमीनी नवाचारों, संकाय मेंटरशिप व डीसी सुरक्षा पायलटों का वास्तविक समय अनुवीक्षण'
                    : 'Real-time Statutory Telemetry across 24 Districts &bull; LGD Spatial Resolution &bull; GFR 173(i) Compliance'}
                </p>
              </div>
            </div>

            {/* Live Telemetry Clocks & Sync Status */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start lg:self-auto">
              {/* Sync Status Badge */}
              <div className="bg-emerald-950/80 border border-emerald-400/80 px-3 py-1.5 text-xs flex items-center gap-2 text-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <span className="text-[9px] text-emerald-400 block font-mono font-bold leading-none">
                    NIC-JH MESH SYNC
                  </span>
                  <span className="font-mono font-bold text-[11px] text-white">ONLINE &bull; ACTIVE</span>
                </div>
              </div>

              {/* Live IST Clock */}
              <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 text-xs text-right font-mono">
                <span className="text-[9px] text-amber-400 block uppercase font-bold tracking-wider leading-none">
                  Live IST Clock ({lastUpdatedIso})
                </span>
                <span className="font-black text-white text-xs sm:text-sm tracking-widest text-[#F8E7A2]">
                  {liveIstTime || '07:05:00 IST'}
                </span>
              </div>

              {/* Role Indicator */}
              <div className="bg-white/10 px-2.5 py-1.5 border border-white/20 text-xs hidden sm:block">
                <span className="text-[9px] text-slate-300 uppercase block font-bold">Session Role:</span>
                <span className="font-mono font-black text-white text-[11px]">
                  {session?.role || 'GOVT_ADMIN'}
                </span>
              </div>

              {/* Startup & GeM Button */}
              <button
                type="button"
                onClick={() => setIsGeMModalOpen(true)}
                className="px-3 py-1.5 bg-[#991B1B] hover:bg-[#7A1B1B] text-white text-xs font-black uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400"
                title="Open Startup Jharkhand & GeM Direct Procurement Bridge"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F8E7A2]" />
                <span>GeM Bridge</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. KPI OVERVIEW CARDS (GIGW 3.0 STYLING) */}
      {/* ==================================================================== */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Civic Submissions */}
          <div className="bg-white border-2 border-slate-300 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Total Submissions
              </span>
              <MapPin className="w-4 h-4 text-[#0B2545]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#0B2545] mt-1.5">
              {totalCivicSubmissions.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Across 24 District Jurisdictions
            </p>
          </div>

          {/* Card 2: Endorsed Master Challenges */}
          <div className="bg-white border-2 border-emerald-400 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Endorsed Challenges
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-900 mt-1.5 flex items-baseline gap-1.5">
              <span>{endorsedPanchayatPercentage}%</span>
              <span className="text-xs font-bold text-emerald-700">Verified</span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Passed 48h Panchayat Quality Gate
            </p>
          </div>

          {/* Card 3: Active Collegiate Capstones */}
          <div className="bg-white border-2 border-blue-300 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                Active Capstones
              </span>
              <Users className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-950 mt-1.5">
              {activeCollegiateCapstones} Teams
            </div>
            <p className="text-[10px] text-blue-700 mt-0.5">
              70/30 Capacity Lock Compliant
            </p>
          </div>

          {/* Card 4: Corporate CSR Capital Unlocked */}
          <div className="bg-white border-2 border-amber-400 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                CSR Capital Unlocked
              </span>
              <Coins className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-950 mt-1.5">
              ₹{(corporateCsrUnlockedINR / 100000).toFixed(2)}L
            </div>
            <p className="text-[10px] text-amber-800 mt-0.5">
              MCA Schedule VII Micro-Grants
            </p>
          </div>

          {/* Card 5: Verified Deployments & BIS Clearances */}
          <div className="bg-white border-2 border-[#991B1B] p-3.5 shadow-2xs col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-[#991B1B]">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#991B1B]">
                BIS Deployments
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#991B1B]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#991B1B] mt-1.5">
              {verifiedSafetyDeployments} Passed
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">
              DC 90-Day Public Pilot Permits
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. INTERACTIVE SECTOR FILTER BAR */}
      {/* ==================================================================== */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-white border border-slate-300 p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#1E6F50]" />
              <span>Sector Domain:</span>
            </span>
          </div>

          {/* Sector Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SECTOR_CHIPS.map((chip) => {
              const Icon = chip.icon;
              const isActive = selectedSector === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedSector(chip.id)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase transition-all inline-flex items-center gap-1.5 cursor-pointer rounded-none border ${
                    isActive
                      ? 'bg-[#0B2545] text-[#F8E7A2] border-[#0B2545] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F8E7A2]' : 'text-slate-500'}`} />
                  <span>{language === 'hi' ? chip.hindiLabel : chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. INTERACTIVE 24-DISTRICT JHARKHAND VECTOR SVG MAP & DRAWER */}
      {/* ==================================================================== */}
      <section className="max-w-7xl mx-auto px-4 space-y-3">
        <div className="border-b-2 border-[#1E6F50] pb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#991B1B]" />
              <span>Statewide Spatial Distress Matrix &bull; 24-District Interactive Vector Map</span>
            </h2>
            <p className="text-[11px] text-slate-600">
              Interactive pure vector SVG topology. Click any district to open the District Deep-Dive Drawer.
            </p>
          </div>

          {/* Distress Heat Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 inline-block border border-slate-700" style={{ backgroundColor: '#991B1B' }}></span>
              <span className="text-slate-700">ACUTE (#991B1B)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 inline-block border border-slate-700" style={{ backgroundColor: '#C25E2E' }}></span>
              <span className="text-slate-700">HIGH (#C25E2E)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 inline-block border border-slate-700" style={{ backgroundColor: '#B47D14' }}></span>
              <span className="text-slate-700">MEDIUM (#B47D14)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 inline-block border border-slate-700" style={{ backgroundColor: '#1E6F50' }}></span>
              <span className="text-slate-700">LOW (#1E6F50)</span>
            </span>
          </div>
        </div>

        {/* Map Grid + Deep Dive Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* 24-District SVG Map Container (8 Cols) */}
          <div className="lg:col-span-8 bg-[#0B2545] border-2 border-slate-700 p-3 sm:p-4 text-white shadow-lg relative">
            <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-slate-800">
              <span className="font-mono text-[11px] text-amber-300 font-bold uppercase tracking-wider">
                JHARKHAND VECTOR TOPOLOGY &bull; 24 ADMINISTRATIVE DISTRICTS
              </span>
              <button
                type="button"
                onClick={() => setSelectedDistrictCode(3403)}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Reset to Dumka
              </button>
            </div>

            {/* Pure Vector SVG Element */}
            <div className="pt-2">
              <JharkhandDistrictSvgMap
                districts={liveDistricts}
                selectedDistrictCode={selectedDistrictCode}
                onSelectDistrict={(d) => setSelectedDistrictCode(d.districtCode)}
                hoveredDistrictCode={hoveredDistrictCode}
                onHoverDistrict={setHoveredDistrictCode}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800 mt-2 font-mono">
              <span>* Zero Map Bloat: Pure SVG Vector Elements &bull; No Leaflet / Mapbox</span>
              <span>LGD Level-2 Geospatial Telemetry</span>
            </div>
          </div>

          {/* District Deep-Dive Drawer (4 Cols) */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-300 p-4 space-y-4 shadow-sm">
            {selectedDistrictData ? (
              <div className="space-y-3.5">
                {/* District Header */}
                <div className="border-b-2 border-slate-200 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-slate-500 uppercase">
                      LGD CODE: {selectedDistrictData.districtCode} &bull; {selectedDistrictHub?.division.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase text-white ${
                        DISTRESS_HEAT_COLORS[selectedDistrictData.distressIntensityLevel].bg
                      }`}
                    >
                      {selectedDistrictData.distressIntensityLevel} DISTRESS
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-[#0B2545] uppercase mt-1">
                    {selectedDistrictData.districtName} District
                  </h3>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Reported Issues
                    </span>
                    <span className="text-base font-black text-[#0B2545] font-mono">
                      {selectedDistrictData.totalIssuesReported}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Endorsed Masters
                    </span>
                    <span className="text-base font-black text-emerald-800 font-mono">
                      {selectedDistrictData.endorsedMasterCount}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Collegiate Teams
                    </span>
                    <span className="text-base font-black text-blue-900 font-mono">
                      {selectedDistrictData.activeCapstonesCount} Teams
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      BIS Field Pilots
                    </span>
                    <span className="text-base font-black text-[#991B1B] font-mono">
                      {selectedDistrictData.verifiedDeploymentsCount} Passed
                    </span>
                  </div>
                </div>

                {/* Lead Institutional Hub */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-900 font-black uppercase text-[10px]">
                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                    <span>Lead Collegiate Innovation Hub</span>
                  </div>
                  <div className="font-bold text-slate-900 text-[12px]">
                    {selectedDistrictHub?.leadHub}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Nodal Officer: <strong>{selectedDistrictHub?.nodalOfficer}</strong>
                  </div>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {selectedDistrictHub?.activeLabs.map((lab, i) => (
                      <span
                        key={i}
                        className="text-[9px] bg-white border border-blue-200 text-blue-800 px-1.5 py-0.2 font-medium"
                      >
                        {lab}
                      </span>
                    ))}
                  </div>
                </div>

                {/* SLA Bottleneck Flag & Action Notice */}
                <div className="p-3 bg-amber-50 border-2 border-amber-400 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-950 font-black uppercase text-[10px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>SLA Review Bottleneck Flag</span>
                    </div>
                    <span className="px-1.5 py-0.2 bg-[#991B1B] text-white text-[9px] font-mono font-black">
                      {pendingOver14DaysCount} &gt; 14 Days
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 leading-snug">
                    {pendingOver14DaysCount > 0 ? (
                      <>
                        <strong>{pendingOver14DaysCount} challenge tickets</strong> in {selectedDistrictData.districtName} have exceeded the statutory 14-day review turnaround window without faculty or Panchayat clearance.
                      </>
                    ) : (
                      <>District resolution pipeline is operating within standard 14-day benchmark.</>
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={handleIssueExpediteNotice}
                    className="w-full py-2 bg-[#991B1B] hover:bg-[#7A1B1B] text-white text-xs font-bold uppercase transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5 text-[#F8E7A2]" />
                    <span>Issue Administrative Expedite Notice</span>
                  </button>
                </div>

                {/* Recently Dispatched Notices Log */}
                {expeditedNotices.length > 0 && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">
                      Active Expedite Orders:
                    </span>
                    {expeditedNotices.slice(0, 2).map((notice) => (
                      <div
                        key={notice.noticeId}
                        className="text-[10px] font-mono text-slate-700 bg-white p-1 border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-bold text-[#991B1B]">{notice.noticeId}</span>
                        <span className="text-slate-500">{notice.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold">No District Selected</p>
                <p className="text-[11px]">Click any district polygon on the map to inspect localized telemetry.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. STATEWIDE RESOLUTION SLA & BOTTLENECK TABLE */}
      {/* ==================================================================== */}
      <section className="max-w-7xl mx-auto px-4 space-y-3">
        <div className="border-b-2 border-[#1E6F50] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E6F50]" />
              <span>Statewide Resolution SLA &amp; Bottleneck Accountability Ledger</span>
            </h2>
            <p className="text-[11px] text-slate-600">
              High-urgency master challenges across districts with pipeline days, milestone progress, and mentor review timers.
            </p>
          </div>

          {/* Table Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Search ticket / district..."
                className="pl-8 pr-2.5 py-1 text-xs border border-slate-300 font-medium w-48 focus:outline-none focus:border-[#0B2545] bg-white"
              />
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold bg-white px-2.5 py-1 border border-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={tableSlaOnly}
                onChange={(e) => setTableSlaOnly(e.target.checked)}
                className="rounded-none text-[#991B1B] focus:ring-0"
              />
              <span>&gt; 14 Days SLA Breached Only</span>
            </label>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-slate-300 bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B2545] text-white text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="p-2.5 border-r border-slate-700">Master Ticket ID</th>
                <th className="p-2.5 border-r border-slate-700">District / Jurisdiction</th>
                <th className="p-2.5 border-r border-slate-700">Sector</th>
                <th className="p-2.5 border-r border-slate-700 text-center">Pipeline Days</th>
                <th className="p-2.5 border-r border-slate-700">Current Milestone Stage</th>
                <th className="p-2.5 border-r border-slate-700">Mentor Review Timer</th>
                <th className="p-2.5 text-center">Statutory Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSlaRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                    No master issue bottlenecks found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredSlaRows.map((row) => (
                  <tr
                    key={row.issueId}
                    className={`hover:bg-slate-50 transition-colors ${
                      row.isOverdue ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">
                      {row.issueId}
                    </td>
                    <td className="p-2.5 border-r border-slate-200">
                      <span className="font-bold text-slate-800">{row.districtName}</span>
                      <span className="text-[10px] text-slate-500 block">{row.panchayatName}</span>
                    </td>
                    <td className="p-2.5 border-r border-slate-200">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                        {row.sector.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold border-r border-slate-200">
                      {row.isOverdue ? (
                        <span className="px-1.5 py-0.5 bg-[#991B1B] text-white text-[10px] font-black inline-block">
                          {row.daysInPipeline} Days (&gt;14d)
                        </span>
                      ) : (
                        <span className="text-slate-800">{row.daysInPipeline} Days</span>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {row.currentMilestone}
                    </td>
                    <td className="p-2.5 border-r border-slate-200">
                      {row.isOverdue ? (
                        <span className="text-[#991B1B] font-bold text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-[#991B1B] shrink-0" />
                          <span>{row.mentorReviewTimer}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{row.mentorReviewTimer}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const noticeId = `JH-EXPEDITE-${row.issueId.slice(-6)}-${crypto
                            .randomUUID()
                            .slice(0, 4)
                            .toUpperCase()}`;
                          const toastEvent = new CustomEvent('udbhav:toast', {
                            detail: {
                              text: `Administrative Notice ${noticeId} dispatched for ${row.issueId} (${row.districtName})!`,
                              type: 'warning',
                            },
                          });
                          window.dispatchEvent(toastEvent);
                        }}
                        className="px-2 py-1 bg-[#0B2545] hover:bg-[#153e70] text-white text-[10px] font-bold uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3 text-[#F8E7A2]" />
                        <span>Expedite</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. STARTUP JHARKHAND & GeM PROCUREMENT BRIDGE PANEL */}
      {/* ==================================================================== */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-amber-50/80 via-white to-slate-50 border-2 border-amber-400 p-4 shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-300 pb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#991B1B] text-[#F8E7A2] p-2.5 border border-amber-500 shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#1E6F50] text-white text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
                    SCALE &amp; COMMERCIALIZATION ACCELERATOR
                  </span>
                  <span className="text-[10px] font-mono text-slate-700 font-bold">
                    GFR 2017 RULE 173(i) &bull; GeM SPECIAL WINDOW &bull; RULE 149 DIRECT PURCHASE
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-[#0B2545] uppercase mt-0.5">
                  Startup Jharkhand &amp; Government e-Marketplace (GeM) Procurement Bridge
                </h3>
                <p className="text-xs text-slate-600">
                  Relaxation of Prior Turnover &amp; Experience for Accredited Collegiate Innovations under Ministry of Finance OM No. F.20/2/2014-PPD
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGeMModalOpen(true)}
              className="px-4 py-2.5 bg-[#991B1B] hover:bg-[#7A1B1B] text-white text-xs font-black uppercase transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md shrink-0 self-start md:self-auto border border-amber-400"
            >
              <Sparkles className="w-4 h-4 text-[#F8E7A2]" />
              <span>Generate Startup Jharkhand &amp; GeM Onboarding Packet</span>
            </button>
          </div>

          {/* Featured Capstone Spin-off Details */}
          <div className="bg-white border border-slate-300 p-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 font-black uppercase inline-block">
                TIER 2 BIS CERTIFIED &bull; FIELD PILOT CLEARED
              </span>
              <h4 className="text-sm font-black text-[#0B2545]">
                {featuredTeam?.teamName || 'Jal-Shuddhi Innovators'} (BIT Sindri)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Solar-Powered IoT Fluoride Remediation Unit for Dumka District (Challenge JH-2026-M-849201).
              </p>
            </div>

            <div className="text-xs space-y-1.5 bg-slate-50 p-2.5 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Accredited Testing Lab:</span>
                <span className="font-bold text-slate-800">
                  {featuredSafety?.tier2EvaluatorAgency || 'CSIR-CIMFR Dhanbad'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Verified BIS Standard:</span>
                <span className="font-mono text-slate-900 font-bold">
                  {featuredSafety?.tier2BisStandardCode || 'IS 10500:2012'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">DC Permit Pass:</span>
                <span className="font-mono font-bold text-[#991B1B]">
                  {featuredSafety?.dcPilotPermitQR || 'JH-DC-PILOT-PERMIT-2026-9E5B'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Exempted from Prior Turnover &amp; Experience under GFR 173(i)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Eligible for direct government contracting across Gram Panchayats, Block Development Offices (BDOs), and Public Health Engineering Department (PHED).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. MODAL: STARTUP JHARKHAND & GeM ONBOARDING PACKET (PRINTABLE) */}
      {/* ==================================================================== */}
      {isGeMModalOpen && (
        <React.Suspense fallback={null}>
          <GemProcurementBridgeModal
            isOpen={isGeMModalOpen}
            onClose={() => setIsGeMModalOpen(false)}
            team={featuredTeam}
            safetyVal={featuredSafety}
            brief={featuredBrief}
            language={language}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default StateGISCommandDashboard;

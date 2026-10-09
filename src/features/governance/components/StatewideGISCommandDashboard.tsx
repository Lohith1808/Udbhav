/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 3: Governance & Capital — Task 3.5 (Final Sprint 3 Task)
 * 
 * StatewideGISCommandDashboard (Shoe 5 - Executive Command & Analytics):
 * State executive command and spatial analytics portal for the Department of
 * Higher & Technical Education (DHTE) and District Administrations.
 * 
 * Features:
 * 1. Top Executive KPI Strip: Statewide Ingestion, Endorsement Velocity, Active Capstones,
 *    Committed CSR Capital, and BIS Certified Field Deployments.
 * 2. Statewide Spatial Distress Matrix / Heatmap: Interactive SVG Choropleth across 24 Jharkhand
 *    districts with click-to-filter capability and ACUTE / HIGH / MEDIUM / LOW color-coding.
 * 3. District Performance & SLA Telemetry Table: 24-district breakdown, LGD codes, SLA bottleneck
 *    highlights (e.g. Dumka / Dhanbad), and statutory compliance indicators.
 * 4. Startup Jharkhand & GeM Procurement Bridge Panel: Fast-track commercialization and public
 *    procurement exemption dossier under GFR 2017 Rule 173(i) for BIS-certified student spin-offs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Users,
  Award,
  Coins,
  Clock,
  Building2,
  CheckCircle2,
  Printer,
  X,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  DistrictGISSummary,
  DistressIntensityLevel,
  EscrowGrant,
  SafetyValidation,
} from '../../../types/governance';
import { StudentTeam, EngineeringProblemBrief } from '../../../types/solver';
import {
  getDistrictGISMetrics,
  getAllEscrowGrants,
  getAllSafetyValidations,
  getAllTeams,
  getBriefs,
} from '../../../lib/db';

export interface StatewideGISCommandDashboardProps {
  userRole?: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR';
  onRoleChange?: (role: 'FACULTY_MENTOR' | 'GOVT_ADMIN' | 'INDUSTRY_CSR' | 'ACCREDITED_EVALUATOR') => void;
  language?: 'en' | 'hi';
}

/**
 * 24 Official Districts of Jharkhand with LGD Codes, Administrative Divisions,
 * and SVG Geographic Centroids for authentic choropleth rendering.
 */
interface DistrictGeoData {
  districtCode: number;
  districtName: string;
  division: string;
  cx: number;
  cy: number;
  baselineIssues: number;
  baselineEndorsed: number;
  baselineCapstones: number;
  baselineDeployments: number;
  distressLevel: DistressIntensityLevel;
  averageResolutionDays: number;
  slaBottleneckAlert?: string;
}

const JHARKHAND_24_DISTRICTS: DistrictGeoData[] = [
  // Santhal Pargana Division
  { districtCode: 3403, districtName: 'Dumka', division: 'Santhal Pargana', cx: 510, cy: 90, baselineIssues: 39, baselineEndorsed: 28, baselineCapstones: 9, baselineDeployments: 4, distressLevel: 'ACUTE', averageResolutionDays: 26, slaBottleneckAlert: 'ALERT: 1 Capstone awaiting Tier 2 BIS clearance (IS 10500:2012)' },
  { districtCode: 3406, districtName: 'Deoghar', division: 'Santhal Pargana', cx: 440, cy: 70, baselineIssues: 22, baselineEndorsed: 17, baselineCapstones: 5, baselineDeployments: 3, distressLevel: 'MEDIUM', averageResolutionDays: 16 },
  { districtCode: 3407, districtName: 'Godda', division: 'Santhal Pargana', cx: 510, cy: 40, baselineIssues: 18, baselineEndorsed: 13, baselineCapstones: 4, baselineDeployments: 2, distressLevel: 'HIGH', averageResolutionDays: 21 },
  { districtCode: 3410, districtName: 'Sahibganj', division: 'Santhal Pargana', cx: 575, cy: 35, baselineIssues: 26, baselineEndorsed: 19, baselineCapstones: 6, baselineDeployments: 3, distressLevel: 'HIGH', averageResolutionDays: 24 },
  { districtCode: 3409, districtName: 'Pakur', division: 'Santhal Pargana', cx: 575, cy: 85, baselineIssues: 16, baselineEndorsed: 11, baselineCapstones: 3, baselineDeployments: 1, distressLevel: 'MEDIUM', averageResolutionDays: 19, slaBottleneckAlert: 'Awaiting CSR co-funding allocation under MCA Schedule VII' },
  { districtCode: 3408, districtName: 'Jamtara', division: 'Santhal Pargana', cx: 495, cy: 130, baselineIssues: 15, baselineEndorsed: 12, baselineCapstones: 3, baselineDeployments: 2, distressLevel: 'LOW', averageResolutionDays: 13 },

  // North Chotanagpur Division
  { districtCode: 3402, districtName: 'Dhanbad', division: 'North Chotanagpur', cx: 440, cy: 135, baselineIssues: 54, baselineEndorsed: 41, baselineCapstones: 14, baselineDeployments: 9, distressLevel: 'ACUTE', averageResolutionDays: 22, slaBottleneckAlert: 'High volume: 14 capstone teams deployed at BIT Sindri & IIT-ISM' },
  { districtCode: 3411, districtName: 'Bokaro', division: 'North Chotanagpur', cx: 375, cy: 140, baselineIssues: 31, baselineEndorsed: 25, baselineCapstones: 8, baselineDeployments: 5, distressLevel: 'MEDIUM', averageResolutionDays: 17 },
  { districtCode: 3413, districtName: 'Giridih', division: 'North Chotanagpur', cx: 380, cy: 80, baselineIssues: 29, baselineEndorsed: 21, baselineCapstones: 7, baselineDeployments: 3, distressLevel: 'HIGH', averageResolutionDays: 20 },
  { districtCode: 3405, districtName: 'Hazaribagh', division: 'North Chotanagpur', cx: 300, cy: 95, baselineIssues: 27, baselineEndorsed: 19, baselineCapstones: 6, baselineDeployments: 3, distressLevel: 'LOW', averageResolutionDays: 14 },
  { districtCode: 3414, districtName: 'Koderma', division: 'North Chotanagpur', cx: 295, cy: 45, baselineIssues: 14, baselineEndorsed: 10, baselineCapstones: 3, baselineDeployments: 2, distressLevel: 'LOW', averageResolutionDays: 12 },
  { districtCode: 3412, districtName: 'Chatra', division: 'North Chotanagpur', cx: 220, cy: 70, baselineIssues: 23, baselineEndorsed: 16, baselineCapstones: 5, baselineDeployments: 2, distressLevel: 'HIGH', averageResolutionDays: 22 },
  { districtCode: 3415, districtName: 'Ramgarh', division: 'North Chotanagpur', cx: 310, cy: 155, baselineIssues: 19, baselineEndorsed: 15, baselineCapstones: 4, baselineDeployments: 3, distressLevel: 'LOW', averageResolutionDays: 11 },

  // South Chotanagpur Division
  { districtCode: 3401, districtName: 'Ranchi', division: 'South Chotanagpur', cx: 250, cy: 180, baselineIssues: 48, baselineEndorsed: 36, baselineCapstones: 12, baselineDeployments: 7, distressLevel: 'HIGH', averageResolutionDays: 18, slaBottleneckAlert: 'Capital Cluster: 12 active capstones across BIT Mesra & NIFFT' },
  { districtCode: 3418, districtName: 'Lohardaga', division: 'South Chotanagpur', cx: 165, cy: 175, baselineIssues: 13, baselineEndorsed: 10, baselineCapstones: 3, baselineDeployments: 2, distressLevel: 'LOW', averageResolutionDays: 13 },
  { districtCode: 3416, districtName: 'Gumla', division: 'South Chotanagpur', cx: 125, cy: 225, baselineIssues: 25, baselineEndorsed: 18, baselineCapstones: 5, baselineDeployments: 2, distressLevel: 'HIGH', averageResolutionDays: 23 },
  { districtCode: 3419, districtName: 'Simdega', division: 'South Chotanagpur', cx: 120, cy: 290, baselineIssues: 17, baselineEndorsed: 12, baselineCapstones: 4, baselineDeployments: 1, distressLevel: 'MEDIUM', averageResolutionDays: 19 },
  { districtCode: 3417, districtName: 'Khunti', division: 'South Chotanagpur', cx: 240, cy: 235, baselineIssues: 21, baselineEndorsed: 15, baselineCapstones: 5, baselineDeployments: 3, distressLevel: 'MEDIUM', averageResolutionDays: 16 },

  // Kolhan Division
  { districtCode: 3404, districtName: 'East Singhbhum', division: 'Kolhan', cx: 435, cy: 245, baselineIssues: 32, baselineEndorsed: 24, baselineCapstones: 8, baselineDeployments: 6, distressLevel: 'MEDIUM', averageResolutionDays: 15, slaBottleneckAlert: 'Industrial Corridor: Sponsored by Tata Steel Foundation & NIT Jamshedpur' },
  { districtCode: 3421, districtName: 'Saraikela Kharsawan', division: 'Kolhan', cx: 360, cy: 235, baselineIssues: 20, baselineEndorsed: 16, baselineCapstones: 5, baselineDeployments: 3, distressLevel: 'LOW', averageResolutionDays: 14 },
  { districtCode: 3420, districtName: 'West Singhbhum', division: 'Kolhan', cx: 280, cy: 295, baselineIssues: 33, baselineEndorsed: 22, baselineCapstones: 7, baselineDeployments: 3, distressLevel: 'ACUTE', averageResolutionDays: 27, slaBottleneckAlert: 'ALERT: Iron contamination telemetry pending lab verification in Chaibasa' },

  // Palamu Division
  { districtCode: 3424, districtName: 'Palamu', division: 'Palamu', cx: 140, cy: 65, baselineIssues: 35, baselineEndorsed: 24, baselineCapstones: 7, baselineDeployments: 3, distressLevel: 'ACUTE', averageResolutionDays: 25, slaBottleneckAlert: 'SLA Warning: 3 water quality grievances pending Panchayat endorsement > 36 hrs' },
  { districtCode: 3422, districtName: 'Garhwa', division: 'Palamu', cx: 65, cy: 50, baselineIssues: 28, baselineEndorsed: 19, baselineCapstones: 6, baselineDeployments: 2, distressLevel: 'HIGH', averageResolutionDays: 24 },
  { districtCode: 3423, districtName: 'Latehar', division: 'Palamu', cx: 145, cy: 120, baselineIssues: 24, baselineEndorsed: 17, baselineCapstones: 5, baselineDeployments: 2, distressLevel: 'MEDIUM', averageResolutionDays: 18 },
];

const DISTRESS_COLOR_MAP: Record<DistressIntensityLevel, { bg: string; text: string; fill: string; border: string }> = {
  ACUTE: { bg: 'bg-[#7A1B1B]', text: 'text-[#7A1B1B]', fill: '#7A1B1B', border: 'border-[#7A1B1B]' },
  HIGH: { bg: 'bg-[#C25E2E]', text: 'text-[#C25E2E]', fill: '#C25E2E', border: 'border-[#C25E2E]' },
  MEDIUM: { bg: 'bg-[#B47D14]', text: 'text-[#B47D14]', fill: '#B47D14', border: 'border-[#B47D14]' },
  LOW: { bg: 'bg-[#1E6F50]', text: 'text-[#1E6F50]', fill: '#1E6F50', border: 'border-[#1E6F50]' },
};

export const StatewideGISCommandDashboard: React.FC<StatewideGISCommandDashboardProps> = ({
  userRole: propUserRole = 'GOVT_ADMIN',
  onRoleChange,
  language = 'en',
}) => {
  const [dbDistricts, setDbDistricts] = useState<DistrictGISSummary[]>([]);
  const [grants, setGrants] = useState<EscrowGrant[]>([]);
  const [teams, setTeams] = useState<StudentTeam[]>([]);
  const [briefs, setBriefs] = useState<EngineeringProblemBrief[]>([]);
  const [safetyValidations, setSafetyValidations] = useState<SafetyValidation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & Selection states
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(3403); // Default Dumka
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [distressFilter, setDistressFilter] = useState<string>('ALL');
  const [isGeMModalOpen, setIsGeMModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allDistrictMetrics, allGrants, allTeams, allBriefs, allSafety] = await Promise.all([
        getDistrictGISMetrics(),
        getAllEscrowGrants(),
        getAllTeams(),
        getBriefs(),
        getAllSafetyValidations(),
      ]);
      setDbDistricts(allDistrictMetrics);
      setGrants(allGrants);
      setTeams(allTeams);
      setBriefs(allBriefs);
      setSafetyValidations(allSafety);
    } catch (err) {
      console.error('Failed to load GIS telemetry metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Merge baseline 24-district data with any dynamic Dexie metrics
  const mergedDistricts = useMemo(() => {
    return JHARKHAND_24_DISTRICTS.map((geo) => {
      const match = dbDistricts.find((d) => d.districtCode === geo.districtCode);
      if (match) {
        return {
          ...geo,
          baselineIssues: match.totalIssuesReported,
          baselineEndorsed: match.endorsedMasterCount,
          baselineCapstones: match.activeCapstonesCount,
          baselineDeployments: match.verifiedDeploymentsCount,
          distressLevel: match.distressIntensityLevel,
          averageResolutionDays: match.averageResolutionDays,
        };
      }
      return geo;
    });
  }, [dbDistricts]);

  // Aggregate Statewide KPIs
  const totalStatewideIssues = useMemo(() => {
    const sum = mergedDistricts.reduce((acc, d) => acc + d.baselineIssues, 0);
    return Math.max(sum, briefs.length);
  }, [mergedDistricts, briefs]);

  const totalStatewideCapstones = useMemo(() => {
    const sum = mergedDistricts.reduce((acc, d) => acc + d.baselineCapstones, 0);
    return Math.max(sum, teams.length);
  }, [mergedDistricts, teams]);

  const totalStatewideDeployments = useMemo(() => {
    const cleared = safetyValidations.filter((s) => s.isPublicPilotCleared).length;
    const sum = mergedDistricts.reduce((acc, d) => acc + d.baselineDeployments, 0);
    return Math.max(sum, cleared);
  }, [mergedDistricts, safetyValidations]);

  const dumkaSafety = useMemo(() => {
    return (
      safetyValidations.find((s) => s.masterIssueId === 'JH-2026-M-849201') ||
      safetyValidations[0] ||
      null
    );
  }, [safetyValidations]);

  const totalCommittedCSR = useMemo(() => {
    return grants.reduce((sum, g) => sum + g.totalCommittedINR, 0);
  }, [grants]);

  const totalDisbursedCSR = useMemo(() => {
    return grants.reduce((sum, g) => {
      return (
        sum +
        g.tranches
          .filter((t) => t.status === 'DISBURSED')
          .reduce((acc, t) => acc + t.amountINR, 0)
      );
    }, 0);
  }, [grants]);

  const selectedDistrictData = useMemo(() => {
    if (!selectedDistrictCode) return null;
    return mergedDistricts.find((d) => d.districtCode === selectedDistrictCode) || null;
  }, [selectedDistrictCode, mergedDistricts]);

  // Filtered table rows
  const filteredDistricts = useMemo(() => {
    return mergedDistricts.filter((d) => {
      const matchesSearch =
        d.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.districtCode.toString().includes(searchQuery) ||
        d.division.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDistress =
        distressFilter === 'ALL' || d.distressLevel === distressFilter;
      return matchesSearch && matchesDistress;
    });
  }, [mergedDistricts, searchQuery, distressFilter]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white border border-slate-300 text-xs font-mono">
        Loading Statewide GIS Command Telemetry...
      </div>
    );
  }

  return (
    <section className="bg-white border border-slate-300 rounded-none shadow-2xs overflow-hidden space-y-4 text-slate-800">
      {/* ==================================================================== */}
      {/* 1. STATEWIDE EXECUTIVE MASTHEAD BANNER */}
      {/* ==================================================================== */}
      <div className="bg-[#0B2545] text-white p-4 border-b-4 border-amber-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#7A1B1B] text-[#F8E7A2] p-2.5 border border-amber-900/60 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#FF9933] text-black text-[9px] font-black uppercase px-1.5 py-0.2">
                  SHOE 5 &bull; STATE EXECUTIVE COMMAND
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  DHTE-GIS-JH-2026 &bull; STATUTORY OVERSIGHT
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5">
                {language === 'hi'
                  ? 'राज्यव्यापी जीआईएस कमान एवं प्रशासनिक समाधान केंद्र'
                  : 'Statewide GIS Command & Resolution Analytics Portal'}
              </h2>
              <p className="text-xs text-slate-300">
                {language === 'hi'
                  ? 'झारखंड के २४ जिलों में जमीनी शिकायतों, विश्वविद्यालय नवाचारों एवं फील्ड पायलटों की निगरानी'
                  : 'Integrated Telemetry: 24 Districts &bull; Panchayat Quality Gates &bull; BIS Safety Gate &bull; GeM Bridge'}
              </p>
            </div>
          </div>

          {/* Role Indicator & GeM Quick Action */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="bg-white/10 px-3 py-1.5 border border-white/20 text-xs flex items-center gap-2">
              <div>
                <span className="text-[10px] text-amber-300 uppercase font-black block">
                  Executive Role:
                </span>
                <span className="font-bold text-white uppercase">
                  {propUserRole || 'GOVT_ADMIN'}
                </span>
              </div>
              {onRoleChange && propUserRole !== 'GOVT_ADMIN' && (
                <button
                  type="button"
                  onClick={() => onRoleChange('GOVT_ADMIN')}
                  className="px-2 py-0.5 bg-[#F8E7A2] text-[#0B2545] text-[10px] font-black uppercase cursor-pointer"
                >
                  Switch to Govt Admin
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsGeMModalOpen(true)}
              className="px-3 py-2 bg-[#7A1B1B] hover:bg-[#962626] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Open Startup Jharkhand & GeM Direct Procurement Bridge"
            >
              <Sparkles className="w-4 h-4 text-[#F8E7A2]" />
              <span>Startup &amp; GeM Bridge</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP EXECUTIVE KPI STRIP (GIGW 3.0 CARDS) */}
      {/* ==================================================================== */}
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Statewide Grassroots Ingestion */}
          <div className="bg-slate-50 border-2 border-slate-300 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                Grassroots Ingestion
              </span>
              <MapPin className="w-4 h-4 text-[#0B2545]" />
            </div>
            <div className="text-xl font-black font-mono text-[#0B2545] mt-1">
              {totalStatewideIssues}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Live issues across 24 Districts
            </p>
          </div>

          {/* Card 2: Panchayat Endorsement Velocity */}
          <div className="bg-emerald-50 border-2 border-emerald-400 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-800 font-bold uppercase">
                Endorsement Velocity
              </span>
              <Clock className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-900 mt-1">
              18.4 hrs
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              Statutory 48h SLA compliant
            </p>
          </div>

          {/* Card 3: Active Collegiate Capstones */}
          <div className="bg-blue-50 border-2 border-blue-300 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-800 font-bold uppercase">
                Collegiate Solvers
              </span>
              <Users className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-xl font-black font-mono text-blue-900 mt-1">
              {totalStatewideCapstones} Teams
            </div>
            <p className="text-[10px] text-blue-700 mt-0.5">
              BIT Sindri, NIT JSR &amp; ISM
            </p>
          </div>

          {/* Card 4: Committed CSR Capital */}
          <div className="bg-amber-50 border-2 border-amber-400 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-800 font-bold uppercase">
                Committed CSR Capital
              </span>
              <Coins className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-xl font-black font-mono text-amber-900 mt-1">
              ₹{(totalCommittedCSR / 100000).toFixed(2)}L
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5">
              ₹{(totalDisbursedCSR / 1000).toFixed(0)}k disbursed via Escrow
            </p>
          </div>

          {/* Card 5: BIS Certified Hardware Pilots */}
          <div className="bg-[#7A1B1B]/10 border-2 border-[#7A1B1B]/40 p-3 shadow-2xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#7A1B1B] font-bold uppercase">
                BIS Field Deployments
              </span>
              <Award className="w-4 h-4 text-[#7A1B1B]" />
            </div>
            <div className="text-xl font-black font-mono text-[#7A1B1B] mt-1">
              {totalStatewideDeployments} Pilots
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Authorized DC 90-day permits
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. STATEWIDE SPATIAL DISTRESS MATRIX & INTERACTIVE CHOROPLETH */}
      {/* ==================================================================== */}
      <div className="px-4 space-y-3">
        <div className="border-b-2 border-[#1E6F50] pb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1E6F50]" />
              <span>Statewide Spatial Distress Matrix &bull; 24-District Interactive Choropleth</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Click any district below to filter localized distress analytics, active collegiate solvers, and SLA bottlenecks.
            </p>
          </div>

          {/* Distress Legend */}
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#7A1B1B] inline-block border border-slate-600"></span>
              <span>Acute (#7A1B1B)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#C25E2E] inline-block border border-slate-600"></span>
              <span>High (#C25E2E)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#B47D14] inline-block border border-slate-600"></span>
              <span>Medium (#B47D14)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#1E6F50] inline-block border border-slate-600"></span>
              <span>Low (#1E6F50)</span>
            </span>
          </div>
        </div>

        {/* Choropleth Grid + Selected District Deep-Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* SVG Map Container (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-900 border-2 border-slate-700 p-3 sm:p-4 text-white relative">
            <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-slate-800">
              <span className="font-mono text-[10px] text-amber-400 font-bold">
                JHARKHAND GEOGRAPHICAL DISTRESS HEATMAP &bull; 24 ADMINISTRATIVE DISTRICTS
              </span>
              <button
                type="button"
                onClick={() => setSelectedDistrictCode(null)}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Reset Map Selection
              </button>
            </div>

            {/* SVG Choropleth Map */}
            <div className="w-full overflow-x-auto py-2 flex justify-center">
              <svg
                viewBox="0 0 650 340"
                className="w-full max-w-[650px] h-auto select-none"
                style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))' }}
                role="img"
                aria-label="Jharkhand 24-District Interactive Choropleth Map"
              >
                {/* State Boundary Outline Placeholder */}
                <rect
                  x="20"
                  y="10"
                  width="610"
                  height="320"
                  fill="#0F2537"
                  stroke="#1E3A52"
                  strokeWidth="1.5"
                  rx="6"
                />

                {/* Grid Lines for Telemetry Feel */}
                <line x1="20" y1="110" x2="630" y2="110" stroke="#163248" strokeDasharray="3 3" />
                <line x1="20" y1="210" x2="630" y2="210" stroke="#163248" strokeDasharray="3 3" />
                <line x1="220" y1="10" x2="220" y2="330" stroke="#163248" strokeDasharray="3 3" />
                <line x1="420" y1="10" x2="420" y2="330" stroke="#163248" strokeDasharray="3 3" />

                {/* Division Region Watermarks */}
                <text x="70" y="30" fill="#244766" fontSize="9" fontWeight="900" textAnchor="start">PALAMU DIVISION</text>
                <text x="240" y="30" fill="#244766" fontSize="9" fontWeight="900" textAnchor="start">NORTH CHOTANAGPUR</text>
                <text x="460" y="30" fill="#244766" fontSize="9" fontWeight="900" textAnchor="start">SANTHAL PARGANA</text>
                <text x="140" y="315" fill="#244766" fontSize="9" fontWeight="900" textAnchor="start">SOUTH CHOTANAGPUR</text>
                <text x="360" y="315" fill="#244766" fontSize="9" fontWeight="900" textAnchor="start">KOLHAN DIVISION</text>

                {/* Interactive District Tiles */}
                {mergedDistricts.map((d) => {
                  const isSelected = selectedDistrictCode === d.districtCode;
                  const color = DISTRESS_COLOR_MAP[d.distressLevel].fill;
                  const tileW = 58;
                  const tileH = 34;
                  const x = d.cx - tileW / 2;
                  const y = d.cy - tileH / 2;

                  return (
                    <g
                      key={d.districtCode}
                      onClick={() => setSelectedDistrictCode(d.districtCode)}
                      className="cursor-pointer transition-transform hover:opacity-90"
                      tabIndex={0}
                      role="button"
                      aria-label={`${d.districtName} district, distress level ${d.distressLevel}`}
                    >
                      {/* Tile Box */}
                      <rect
                        x={x}
                        y={y}
                        width={tileW}
                        height={tileH}
                        rx="3"
                        fill={color}
                        stroke={isSelected ? '#F8E7A2' : '#FFFFFF'}
                        strokeWidth={isSelected ? 2.5 : 0.8}
                        className={isSelected ? 'filter drop-shadow-md' : ''}
                      />

                      {/* District Name */}
                      <text
                        x={d.cx}
                        y={d.cy - 3}
                        fill="#FFFFFF"
                        fontSize="7.5"
                        fontWeight="900"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {d.districtName.toUpperCase()}
                      </text>

                      {/* Issues & LGD Code */}
                      <text
                        x={d.cx}
                        y={d.cy + 9}
                        fill="#F8E7A2"
                        fontSize="6.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {d.baselineIssues} Issues &bull; {d.districtCode}
                      </text>

                      {/* Bottleneck Alert Indicator Dot */}
                      {d.slaBottleneckAlert && (
                        <circle
                          cx={x + tileW - 4}
                          cy={y + 4}
                          r="3"
                          fill="#FFCC00"
                          stroke="#000000"
                          strokeWidth="0.5"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span>* Interactive Vector Topology: Click nodes to filter localized SLA status</span>
              <span>LGD Level 2 Spatial Aggregation</span>
            </div>
          </div>

          {/* Selected District Deep Dive Card (4 Cols) */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-300 p-4 space-y-3 shadow-2xs">
            {selectedDistrictData ? (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 font-mono">
                      LGD CODE: {selectedDistrictData.districtCode} &bull; {selectedDistrictData.division.toUpperCase()}
                    </span>
                    <h4 className="text-base font-black text-[#0B2545] uppercase">
                      {selectedDistrictData.districtName} District
                    </h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black uppercase text-white ${
                      DISTRESS_COLOR_MAP[selectedDistrictData.distressLevel].bg
                    }`}
                  >
                    {selectedDistrictData.distressLevel} DISTRESS
                  </span>
                </div>

                {/* District Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Reported Issues
                    </span>
                    <span className="text-sm font-black text-[#0B2545] font-mono">
                      {selectedDistrictData.baselineIssues}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Endorsed Masters
                    </span>
                    <span className="text-sm font-black text-emerald-800 font-mono">
                      {selectedDistrictData.baselineEndorsed}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Active Capstones
                    </span>
                    <span className="text-sm font-black text-blue-900 font-mono">
                      {selectedDistrictData.baselineCapstones} Teams
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      BIS Field Pilots
                    </span>
                    <span className="text-sm font-black text-[#7A1B1B] font-mono">
                      {selectedDistrictData.baselineDeployments} Deployed
                    </span>
                  </div>
                </div>

                {/* SLA Turnaround */}
                <div className="p-2 bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Avg Grievance Latency:</span>
                  <span className="font-mono font-black text-slate-900">
                    {selectedDistrictData.averageResolutionDays} Days
                  </span>
                </div>

                {/* Bottleneck Alert Banner */}
                {selectedDistrictData.slaBottleneckAlert ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-400 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-black uppercase text-[10px] text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Administrative Attention Notice</span>
                    </div>
                    <p className="text-[11px] leading-snug">
                      {selectedDistrictData.slaBottleneckAlert}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-[11px]">
                      District operating within statutory SLA benchmarks with zero unresolved bottlenecks.
                    </span>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSearchQuery(selectedDistrictData.districtName)}
                    className="w-full py-1.5 bg-[#0B2545] hover:bg-[#153e70] text-white text-xs font-bold uppercase transition-colors text-center cursor-pointer"
                  >
                    Filter Telemetry Table to {selectedDistrictData.districtName}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold">No District Selected</p>
                <p className="text-[11px]">
                  Click any district tile on the choropleth map to inspect detailed governance metrics and SLA performance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. DISTRICT PERFORMANCE & SLA TELEMETRY TABLE */}
      {/* ==================================================================== */}
      <div className="p-4 space-y-3">
        <div className="border-b-2 border-[#1E6F50] pb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase text-[#0B2545] tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E6F50]" />
              <span>District Governance &amp; Statutory SLA Telemetry Ledger</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Statewide administrative accountability matrix tracking 24 district magistrate jurisdictions.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search district / LGD..."
                className="pl-8 pr-2.5 py-1 text-xs border border-slate-300 font-medium w-44 focus:outline-none focus:border-[#0B2545]"
              />
            </div>

            <select
              value={distressFilter}
              onChange={(e) => setDistressFilter(e.target.value)}
              className="py-1 px-2 text-xs border border-slate-300 bg-white font-medium focus:outline-none focus:border-[#0B2545]"
            >
              <option value="ALL">All Distress Levels</option>
              <option value="ACUTE">Acute Only (#7A1B1B)</option>
              <option value="HIGH">High Only (#C25E2E)</option>
              <option value="MEDIUM">Medium Only (#B47D14)</option>
              <option value="LOW">Low Only (#1E6F50)</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-slate-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B2545] text-white text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="p-2.5 border-r border-slate-700">District Name</th>
                <th className="p-2.5 border-r border-slate-700">LGD Code</th>
                <th className="p-2.5 border-r border-slate-700">Division</th>
                <th className="p-2.5 border-r border-slate-700 text-center">Endorsed Issues</th>
                <th className="p-2.5 border-r border-slate-700 text-center">Active Capstones</th>
                <th className="p-2.5 border-r border-slate-700 text-center">BIS Pilots</th>
                <th className="p-2.5 border-r border-slate-700 text-center">Distress Level</th>
                <th className="p-2.5 border-r border-slate-700 text-center">Avg Latency</th>
                <th className="p-2.5">Statutory SLA Notice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDistricts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-500 italic">
                    No districts match the search query "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredDistricts.map((d) => {
                  const isSelected = selectedDistrictCode === d.districtCode;
                  return (
                    <tr
                      key={d.districtCode}
                      onClick={() => setSelectedDistrictCode(d.districtCode)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {d.districtName}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 border-r border-slate-200">
                        {d.districtCode}
                      </td>
                      <td className="p-2.5 text-slate-600 border-r border-slate-200">
                        {d.division}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                        {d.baselineEndorsed}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-blue-900 border-r border-slate-200">
                        {d.baselineCapstones}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-800 border-r border-slate-200">
                        {d.baselineDeployments}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase text-white ${
                            DISTRESS_COLOR_MAP[d.distressLevel].bg
                          }`}
                        >
                          {d.distressLevel}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-800 border-r border-slate-200">
                        {d.averageResolutionDays}d
                      </td>
                      <td className="p-2.5 text-[11px]">
                        {d.slaBottleneckAlert ? (
                          <span className="text-[#7A1B1B] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#7A1B1B] shrink-0" />
                            <span>{d.slaBottleneckAlert}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Compliant</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. STARTUP JHARKHAND & GeM PROCUREMENT BRIDGE PANEL */}
      {/* ==================================================================== */}
      <div className="m-4 p-4 bg-gradient-to-r from-amber-50/60 via-white to-slate-50 border-2 border-amber-400 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-300 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="bg-[#7A1B1B] text-[#F8E7A2] p-2 border border-amber-900 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#1E6F50] text-white text-[9px] font-black uppercase px-1.5 py-0.2">
                  SCALE &amp; COMMERCIALIZATION ACCELERATOR
                </span>
                <span className="text-[11px] font-mono text-slate-600 font-bold">
                  GFR 2017 RULE 173(i) &bull; GeM SPECIAL WINDOW
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#0B2545] uppercase mt-0.5">
                Startup Jharkhand &amp; Government e-Marketplace (GeM) Procurement Bridge
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGeMModalOpen(true)}
            className="px-4 py-2 bg-[#7A1B1B] hover:bg-[#962626] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs self-start md:self-auto shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[#F8E7A2]" />
            <span>Generate Startup Jharkhand &amp; GeM Onboarding Packet</span>
          </button>
        </div>

        {/* Featured Capstone Spin-off: Dumka Jal-Shuddhi */}
        <div className="bg-white border border-slate-300 p-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 font-black uppercase inline-block">
              TIER 2 BIS CERTIFIED &bull; FIELD PILOT CLEARED
            </span>
            <h4 className="text-sm font-black text-[#0B2545]">
              Team Jal-Shuddhi Innovators (BIT Sindri)
            </h4>
            <p className="text-xs text-slate-600">
              Solar-Powered IoT Fluoride Remediation Unit for Dumka District (Challenge JH-2026-M-849201).
            </p>
          </div>

          <div className="text-xs space-y-1 bg-slate-50 p-2.5 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">Accredited Lab:</span>
              <span className="font-bold text-slate-800">CSIR-CIMFR Dhanbad</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">BIS Standard:</span>
              <span className="font-mono text-slate-800">IS 10500:2012</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">DC Permit ID:</span>
              <span className="font-mono font-bold text-[#7A1B1B]">
                {dumkaSafety?.dcPilotPermitQR || 'JH-DC-PILOT-PERMIT-2026-9E5B'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Exempted from Prior Turnover &amp; Experience under GFR 173(i)</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Eligible for direct government contracting across Gram Panchayats and Public Health Engineering Departments (PHED).
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. MODAL: STARTUP JHARKHAND & GeM ONBOARDING PACKET (PRINTABLE) */}
      {/* ==================================================================== */}
      {isGeMModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gem-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-2xs overflow-y-auto"
        >
          <div className="relative w-full max-w-4xl bg-white border-2 border-slate-400 shadow-2xl max-h-[94vh] flex flex-col my-auto text-slate-800">
            {/* Modal Header */}
            <div className="bg-[#0B2545] text-white p-4 border-b-4 border-amber-500 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-[#7A1B1B] text-[#F8E7A2] p-2.5 border border-amber-900/60 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="gem-modal-title" className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                    Startup Jharkhand &amp; GeM Direct Procurement Packet
                  </h3>
                  <p className="text-xs text-slate-300">
                    Statutory Exemption Certificate under General Financial Rules (GFR) 2017 Rule 173(i)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGeMModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Dossier */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Certificate Container with State Borders */}
              <div className="border-4 border-[#7A1B1B] p-5 sm:p-6 bg-white space-y-4 shadow-sm">
                {/* Official Crest Header */}
                <div className="text-center border-b-2 border-slate-300 pb-3 space-y-1">
                  <div className="inline-flex items-center gap-2 bg-[#7A1B1B] text-[#F8E7A2] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    GOVERNMENT OF JHARKHAND &bull; झारखण्ड सरकार
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-[#0B2545] uppercase">
                    Department of Higher &amp; Technical Education &bull; Department of Industries
                  </h4>
                  <p className="text-xs font-bold text-slate-600 uppercase">
                    Collegiate Innovation Commercialization &amp; GeM Public Procurement Exemption Pass
                  </p>
                </div>

                {/* Statutory Reference Clauses */}
                <div className="p-3 bg-amber-50/80 border border-amber-300 text-xs space-y-1.5">
                  <div className="font-black uppercase text-[10px] text-amber-900">
                    STATUTORY LEGAL BASIS &bull; GFR 2017 RULE 173(i)
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Under Rule 173(i) of General Financial Rules 2017 and Jharkhand Startup Policy 2023 (Clause 9.2), accredited student startups whose prototypes have cleared dual-tier academic and statutory BIS/NABL testing (CSIR-CIMFR) are granted full exemption from prior turnover and prior experience requirements for public procurement on the Government e-Marketplace (GeM).
                  </p>
                </div>

                {/* Candidate Venture Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Recognized Venture Entity:
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      Jal-Shuddhi Environmental Solutions LLP
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Incubated at BIT Sindri Incubation Center
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      DPIIT &amp; Startup Jharkhand ID:
                    </span>
                    <span className="font-mono font-bold text-[#0B2545] block mt-0.5">
                      DPIIT-JH-2026-7841 / UDBHAV-VENTURE-01
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Recognized under Category: Clean Water &amp; IoT Hardware
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Field Clearance &amp; BIS Token:
                    </span>
                    <span className="font-mono font-bold text-[#7A1B1B] block mt-0.5">
                      {dumkaSafety?.dcPilotPermitQR || 'JH-DC-PILOT-PERMIT-2026-9E5B'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      IS 10500:2012 Drinking Water Specification (CSIR-CIMFR)
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Recommended Initial Procurement:
                    </span>
                    <span className="font-mono font-bold text-emerald-900 block mt-0.5">
                      ₹12,40,000 (20 Village Panchayats, Dumka)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Direct Purchase window under GeM Rule 149
                    </span>
                  </div>
                </div>

                {/* State Endorsement Seals */}
                <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600">
                  <div>
                    <span className="font-bold text-slate-800 block">Digitally Certified:</span>
                    <span>Secretary, DHTE Jharkhand</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Startup Mission:</span>
                    <span>Director of Industries, Ranchi</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Field Collectorate:</span>
                    <span>District Magistrate, Dumka</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 border-t border-slate-300 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-600 font-bold">
                Status: Ready for GeM Onboarding &amp; State Tender Exemption Filing
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#0B2545] hover:bg-[#153e70] text-white text-xs font-bold uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#F8E7A2]" />
                  <span>Print GeM Onboarding Packet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsGeMModalOpen(false)}
                  className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StatewideGISCommandDashboard;

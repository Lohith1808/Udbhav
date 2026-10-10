/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Official LGD Local Rural Technician Directory & Livelihood Dispatch Engine
 *
 * Implements Task 8.2 of Sprint 8:
 * Dynamic rural artisan dispatch mapping citizens' geo-tagged LGD locations
 * (District & Block codes) to empanelled tradespeople under PM Vishwakarma /
 * Panchayat Skill Registry.
 */

export type TechnicianTrade =
  | 'PUMP_MECHANIC'
  | 'ELECTRICIAN'
  | 'PLUMBER'
  | 'SOLAR_TECHNICIAN'
  | 'MASON';

export interface EmpanelledTechnician {
  id: string;
  name: string;
  trade: TechnicianTrade;
  tradeHindi: string;
  experienceYears: number;
  districtName: string;
  districtCode: number;
  blockName: string;
  blockCode: number;
  panchayatName: string;
  panchayatCode: number;
  maskedContact: string;
  rating: number; // 4.6 to 4.9
  verificationBadge: string;
  dailyAvailability: 'AVAILABLE_NOW' | 'BUSY_ON_CALL';
}

/**
 * Normalized trade dictionary mapping varied AI triage strings
 * to official standard technician trades.
 */
export const TRADE_META: Record<
  TechnicianTrade,
  { en: string; hi: string; defaultEquipment: string }
> = {
  PUMP_MECHANIC: {
    en: 'Water Pump & Valve Mechanic',
    hi: 'जल पंप एवं वाल्व मैकेनिक',
    defaultEquipment: 'Submersible puller, Impeller re-sleeving kit',
  },
  ELECTRICIAN: {
    en: 'Rural Electrical & Microgrid Technician',
    hi: 'ग्रामीण इलेक्ट्रीशियन एवं माइक्रोग्रिड',
    defaultEquipment: 'Insulated clamp meter, Phase tester, Rewiring spools',
  },
  PLUMBER: {
    en: 'Drinking Water Plumber & Pipe Fitter',
    hi: 'पेयजल प्लम्बर एवं पाइप फिटर',
    defaultEquipment: 'Pipe die sets, GI/PVC solvent, Compression joints',
  },
  SOLAR_TECHNICIAN: {
    en: 'Solar Lift & Inverter Technician',
    hi: 'सोलर लिफ्ट एवं इन्वर्टर तकनीशियन',
    defaultEquipment: 'Multimeter, Photovoltaic crimping tool, Bypass diodes',
  },
  MASON: {
    en: 'Mason & Civil Structure Artisan',
    hi: 'राजमिस्त्री एवं नागरिक संरचना',
    defaultEquipment: 'Trowel set, Spirit level, Rapid waterproof cement',
  },
};

/**
 * Empanelled rural technician database across key Jharkhand LGD jurisdictions.
 */
export const EMPANELLED_TECHNICIANS: EmpanelledTechnician[] = [
  // --- RANCHI DISTRICT (351) ---
  // Kanke Block (3188)
  {
    id: 'TECH-JH-RNC-01',
    name: 'Sanjay Munda',
    trade: 'PUMP_MECHANIC',
    tradeHindi: 'जल पंप मैकेनिक',
    experienceYears: 8,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Kanke',
    blockCode: 3188,
    panchayatName: 'Arsande',
    panchayatCode: 114829,
    maskedContact: '+91 9835X-XXXX1',
    rating: 4.9,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-RNC-02',
    name: 'Birsa Oraon',
    trade: 'ELECTRICIAN',
    tradeHindi: 'ग्रामीण इलेक्ट्रीशियन',
    experienceYears: 6,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Kanke',
    blockCode: 3188,
    panchayatName: 'Boreya',
    panchayatCode: 114830,
    maskedContact: '+91 9431X-XXXX8',
    rating: 4.8,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-RNC-03',
    name: 'Pooja Devi',
    trade: 'PLUMBER',
    tradeHindi: 'प्लम्बर / नलसाज',
    experienceYears: 5,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Kanke',
    blockCode: 3188,
    panchayatName: 'Sukhurhutu',
    panchayatCode: 114831,
    maskedContact: '+91 9122X-XXXX4',
    rating: 4.7,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-RNC-04',
    name: 'Karamchand Mahato',
    trade: 'SOLAR_TECHNICIAN',
    tradeHindi: 'सौर तकनीशियन',
    experienceYears: 7,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Kanke',
    blockCode: 3188,
    panchayatName: 'Pithoria',
    panchayatCode: 114832,
    maskedContact: '+91 8789X-XXXX2',
    rating: 4.8,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'BUSY_ON_CALL',
  },
  {
    id: 'TECH-JH-RNC-05',
    name: 'Budheshwar Bedia',
    trade: 'MASON',
    tradeHindi: 'राजमिस्त्री / निर्माण',
    experienceYears: 11,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Kanke',
    blockCode: 3188,
    panchayatName: 'Arsande',
    panchayatCode: 114829,
    maskedContact: '+91 9771X-XXXX5',
    rating: 4.9,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // Namkum Block (3191)
  {
    id: 'TECH-JH-RNC-06',
    name: 'Ramesh Soren',
    trade: 'PUMP_MECHANIC',
    tradeHindi: 'जल पंप मैकेनिक',
    experienceYears: 9,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Namkum',
    blockCode: 3191,
    panchayatName: 'Sidroll',
    panchayatCode: 114902,
    maskedContact: '+91 9304X-XXXX3',
    rating: 4.7,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-RNC-07',
    name: 'Sunita Toppo',
    trade: 'ELECTRICIAN',
    tradeHindi: 'ग्रामीण इलेक्ट्रीशियन',
    experienceYears: 4,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Namkum',
    blockCode: 3191,
    panchayatName: 'Rajaulatu',
    panchayatCode: 114903,
    maskedContact: '+91 9934X-XXXX7',
    rating: 4.6,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // Ormanjhi Block (3192)
  {
    id: 'TECH-JH-RNC-08',
    name: 'Dilip Gope',
    trade: 'PLUMBER',
    tradeHindi: 'प्लम्बर / नलसाज',
    experienceYears: 6,
    districtName: 'Ranchi',
    districtCode: 351,
    blockName: 'Ormanjhi',
    blockCode: 3192,
    panchayatName: 'Anandi',
    panchayatCode: 114945,
    maskedContact: '+91 9470X-XXXX9',
    rating: 4.8,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // --- DHANBAD DISTRICT (337) ---
  {
    id: 'TECH-JH-DHN-01',
    name: 'Subhash Kumbhakar',
    trade: 'PUMP_MECHANIC',
    tradeHindi: 'जल पंप मैकेनिक',
    experienceYears: 10,
    districtName: 'Dhanbad',
    districtCode: 337,
    blockName: 'Govindpur',
    blockCode: 3160,
    panchayatName: 'Kandra',
    panchayatCode: 113901,
    maskedContact: '+91 9832X-XXXX6',
    rating: 4.8,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-DHN-02',
    name: 'Manish Rawani',
    trade: 'ELECTRICIAN',
    tradeHindi: 'ग्रामीण इलेक्ट्रीशियन',
    experienceYears: 5,
    districtName: 'Dhanbad',
    districtCode: 337,
    blockName: 'Govindpur',
    blockCode: 3160,
    panchayatName: 'Chhatatanr',
    panchayatCode: 113902,
    maskedContact: '+91 9204X-XXXX1',
    rating: 4.7,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-DHN-03',
    name: 'Anil Bauri',
    trade: 'PLUMBER',
    tradeHindi: 'प्लम्बर / नलसाज',
    experienceYears: 7,
    districtName: 'Dhanbad',
    districtCode: 337,
    blockName: 'Dhanbad Sadar',
    blockCode: 3161,
    panchayatName: 'Jagjivan Nagar',
    panchayatCode: 113915,
    maskedContact: '+91 9430X-XXXX4',
    rating: 4.9,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // --- BOKARO DISTRICT (336) ---
  {
    id: 'TECH-JH-BOK-01',
    name: 'Mukesh Kumar Karmali',
    trade: 'PUMP_MECHANIC',
    tradeHindi: 'जल पंप मैकेनिक',
    experienceYears: 7,
    districtName: 'Bokaro',
    districtCode: 336,
    blockName: 'Chas',
    blockCode: 3150,
    panchayatName: 'Pindrajora',
    panchayatCode: 113705,
    maskedContact: '+91 9772X-XXXX3',
    rating: 4.8,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-BOK-02',
    name: 'Pramila Devi',
    trade: 'SOLAR_TECHNICIAN',
    tradeHindi: 'सौर तकनीशियन',
    experienceYears: 6,
    districtName: 'Bokaro',
    districtCode: 336,
    blockName: 'Bermo',
    blockCode: 3152,
    panchayatName: 'Phusro Rural',
    panchayatCode: 113740,
    maskedContact: '+91 8877X-XXXX8',
    rating: 4.9,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // --- DUMKA DISTRICT (338) ---
  {
    id: 'TECH-JH-DMK-01',
    name: 'Hopna Murmu',
    trade: 'PLUMBER',
    tradeHindi: 'प्लम्बर / नलसाज',
    experienceYears: 9,
    districtName: 'Dumka',
    districtCode: 338,
    blockName: 'Dumka Sadar',
    blockCode: 3170,
    panchayatName: 'Ghasipur',
    panchayatCode: 114102,
    maskedContact: '+91 9546X-XXXX5',
    rating: 4.7,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-DMK-02',
    name: 'Chunda Marandi',
    trade: 'SOLAR_TECHNICIAN',
    tradeHindi: 'सौर तकनीशियन',
    experienceYears: 5,
    districtName: 'Dumka',
    districtCode: 338,
    blockName: 'Shikaripara',
    blockCode: 3174,
    panchayatName: 'Pattabari',
    panchayatCode: 114150,
    maskedContact: '+91 9631X-XXXX7',
    rating: 4.8,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // --- EAST SINGHBHUM (339) ---
  {
    id: 'TECH-JH-ESB-01',
    name: 'Gopal Hansda',
    trade: 'ELECTRICIAN',
    tradeHindi: 'ग्रामीण इलेक्ट्रीशियन',
    experienceYears: 8,
    districtName: 'East Singhbhum',
    districtCode: 339,
    blockName: 'Ghatshila',
    blockCode: 3180,
    panchayatName: 'Galudih',
    panchayatCode: 114401,
    maskedContact: '+91 9431X-XXXX2',
    rating: 4.8,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-ESB-02',
    name: 'Mangal Baskey',
    trade: 'PUMP_MECHANIC',
    tradeHindi: 'जल पंप मैकेनिक',
    experienceYears: 6,
    districtName: 'East Singhbhum',
    districtCode: 339,
    blockName: 'Potka',
    blockCode: 3182,
    panchayatName: 'Kowali',
    panchayatCode: 114440,
    maskedContact: '+91 9386X-XXXX9',
    rating: 4.7,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },

  // --- HAZARIBAGH DISTRICT (345) ---
  {
    id: 'TECH-JH-HZB-01',
    name: 'Kishore Saw',
    trade: 'MASON',
    tradeHindi: 'राजमिस्त्री / निर्माण',
    experienceYears: 12,
    districtName: 'Hazaribagh',
    districtCode: 345,
    blockName: 'Hazaribagh Sadar',
    blockCode: 3220,
    panchayatName: 'Meru',
    panchayatCode: 115201,
    maskedContact: '+91 9199X-XXXX6',
    rating: 4.9,
    verificationBadge: 'Panchayat Verified / पंचायत सत्यापित',
    dailyAvailability: 'AVAILABLE_NOW',
  },
  {
    id: 'TECH-JH-HZB-02',
    name: 'Naresh Prajapati',
    trade: 'ELECTRICIAN',
    tradeHindi: 'ग्रामीण इलेक्ट्रीशियन',
    experienceYears: 7,
    districtName: 'Hazaribagh',
    districtCode: 345,
    blockName: 'Barhi',
    blockCode: 3222,
    panchayatName: 'Kewal',
    panchayatCode: 115240,
    maskedContact: '+91 9955X-XXXX3',
    rating: 4.8,
    verificationBadge: 'PM Vishwakarma Certified',
    dailyAvailability: 'AVAILABLE_NOW',
  },
];

/**
 * Normalizes any freeform or AI triage string into standard TechnicianTrade.
 */
export function normalizeTechnicianTrade(trade?: string | null): TechnicianTrade {
  if (!trade) return 'PUMP_MECHANIC';
  const upper = trade.toUpperCase();

  if (upper.includes('PUMP') || upper.includes('MECHANIC') || upper.includes('MOTOR')) {
    return 'PUMP_MECHANIC';
  }
  if (upper.includes('ELEC') || upper.includes('WIRE') || upper.includes('GRID')) {
    return 'ELECTRICIAN';
  }
  if (upper.includes('PLUMB') || upper.includes('PIPE') || upper.includes('WATER') || upper.includes('VALVE')) {
    return 'PLUMBER';
  }
  if (upper.includes('SOLAR') || upper.includes('INVERT') || upper.includes('PANEL')) {
    return 'SOLAR_TECHNICIAN';
  }
  if (upper.includes('MASON') || upper.includes('CIVIL') || upper.includes('BRICK') || upper.includes('CONCRETE')) {
    return 'MASON';
  }

  return 'PUMP_MECHANIC';
}

/**
 * Dynamic LGD Dispatch Matching Engine:
 * Retrieves empanelled rural technicians with hierarchical fallback:
 * 1. Exact Match: matching blockCode AND districtCode AND trade
 * 2. District Match: matching districtCode AND trade
 * 3. Trade Match: any technician with matching trade across Jharkhand
 * 4. Overall Default: fallback to nearby Ranchi/Jharkhand verified artisans
 *
 * Guarantees ZERO empty states.
 */
export function getTechniciansByLocation(
  districtCode?: number,
  blockCode?: number,
  trade?: string | null
): EmpanelledTechnician[] {
  const targetTrade = trade ? normalizeTechnicianTrade(trade) : undefined;

  // Level 1: Exact Block + District + Trade Match
  if (blockCode && districtCode && targetTrade) {
    const exactBlockTrade = EMPANELLED_TECHNICIANS.filter(
      (t) =>
        t.blockCode === blockCode &&
        t.districtCode === districtCode &&
        t.trade === targetTrade
    );
    if (exactBlockTrade.length > 0) return exactBlockTrade;
  }

  // Level 2: Exact Block + District (any trade)
  if (blockCode && districtCode) {
    const exactBlock = EMPANELLED_TECHNICIANS.filter(
      (t) => t.blockCode === blockCode && t.districtCode === districtCode
    );
    if (exactBlock.length > 0) return exactBlock;
  }

  // Level 3: District + Trade Match
  if (districtCode && targetTrade) {
    const districtTrade = EMPANELLED_TECHNICIANS.filter(
      (t) => t.districtCode === districtCode && t.trade === targetTrade
    );
    if (districtTrade.length > 0) return districtTrade;
  }

  // Level 4: District Match (any trade)
  if (districtCode) {
    const districtAny = EMPANELLED_TECHNICIANS.filter(
      (t) => t.districtCode === districtCode
    );
    if (districtAny.length > 0) return districtAny;
  }

  // Level 5: Matching Trade across Jharkhand
  if (targetTrade) {
    const tradeAny = EMPANELLED_TECHNICIANS.filter((t) => t.trade === targetTrade);
    if (tradeAny.length > 0) return tradeAny;
  }

  // Level 6: Safety Fallback - Top rated active technicians (Zero Empty State)
  return EMPANELLED_TECHNICIANS.slice(0, 3);
}

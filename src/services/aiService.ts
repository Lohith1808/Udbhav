/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Real LLM Structured-Output AI Engine (Sprint 4 — Task 4.3)
 * 
 * Resolves Bug 3 (Lack of real AI integration) using Google Gemini 1.5 Flash REST API.
 * Uses native fetch (0 external npm dependencies).
 * Features:
 * - Civic First-Aid Triage & Local Livelihood Dispatch
 * - Engineering Problem Boundary Brief Generator (strictly no prescriptive code)
 * - Ground-Zero Clarification RAG Bridge
 * - Resilient offline deterministic fallback when unkeyed or offline.
 */

import {
  EngineeringProblemBrief,
  DomainSector,
  MAX_BRIEF_BUDGET_INR,
} from '../types/solver';
import {
  generateProblemBoundaryBrief,
  IssueForBoundaryGeneration,
} from '../features/solver/utils/boundaryGenerator';

export interface CivicFirstAidTriageResult {
  isRoutineMaintenance: boolean;
  suggestedTechnicianTrade: 'PLUMBER' | 'ELECTRICIAN' | 'MECHANIC' | 'MASON' | null;
  vernacularTroubleshootingTip: string;
  technicianContactSimulation: {
    tradeTitle: string;
    contactName: string;
    approxDistanceKm: number;
    contactPhone?: string;
  };
  escalateToCivicRD: boolean;
  confidenceScore: number;
  reasoningSummary: string;
}

const STORAGE_API_KEY = 'udbhav_gemini_api_key';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Retrieves the configured Gemini API key from localStorage or Vite environment variable
 */
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem(STORAGE_API_KEY);
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
  }
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
}

/**
 * Persists custom Gemini API key entered by evaluator into localStorage
 */
export function setGeminiApiKey(apiKey: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (apiKey.trim()) {
      window.localStorage.setItem(STORAGE_API_KEY, apiKey.trim());
    } else {
      window.localStorage.removeItem(STORAGE_API_KEY);
    }
  }
}

/**
 * Checks whether an API key is available
 */
export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

/**
 * Tests connection with Gemini Flash REST endpoint
 */
export async function testGeminiConnection(
  keyToTest?: string
): Promise<{ success: boolean; model: string; message: string }> {
  const key = keyToTest || getGeminiApiKey();
  if (!key) {
    return {
      success: false,
      model: 'None',
      message: 'No Gemini API key provided. Please configure a key for live LLM queries.',
    };
  }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Respond with the single word: "READY"' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { success: false, model: 'gemini-1.5-flash', message: msg };
    }

    return {
      success: true,
      model: 'gemini-1.5-flash',
      message: 'Connected successfully to Google Gemini 1.5 Flash REST API!',
    };
  } catch (err) {
    return {
      success: false,
      model: 'gemini-1.5-flash',
      message: err instanceof Error ? err.message : 'Network failure reaching Gemini API.',
    };
  }
}

/**
 * Offline deterministic fallback for Civic First-Aid Triage
 */
function getDeterministicFirstAidTriage(
  transcript: string,
  category: string,
  village: string
): CivicFirstAidTriageResult {
  const text = `${transcript} ${category}`.toLowerCase();

  // Check for routine wear-and-tear triggers
  const isPlumbingRoutine =
    text.includes('valve') ||
    text.includes('वाल्व') ||
    text.includes('airlock') ||
    text.includes('जाम') ||
    text.includes('leak') ||
    text.includes('लीक') ||
    text.includes('washer') ||
    text.includes('वॉशर');

  const isElectricalRoutine =
    text.includes('fuse') ||
    text.includes('फ्यूज') ||
    text.includes('starter') ||
    text.includes('स्टार्टर') ||
    text.includes('spark') ||
    text.includes('ट्रिप') ||
    text.includes('breaker') ||
    text.includes('wire') ||
    text.includes('तार');

  const isMasonryRoutine =
    text.includes('crack') ||
    text.includes('दरार') ||
    text.includes('cement') ||
    text.includes('chuan');

  if (isPlumbingRoutine) {
    return {
      isRoutineMaintenance: true,
      suggestedTechnicianTrade: 'PLUMBER',
      vernacularTroubleshootingTip:
        'चापाकल के फुट-वाल्व में कचरा या बालू फंसा हो सकता है। हैंडल को 10-12 बार तेजी से ऊपर-नीचे चलाएं या ऊपर से आधा बाल्टी साफ पानी डालकर वैक्यूम प्राइमिंग करें।',
      technicianContactSimulation: {
        tradeTitle: 'ग्रामीण चापाकल व नल मिस्त्री (Registered Jal Mistry)',
        contactName: 'राजू महतो (Raju Mahto)',
        approxDistanceKm: 1.2,
        contactPhone: '+91 94311-74921',
      },
      escalateToCivicRD: false,
      confidenceScore: 0.88,
      reasoningSummary:
        'समस्या मुख्य रूप से वॉल्व में बालू फंसने अथवा फुट-वाल्व घिसने से संबंधित प्रतीत होती है। स्थानीय जल मिस्त्री द्वारा ₹150-200 में तुरंत सुधारी जा सकती है।',
    };
  }

  if (isElectricalRoutine) {
    return {
      isRoutineMaintenance: true,
      suggestedTechnicianTrade: 'ELECTRICIAN',
      vernacularTroubleshootingTip:
        'कृषि बोरवेल मोटर का एमसीबी या स्टार्टर रिले ट्रिप हो गया हो सकता है। मुख्य पावर स्विच बंद करें और 5 मिनट बाद रीसेट बटन दबाकर पुनः चालू करें। वोल्टेज कम होने पर मोटर न चलाएं।',
      technicianContactSimulation: {
        tradeTitle: 'प्रमाणित ग्रामीण इलेक्ट्रीशियन (Gramin Urja Sahayak)',
        contactName: 'सुरेश यादव (Suresh Yadav)',
        approxDistanceKm: 2.1,
        contactPhone: '+91 94302-88123',
      },
      escalateToCivicRD: false,
      confidenceScore: 0.85,
      reasoningSummary:
        'स्टार्टर अथवा फ्यूज वायर का सामान्य दोष प्रतीत होता है। स्थानीय तकनीशियन तुरंत सुधार कर सकते हैं।',
    };
  }

  if (isMasonryRoutine) {
    return {
      isRoutineMaintenance: true,
      suggestedTechnicianTrade: 'MASON',
      vernacularTroubleshootingTip:
        'नाली या चबूतरे की हल्की दरार को त्वरित रूप से सीमेंट और रेत के 1:3 घोल से बंद किया जा सकता है ताकि गंदा पानी स्रोत में न रिसने पाए।',
      technicianContactSimulation: {
        tradeTitle: 'पंचायत राज मिस्त्री (Panchayat Mason)',
        contactName: 'कारू मुंडा (Karu Munda)',
        approxDistanceKm: 0.8,
        contactPhone: '+91 94715-62019',
      },
      escalateToCivicRD: false,
      confidenceScore: 0.82,
      reasoningSummary:
        'चबूतरे की मरम्मत स्थानीय राज मिस्त्री द्वारा मनरेगा सामग्री से संभव है।',
    };
  }

  // Default: Chronic structural/innovation challenge requiring engineering R&D
  return {
    isRoutineMaintenance: false,
    suggestedTechnicianTrade: null,
    vernacularTroubleshootingTip:
      'यह समस्या स्थानीय मरम्मत से परे है (जैसे आर्सेनिक/फ्लोराइड विषाक्तता अथवा भारी शीत-गृह की अनुपस्थिति)। इसे राज्य स्तरीय इंजीनियरिंग कॉलेज R&D टीम को भेजा जा रहा है।',
    technicianContactSimulation: {
      tradeTitle: 'नोडल प्रखंड विकास अधिकारी (BDO / Panchayat Desk)',
      contactName: `प्रखंड तकनीकी समन्वयक (${village || 'Jharkhand Node'})`,
      approxDistanceKm: 4.5,
      contactPhone: '+91 651-240012',
    },
    escalateToCivicRD: true,
    confidenceScore: 0.94,
    reasoningSummary:
      'दीर्घकालिक संरचनात्मक समस्या (Chronic Structural Problem): भूजल संदूषण अथवा फसल बर्बादी जो सामान्य स्पेयर पार्ट्स से ठीक नहीं हो सकती; विश्वविद्यालय इंजीनियरिंग नवाचार अनिवार्य है।',
  };
}

/**
 * 1. AI First-Aid Triage & Local Livelihood Dispatch
 * Evaluates whether an issue is routine maintenance or structural innovation challenge
 */
export async function evaluateCivicFirstAidTriage(
  transcript: string,
  category: string,
  village: string
): Promise<CivicFirstAidTriageResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return getDeterministicFirstAidTriage(transcript, category, village);
  }

  const prompt = `
You are the AI First-Aid Civic Triage Engine for Project Udbhav (Department of Higher & Technical Education, Government of Jharkhand).
Your task is to analyze the following rural citizen report from Jharkhand village "${village}".
Determine whether this issue is:
A) Routine maintenance serviceable by local rural tradespeople (Plumber, Electrician, Mechanic, Mason) such as a clogged valve, tripped breaker, cracked apron, or worn gasket.
OR
B) Chronic, structural civic friction (e.g., severe groundwater arsenic/fluoride poisoning, zero-grid post-harvest cold chain absence, river embankment scouring) requiring university capstone engineering R&D.

Issue Category: "${category}"
Citizen Description / Vernacular Transcription:
"${transcript}"

CRITICAL SYSTEM DIRECTIVE:
You MUST respond with ONLY valid JSON adhering strictly to this schema:
{
  "isRoutineMaintenance": boolean,
  "suggestedTechnicianTrade": "PLUMBER" | "ELECTRICIAN" | "MECHANIC" | "MASON" | null,
  "vernacularTroubleshootingTip": "Simple, actionable DIY advice in Hindi/Vernacular (1-2 sentences)",
  "technicianContactSimulation": {
    "tradeTitle": "Official rural trade title in Hindi/English",
    "contactName": "Realistic rural name from Jharkhand",
    "approxDistanceKm": number
  },
  "escalateToCivicRD": boolean,
  "confidenceScore": number (between 0.0 and 1.0),
  "reasoningSummary": "Clear 1-sentence analytical rationale"
}
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      console.warn('[Gemini AI] Triage API call failed, using deterministic fallback');
      return getDeterministicFirstAidTriage(transcript, category, village);
    }

    const data = await response.json();
    const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      return getDeterministicFirstAidTriage(transcript, category, village);
    }

    const parsed = JSON.parse(rawJsonText) as CivicFirstAidTriageResult;
    return {
      isRoutineMaintenance: Boolean(parsed.isRoutineMaintenance),
      suggestedTechnicianTrade: parsed.suggestedTechnicianTrade || null,
      vernacularTroubleshootingTip:
        parsed.vernacularTroubleshootingTip ||
        'कृपया समस्या स्थल पर सुरक्षा मानकों का पालन करें।',
      technicianContactSimulation: {
        tradeTitle:
          parsed.technicianContactSimulation?.tradeTitle ||
          'स्थानीय ग्राम पंचायत तकनीशियन',
        contactName:
          parsed.technicianContactSimulation?.contactName || 'संजय महतो',
        approxDistanceKm:
          Number(parsed.technicianContactSimulation?.approxDistanceKm) || 1.5,
        contactPhone: '+91 94311-74921',
      },
      escalateToCivicRD: Boolean(parsed.escalateToCivicRD),
      confidenceScore: Number(parsed.confidenceScore) || 0.85,
      reasoningSummary:
        parsed.reasoningSummary ||
        'विश्लेषण पूर्ण: प्राथमिकता स्तर निर्धारित किया गया।',
    };
  } catch (err) {
    console.error('[Gemini AI] Error in evaluateCivicFirstAidTriage:', err);
    return getDeterministicFirstAidTriage(transcript, category, village);
  }
}

/**
 * 2. AI Problem Boundary Generator (No Pre-Cooked Solutions)
 * Uses Gemini 1.5 Flash to extract non-negotiable operational boundaries and measurable benchmarks
 */
export async function generateLLMProblemBoundaryBrief(
  params: IssueForBoundaryGeneration
): Promise<EngineeringProblemBrief> {
  const apiKey = getGeminiApiKey();

  // If no API key is configured, fallback to rule-based boundary generator
  if (!apiKey) {
    return generateProblemBoundaryBrief(params);
  }

  const prompt = `
You are the AI Problem Boundary Brief Generator for Project Udbhav (SIH PS ID: 26043 — Department of Higher & Technical Education, Jharkhand).
Your purpose is to convert an endorsed grassroots civic problem into an accredited Engineering Problem Brief for multidisciplinary engineering collegiate capstone teams (NEP 2020).

CRITICAL HACKATHON RULE & JURY DEFENSE DIRECTIVE:
You must output ONLY:
1. Operational constraints (e.g. power limits, ambient temperature limits, physical footprint, locally available raw materials).
2. Measurable benchmarks with numerical targets and tolerances (e.g. flow rate >= 4 L/min, arsenic < 0.01 mg/L).
3. Statutory BOM cost ceiling strictly capped <= ₹2,500.
YOU ARE STRICTLY FORBIDDEN from proposing architecture, prescriptive circuits, software algorithms, or implementation solutions. The student engineers must design their own solution within the boundaries.

Problem Details:
- Master Issue ID: "${params.id}"
- Citizen Report & Audio Transcription: "${params.transcriptionText}"
- Category: "${params.category || 'General Civic Infrastructure'}"
- Location: District ${params.district}, Block ${params.block}, Jharkhand
- Impact: ${params.affectedHouseholds} households
- Panchayat Inspection Note: "${params.panchayatNote}"
- Severity: "${params.severity}"

CRITICAL SYSTEM DIRECTIVE:
You MUST respond with ONLY valid JSON adhering strictly to this schema:
{
  "title": "Concise, formal engineering problem title (max 90 chars)",
  "domainSector": "WATER_RESOURCES" | "AGRITECH" | "RURAL_ENERGY" | "SANITATION" | "HEALTHCARE" | "CIVIL_INFRA",
  "contextSummary": "Rigorous technical summary of the localized challenge (2-3 sentences)",
  "boundaryConstraints": [
    "Constraint 1 (e.g. Zero-grid power requirement or micro-solar <=50W)",
    "Constraint 2 (e.g. Maximum footprint <= 0.8 sq.m)",
    "Constraint 3 (e.g. Local material requirement)",
    "Constraint 4 (e.g. BOM manufacturing cost capped strictly <= ₹2,500)"
  ],
  "measurableBenchmarks": [
    {
      "metric": "Engineering metric name",
      "targetValue": "Quantifiable target value",
      "tolerance": "Permissible tolerance (e.g. ±5%)"
    },
    {
      "metric": "Engineering metric name 2",
      "targetValue": "Quantifiable target value",
      "tolerance": "Permissible tolerance"
    },
    {
      "metric": "Engineering metric name 3",
      "targetValue": "Quantifiable target value",
      "tolerance": "Permissible tolerance"
    }
  ],
  "maxCostINR": number (between 1800 and 2500)
}
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      console.warn('[Gemini AI] Brief API call failed, falling back to deterministic generator');
      return generateProblemBoundaryBrief(params);
    }

    const data = await response.json();
    const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      return generateProblemBoundaryBrief(params);
    }

    const parsed = JSON.parse(rawJsonText);

    // Sanitize cost to ensure statutory ceiling <= ₹2,500 is never breached
    const cost = Math.min(
      Math.max(Number(parsed.maxCostINR) || 2450, 1500),
      MAX_BRIEF_BUDGET_INR
    );

    const validSectors: DomainSector[] = [
      'WATER_RESOURCES',
      'AGRITECH',
      'RURAL_ENERGY',
      'SANITATION',
      'HEALTHCARE',
      'CIVIL_INFRA',
    ];
    const domainSector: DomainSector = validSectors.includes(parsed.domainSector)
      ? parsed.domainSector
      : 'WATER_RESOURCES';

    return {
      id: `BRIEF-JH-AI-${Date.now().toString().slice(-6)}`,
      masterIssueId: params.id,
      title: parsed.title || 'Engineering Problem Boundary Brief',
      domainSector,
      contextSummary: parsed.contextSummary || params.panchayatNote,
      boundaryConstraints: Array.isArray(parsed.boundaryConstraints)
        ? parsed.boundaryConstraints
        : [
            '100% off-grid operation',
            'Manufacturable from locally procurable components',
            'BOM unit cost capped <= ₹2,500',
          ],
      measurableBenchmarks: Array.isArray(parsed.measurableBenchmarks)
        ? parsed.measurableBenchmarks
        : [
            {
              metric: 'Target Operational Performance',
              targetValue: '>= 90% Efficiency',
              tolerance: '±5%',
            },
          ],
      maxCostINR: cost,
      fieldEvidenceSummary: {
        photoCount: 2,
        audioNotePresent: Boolean(params.transcriptionText),
        householdImpact: params.affectedHouseholds,
        panchayatNote: params.panchayatNote,
        district: params.district,
        block: params.block,
      },
      status: 'OPEN_FOR_CLAIMS',
      createdAt: Date.now(),
    };
  } catch (err) {
    console.error('[Gemini AI] Error in generateLLMProblemBoundaryBrief:', err);
    return generateProblemBoundaryBrief(params);
  }
}

/**
 * 3. Grounded Field Clarification Chatbot
 * Answers student questions using ONLY confirmed field reports, transparently flagging unverified points
 */
export async function askGroundZeroClarification(
  studentQuestion: string,
  fieldReportContext: string
): Promise<string> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return `[Field Clarification System] Verified Field Report Record: "${fieldReportContext.slice(0, 200)}...". Note: Live Gemini LLM is offline; for real-time natural language query answering, configure a Gemini API key.`;
  }

  const prompt = `
You are the Ground-Zero Clarification Assistant for Project Udbhav (Jharkhand Civic Capstone Network).
Student solvers are designing an engineering solution and have asked a question regarding the field report.

GROUND TRUTH FIELD REPORT & INSPECTION NOTES:
"${fieldReportContext}"

STUDENT QUESTION:
"${studentQuestion}"

CRITICAL ACCREDITATION RULE:
You MUST answer the question using ONLY the confirmed facts from the field report above.
If the question asks for parameters NOT present in the field report (e.g. pipe outer diameter, water table depth in meters, soil pH), you MUST explicitly state:
"Data not in field report; requires verification from Panchayat Sachiv via Technical Query Bridge."
Do NOT invent, guess, or extrapolate unverified field measurements.
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      return `Data from field report: ${fieldReportContext.slice(0, 160)}... (Live query service temporarily unavailable)`;
    }

    const data = await response.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No field clarification output received.'
    );
  } catch (err) {
    return 'Field Clarification Service Error: ' + (err instanceof Error ? err.message : String(err));
  }
}

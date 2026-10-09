/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Local Workstation Ollama AI REST Engine & Zero-Key Inference (Sprint 5 — Task 5.2)
 * 
 * Resolves Bug 3 (Missing AI & API key demands) using local Ollama REST endpoints:
 * - Direct local REST query: POST http://127.0.0.1:11434/api/generate
 * - Tag probe & model discovery: GET http://127.0.0.1:11434/api/tags
 * - Zero external heavy npm packages (native browser fetch)
 * - Zero runtime crashes: Automatic fallback to offline deterministic heuristic engine
 * - Enforces NEP 2020 student autonomy: strictly no prescriptive circuits, code, or architectures
 * - Strictly enforces statutory BOM cost ceiling <= ₹2,500
 */

import {
  EngineeringProblemBrief,
  DomainSector,
  MAX_BRIEF_BUDGET_INR,
} from '../types/solver';
import {
  generateProblemBoundaryBrief,
  type ProblemBriefInput,
  type IssueForBoundaryGeneration,
} from '../features/solver/utils/boundaryGenerator';

export type { ProblemBriefInput, IssueForBoundaryGeneration };

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

// Configuration storage keys
const STORAGE_OLLAMA_ENDPOINT = 'udbhav_ollama_endpoint';
const STORAGE_OLLAMA_MODEL = 'udbhav_ollama_model';
const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

/**
 * Retrieves the configured Ollama REST endpoint from localStorage (default: http://127.0.0.1:11434)
 */
export function getOllamaEndpoint(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const val = window.localStorage.getItem(STORAGE_OLLAMA_ENDPOINT);
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  }
  return DEFAULT_OLLAMA_ENDPOINT;
}

/**
 * Persists custom Ollama REST endpoint in localStorage
 */
export function setOllamaEndpoint(endpoint: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (endpoint.trim()) {
      window.localStorage.setItem(STORAGE_OLLAMA_ENDPOINT, endpoint.trim());
    } else {
      window.localStorage.removeItem(STORAGE_OLLAMA_ENDPOINT);
    }
  }
}

/**
 * Retrieves the configured Ollama model name from localStorage (default: llama3.2)
 */
export function getOllamaModel(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const val = window.localStorage.getItem(STORAGE_OLLAMA_MODEL);
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  }
  return DEFAULT_OLLAMA_MODEL;
}

/**
 * Persists custom Ollama model name in localStorage
 */
export function setOllamaModel(model: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (model.trim()) {
      window.localStorage.setItem(STORAGE_OLLAMA_MODEL, model.trim());
    } else {
      window.localStorage.removeItem(STORAGE_OLLAMA_MODEL);
    }
  }
}

/**
 * Fast ping to check if local Ollama daemon is reachable
 */
export async function checkOllamaActive(endpointToTest?: string): Promise<boolean> {
  const base = (endpointToTest || getOllamaEndpoint()).replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${base}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Pings http://127.0.0.1:11434/api/tags to list installed local models and diagnose connection status
 */
export async function testOllamaConnection(
  endpointToTest?: string,
  modelToTest?: string
): Promise<{ success: boolean; model: string; models: string[]; message: string }> {
  const base = (endpointToTest || getOllamaEndpoint()).replace(/\/+$/, '');
  const model = modelToTest || getOllamaModel();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${base}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        model,
        models: [],
        message: `HTTP ${res.status}: Connected to endpoint, but server returned an error status.`,
      };
    }

    const data = await res.json();
    const rawList = Array.isArray(data?.models) ? data.models : [];
    const models: string[] = rawList
      .map((m: { name?: string; model?: string }) => m.name || m.model || '')
      .filter((n: string) => n.length > 0);

    const isTargetInstalled = models.some(
      (m) => m === model || m.startsWith(`${model}:`) || m.includes(model)
    );

    const note = isTargetInstalled
      ? `Model "${model}" is ready for live local inference.`
      : models.length > 0
      ? `Connected, but target model "${model}" is not in installed list. Available: ${models.slice(0, 3).join(', ')}`
      : 'Ollama is active with 0 local models downloaded.';

    return {
      success: true,
      model,
      models,
      message: `Active! Detected ${models.length} local model(s) on workstation. ${note}`,
    };
  } catch (err) {
    const isCorsOrConnRefused = err instanceof TypeError || (err instanceof Error && err.name === 'AbortError');
    return {
      success: false,
      model,
      models: [],
      message: isCorsOrConnRefused
        ? `Cannot reach Ollama at ${base}. To allow browser access, run in PowerShell: $env:OLLAMA_ORIGINS="*"; ollama serve`
        : `Connection error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Core query engine for local Ollama REST API with native fetch and strict JSON format
 */
async function queryOllamaJSON<T>(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 25000
): Promise<T | null> {
  const endpoint = getOllamaEndpoint().replace(/\/+$/, '');
  const model = getOllamaModel();
  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Ollama AI] Request failed with HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    let responseText = data?.response;
    if (!responseText || typeof responseText !== 'string') {
      return null;
    }

    // Strip markdown code fences if model enclosed JSON in ```json ... ```
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
    }

    return JSON.parse(responseText) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Ollama AI] Local inference unavailable or timed out, activating heuristic fallback:', err);
    return null;
  }
}

/**
 * Deterministic offline heuristic fallback for Civic First-Aid Triage
 */
function getDeterministicFirstAidTriage(
  transcript: string,
  category: string,
  village: string
): CivicFirstAidTriageResult {
  const text = `${transcript} ${category}`.toLowerCase();

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
 * Evaluates whether an issue is routine maintenance or structural innovation challenge via Local Ollama
 */
export async function evaluateCivicFirstAidTriage(
  transcript: string,
  category: string,
  village = 'Jharkhand Village'
): Promise<CivicFirstAidTriageResult> {
  const systemInstruction = `
You are an expert rural engineering diagnostician for the Government of Jharkhand. Evaluate whether the reported issue is routine maintenance or chronic innovation R&D. Return ONLY valid JSON matching this schema:
{
  "isRoutineMaintenance": boolean,
  "suggestedTechnicianTrade": "PLUMBER" | "ELECTRICIAN" | "MECHANIC" | "MASON" | null,
  "vernacularTroubleshootingTip": "Simple, actionable DIY advice in Hindi/Vernacular",
  "technicianContactSimulation": {
    "tradeTitle": "Official rural trade title in Hindi/English",
    "contactName": "Realistic rural name from Jharkhand",
    "approxDistanceKm": number,
    "contactPhone": "Phone number string"
  },
  "escalateToCivicRD": boolean,
  "confidenceScore": number,
  "reasoningSummary": "Clear 1-sentence analytical rationale"
}
`;

  const userPayload = `
Rural Citizen Report Context:
- Village / Panchayat: "${village}"
- Issue Category: "${category}"
- Spoken Audio Transcript: "${transcript}"
`;

  const result = await queryOllamaJSON<CivicFirstAidTriageResult>(userPayload, systemInstruction);

  if (result && typeof result.isRoutineMaintenance === 'boolean') {
    return {
      isRoutineMaintenance: Boolean(result.isRoutineMaintenance),
      suggestedTechnicianTrade: result.suggestedTechnicianTrade || null,
      vernacularTroubleshootingTip:
        result.vernacularTroubleshootingTip ||
        'कृपया समस्या स्थल पर सुरक्षा मानकों का पालन करें।',
      technicianContactSimulation: {
        tradeTitle:
          result.technicianContactSimulation?.tradeTitle ||
          'स्थानीय ग्राम पंचायत तकनीशियन',
        contactName:
          result.technicianContactSimulation?.contactName || 'राजू महतो',
        approxDistanceKm:
          Number(result.technicianContactSimulation?.approxDistanceKm) || 1.5,
        contactPhone:
          result.technicianContactSimulation?.contactPhone || '+91 94311-74921',
      },
      escalateToCivicRD: Boolean(result.escalateToCivicRD),
      confidenceScore: Math.min(1, Math.max(0, Number(result.confidenceScore) || 0.85)),
      reasoningSummary:
        result.reasoningSummary ||
        'विश्लेषण पूर्ण: प्राथमिकता स्तर निर्धारित किया गया।',
    };
  }

  // Graceful deterministic fallback
  return getDeterministicFirstAidTriage(transcript, category, village);
}

interface LLMBriefJSONResponse {
  title?: string;
  domainSector?: DomainSector;
  contextSummary?: string;
  boundaryConstraints?: string[];
  measurableBenchmarks?: Array<{
    metric: string;
    targetValue: string;
    tolerance: string;
  }>;
  maxCostINR?: number;
}

/**
 * 2. Academic Problem Boundary Brief Generator (No Pre-Cooked Solutions)
 * Uses Local Ollama to extract non-negotiable operational boundaries and quantitative benchmarks (BOM <= ₹2,500)
 */
export async function generateLLMProblemBoundaryBrief(
  params: ProblemBriefInput
): Promise<EngineeringProblemBrief> {
  const systemInstruction = `
You are the DHTE Jharkhand Academic Problem Boundary Generator under SIH PS-26043. Convert field evidence into operational boundaries, measurable quantitative benchmarks, and a maximum Bill of Materials (BOM) cost ceiling (strictly <= ₹2,500). DO NOT generate code, circuits, or prescriptive implementations. Return ONLY valid JSON adhering to this schema:
{
  "title": "Concise, formal engineering problem title (max 90 chars)",
  "domainSector": "WATER_RESOURCES" | "AGRITECH" | "RURAL_ENERGY" | "SANITATION" | "HEALTHCARE" | "CIVIL_INFRA",
  "contextSummary": "Rigorous technical summary of the localized challenge (2-3 sentences)",
  "boundaryConstraints": [
    "Constraint 1 (power limit e.g. off-grid <=30W)",
    "Constraint 2 (physical footprint limit e.g. <= 1.0 sq.m)",
    "Constraint 3 (locally available raw materials only)",
    "Constraint 4 (BOM manufacturing cost capped strictly <= ₹2,500)"
  ],
  "measurableBenchmarks": [
    {
      "metric": "Engineering metric name",
      "targetValue": "Quantifiable target value",
      "tolerance": "Permissible tolerance (e.g. ±5%)"
    }
  ],
  "maxCostINR": number
}
`;

  const userPayload = `
Field Evidence Details:
- Master Issue ID: "${params.id}"
- Citizen Audio Transcript: "${params.transcriptionText}"
- Category: "${params.category || 'General Rural Infrastructure'}"
- District: "${params.district}", Block: "${params.block}", Jharkhand
- Affected Households: ${params.affectedHouseholds}
- Panchayat Inspection Audit: "${params.panchayatNote}"
- Severity: "${params.severity}"
`;

  const parsed = await queryOllamaJSON<LLMBriefJSONResponse>(userPayload, systemInstruction);

  if (parsed && parsed.title && Array.isArray(parsed.boundaryConstraints)) {
    // Strictly bound BOM cost to <= ₹2,500
    const cost = Math.min(
      Math.max(Number(parsed.maxCostINR) || 2450, 1200),
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
    const domainSector: DomainSector =
      parsed.domainSector && validSectors.includes(parsed.domainSector)
        ? parsed.domainSector
        : 'WATER_RESOURCES';

    return {
      id: `BRIEF-JH-AI-${Date.now().toString().slice(-6)}`,
      masterIssueId: params.id,
      title: parsed.title,
      domainSector,
      contextSummary: parsed.contextSummary || params.panchayatNote,
      boundaryConstraints: parsed.boundaryConstraints,
      measurableBenchmarks: Array.isArray(parsed.measurableBenchmarks) && parsed.measurableBenchmarks.length > 0
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
  }

  // Graceful deterministic fallback
  return generateProblemBoundaryBrief(params);
}

/**
 * 3. Grounded Field Clarification Chatbot
 * Answers student solver inquiries using ONLY confirmed field records via Local Ollama
 */
export async function askGroundZeroClarification(
  studentQuestion: string,
  fieldReportContext: string
): Promise<string> {
  const systemInstruction = `
You are the Ground-Zero Clarification Assistant for Project Udbhav (Jharkhand Civic Capstone Network).
Answer student questions using ONLY confirmed field reports. If parameters are not in the field report, state:
"Data not in field report; requires verification from Panchayat Sachiv via Technical Query Bridge."
Do NOT invent or extrapolate unverified field measurements.
`;

  const userPayload = `
CONFIRMED FIELD REPORT:
"${fieldReportContext}"

STUDENT INQUIRY:
"${studentQuestion}"
`;

  const endpoint = getOllamaEndpoint().replace(/\/+$/, '');
  const model = getOllamaModel();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${systemInstruction}\n\n${userPayload}`,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.response && typeof data.response === 'string') {
        return data.response.trim();
      }
    }
  } catch {
    // Fall through to deterministic fallback
  }

  return `[Field Clarification Record]: ${fieldReportContext.slice(0, 220)}... (Note: Local Ollama daemon unreachable or offline; response based directly on confirmed Panchayat inspection notes).`;
}

// ============================================================================
// BACKWARD-COMPATIBILITY STUBS (Safe transitions from legacy cloud references)
// ============================================================================

export function getGeminiApiKey(): string {
  return '';
}

export function setGeminiApiKey(_key: string): void {
  // Legacy stub
}

export function hasGeminiApiKey(): boolean {
  return false;
}

export async function testGeminiConnection(): Promise<{
  success: boolean;
  model: string;
  message: string;
}> {
  return {
    success: false,
    model: 'Migrated to Local Ollama',
    message: 'Cloud API keys deprecated in favor of zero-key Local Ollama AI REST engine.',
  };
}

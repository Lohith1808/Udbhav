/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Masked Citizen Callback & Clarification Bridge Modal (Sprint 8 — Task 8.3)
 *
 * Provides a cryptographically secure, privacy-preserving inquiry bridge
 * connecting collegiate student solvers with grassroots citizen submitters.
 * Submitter raw phone numbers remain hashed/salted; inquiries route via
 * masked civic proxy tokens (Citizen #JH-XXXX).
 */

import React, { useState, useId } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Send,
  X,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Radio,
  FileQuestion,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface MaskedCitizenQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  maskedCitizenToken: string; // e.g. 'Citizen #JH-8492'
  locationContext?: { district: string; block: string; panchayat: string };
  onSubmitQuery: (query: {
    category: string;
    questionText: string;
    isUrgentCallback: boolean;
  }) => Promise<void> | void;
}

export type QueryCategory =
  | 'ENGINEERING_SPECS'
  | 'WATER_SAMPLE'
  | 'POWER_INFRA'
  | 'OPERATIONAL_HOURS';

interface CategoryConfig {
  key: QueryCategory;
  labelEn: string;
  labelHi: string;
  icon: typeof FileQuestion;
  templates: Array<{ en: string; hi: string }>;
}

const QUERY_CATEGORIES: CategoryConfig[] = [
  {
    key: 'ENGINEERING_SPECS',
    labelEn: 'Measurements & Specs',
    labelHi: 'इंजीनियरिंग विनिर्देश',
    icon: FileQuestion,
    templates: [
      {
        en: 'What is the internal pipe diameter and discharge water pressure at the handpump?',
        hi: 'चापाकल के पाइप का आंतरिक व्यास और डिस्चार्ज दबाव क्या है?',
      },
      {
        en: 'Is there a reinforced concrete apron or soak pit constructed around the borehole casing?',
        hi: 'क्या बोरहोल केसिंग के चारों ओर कंक्रीट चबूतरा (apron) या सोकपिट बना हुआ है?',
      },
      {
        en: 'What is the approximate water table depth in meters during peak summer months?',
        hi: 'गर्मी के मौसम में भूजल स्तर की गहराई लगभग कितने मीटर तक गिरती है?',
      },
    ],
  },
  {
    key: 'WATER_SAMPLE',
    labelEn: 'Water or Soil Test',
    labelHi: 'जल / मृदा नमूना विवरण',
    icon: AlertCircle,
    templates: [
      {
        en: 'Does reddish iron or fluoride staining occur immediately upon pumping or after settling for a few hours?',
        hi: 'क्या पानी में लाल रंग (आयरन/फ्लोराइड) तुरंत निकलता है या कुछ घंटे रखने के बाद नीचे बैठता है?',
      },
      {
        en: 'Has the local PHED laboratory performed any prior chemical TDS or fluoride water testing in this tola?',
        hi: 'क्या स्थानीय पीएचईडी लैब द्वारा इस टोले में पूर्व में कोई टीडीएस या फ्लोराइड परीक्षण किया गया है?',
      },
      {
        en: 'Does the water have an oily film, sulfur odor, or unpleasant metallic taste?',
        hi: 'क्या पानी में कोई गंध, तैलीय परत या धात्विक स्वाद महसूस होता है?',
      },
    ],
  },
  {
    key: 'POWER_INFRA',
    labelEn: 'Power Grid Availability',
    labelHi: 'विद्युत आपूर्ति स्थिति',
    icon: Radio,
    templates: [
      {
        en: 'Is a 3-phase rural electrical grid line available near the community pump site?',
        hi: 'क्या सामुदायिक पंप स्थल के पास 3-फेज ग्रामीण विद्युत लाइन उपलब्ध है?',
      },
      {
        en: 'How many daily hours of stable electrical supply are received, and do severe voltage drops (140V) occur?',
        hi: 'दैनिक कितने घंटे स्थिर बिजली मिलती है और क्या वोल्टेज 140V तक गिरता है?',
      },
      {
        en: 'Is the Panchayat school or community roof accessible for micro-solar panel installation?',
        hi: 'क्या पंचायत भवन या स्कूल की छत सौर पैनल स्थापना हेतु उपयुक्त है?',
      },
    ],
  },
  {
    key: 'OPERATIONAL_HOURS',
    labelEn: 'Usage Hours & Frequency',
    labelHi: 'उपयोग समय व भार',
    icon: HelpCircle,
    templates: [
      {
        en: 'How many households depend on this water source during peak morning hours (6 AM - 9 AM)?',
        hi: 'सुबह 6 से 9 बजे के दौरान कितने ग्रामीण परिवार इस जल स्रोत पर निर्भर रहते हैं?',
      },
      {
        en: 'What is the distance to the next nearest functional drinking water handpump?',
        hi: 'निकटतम अन्य चालू पेयजल चापाकल की दूरी कितनी है?',
      },
      {
        en: 'Do women and school students experience long waiting queues exceeding 45 minutes?',
        hi: 'क्या पानी भरने में ग्रामीणों को 45 मिनट से अधिक की लंबी कतार में खड़ा होना पड़ता है?',
      },
    ],
  },
];

export const MaskedCitizenQueryModal: React.FC<MaskedCitizenQueryModalProps> = ({
  isOpen,
  onClose,
  issueId,
  maskedCitizenToken,
  locationContext,
  onSubmitQuery,
}) => {
  const modalTitleId = useId();
  const [selectedCategory, setSelectedCategory] = useState<QueryCategory>('ENGINEERING_SPECS');
  const [questionText, setQuestionText] = useState<string>('');
  const [isUrgentCallback, setIsUrgentCallback] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dispatchResultToken, setDispatchResultToken] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCategoryConfig =
    QUERY_CATEGORIES.find((c) => c.key === selectedCategory) ?? QUERY_CATEGORIES[0];

  const handleApplyTemplate = (templateText: string) => {
    setQuestionText(templateText);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionText.trim();

    if (trimmed.length < 15) {
      setValidationError(
        'कृपया कम से कम 15 वर्णों का स्पष्ट तकनीकी प्रश्न दर्ज करें / Please enter at least 15 characters for technical clarity.'
      );
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      await onSubmitQuery({
        category: selectedCategory,
        questionText: trimmed,
        isUrgentCallback,
      });

      // Generate verified dispatch token
      const randomUuid = Math.random().toString(36).substring(2, 7).toUpperCase();
      const token = `JH-MASKED-QUERY-2026-${randomUuid}`;
      setDispatchResultToken(token);
    } catch (err) {
      console.error('Failed to dispatch masked inquiry:', err);
      setValidationError('Failed to dispatch query. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setDispatchResultToken(null);
    setQuestionText('');
    setIsUrgentCallback(false);
    setValidationError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div className="bg-white border-2 border-[#0B2545] w-full max-w-2xl shadow-2xl rounded-none overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-[#0B2545] text-white px-4 py-3 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#7A1B1B] text-[#F8E7A2]">
              <PhoneCall className="w-4 h-4 text-amber-300" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest">
                GRASSROOTS INQUIRY BRIDGE &bull; SPRINT 8
              </div>
              <h2 id={modalTitleId} className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                नागरिक स्पष्टीकरण सेतु / Masked Citizen Inquiry
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statutory Privacy Shield Banner */}
        <div className="bg-[#0B2545]/95 text-slate-100 p-3 border-b border-amber-400 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs space-y-0.5">
            <div className="font-extrabold text-amber-300 text-[11px] uppercase tracking-wider">
              सुरक्षित नागरिक सेतु (गोपनीयता संरक्षित) &bull; Masked Civic Privacy Proxy
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
              Submitter phone number is cryptographically salted. Inquiries route via masked push alert.
              Beneficiary identity is strictly isolated to prevent unconsented surveillance.
            </p>
          </div>
        </div>

        {/* Beneficiary Meta Strip */}
        <div className="bg-slate-100 p-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold text-[#0B2545]">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Beneficiary:</span>
            <span className="px-2 py-0.5 bg-white border border-slate-300 text-[#7A1B1B] font-black">
              {maskedCitizenToken || 'Citizen #JH-8492'}
            </span>
          </div>

          {locationContext && (
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {locationContext.panchayat} GP, {locationContext.block} Block ({locationContext.district})
              </span>
            </div>
          )}

          <div className="text-[10px] font-mono text-slate-500">
            Issue Ref: #{issueId.slice(-6).toUpperCase()}
          </div>
        </div>

        {/* Success Dispatch Banner */}
        {dispatchResultToken ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-100 border-2 border-emerald-500 text-emerald-800 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                नागरिक स्पष्टीकरण संदेश सफलतापूर्वक प्रेषित!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Your technical clarification inquiry has been cryptographically routed through the NIC SMS/Push Gateway.
                The citizen can respond directly or via voice note.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-300 p-3 max-w-sm mx-auto">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                Simulated Dispatch Token:
              </div>
              <div className="font-mono text-xs font-black text-[#0B2545] tracking-wider mt-0.5">
                {dispatchResultToken}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2 bg-[#0B2545] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer transition-colors"
              >
                विंडो बंद करें / Close Bridge
              </button>
            </div>
          </div>
        ) : (
          /* Inquiry Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Quick-Category Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                1. जांच श्रेणी चुनें / Select Inquiry Domain:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {QUERY_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`p-2 border text-left transition-all cursor-pointer rounded-none flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#0B2545] text-white border-[#0B2545] shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="text-[10px] font-extrabold uppercase leading-tight line-clamp-2">
                        {cat.labelHi}
                      </div>
                      <div
                        className={`text-[9px] mt-1 font-sans ${
                          isSelected ? 'text-amber-200' : 'text-slate-500'
                        }`}
                      >
                        {cat.labelEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Question Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase text-[11px]">
                  2. त्वरित प्रश्न टेम्प्लेट / Quick Template Questions:
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Click to populate</span>
              </div>
              <div className="space-y-1">
                {currentCategoryConfig.templates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.en)}
                    className="w-full text-left p-2 bg-slate-50 hover:bg-amber-50/60 border border-slate-300 hover:border-amber-400 text-xs text-slate-800 transition-colors flex items-start gap-2 cursor-pointer rounded-none group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 text-[11px] leading-snug">
                      <div className="font-semibold text-slate-900">{tmpl.hi}</div>
                      <div className="text-slate-500 font-sans">{tmpl.en}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 uppercase text-[11px]">
                  3. आपका विशिष्ट प्रश्न / Technical Inquiry Details:
                  <span className="text-red-600 ml-0.5">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    questionText.trim().length >= 15 ? 'text-emerald-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {questionText.trim().length}/15 min chars
                </span>
              </div>
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => {
                  setQuestionText(e.target.value);
                  if (validationError && e.target.value.trim().length >= 15) {
                    setValidationError(null);
                  }
                }}
                placeholder="पाइप का व्यास, भूजल स्तर, बिजली उपलब्धता अथवा किसी अन्य आवश्यक तकनीकी विनिर्देश के बारे में नागरिक से पूछें..."
                className="w-full text-xs p-2.5 border border-slate-400 bg-white focus:bg-amber-50/20 rounded-none focus:outline-none focus:border-[#0B2545] font-sans leading-relaxed transition-colors"
              />
              {validationError && (
                <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                  <span>{validationError}</span>
                </p>
              )}
            </div>

            {/* Priority Callback Toggle */}
            <div className="p-2.5 bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
              <label
                htmlFor="urgent-callback-toggle"
                className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer select-none"
              >
                <PhoneCall className="w-4 h-4 text-[#7A1B1B] shrink-0" />
                <div>
                  <div>नागरिक को तत्काल कॉलबैक अनुरोध भेजें</div>
                  <div className="text-[10px] text-amber-800 font-normal">
                    Request Priority Masked Voice Callback via IVR Bridge
                  </div>
                </div>
              </label>
              <input
                id="urgent-callback-toggle"
                type="checkbox"
                checked={isUrgentCallback}
                onChange={(e) => setIsUrgentCallback(e.target.checked)}
                className="w-4 h-4 accent-[#7A1B1B] cursor-pointer"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
              >
                रद्द करें / Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || questionText.trim().length < 15}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#7A1B1B] hover:bg-[#631515] active:bg-[#4d1010] disabled:opacity-50 disabled:cursor-not-allowed text-[#F8E7A2] text-xs font-black uppercase tracking-wider rounded-none shadow-2xs transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>प्रेषित हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>संदेश प्रेषित करें / Dispatch Masked Query</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MaskedCitizenQueryModal;

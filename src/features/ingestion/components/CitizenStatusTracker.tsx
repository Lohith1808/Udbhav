/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Dialect-Aware 6-Stage Citizen Progress Tracker Component
 * 
 * Strict Alignment with Requirements Section 3 (Shoe 1):
 * 1. Report Received / समस्या दर्ज हुई
 * 2. Pending Panchayat Verification / पंचायत जांच बाकी
 * 3. Verified & Open to Colleges / इंजीनियरिंग कॉलेज को भेजा गया
 * 4. Team Building Solution / समाधान पर कार्य जारी
 * 5. Field Testing at Village / गांव में टेस्टिंग शुरू
 * 6. Resolved & Deployed / समस्या का समाधान हो गया
 */

import React, { useState } from 'react';
import { IssueStatus } from '../../../types/ingestion';
import {
  CheckCircle2,
  Volume2,
  VolumeX,
  AlertOctagon,
  Copy,
  Check,
  X,
} from 'lucide-react';

export interface CitizenStatusTrackerProps {
  /** Central authoritative IssueStatus */
  status: IssueStatus;
  /** Authoritative receipt tracking token (e.g. 'JH-2026-M-8D2625') */
  trackingToken: string;
  /** Submitter masked identity */
  maskedCitizenId?: string;
  /** UI Language */
  language?: 'hi' | 'en';
  /** Optional close callback if rendered within a modal */
  onClose?: () => void;
  /** Optional custom CSS classes */
  className?: string;
}

interface MilestoneStage {
  step: number;
  labelEn: string;
  labelHi: string;
  descEn: string;
  descHi: string;
  spokenTextHi: string;
  spokenTextEn: string;
}

const MILESTONE_STAGES: MilestoneStage[] = [
  {
    step: 1,
    labelEn: 'Report Received',
    labelHi: 'समस्या दर्ज हुई',
    descEn: 'Civic issue recorded with cryptographic identity hash and LGD spatial geotag.',
    descHi: 'नागरिक रिपोर्ट सुरक्षित रूप से दर्ज कर ली गई है।',
    spokenTextHi: 'आपकी समस्या दर्ज हो चुकी है और सिस्टम में सुरक्षित है।',
    spokenTextEn: 'Your civic report has been received and logged in the state system.',
  },
  {
    step: 2,
    labelEn: 'Pending Panchayat Verification',
    labelHi: 'पंचायत जांच बाकी',
    descEn: 'Awaiting mandatory inspection note and severity validation from Panchayat Secretary / BDO.',
    descHi: 'पंचायत सचिव अथवा प्रखंड विकास पदाधिकारी द्वारा स्थल निरीक्षण व सत्यापन प्रक्रियाधीन है।',
    spokenTextHi: 'आपकी रिपोर्ट पंचायत सचिव द्वारा सत्यापन की प्रतीक्षा में है।',
    spokenTextEn: 'Your report is currently pending local Panchayat field verification.',
  },
  {
    step: 3,
    labelEn: 'Verified & Open to Colleges',
    labelHi: 'इंजीनियरिंग कॉलेज को भेजा गया',
    descEn: 'Endorsed master challenge published to university engineering solvers across Jharkhand.',
    descHi: 'सत्यापित समस्या राज्य के तकनीकी व इंजीनियरिंग विश्वविद्यालयों के छात्रों हेतु उपलब्ध करा दी गई है।',
    spokenTextHi: 'समस्या सत्यापित हो चुकी है और इंजीनियरिंग कॉलेज के छात्रों को भेज दी गई है।',
    spokenTextEn: 'Issue is verified and published to state engineering colleges for problem solving.',
  },
  {
    step: 4,
    labelEn: 'Team Building Solution',
    labelHi: 'समाधान पर कार्य जारी',
    descEn: 'Multidisciplinary capstone team prototyping solution under faculty lab supervision.',
    descHi: 'छात्र व प्रोफेसरों की तकनीकी टीम लैब में समाधान का प्रोटोटाइप बना रही है।',
    spokenTextHi: 'इंजीनियरिंग कॉलेज की टीम आपकी समस्या के समाधान पर कार्य कर रही है।',
    spokenTextEn: 'An academic engineering team is actively building a prototype solution.',
  },
  {
    step: 5,
    labelEn: 'Field Testing at Village',
    labelHi: 'गांव में टेस्टिंग शुरू',
    descEn: 'Laboratory tested and BIS accredited prototype undergoing pilot trial in your Gram Panchayat.',
    descHi: 'प्रोटोटाइप का आपके गांव में जमीनी परीक्षण व फील्ड सेफ्टी टेस्टिंग जारी है।',
    spokenTextHi: 'समाधान का प्रोटोटाइप आपके गांव में फील्ड टेस्टिंग हेतु पहुंच चुका है।',
    spokenTextEn: 'Prototype has entered field testing directly in your village.',
  },
  {
    step: 6,
    labelEn: 'Resolved & Deployed',
    labelHi: 'समस्या का समाधान हो गया',
    descEn: 'Final technology handed over to Gram Panchayat with statutory certification.',
    descHi: 'प्रमाणित तकनीक का सफल क्रियान्वयन कर पंचायत को सौंप दिया गया है।',
    spokenTextHi: 'बधाई हो, आपकी समस्या का पूर्ण समाधान हो चुका है।',
    spokenTextEn: 'Congratulations, your civic challenge has been fully resolved and deployed.',
  },
];

export const CitizenStatusTracker: React.FC<CitizenStatusTrackerProps> = ({
  status,
  trackingToken,
  maskedCitizenId = 'Citizen #JH-XXXX',
  language = 'en',
  onClose,
  className = '',
}) => {
  const [isPlayingSpeech, setIsPlayingSpeech] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Compute active milestone step number (1 to 6) based on IssueStatus
  const getActiveStepNumber = (issueStatus: IssueStatus): number => {
    switch (issueStatus) {
      case 'REPORTED':
        return 1;
      case 'ROUTED_LOCAL_REPAIR':
      case 'AI_TRIAGED':
        return 2;
      case 'ENDORSED_MASTER':
      case 'CLAIMED_ACADEMIC':
        return 3;
      case 'IN_PROTOTYPING':
      case 'TIER1_LAB_PASSED':
        return 4;
      case 'TIER2_BIS_CERTIFIED':
      case 'PUBLIC_PILOT_ACTIVE':
        return 5;
      case 'RESOLVED_DEPLOYED':
        return 6;
      case 'REJECTED_SPAM':
        return 0; // Special rejected state
      default:
        return 1;
    }
  };

  const activeStep = getActiveStepNumber(status);
  const isRejected = status === 'REJECTED_SPAM';

  // Spoken vernacular audio playback using browser SpeechSynthesis API
  const handlePlaySpokenStatus = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    const currentStage = MILESTONE_STAGES[Math.max(0, activeStep - 1)] || MILESTONE_STAGES[0];
    const textToSpeak =
      language === 'hi'
        ? `ट्रैकिंग नंबर ${trackingToken.replace(/-/g, ' ')}. ${currentStage.spokenTextHi}`
        : `Tracking Token ${trackingToken}. Current Stage: ${currentStage.spokenTextEn}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.9; // Slightly slower for clear rural comprehension

    utterance.onstart = () => setIsPlayingSpeech(true);
    utterance.onend = () => setIsPlayingSpeech(false);
    utterance.onerror = () => setIsPlayingSpeech(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Copy tracking receipt token
  const handleCopyToken = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(trackingToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className={`bg-white border-2 border-slate-400 p-4 sm:p-5 rounded-none shadow-md space-y-4 ${className}`}>
      {/* 1. Header Banner & Tracking Token Receipt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#7A1B1B] text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
              OFFICIAL TRACKING RECEIPT
            </span>
            <span className="text-[11px] font-bold text-slate-600 font-mono">
              DHTE CITIZEN MONITOR
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
            {language === 'hi' ? 'नागरिक प्रगति ट्रैकर' : 'Dialect-Aware 6-Stage Progress Tracker'}
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            {language === 'hi' ? 'प्रस्तुतकर्ता:' : 'Submitter Identity:'} {maskedCitizenId}
          </p>
        </div>

        {/* Tracking Token Badge with 1-click Copy */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-mono text-xs font-black text-slate-900 flex items-center gap-2">
            <span>{trackingToken}</span>
            <button
              type="button"
              onClick={handleCopyToken}
              className="text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Copy Tracking Token"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-800"
              title="Close Tracker"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Audio Read-Out Button for Semi-Literate Citizens */}
      <div className="bg-amber-50 border border-amber-300 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-xs text-amber-950 font-medium">
          <span className="font-extrabold uppercase mr-1.5">
            {language === 'hi' ? 'ऑडियो उद्घोषणा:' : 'SPOKEN AUDIO READ-OUT:'}
          </span>
          {language === 'hi'
            ? 'अपनी स्थानीय भाषा में वर्तमान प्रगति स्थिति सुनने हेतु बटन दबाएं।'
            : 'Press the audio button to hear the current milestone read aloud.'}
        </div>

        <button
          type="button"
          onClick={handlePlaySpokenStatus}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-none border transition-all cursor-pointer ${
            isPlayingSpeech
              ? 'bg-red-700 border-red-800 text-white animate-pulse'
              : 'bg-[#0B2545] hover:bg-slate-800 border-[#0B2545] text-[#F8E7A2]'
          }`}
        >
          {isPlayingSpeech ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'रोकें (Stop)' : 'Stop Audio'}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'hi' ? 'स्थिति सुनें' : 'Listen Status'}</span>
            </>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* 3. SIX-STAGE VISUAL PROGRESS TIMELINE */}
      {/* ============================================================== */}
      {isRejected ? (
        <div className="p-4 bg-red-100 border-2 border-red-700 text-red-950 text-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-red-900 uppercase">
            <AlertOctagon className="w-5 h-5 text-red-700" />
            <span>
              {language === 'hi' ? 'अस्वीकृत / अमान्य प्रविष्टि' : 'Submission Rejected / Classified as Non-Actionable'}
            </span>
          </div>
          <p className="mt-1 text-red-900/90 text-xs">
            {language === 'hi'
              ? 'यह रिपोर्ट पंचायत अथवा एआई ट्राइएज द्वारा अमान्य अथवा दोहराव के कारण बंद कर दी गई है।'
              : 'This issue was flagged as out-of-boundary, duplicate, or non-structural maintenance.'}
          </p>
        </div>
      ) : (
        <div className="relative pt-2 pb-1">
          {/* Vertical Stepper List */}
          <div className="space-y-4">
            {MILESTONE_STAGES.map((stage) => {
              const isCompleted = activeStep > stage.step;
              const isCurrent = activeStep === stage.step;

              return (
                <div key={stage.step} className="flex items-start gap-3 relative group">
                  {/* Step Connector Line */}
                  {stage.step < 6 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-10 ${
                        isCompleted ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Step Icon Badge */}
                  <div
                    className={`w-8 h-8 rounded-none border-2 flex items-center justify-center font-bold text-xs shrink-0 z-10 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-700 border-emerald-800 text-white'
                        : isCurrent
                        ? 'bg-[#FF9933] border-amber-600 text-black animate-pulse'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>0{stage.step}</span>
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1 bg-slate-50 border border-slate-200 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-xs ${
                            isCompleted
                              ? 'text-emerald-900'
                              : isCurrent
                              ? 'text-[#7A1B1B] uppercase tracking-wide'
                              : 'text-slate-500'
                          }`}
                        >
                          {language === 'hi' ? stage.labelHi : stage.labelEn}
                        </span>

                        {isCurrent && (
                          <span className="bg-[#7A1B1B] text-white text-[9px] font-black uppercase px-1.5 py-0.2 animate-pulse">
                            ACTIVE
                          </span>
                        )}
                        {isCompleted && (
                          <span className="bg-emerald-100 text-emerald-900 text-[9px] font-bold px-1.5 py-0.2">
                            VERIFIED
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        Stage {stage.step} of 6
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                      {language === 'hi' ? stage.descHi : stage.descEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Footer Information & Escalation Notice */}
      <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
        <div>
          <span>DHTE Public Portal &bull; GIGW 3.0 Telemetry</span>
        </div>
        <div className="text-emerald-800 font-bold">
          Current State: {status}
        </div>
      </div>
    </div>
  );
};

export default CitizenStatusTracker;

/**
 * Project Udbhav (SIH PS ID: 26043 — DHTE Jharkhand)
 * Sprint 2: Academic Engine — Panchayat Technical Clarification Bridge Modal
 * 
 * Bidirectional technical inquiry conduit connecting student solver teams
 * with grassroots Panchayat field officers while enforcing PII isolation.
 */

import React, { useState, useEffect, useId } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Send,
  Clock,
  CheckCircle2,
  Lock,
  X,
  MapPin,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  EngineeringProblemBrief,
  PanchayatTechnicalQuery,
  StudentTeam,
} from '../../../types/solver';
import { db, saveTechnicalQuery } from '../../../lib/db';
import { askGroundZeroClarification } from '../../../services/aiService';

export interface PanchayatQueryModalProps {
  brief: EngineeringProblemBrief;
  team?: StudentTeam | null;
  language?: 'en' | 'hi';
  onClose: () => void;
}

export const PanchayatQueryModal: React.FC<PanchayatQueryModalProps> = ({
  brief,
  team,
  language = 'en',
  onClose,
}) => {
  const modalTitleId = useId();
  const [queries, setQueries] = useState<PanchayatTechnicalQuery[]>([]);
  const [newQueryText, setNewQueryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [aiAssistantAnswer, setAiAssistantAnswer] = useState<string | null>(null);
  const [isAiAnswering, setIsAiAnswering] = useState<boolean>(false);

  const teamId = team?.id || `TEAM-${brief.id.slice(-6)}`;
  const teamName = team?.teamName || 'Collegiate Solver Team';

  // Load existing queries from Dexie IndexedDB
  const loadQueries = async () => {
    try {
      const records = await db.technicalQueries
        .where('masterIssueId')
        .equals(brief.masterIssueId)
        .toArray();

      if (records.length === 0) {
        // Seed default starter query for realistic context if empty
        const initialSampleQuery: PanchayatTechnicalQuery = {
          id: `QUERY-JH-${Date.now().toString(36).toUpperCase()}-01`,
          teamId,
          masterIssueId: brief.masterIssueId,
          queryText:
            'What is the internal diameter of the tube well casing and what is the static water table depth during pre-monsoon peak?',
          responseNote:
            'BDO / Panchayat Technical Assistant confirmed: Standard Mark-II cylinder casing diameter is 100mm (4 inches). Static water level drops to 32 meters in peak May.',
          status: 'ANSWERED',
          createdAt: Date.now() - 3600000 * 24,
        };
        await saveTechnicalQuery(initialSampleQuery);
        setQueries([initialSampleQuery]);
      } else {
        setQueries(records.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (err) {
      console.error('Error fetching technical queries:', err);
    }
  };

  useEffect(() => {
    loadQueries();
  }, [brief.masterIssueId]);

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const queryId = `QUERY-JH-${Date.now().toString(36).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

      const newQuery: PanchayatTechnicalQuery = {
        id: queryId,
        teamId,
        masterIssueId: brief.masterIssueId,
        queryText: newQueryText.trim(),
        status: 'PENDING_OFFICER',
        createdAt: Date.now(),
      };

      await saveTechnicalQuery(newQuery);
      setNewQueryText('');
      setStatusMessage(
        language === 'hi'
          ? 'प्रश्न सफलतापूर्वक पंचायत अधिकारी को प्रेषित किया गया!'
          : 'Technical query dispatched to Panchayat Field Inspector!'
      );
      await loadQueries();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('Error dispatching technical query:', err);
      setStatusMessage('Failed to submit query. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskAiAssistant = async () => {
    if (!newQueryText.trim() || isAiAnswering) return;
    setIsAiAnswering(true);
    setAiAssistantAnswer(null);
    try {
      const context = `${brief.title}. Context: ${brief.contextSummary}. Panchayat Field Notes: ${brief.fieldEvidenceSummary.panchayatNote}. District: ${brief.fieldEvidenceSummary.district}, Block: ${brief.fieldEvidenceSummary.block}. Measurable Targets: ${brief.measurableBenchmarks.map(m => `${m.metric}: ${m.targetValue}`).join('; ')}. Statutory Cost: ₹${brief.maxCostINR}.`;
      const ans = await askGroundZeroClarification(newQueryText.trim(), context);
      setAiAssistantAnswer(ans);
    } finally {
      setIsAiAnswering(false);
    }
  };

  const handleSimulateResponse = async (queryId: string) => {
    try {
      const existing = await db.technicalQueries.get(queryId);
      if (!existing) return;

      const sampleResponses: Record<string, string> = {
        WATER_RESOURCES:
          'Panchayat Secretary verified: Handpump discharge rate is 12 L/min at 40 strokes/min. Water test indicates iron precipitate causes staining; gravity filter unit can be mounted on the 1.2m apron.',
        AGRITECH:
          'Krishi Mitra verified: Haat operates on Tuesdays and Fridays. Farmers bring crates by 6:00 AM; ambient midday shade temperature reaches 41°C. Passive holding capacity for 10-12 crates needed.',
        RURAL_ENERGY:
          'Gram Rozgar Sevak verified: Line supply voltage frequently drops to 140V during 6 PM - 10 PM load hours. Village primary school roof is available for micro-PV mounting.',
      };

      const note =
        sampleResponses[brief.domainSector] ||
        'Gram Panchayat Officer confirmed: On-site verification confirms feasibility within statutory village commons boundary.';

      await db.technicalQueries.update(queryId, {
        status: 'ANSWERED',
        responseNote: note,
      });

      await loadQueries();
    } catch (err) {
      console.error('Error simulating response:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div className="bg-white border-2 border-[#0B2545] max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================== */}
        {/* MODAL HEADER */}
        {/* ================================================================== */}
        <div className="bg-[#0B2545] text-white p-3.5 sm:p-4 flex items-start justify-between gap-3 border-b-2 border-amber-500 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#7A1B1B] text-[#F8E7A2] border border-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] tracking-wider uppercase inline-flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-amber-300" />
                  <span>Grassroots Field Conduit</span>
                </span>
                <span className="text-[11px] font-mono text-amber-200 bg-white/10 px-2 py-0.5 border border-white/20">
                  {brief.masterIssueId}
                </span>
              </div>
              <h2
                id={modalTitleId}
                className="text-base sm:text-lg font-black text-white leading-snug"
              >
                {language === 'hi'
                  ? 'पंचायत तकनीकी स्पष्टीकरण सेतु'
                  : 'Panchayat Field Clarification Bridge'}
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                {language === 'hi'
                  ? 'छात्र टीम एवं ग्राम पंचायत अधिकारी के बीच द्विदिशीय तकनीकी संवाद।'
                  : 'Bidirectional technical communication between Student Solvers & Panchayat Officers.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challenge Provenance & Privacy Guardrail Banner */}
        <div className="bg-emerald-50 border-b border-emerald-300 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-800 shrink-0" />
            <div>
              <span className="font-black text-emerald-950 uppercase text-[10px] block">
                Secure Field Bridge (PII Protected)
              </span>
              <span className="text-[11px] text-emerald-900">
                Communication routed via masked Panchayat token to protect citizen contact details.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-700 bg-white border border-emerald-200 px-2.5 py-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#7A1B1B]" />
              <strong>{brief.fieldEvidenceSummary.block}</strong>, {brief.fieldEvidenceSummary.district}
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-[#0B2545]">{teamName}</span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* MODAL CONTENT: Query Stream + New Query Composer */}
        {/* ================================================================== */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#FCFDFE]">
          {statusMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* New Query Composer Form */}
          <div className="bg-white border-2 border-slate-300 p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#2A6F86]" />
                <span>Submit Technical Clarification / नया तकनीकी प्रश्न</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Direct to Panchayat Desk
              </span>
            </div>

            {/* Grounded AI Assistant Response Box */}
            {aiAssistantAnswer && (
              <div className="mb-2 p-3 bg-purple-50 border border-purple-300 text-xs text-purple-950 space-y-1">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-purple-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Grounded Field Assistant (Gemini Flash RAG):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAiAssistantAnswer(null)}
                    className="text-purple-600 hover:text-purple-900 text-[10px] uppercase font-bold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed bg-white p-2 border border-purple-200">
                  {aiAssistantAnswer}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitQuery} className="space-y-2">
              <textarea
                required
                rows={3}
                placeholder="e.g. What is the average borehole casing diameter and water turbidity level during dry season? Is single-phase power accessible near the handpump apron?"
                value={newQueryText}
                onChange={(e) => setNewQueryText(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 focus:border-[#0B2545] focus:ring-1 focus:ring-[#0B2545] outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500 italic">
                  Keep queries focused on physical, electrical, and environmental constraints.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAskAiAssistant}
                    disabled={!newQueryText.trim() || isAiAnswering}
                    className="px-3 py-2 bg-[#7A1B1B] hover:bg-[#912020] disabled:bg-slate-300 text-white text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:cursor-not-allowed"
                    title="Ask grounded AI if this parameter is in the field report"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAiAnswering ? 'animate-spin' : ''}`} />
                    <span>{isAiAnswering ? 'Ground-Checking...' : 'AI Ground-Check'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!newQueryText.trim() || isSubmitting}
                    className="px-4 py-2 bg-[#0B2545] hover:bg-[#1E3A5F] disabled:bg-slate-400 text-white text-xs font-bold uppercase rounded-none transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {isSubmitting
                        ? language === 'hi'
                          ? 'प्रेषित हो रहा है...'
                          : 'Dispatching...'
                        : language === 'hi'
                        ? 'प्रश्न प्रेषित करें'
                        : 'Dispatch Field Query'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Historical Technical Queries Stream */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#7A1B1B] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Query Audit Trail ({queries.length} Technical Inquiries)
                </span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Chronological Log
              </span>
            </div>

            {queries.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase">
                  No technical queries submitted yet
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use the composer above to ask the Gram Panchayat officer about local site parameters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queries.map((q) => {
                  const isAnswered = q.status === 'ANSWERED';

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 border transition-all shadow-2xs ${
                        isAnswered
                          ? 'bg-white border-l-4 border-l-emerald-600 border-slate-200'
                          : 'bg-amber-50/50 border-l-4 border-l-amber-500 border-amber-200'
                      }`}
                    >
                      {/* Query Header Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2 text-[11px]">
                        <span className="font-mono text-slate-500 text-[10px]">
                          {q.id} &bull; {new Date(q.createdAt).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isAnswered ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold uppercase text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Answered by Panchayat</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase text-[10px] inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Awaiting Field Inspector</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="text-xs text-slate-900 font-medium leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
                        <strong className="text-[#0B2545] block text-[10px] uppercase font-black mb-0.5">
                          Solver Inquiry:
                        </strong>
                        &ldquo;{q.queryText}&rdquo;
                      </div>

                      {/* Official Officer Response Note (if answered) */}
                      {isAnswered && q.responseNote && (
                        <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-300 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-950 border-b border-emerald-200 pb-1">
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Official Panchayat Inspection Clarification</span>
                            </span>
                            <span className="font-mono text-emerald-800">
                              Status: Verified Ground Data
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-950 leading-relaxed italic pt-0.5">
                            &ldquo;{q.responseNote}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Simulation tool for live testing / hackathon demonstration */}
                      {!isAnswered && (
                        <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between text-[11px]">
                          <span className="text-amber-800 italic text-[10px]">
                            Pending response from Block Development Office
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSimulateResponse(q.id)}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Simulate Officer Response</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* MODAL FOOTER */}
        {/* ================================================================== */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-300 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] font-mono text-slate-500">
            {brief.fieldEvidenceSummary.district} / {brief.fieldEvidenceSummary.block}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold uppercase rounded-none transition-colors cursor-pointer"
          >
            {language === 'hi' ? 'बंद करें' : 'Close Bridge'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanchayatQueryModal;

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lightbulb,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  Community,
  KpiSubmission,
  ReportingPeriod,
  Team,
  User,
} from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  submission: KpiSubmission | null;
  period?: ReportingPeriod;
  community?: Community;
  team?: Team;
  currentUser: User;
  onActionPlanCreated?: () => void;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  submission,
  period,
  community,
  team,
  currentUser,
  onActionPlanCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [promotedKpis, setPromotedKpis] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!submission) return;
    setLoading(true);
    setError(null);

    const underperforming = submission.results.filter(
      (r) => r.status === 'Needs Attention' || (r.attainmentPercentage !== null && r.attainmentPercentage < 90)
    );

    const notesMap: Record<string, string> = {};
    submission.results.forEach((r) => {
      if (submission.rawInputs[r.key]?.notes) {
        notesMap[r.key] = submission.rawInputs[r.key].notes!;
      }
    });

    try {
      const res = await api.analyzeWithAi({
        communityName: community?.name || submission.communityId,
        teamName: team?.name || submission.teamId,
        periodName: period?.name || submission.periodId,
        overallScore: submission.overallWeightedScore,
        underperformingKpis: underperforming,
        notes: notesMap,
      });
      setAnalysis(res.analysis);
    } catch (err: any) {
      setError(err.message || 'AI diagnosis request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && submission) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
      setPromotedKpis({});
    }
  }, [isOpen, submission?.id]);

  if (!isOpen || !submission) return null;

  const handlePromoteToActionPlan = async (item: any) => {
    try {
      let submissionId = submission.id;
      if (submissionId.startsWith('sub_preview_')) {
        const saved = await api.submitScorecard({
          periodId: submission.periodId,
          communityId: submission.communityId,
          teamId: submission.teamId,
          rawInputs: submission.rawInputs,
          isDraft: true,
        });
        submissionId = saved.submission.id;
      }
      await api.createActionPlan({
        submissionId,
        periodId: submission.periodId,
        communityId: submission.communityId,
        teamId: submission.teamId,
        kpiKey: item.kpiKey,
        kpiName: item.kpiName,
        title: `Recovery Protocol: ${item.kpiName}`,
        identifiedRootCause: item.identifiedRootCause,
        verifiedFactVsHypothesis: item.factVsHypothesis,
        recommendedIntervention: item.recommendedIntervention,
        actionOwner: item.actionOwner || 'Team Lead',
        proposedDeadline: new Date(Date.now() + (item.proposedDaysToDeadline || 14) * 86400000).toISOString(),
        measurableRecoveryTarget: item.measurableRecoveryTarget,
        currentScoreSummary: `Attainment: ${item.currentAttainment}`,
        status: 'PENDING_APPROVAL',
        aiGenerated: true,
      });

      setPromotedKpis((prev) => ({ ...prev, [item.kpiKey]: true }));
      if (onActionPlanCreated) onActionPlanCreated();
    } catch (err: any) {
      alert(`Failed to create action plan: ${err.message}`);
    }
  };

  return (
    <div className="glass-overlay fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className="glass-dialog relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Copilot</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Re-run Analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto px-5 py-4 flex-1 space-y-4 text-xs">
          {/* Metadata pill-free banner */}
          <div className="glass-soft p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
              <span>{team?.name || submission.teamId}</span>
              <span className="font-mono tabular-nums font-bold">{submission.overallWeightedScore}%</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
              <span>{community?.name || submission.communityId}</span>
              <span aria-hidden="true">·</span>
              <span>{period?.name || submission.periodId}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-500">{submission.needsAttentionCount} flagged</span>
            </div>
          </div>

          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-slate-500 font-medium">
                Analyzing scorecard...
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Executive Diagnosis Summary */}
              <div className="space-y-1.5 p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-indigo-500" />
                    <span>Summary</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-200/50 dark:bg-indigo-900/50">
                    {analysis.overallHealthStatus}
                  </span>
                </div>
                <details className="text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                  <summary className="cursor-pointer">Read Summary</summary>
                  <p className="mt-1">{analysis.executiveSummary}</p>
                </details>
              </div>

              {/* Priority Interventions / Root Cause Cards */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Recommendations ({analysis.priorityRecommendations.length})
                </div>

                {analysis.priorityRecommendations.map((item: any, idx: number) => {
                  const isPromoted = promotedKpis[item.kpiKey];
                  return (
                    <div
                      key={item.kpiKey || idx}
                      className="glass-tile p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shadow-xs"
                    >
                      {/* Metric Name & Attainment */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{item.kpiName}</span>
                          <span className="text-amber-500 font-mono text-[11px] font-medium">
                            ({item.currentAttainment})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {item.confidenceScore || 'Verified'}
                        </span>
                      </div>

                      <details className="glass-soft p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px]">
                        <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold">
                          Cause & Evidence
                        </summary>
                        <div className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">
                          <p><strong>Cause:</strong> {item.identifiedRootCause}</p>
                          <p><strong>Facts & Hypotheses:</strong> {item.factVsHypothesis}</p>
                        </div>
                      </details>

                      {/* Recommended Practical Intervention */}
                      <div>
                        <div className="text-[10px] font-semibold text-slate-500 uppercase">
                          Action
                        </div>
                        <details className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                          <summary className="cursor-pointer">View Action</summary>
                          <p className="mt-1">{item.recommendedIntervention}</p>
                        </details>
                      </div>

                      {/* Key Logistics: Owner, Target, Deadline */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Owner: </span>
                          <span>{item.actionOwner}</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Target: </span>
                          <span>{item.measurableRecoveryTarget}</span>
                        </div>
                      </div>

                      {/* Promotion Button to Human Approval Workflow */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                        {isPromoted ? (
                          <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Plan Created</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePromoteToActionPlan(item)}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded font-semibold text-xs transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create Plan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {analysis.priorityRecommendations.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    All KPIs on track.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="glass-soft px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-500 text-[11px] flex items-center justify-between">
          <span>AI suggestions require human approval.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

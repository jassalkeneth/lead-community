import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Save,
  Send,
  X,
} from 'lucide-react';
import {
  Community,
  KpiSubmission,
  RawKpiInput,
  ReportingPeriod,
  Team,
  User,
} from '../../types/index.ts';
import {
  calculateScorecard,
  SYSTEM_KPI_DEFINITIONS,
  validateKpiInput,
} from '../../scoring/scoringEngine.ts';
import { api } from '../../lib/api.ts';

interface ScorecardSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: ReportingPeriod[];
  communities: Community[];
  teams: Team[];
  currentUser: User;
  existingSubmission?: KpiSubmission | null;
  onSuccess: (sub: KpiSubmission) => void;
}

export const ScorecardSubmissionModal: React.FC<ScorecardSubmissionModalProps> = ({
  isOpen,
  onClose,
  periods,
  communities,
  teams,
  currentUser,
  existingSubmission,
  onSuccess,
}) => {
  const [periodId, setPeriodId] = useState(
    existingSubmission?.periodId || periods.find((p) => p.isCurrent)?.id || periods[0]?.id || ''
  );
  const [communityId, setCommunityId] = useState(
    existingSubmission?.communityId || currentUser.assignedCommunityId || communities[0]?.id || ''
  );
  const [teamId, setTeamId] = useState(
    existingSubmission?.teamId || currentUser.assignedTeamId || teams[0]?.id || ''
  );

  const [rawInputs, setRawInputs] = useState<Record<string, RawKpiInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync inputs if editing an existing submission
  useEffect(() => {
    if (existingSubmission) {
      setPeriodId(existingSubmission.periodId);
      setCommunityId(existingSubmission.communityId);
      setTeamId(existingSubmission.teamId);
      setRawInputs(existingSubmission.rawInputs || {});
    } else {
      // Default initial state
      setRawInputs({
        onboarding_speed: { numerator: undefined, denominator: undefined, notes: '' },
        onboarding_completeness: { numerator: undefined, denominator: undefined, notes: '' },
        community_engagement: { numerator: undefined, denominator: undefined, notes: '' },
        events_held: { count: undefined, notes: '' },
        event_attendance: { numerator: undefined, denominator: undefined, notes: '' },
        testimonials_collected: { count: undefined, notes: '' },
        referral_enrollments: { count: undefined, notes: '' },
        moderation_response: { numerator: undefined, denominator: undefined, notes: '' },
        team_kpi_attainment: { binaryValue: true, notes: '' },
        monthly_report_on_time: { binaryValue: true, notes: '' },
      });
    }
  }, [existingSubmission, isOpen]);

  // Adjust team if community changes
  useEffect(() => {
    const validTeams = teams.filter((t) => t.communityId === communityId);
    if (validTeams.length > 0 && !validTeams.some((t) => t.id === teamId)) {
      setTeamId(validTeams[0].id);
    }
  }, [communityId, teams, teamId]);

  if (!isOpen) return null;

  // Real-time calculation using pure engine
  const calculation = calculateScorecard(rawInputs, SYSTEM_KPI_DEFINITIONS);

  const handleRatioChange = (kpiKey: string, field: 'numerator' | 'denominator', val: string) => {
    const parsed = val === '' ? undefined : Number(val);
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        [field]: parsed,
      },
    }));
  };

  const handleCountChange = (kpiKey: string, val: string) => {
    const parsed = val === '' ? undefined : Number(val);
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        count: parsed,
      },
    }));
  };

  const handleBinaryChange = (kpiKey: string, val: boolean) => {
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        binaryValue: val,
      },
    }));
  };

  const handleNotesChange = (kpiKey: string, notes: string) => {
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        notes,
      },
    }));
  };

  const handleSubmit = async (isDraft: boolean) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.submitScorecard({
        id: existingSubmission?.id,
        periodId,
        communityId,
        teamId,
        rawInputs,
        isDraft,
      });
      onSuccess(res.submission);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="glass-dialog relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>
                {existingSubmission ? 'Edit Scorecard' : 'New Scorecard'}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Calculation Banner */}
        <div className="glass-soft px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">
                {calculation.isProvisional ? 'Provisional Score' : 'Weighted Score'}
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {calculation.isProvisional ? `${calculation.provisionalScore}%` : `${calculation.overallWeightedScore}%`}
              </div>
            </div>
            <div className="h-7 w-[1px] bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{calculation.onTrackCount} On Track</span>
              </div>
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{calculation.needsAttentionCount} Needs Attention</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{calculation.pendingCount} Pending</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Valid Weight: <span className="font-mono font-semibold">{calculation.totalValidWeights}%</span>
          </div>
        </div>

        {/* Body Form */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Context Selectors */}
          <div className="glass-soft grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
                Period
              </label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
                Community
              </label>
              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
              >
                {teams
                  .filter((t) => t.communityId === communityId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 10 KPI Input Rows */}
          <div className="space-y-3">
            {SYSTEM_KPI_DEFINITIONS.map((def, index) => {
              const res = calculation.results.find((r) => r.key === def.key);
              const input = rawInputs[def.key] || {};
              const err = validateKpiInput(def, input);

              return (
                <div
                  key={def.key}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 font-semibold">
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {def.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Weight: {def.weight}% · Target: {def.target}
                          {def.unit}
                        </span>
                      </div>
                      <details className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <summary className="cursor-pointer">About this KPI</summary>
                        <p className="mt-1">{def.description}</p>
                      </details>
                    </div>

                    {/* Calculated Outcome Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[11px] font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {res?.achievedValue !== null ? `${res?.achievedValue}${def.unit}` : 'Pending'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {res?.attainmentPercentage !== null ? `${res?.attainmentPercentage}% attainment` : 'Pending'}
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          res?.status === 'On Track'
                            ? 'text-emerald-600 bg-emerald-500/10'
                            : res?.status === 'Needs Attention'
                            ? 'text-amber-600 bg-amber-500/10'
                            : 'text-slate-400 bg-slate-500/10'
                        }`}
                      >
                        {res?.status}
                      </span>
                    </div>
                  </div>

                  {/* Input Fields depending on KPI Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    {def.type === 'ratio' && (
                      <>
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            {def.numeratorLabel || 'Numerator'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 95"
                            value={input.numerator != null ? input.numerator : ''}
                            onChange={(e) => handleRatioChange(def.key, 'numerator', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            {def.denominatorLabel || 'Total Denominator'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 100"
                            value={input.denominator != null ? input.denominator : ''}
                            onChange={(e) => handleRatioChange(def.key, 'denominator', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </>
                    )}

                    {def.type === 'count' && (
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          {def.countLabel || 'Count'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 2"
                          value={input.count != null ? input.count : ''}
                          onChange={(e) => handleCountChange(def.key, e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}

                    {def.type === 'binary' && (
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Target Met?</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBinaryChange(def.key, true)}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                              input.binaryValue === true
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Yes (100%)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBinaryChange(def.key, false)}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                              input.binaryValue === false
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            No (0%)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Operational Evidence Notes */}
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Notes / Evidence
                      </label>
                      <input
                        type="text"
                        placeholder="Add evidence..."
                        value={input.notes || ''}
                        onChange={(e) => handleNotesChange(def.key, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {err && <div className="text-[11px] text-red-500 font-medium mt-1">{err}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="glass-soft px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900">
          <div className="text-xs text-slate-500">
            {calculation.isProvisional ? (
              <span className="text-amber-500 font-medium flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Incomplete: provisional score</span>
              </span>
            ) : (
              <span className="text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>10/10 KPIs complete</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  Save,
  Send,
  Sparkles,
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
} from '../../scoring/scoringEngine.ts';
import { api } from '../../lib/api.ts';

interface MinimalistScorecardViewProps {
  currentUser: User;
  periods: ReportingPeriod[];
  communities: Community[];
  teams: Team[];
  selectedPeriodId: string;
  selectedCommunityId: string;
  selectedTeamId: string;
  onPeriodChange: (id: string) => void;
  onCommunityChange: (id: string) => void;
  onTeamChange: (id: string) => void;
  activeSubmission: KpiSubmission | null;
  onSubmissionSaved: (sub: KpiSubmission) => void;
  onOpenPrintReport: (sub: KpiSubmission) => void;
  onOpenAiCopilot: (sub: KpiSubmission) => void;
}

export const MinimalistScorecardView: React.FC<MinimalistScorecardViewProps> = ({
  currentUser,
  periods,
  communities,
  teams,
  selectedPeriodId,
  selectedCommunityId,
  selectedTeamId,
  onPeriodChange,
  onCommunityChange,
  onTeamChange,
  activeSubmission,
  onSubmissionSaved,
  onOpenPrintReport,
  onOpenAiCopilot,
}) => {
  // Local raw input state
  const [rawInputs, setRawInputs] = useState<Record<string, RawKpiInput>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initialize or sync with active submission
  useEffect(() => {
    if (activeSubmission && activeSubmission.rawInputs) {
      setRawInputs(activeSubmission.rawInputs);
    } else {
      setRawInputs({});
    }
  }, [activeSubmission?.id, selectedPeriodId, selectedTeamId]);

  // Real-time calculation using pure engine
  const calculation = calculateScorecard(rawInputs, SYSTEM_KPI_DEFINITIONS);

  const handleRatioNumeratorChange = (kpiKey: string, val: string) => {
    const num = val === '' ? undefined : Number(val);
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        numerator: num,
      },
    }));
  };

  const handleRatioDenominatorChange = (kpiKey: string, val: string) => {
    const den = val === '' ? undefined : Number(val);
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        denominator: den,
      },
    }));
  };

  const handleCountChange = (kpiKey: string, val: string) => {
    const countVal = val === '' ? undefined : Number(val);
    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        count: countVal,
      },
    }));
  };

  const handleBinarySelect = (kpiKey: string, val: string) => {
    let boolVal: boolean | undefined = undefined;
    if (val === 'Yes') boolVal = true;
    else if (val === 'No') boolVal = false;

    setRawInputs((prev) => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        binaryValue: boolVal,
      },
    }));
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all input values on this scorecard?')) {
      setRawInputs({});
    }
  };

  const handleSave = async (isDraft = false) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.submitScorecard({
        id: activeSubmission?.id,
        periodId: selectedPeriodId,
        communityId: selectedCommunityId,
        teamId: selectedTeamId,
        rawInputs,
        isDraft,
      });
      onSubmissionSaved(res.submission);
      setSaveMessage(isDraft ? 'Draft saved' : 'Submitted');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Group definitions by category
  const categories: string[] = [
    'STUDENT ONBOARDING',
    'ENGAGEMENT & EVENTS',
    'GROWTH & REFERRALS',
    'TEAM LEADERSHIP',
    'ADMIN',
  ];

  const currentCommunity = communities.find((c) => c.id === selectedCommunityId) || communities[0];
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  // Temporary mock submission object for print/AI if not yet persisted
  const previewSubmission: KpiSubmission = activeSubmission || {
    id: `sub_preview_${Date.now()}`,
    periodId: selectedPeriodId,
    communityId: selectedCommunityId,
    teamId: selectedTeamId,
    submittedById: currentUser.id,
    submittedByName: currentUser.name,
    submittedByRole: currentUser.role,
    status: 'DRAFT',
    rawInputs,
    results: calculation.results,
    overallWeightedScore: calculation.overallWeightedScore,
    provisionalScore: calculation.provisionalScore,
    isProvisional: calculation.isProvisional,
    validWeightsTotal: calculation.totalValidWeights,
    onTrackCount: calculation.onTrackCount,
    needsAttentionCount: calculation.needsAttentionCount,
    pendingCount: calculation.pendingCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scorecard
          </h1>
        </div>

        {/* Action Buttons matching Screenshot 1 */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenPrintReport(previewSubmission)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={handleClearData}
            className="border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Clear
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 3 Top Stat Cards matching Screenshot 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: OVERALL WEIGHTED SCORE */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              WEIGHTED SCORE
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {calculation.isProvisional && calculation.pendingCount > 0
                  ? calculation.provisionalScore.toFixed(1)
                  : calculation.overallWeightedScore.toFixed(1)}
              </span>
              <span className="text-xl font-medium text-slate-400 dark:text-slate-500">%</span>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 dark:bg-slate-100 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    calculation.isProvisional && calculation.pendingCount > 0
                      ? calculation.provisionalScore
                      : calculation.overallWeightedScore
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: KPIS ON TRACK */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              ON TRACK
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {calculation.onTrackCount}
              </span>
              <span className="text-2xl font-medium text-slate-400 dark:text-slate-500">/ 10</span>
            </div>
          </div>
        </div>

        {/* Card 3: NEEDS ATTENTION */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              NEEDS ATTENTION
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                {calculation.needsAttentionCount}
              </span>
              <span className="text-2xl font-medium text-slate-400 dark:text-slate-500">KPIs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scorecard Table matching Screenshots 2, 3, 4, 5, 6, 7 */}
      <div className="glass-panel bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 min-w-[240px]">KPI</th>
                <th className="py-4 px-6 text-center w-24">WEIGHT</th>
                <th className="py-4 px-6 text-center min-w-[150px]">TARGET</th>
                <th className="py-4 px-6 text-center min-w-[220px]">INPUT</th>
                <th className="py-4 px-6 text-center w-24">RESULT</th>
                <th className="py-4 px-6 text-center w-32">STATUS</th>
              </tr>
            </thead>

            {/* Table Body organized by category groups */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {categories.map((category) => {
                const kpisInCategory = SYSTEM_KPI_DEFINITIONS.filter(
                  (def) => def.category === category
                );

                return (
                  <React.Fragment key={category}>
                    {/* Category Title Header Row in Blue uppercase */}
                    <tr className="glass-soft bg-slate-50/60 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
                      <td
                        colSpan={6}
                        className="py-3 px-6 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider"
                      >
                        {category}
                      </td>
                    </tr>

                    {/* KPI Rows */}
                    {kpisInCategory.map((def) => {
                      const res = calculation.results.find((r) => r.key === def.key);
                      const input = rawInputs[def.key] || {};
                      const isPending = res?.status === 'Pending';
                      const isOnTrack = res?.status === 'On Track';
                      const isNeedsAttention = res?.status === 'Needs Attention';

                      return (
                        <tr
                          key={def.key}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* 1. Category & KPI */}
                          <td className="py-4 px-6 font-medium text-slate-900 dark:text-slate-100">
                            {def.name}
                          </td>

                          {/* 2. Weight */}
                          <td className="py-4 px-6 text-center font-medium text-slate-600 dark:text-slate-300">
                            {def.weight}%
                          </td>

                          {/* 3. Target */}
                          <td className="py-4 px-6 text-center text-slate-500 dark:text-slate-400">
                            {def.description}
                          </td>

                          {/* 4. Input Data */}
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              {def.type === 'ratio' && (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Achieved"
                                    value={input.numerator != null ? input.numerator : ''}
                                    onChange={(e) =>
                                      handleRatioNumeratorChange(def.key, e.target.value)
                                    }
                                    className="w-24 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-slate-400 font-medium">/</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Total"
                                    value={input.denominator != null ? input.denominator : ''}
                                    onChange={(e) =>
                                      handleRatioDenominatorChange(def.key, e.target.value)
                                    }
                                    className="w-24 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </>
                              )}

                              {def.type === 'count' && (
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Total Count"
                                  value={input.count != null ? input.count : ''}
                                  onChange={(e) => handleCountChange(def.key, e.target.value)}
                                  className="w-32 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}

                              {def.type === 'binary' && (
                                <select
                                  value={
                                    input.binaryValue === true
                                      ? 'Yes'
                                      : input.binaryValue === false
                                      ? 'No'
                                      : 'Select...'
                                  }
                                  onChange={(e) => handleBinarySelect(def.key, e.target.value)}
                                  className="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="Select...">Select...</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              )}
                            </div>
                          </td>

                          {/* 5. Result */}
                          <td className="py-4 px-6 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                            {res?.achievedValue != null
                              ? def.type === 'binary'
                                ? input.binaryValue
                                  ? 'Yes'
                                  : 'No'
                                : `${res.achievedValue}${def.type === 'ratio' ? '%' : ''}`
                              : '-'}
                          </td>

                          {/* 6. Status Badge */}
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-block font-semibold px-3 py-1 rounded-full text-xs transition-colors ${
                                isOnTrack
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : isNeedsAttention
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {res?.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating AI Copilot Star Button matching Screenshot center button */}
      <button
        onClick={() => onOpenAiCopilot(previewSubmission)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-13 h-13 rounded-full bg-black shadow-xl hover:scale-108 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-slate-800 hover:border-slate-700"
        title="Open AI Performance Copilot"
      >
        {/* Colorful 4-pointed AI sparkle star gradient */}
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="aiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="35%" stopColor="#ec4899" />
              <stop offset="70%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <path
            d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
            fill="url(#aiSparkleGrad)"
          />
        </svg>
      </button>
    </div>
  );
};

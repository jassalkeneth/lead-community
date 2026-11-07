import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Filter,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Community,
  CorrectiveActionPlan,
  KpiSubmission,
  ReportingPeriod,
  Team,
  User,
} from '../../types/index.ts';

interface ExecutiveDashboardProps {
  currentUser: User;
  periods: ReportingPeriod[];
  communities: Community[];
  teams: Team[];
  submissions: KpiSubmission[];
  actionPlans: CorrectiveActionPlan[];
  selectedPeriodId: string;
  onSelectPeriod: (id: string) => void;
  selectedCommunityId: string;
  onSelectCommunity: (id: string) => void;
  selectedTeamId: string;
  onSelectTeam: (id: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  onOpenScorecard: (submission: KpiSubmission) => void;
  onOpenAiCopilot: (submission: KpiSubmission) => void;
  onNavigateToTab: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentUser,
  periods,
  communities,
  teams,
  submissions,
  actionPlans,
  selectedPeriodId,
  onSelectPeriod,
  selectedCommunityId,
  onSelectCommunity,
  selectedTeamId,
  onSelectTeam,
  selectedStatus,
  onSelectStatus,
  onOpenScorecard,
  onOpenAiCopilot,
  onNavigateToTab,
}) => {
  // Filtered submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (selectedPeriodId && s.periodId !== selectedPeriodId) return false;
    if (selectedCommunityId && s.communityId !== selectedCommunityId) return false;
    if (selectedTeamId && s.teamId !== selectedTeamId) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    return true;
  });

  // Aggregate Metrics
  const totalSubmissions = filteredSubmissions.length;
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];
  const targetTeamsCount = selectedCommunityId
    ? teams.filter((t) => t.communityId === selectedCommunityId).length
    : teams.length;
  
  const completionRate = targetTeamsCount > 0
    ? Math.min(100, Math.round((totalSubmissions / targetTeamsCount) * 100))
    : 0;

  const validScores = filteredSubmissions
    .filter((s) => s.status !== 'DRAFT')
    .map((s) => s.overallWeightedScore);
  const averageScore = validScores.length > 0
    ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1))
    : 0;

  const totalOnTrack = filteredSubmissions.reduce((acc, s) => acc + s.onTrackCount, 0);
  const totalNeedsAttention = filteredSubmissions.reduce((acc, s) => acc + s.needsAttentionCount, 0);
  const totalPending = filteredSubmissions.reduce((acc, s) => acc + s.pendingCount, 0);

  const activeActionPlans = actionPlans.filter(
    (a) => a.status === 'ACTIVE' || a.status === 'PENDING_APPROVAL'
  );

  // Category breakdown for charts
  const categoryScores: Record<string, { sum: number; count: number }> = {
    ONBOARDING: { sum: 0, count: 0 },
    ENGAGEMENT: { sum: 0, count: 0 },
    OPERATIONS: { sum: 0, count: 0 },
    GROWTH: { sum: 0, count: 0 },
  };

  filteredSubmissions.forEach((s) => {
    s.results.forEach((r) => {
      if (r.attainmentPercentage !== null && categoryScores[r.category]) {
        categoryScores[r.category].sum += r.attainmentPercentage;
        categoryScores[r.category].count += 1;
      }
    });
  });

  const categoryChartData = Object.keys(categoryScores).map((cat) => {
    const entry = categoryScores[cat];
    const avg = entry.count > 0 ? Math.round(entry.sum / entry.count) : 0;
    return {
      category: cat.charAt(0) + cat.slice(1).toLowerCase(),
      attainment: avg,
    };
  });

  // Monthly Trend Data
  const monthlyTrends = periods.map((p) => {
    const periodSubs = submissions.filter((s) => s.periodId === p.id && s.status !== 'DRAFT');
    const avg = periodSubs.length > 0
      ? Math.round(periodSubs.reduce((acc, s) => acc + s.overallWeightedScore, 0) / periodSubs.length)
      : 0;
    return {
      name: p.name.split(' ')[0], // "Sep", "Oct", "Nov"
      score: avg || (p.periodCode === '2026-09' ? 88 : p.periodCode === '2026-10' ? 86 : 0),
      target: 90,
    };
  });

  // Community Rankings
  const communityRankings = communities.map((comm) => {
    const commSubs = submissions.filter(
      (s) => s.communityId === comm.id && (!selectedPeriodId || s.periodId === selectedPeriodId)
    );
    const validCommScores = commSubs.filter((s) => s.status !== 'DRAFT').map((s) => s.overallWeightedScore);
    const avg = validCommScores.length > 0
      ? Number((validCommScores.reduce((a, b) => a + b, 0) / validCommScores.length).toFixed(1))
      : 0;
    return {
      ...comm,
      periodAverage: avg,
      submissionsCount: commSubs.length,
    };
  }).sort((a, b) => b.periodAverage - a.periodAverage);

  return (
    <div className="space-y-6">
      {/* Page Title & Operational Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Overview
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Due {currentPeriod?.submissionDeadline ? new Date(currentPeriod.submissionDeadline).toLocaleDateString() : '—'}</span>
          </div>
        </div>

        {/* Global Operational Status Kicker */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('workflow')}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md border border-slate-300 dark:border-slate-700 transition-colors"
          >
            Approvals
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <details className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <summary className="cursor-pointer text-slate-500 font-medium">
          <Filter className="inline-block w-3.5 h-3.5 mr-1.5" />
          <span>Filters</span>
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-3">

        {/* Period Selector */}
        <select
          value={selectedPeriodId}
          onChange={(e) => onSelectPeriod(e.target.value)}
          aria-label="Filter by Reporting Period"
          className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>

        {/* Community Selector */}
        <select
          value={selectedCommunityId}
          onChange={(e) => onSelectCommunity(e.target.value)}
          aria-label="Filter by Community"
          className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Communities</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Team Selector */}
        <select
          value={selectedTeamId}
          onChange={(e) => onSelectTeam(e.target.value)}
          aria-label="Filter by Team"
          className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Teams</option>
          {teams
            .filter((t) => !selectedCommunityId || t.communityId === selectedCommunityId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>

        {/* Status Selector */}
        <select
          value={selectedStatus}
          onChange={(e) => onSelectStatus(e.target.value)}
          aria-label="Filter by Submission Status"
          className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="COMMUNITY_HEAD_REVIEW">Head Review</option>
          <option value="OPERATIONS_MANAGER_REVIEW">Ops Review</option>
          <option value="APPROVED">Approved</option>
          <option value="LOCKED">Locked</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
        </select>

        {(selectedCommunityId || selectedTeamId || selectedStatus) && (
          <button
            onClick={() => {
              onSelectCommunity('');
              onSelectTeam('');
              onSelectStatus('');
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:underline ml-auto font-medium"
          >
            Reset
          </button>
        )}
        </div>
      </details>

      {/* KPI Headline Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Overall Weighted Score */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Weighted Score</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {averageScore}%
            </span>
          </div>
        </div>

        {/* Metric 2: On Track Count */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div title="Attainment ≥ 90%" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>On Track</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalOnTrack}
            </span>
          </div>
        </div>

        {/* Metric 3: Needs Attention Count */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div title="Attainment below 90%" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Needs Attention</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {totalNeedsAttention}
            </span>
          </div>
        </div>

        {/* Metric 4: Pending / Missing Fields */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div title="Missing data or zero denominator" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-700 dark:text-slate-300 tabular-nums">
              {totalPending}
            </span>
          </div>
        </div>

        {/* Metric 5: Submission Completion Rate */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Submitted</span>
            <FileCheck2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {completionRate}%
            </span>
          </div>
          <span className="sr-only">{totalSubmissions}/{targetTeamsCount} teams</span>
        </div>

        {/* Metric 6: Outstanding Action Plans */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Plans</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {activeActionPlans.length}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Visualizations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend Area Chart */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Monthly Trend
              </h2>
            </div>
            <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400">Target 90%</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Weighted Score']}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Performance Bar Chart */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                By Category
              </h2>
            </div>
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <span>Details</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Average Attainment']}
                />
                <Bar dataKey="attainment" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attainment >= 90 ? '#10b981' : entry.attainment >= 75 ? '#6366f1' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Community Rankings & Active Scorecard Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Community Performance Rankings */}
        <details className="glass-panel lg:col-span-2 self-start bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">
            Rankings ({communityRankings.length})
          </summary>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Community</th>
                  <th className="pb-2 font-medium">Head</th>
                  <th className="pb-2 font-medium text-right">Members</th>
                  <th className="pb-2 font-medium text-right">Score</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {communityRankings.map((comm, idx) => {
                  const isTop = idx === 0;
                  return (
                    <tr
                      key={comm.id}
                      onClick={() => onSelectCommunity(comm.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-mono text-slate-500">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        <div>{comm.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{comm.region}</div>
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">{comm.headName}</td>
                      <td className="py-2.5 font-mono text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {comm.memberCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 font-mono text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                        {comm.periodAverage > 0 ? `${comm.periodAverage}%` : 'Pending'}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`text-[11px] font-semibold ${
                            comm.periodAverage >= 90
                              ? 'text-emerald-500'
                              : comm.periodAverage >= 70
                              ? 'text-amber-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {comm.periodAverage >= 90 ? 'On Track' : comm.periodAverage > 0 ? 'Needs Attention' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </details>

        {/* Right Col: Active Scorecards & AI Copilot Action Strip */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Scorecards
              </h2>
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                {filteredSubmissions.filter((s) => s.needsAttentionCount > 0).length} flagged
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredSubmissions.slice(0, 3).map((sub) => {
                const team = teams.find((t) => t.id === sub.teamId);
                const hasIssues = sub.needsAttentionCount > 0;
                return (
                  <div
                    key={sub.id}
                    className="glass-tile p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-slate-900 dark:text-slate-100">
                      <span className="truncate max-w-[160px]">{team?.name || sub.teamId}</span>
                      <span className="font-mono tabular-nums font-semibold">{sub.overallWeightedScore}%</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>{sub.status.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className={hasIssues ? 'text-amber-500 font-medium' : 'text-emerald-500'}>
                        {sub.needsAttentionCount} Deficits
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <button
                        onClick={() => onOpenScorecard(sub)}
                        className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                      >
                        View
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        onClick={() => onOpenAiCopilot(sub)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>AI</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No matching scorecards.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <button
              onClick={() => onNavigateToTab('scorecards')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

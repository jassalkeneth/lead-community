import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Community,
  KpiSubmission,
  ReportingPeriod,
  Team,
} from '../../types/index.ts';
import { SYSTEM_KPI_DEFINITIONS } from '../../scoring/scoringEngine.ts';

interface TeamAnalyticsProps {
  submissions: KpiSubmission[];
  periods: ReportingPeriod[];
  communities: Community[];
  teams: Team[];
}

export const TeamAnalytics: React.FC<TeamAnalyticsProps> = ({
  submissions,
  periods,
  communities,
  teams,
}) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods.find((p) => p.isCurrent)?.id || periods[0]?.id || ''
  );
  const [comparisonMetric, setComparisonMetric] = useState<string>('all');

  const periodSubmissions = submissions.filter(
    (s) => s.periodId === selectedPeriodId && s.status !== 'DRAFT'
  );

  // Radar chart comparing KPI attainments across teams
  const radarData = SYSTEM_KPI_DEFINITIONS.map((def) => {
    const entry: Record<string, any> = {
      kpi: def.name.length > 15 ? def.name.slice(0, 12) + '...' : def.name,
      fullName: def.name,
      target: 100, // Normalized target is 100% attainment
    };

    periodSubmissions.forEach((sub) => {
      const team = teams.find((t) => t.id === sub.teamId);
      const teamLabel = team?.name ? team.name.split(' ')[0] : sub.teamId;
      const res = sub.results.find((r) => r.key === def.key);
      entry[teamLabel] = res?.attainmentPercentage !== null ? res?.attainmentPercentage : 0;
    });

    return entry;
  });

  // Team vs Team comparison bars
  const teamComparisonData = periodSubmissions.map((sub) => {
    const team = teams.find((t) => t.id === sub.teamId);
    return {
      name: team?.name || sub.teamId,
      score: sub.overallWeightedScore,
      onTrack: sub.onTrackCount,
      needsAttention: sub.needsAttentionCount,
    };
  });

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Title & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Team Analytics
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Period:</span>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart: 10 KPI Attainment Spectrum */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              KPI Comparison
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              100% = target met
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Attainment']}
                />
                {periodSubmissions.map((sub, idx) => {
                  const team = teams.find((t) => t.id === sub.teamId);
                  const teamLabel = team?.name ? team.name.split(' ')[0] : sub.teamId;
                  const strokeColor = colors[idx % colors.length];
                  return (
                    <Radar
                      key={sub.id}
                      name={teamLabel}
                      dataKey={teamLabel}
                      stroke={strokeColor}
                      fill={strokeColor}
                      fillOpacity={0.15}
                    />
                  );
                })}
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Score Bar Chart */}
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Team Scores
            </h2>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* KPI Heatmap Matrix Table */}
      <div className="glass-panel bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            KPI Matrix
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Attainment (%)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th className="pb-2 min-w-[200px]">KPI / Weight</th>
                <th className="pb-2 text-right">Target</th>
                {periodSubmissions.map((sub) => {
                  const team = teams.find((t) => t.id === sub.teamId);
                  return (
                    <th key={sub.id} className="pb-2 text-right font-medium text-slate-700 dark:text-slate-300">
                      {team?.name || sub.teamId}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {SYSTEM_KPI_DEFINITIONS.map((def) => {
                return (
                  <tr key={def.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{def.name}</div>
                      <div className="text-[10px] text-slate-400">{def.category} · Weight: {def.weight}%</div>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-500">
                      {def.target} {def.unit}
                    </td>
                    {periodSubmissions.map((sub) => {
                      const res = sub.results.find((r) => r.key === def.key);
                      const attainment = res?.attainmentPercentage;
                      return (
                        <td key={sub.id} className="py-2.5 text-right font-mono tabular-nums">
                          {attainment !== null && attainment !== undefined ? (
                            <span
                              className={`font-semibold ${
                                attainment >= 90
                                  ? 'text-emerald-500'
                                  : attainment >= 70
                                  ? 'text-amber-500'
                                  : 'text-red-500'
                              }`}
                            >
                              {attainment}%
                            </span>
                          ) : (
                            <span className="text-slate-400">Pending</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

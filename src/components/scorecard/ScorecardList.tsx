import React from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Plus,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  Community,
  KpiSubmission,
  ReportingPeriod,
  Team,
  User,
} from '../../types/index.ts';

interface ScorecardListProps {
  submissions: KpiSubmission[];
  periods: ReportingPeriod[];
  communities: Community[];
  teams: Team[];
  currentUser: User;
  onOpenSubmissionModal: (sub?: KpiSubmission) => void;
  onOpenScorecardDetail: (sub: KpiSubmission) => void;
  onOpenAiCopilot: (sub: KpiSubmission) => void;
  onOpenPrintReport: (sub: KpiSubmission) => void;
}

export const ScorecardList: React.FC<ScorecardListProps> = ({
  submissions,
  periods,
  communities,
  teams,
  currentUser,
  onOpenSubmissionModal,
  onOpenScorecardDetail,
  onOpenAiCopilot,
  onOpenPrintReport,
}) => {
  const handleDownloadCsv = (subId: string) => {
    window.location.href = `/api/reports/submission/${subId}/csv`;
  };

  const handleDownloadSummaryCsv = () => {
    window.location.href = '/api/reports/summary/csv';
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scorecards
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{submissions.length} scorecards</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSummaryCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onOpenSubmissionModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Scorecard</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="glass-soft border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Community & Team</th>
                <th className="py-3 px-4">Submitter</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4 text-center">KPIs</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {submissions.map((sub) => {
                const comm = communities.find((c) => c.id === sub.communityId);
                const team = teams.find((t) => t.id === sub.teamId);
                const period = periods.find((p) => p.id === sub.periodId);
                const isLocked = sub.status === 'LOCKED';

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                      {period?.name || sub.periodId}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {team?.name || sub.teamId}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {comm?.name || sub.communityId}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>{sub.submittedByName}</div>
                      <div className="text-[10px] text-slate-400">{sub.submittedByRole.replace('_', ' ')}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {sub.isProvisional ? `${sub.provisionalScore}%*` : `${sub.overallWeightedScore}%`}
                      </div>
                      {sub.isProvisional && (
                        <div className="text-[10px] text-slate-400">Provisional</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2 font-mono text-[11px]">
                        <span className="text-emerald-500 font-semibold" title="On Track count">
                          {sub.onTrackCount}✓
                        </span>
                        <span className="text-amber-500 font-semibold" title="Needs Attention count">
                          {sub.needsAttentionCount}⚠
                        </span>
                        {sub.pendingCount > 0 && (
                          <span className="text-slate-400" title="Pending count">
                            {sub.pendingCount}…
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                        <span
                          className={`font-semibold text-[11px] ${
                            isLocked
                              ? 'text-slate-400'
                              : sub.status === 'APPROVED'
                              ? 'text-emerald-500'
                              : sub.status === 'CHANGES_REQUESTED'
                              ? 'text-red-500'
                              : 'text-indigo-400'
                          }`}
                        >
                          {sub.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenScorecardDetail(sub)}
                          className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onOpenAiCopilot(sub)}
                          className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded font-medium flex items-center gap-1"
                          title="AI Root Cause Analysis"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span className="hidden sm:inline">AI Copilot</span>
                        </button>
                        <button
                          onClick={() => handleDownloadCsv(sub.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Download CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {submissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No scorecards yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Community,
  KpiSubmission,
  ReportingPeriod,
  Team,
  User,
} from '../../types/index.ts';

interface ScorecardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: KpiSubmission | null;
  period?: ReportingPeriod;
  community?: Community;
  team?: Team;
  currentUser: User;
  onOpenAiCopilot: (sub: KpiSubmission) => void;
  onOpenPrintReport: (sub: KpiSubmission) => void;
  onWorkflowAction: (
    action: 'HEAD_APPROVE' | 'HEAD_REQUEST_CHANGES' | 'OPS_APPROVE' | 'OPS_REQUEST_CHANGES' | 'LOCK_SCORECARD',
    notes?: string
  ) => void;
}

export const ScorecardDetailModal: React.FC<ScorecardDetailModalProps> = ({
  isOpen,
  onClose,
  submission,
  period,
  community,
  team,
  currentUser,
  onOpenAiCopilot,
  onOpenPrintReport,
  onWorkflowAction,
}) => {
  if (!isOpen || !submission) return null;

  const isLocked = submission.status === 'LOCKED';
  const isApproved = submission.status === 'APPROVED';
  const isHeadReview = submission.status === 'COMMUNITY_HEAD_REVIEW';
  const isOpsReview = submission.status === 'OPERATIONS_MANAGER_REVIEW';

  const canHeadAct =
    (currentUser.role === 'COMMUNITY_HEAD' || currentUser.role === 'SUPER_ADMIN') && isHeadReview;
  const canOpsAct =
    (currentUser.role === 'OPERATIONS_MANAGER' || currentUser.role === 'SUPER_ADMIN') && isOpsReview;
  const canLock =
    (currentUser.role === 'OPERATIONS_MANAGER' || currentUser.role === 'SUPER_ADMIN') &&
    isApproved &&
    !isLocked;

  const handleDownloadCsv = () => {
    window.location.href = `/api/reports/submission/${submission.id}/csv`;
  };

  const handleDownloadJson = () => {
    window.location.href = `/api/reports/submission/${submission.id}/json`;
  };

  return (
    <div className="glass-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="glass-dialog relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {team?.name || submission.teamId}
              </h2>
              {isLocked && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>{community?.name || submission.communityId}</span>
              <span aria-hidden="true">·</span>
              <span>{period?.name || submission.periodId}</span>
              <span aria-hidden="true">·</span>
              <span>{submission.submittedByName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-indigo-500">{submission.status.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrintReport(submission)}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Printable Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadCsv}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Download CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadJson}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Download JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aggregate Headline */}
        <div className="glass-soft px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Weighted Score</div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {submission.overallWeightedScore}%
              </div>
            </div>
            <div className="h-8 w-[1px] bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submission.onTrackCount} On Track</span>
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{submission.needsAttentionCount} Needs Attention</span>
              </span>
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{submission.pendingCount} Pending</span>
              </span>
            </div>
          </div>

          {/* AI Copilot Quick Launch */}
          <button
            onClick={() => onOpenAiCopilot(submission)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>
        </div>

        {/* 10 Metrics Table */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th className="pb-2">KPI</th>
                <th className="pb-2 text-right">Weight</th>
                <th className="pb-2 text-right">Target</th>
                <th className="pb-2 text-right">Achieved</th>
                <th className="pb-2 text-right">Attainment</th>
                <th className="pb-2 text-right">Points</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {submission.results.map((res) => {
                const note = submission.rawInputs[res.key]?.notes;
                return (
                  <tr key={res.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{res.name}</div>
                      {note && (
                        <details className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <summary className="cursor-pointer">Notes</summary>
                          <p className="mt-1">{note}</p>
                        </details>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-500">{res.weight}%</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {res.target} {res.unit}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {res.achievedValue !== null ? `${res.achievedValue} ${res.unit}` : 'Pending'}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {res.attainmentPercentage !== null ? `${res.attainmentPercentage}%` : 'Pending'}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {res.weightedScore.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-[11px] font-semibold ${
                          res.status === 'On Track'
                            ? 'text-emerald-500'
                            : res.status === 'Needs Attention'
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Review Notes Strip */}
          {(submission.communityHeadNotes || submission.operationsNotes) && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              {submission.communityHeadNotes && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Community Head Feedback: </span>
                  <span className="text-slate-600 dark:text-slate-400">{submission.communityHeadNotes}</span>
                </div>
              )}
              {submission.operationsNotes && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Operations Feedback: </span>
                  <span className="text-slate-600 dark:text-slate-400">{submission.operationsNotes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workflow Approval / Rejection Action Footer */}
        <div className="glass-soft px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            {isLocked ? (
              <span>Locked on {new Date(submission.lockedAt || '').toLocaleDateString()}</span>
            ) : isApproved ? (
              <span>Approved</span>
            ) : isOpsReview ? (
              <span>Ops Review</span>
            ) : (
              <span>Head Review</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canHeadAct && (
              <>
                <button
                  onClick={() => onWorkflowAction('HEAD_REQUEST_CHANGES', 'Please revise flagged metrics.')}
                  className="px-3 py-1.5 rounded text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => onWorkflowAction('HEAD_APPROVE', 'Endorsed by Community Head.')}
                  className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-500 font-semibold"
                >
                  Endorse
                </button>
              </>
            )}

            {canOpsAct && (
              <>
                <button
                  onClick={() => onWorkflowAction('OPS_REQUEST_CHANGES', 'Changes requested by Operations.')}
                  className="px-3 py-1.5 rounded text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => onWorkflowAction('OPS_APPROVE', 'Verified and granted operational sign-off.')}
                  className="px-3 py-1.5 rounded text-white bg-emerald-600 hover:bg-emerald-500 font-semibold"
                >
                  Approve
                </button>
              </>
            )}

            {canLock && (
              <button
                onClick={() => onWorkflowAction('LOCK_SCORECARD', 'Permanently locked for archive.')}
                className="px-3 py-1.5 rounded text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

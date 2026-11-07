import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  Community,
  KpiSubmission,
  ReportingPeriod,
  Team,
  User,
} from '../../types/index.ts';

interface ApprovalQueueProps {
  submissions: KpiSubmission[];
  periods: ReportingPeriod[];
  communities: Community[];
  teams: Team[];
  currentUser: User;
  onOpenScorecard: (sub: KpiSubmission) => void;
  onOpenAiCopilot: (sub: KpiSubmission) => void;
  onWorkflowAction: (
    id: string,
    action: 'HEAD_APPROVE' | 'HEAD_REQUEST_CHANGES' | 'OPS_APPROVE' | 'OPS_REQUEST_CHANGES' | 'LOCK_SCORECARD',
    notes?: string
  ) => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  submissions,
  periods,
  communities,
  teams,
  currentUser,
  onOpenScorecard,
  onOpenAiCopilot,
  onWorkflowAction,
}) => {
  const [activeTab, setActiveTab] = useState<'PENDING_HEAD' | 'PENDING_OPS' | 'APPROVED_LOCKED'>('PENDING_HEAD');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [selectedSubForAction, setSelectedSubForAction] = useState<KpiSubmission | null>(null);
  const [pendingActionType, setPendingActionType] = useState<string>('');

  const headReviewSubmissions = submissions.filter((s) => s.status === 'COMMUNITY_HEAD_REVIEW');
  const opsReviewSubmissions = submissions.filter((s) => s.status === 'OPERATIONS_MANAGER_REVIEW');
  const finalizedSubmissions = submissions.filter((s) => s.status === 'APPROVED' || s.status === 'LOCKED');

  const getActiveList = () => {
    if (activeTab === 'PENDING_HEAD') return headReviewSubmissions;
    if (activeTab === 'PENDING_OPS') return opsReviewSubmissions;
    return finalizedSubmissions;
  };

  const handleOpenActionModal = (sub: KpiSubmission, action: string) => {
    setSelectedSubForAction(sub);
    setPendingActionType(action);
    setFeedbackNote('');
  };

  const handleConfirmAction = () => {
    if (!selectedSubForAction || !pendingActionType) return;
    onWorkflowAction(selectedSubForAction.id, pendingActionType as any, feedbackNote);
    setSelectedSubForAction(null);
    setPendingActionType('');
    setFeedbackNote('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Approvals
          </h1>
        </div>

        {/* Pipeline Stage Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('PENDING_HEAD')}
            className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'PENDING_HEAD'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Head Review</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              {headReviewSubmissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING_OPS')}
            className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'PENDING_OPS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Ops Review</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              {opsReviewSubmissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED_LOCKED')}
            className={`px-3 py-1 font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'APPROVED_LOCKED'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Finalized</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              {finalizedSubmissions.length}
            </span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {getActiveList().map((sub) => {
          const comm = communities.find((c) => c.id === sub.communityId);
          const team = teams.find((t) => t.id === sub.teamId);
          const period = periods.find((p) => p.id === sub.periodId);
          const isLocked = sub.status === 'LOCKED';

          return (
            <div
              key={sub.id}
              className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {team?.name || sub.teamId}
                  </span>
                  <span className="text-xs font-mono text-slate-400">({period?.name})</span>
                  {isLocked && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{comm?.name || sub.communityId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sub.submittedByName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-indigo-500">{sub.status.replace(/_/g, ' ')}</span>
                </div>

                {sub.communityHeadNotes && (
                  <details className="text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                    <summary className="cursor-pointer">Feedback</summary>
                    <p className="mt-1">{sub.communityHeadNotes}</p>
                  </details>
                )}
              </div>

              {/* Metrics & Action Buttons */}
              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                <div className="text-right">
                  <div className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
                    {sub.overallWeightedScore}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="text-emerald-500 font-medium">{sub.onTrackCount} On Track</span> ·{' '}
                    <span className="text-amber-500 font-medium">{sub.needsAttentionCount} Deficits</span>
                  </div>
                </div>

                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenScorecard(sub)}
                    className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md font-medium transition-colors"
                  >
                    View
                  </button>

                  <button
                    onClick={() => onOpenAiCopilot(sub)}
                    className="px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md font-medium transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Copilot</span>
                  </button>

                  {/* Stage 1 Actions */}
                  {activeTab === 'PENDING_HEAD' && (
                    <>
                      <button
                        onClick={() => handleOpenActionModal(sub, 'HEAD_REQUEST_CHANGES')}
                        className="px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(sub, 'HEAD_APPROVE')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors"
                      >
                        Endorse
                      </button>
                    </>
                  )}

                  {/* Stage 2 Actions */}
                  {activeTab === 'PENDING_OPS' && (
                    <>
                      <button
                        onClick={() => handleOpenActionModal(sub, 'OPS_REQUEST_CHANGES')}
                        className="px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(sub, 'OPS_APPROVE')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-colors"
                      >
                        Final Approve
                      </button>
                    </>
                  )}

                  {/* Lock Action */}
                  {activeTab === 'APPROVED_LOCKED' && !isLocked && (
                    <button
                      onClick={() => handleOpenActionModal(sub, 'LOCK_SCORECARD')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md shadow-xs transition-colors flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {getActiveList().length === 0 && (
          <div className="glass-panel py-12 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            No scorecards to review.
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      {selectedSubForAction && (
        <div className="glass-overlay fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-dialog w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Confirm: {pendingActionType.replace(/_/g, ' ')}
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                {selectedSubForAction.id} · Score: {selectedSubForAction.overallWeightedScore}%
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Review Notes
              </label>
              <textarea
                rows={3}
                placeholder="Feedback or reason..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSubForAction(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded shadow-xs"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

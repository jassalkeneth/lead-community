import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  Plus,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { CorrectiveActionPlan, User } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface ActionPlansManagerProps {
  actionPlans: CorrectiveActionPlan[];
  currentUser: User;
  onRefresh: () => void;
}

export const ActionPlansManager: React.FC<ActionPlansManagerProps> = ({
  actionPlans,
  currentUser,
  onRefresh,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPlanForUpdate, setSelectedPlanForUpdate] = useState<CorrectiveActionPlan | null>(null);
  const [progressInput, setProgressInput] = useState<number>(50);
  const [updateNote, setUpdateNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const filteredPlans = actionPlans.filter((p) => {
    if (selectedStatus === 'ALL') return true;
    return p.status === selectedStatus;
  });

  const handleApprovePlan = async (id: string) => {
    try {
      await api.approveActionPlan(id);
      onRefresh();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedPlanForUpdate) return;
    setIsUpdating(true);
    try {
      await api.updateActionPlan(selectedPlanForUpdate.id, {
        progressPercentage: progressInput,
        note: updateNote,
      });
      setSelectedPlanForUpdate(null);
      setUpdateNote('');
      onRefresh();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const canApprove =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'OPERATIONS_MANAGER' ||
    currentUser.role === 'COMMUNITY_HEAD';

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Action Plans
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{actionPlans.length} plans</span>
          </div>
        </div>

        {/* Filter Segment */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          {['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                selectedStatus === st
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlans.map((plan) => {
          const isPendingApproval = plan.status === 'PENDING_APPROVAL';
          const isActive = plan.status === 'ACTIVE';
          const isResolved = plan.status === 'RESOLVED';

          return (
            <div
              key={plan.id}
              className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {plan.title}
                      </span>
                      {plan.aiGenerated && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          <span>AI</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold">{plan.kpiName}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      isResolved
                        ? 'text-emerald-500 bg-emerald-500/10'
                        : isActive
                        ? 'text-indigo-500 bg-indigo-500/10'
                        : 'text-amber-500 bg-amber-500/10'
                    }`}
                  >
                    {plan.status.replace('_', ' ')}
                  </span>
                </div>

                <details className="glass-soft text-xs p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <summary className="cursor-pointer font-medium text-indigo-600 dark:text-indigo-400">
                    Plan Details
                  </summary>
                  <div className="mt-2 space-y-2 text-slate-700 dark:text-slate-300">
                    <p><strong>Cause:</strong> {plan.identifiedRootCause}</p>
                    <p><strong>Action:</strong> {plan.recommendedIntervention}</p>
                  </div>
                </details>

                {/* Owner & Target Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Owner: </span>
                    <span>{plan.actionOwner}</span>
                  </div>
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Deadline: </span>
                    <span>{new Date(plan.proposedDeadline).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Progress</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {plan.progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isResolved ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${plan.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {plan.updates.length} updates
                </span>

                <div className="flex items-center gap-2">
                  {isPendingApproval && canApprove && (
                    <button
                      onClick={() => handleApprovePlan(plan.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedPlanForUpdate(plan);
                      setProgressInput(plan.progressPercentage);
                    }}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPlans.length === 0 && (
          <div className="glass-panel col-span-2 text-center py-12 text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            No matching plans.
          </div>
        )}
      </div>

      {/* Update Progress Modal */}
      {selectedPlanForUpdate && (
        <div className="glass-overlay fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-dialog w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Update Progress
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                {selectedPlanForUpdate.title}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Progress ({progressInput}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressInput}
                onChange={(e) => setProgressInput(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes / Evidence
              </label>
              <textarea
                rows={3}
                placeholder="What changed?"
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md p-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPlanForUpdate(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating}
                onClick={handleSaveProgress}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded shadow-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

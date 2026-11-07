import React from 'react';
import {
  Download,
  Lock,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Community,
  KpiSubmission,
  ReportingPeriod,
  Team,
} from '../../types/index.ts';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: KpiSubmission | null;
  period?: ReportingPeriod;
  community?: Community;
  team?: Team;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  submission,
  period,
  community,
  team,
}) => {
  if (!isOpen || !submission) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="glass-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white">
      <div className="glass-dialog relative w-full max-w-4xl bg-white dark:bg-slate-900 print:dark:bg-white text-slate-900 dark:text-slate-100 print:text-black rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 print:border-none flex flex-col max-h-[92vh] print:max-h-none print:shadow-none">
        {/* Screen Toolbar (hidden in print) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="text-xs font-semibold text-slate-500">
            Report Preview
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="report-paper p-8 overflow-y-auto space-y-6 print:p-6" id="printable-scorecard-document">
          {/* Executive Document Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="text-2xl font-black tracking-tight uppercase">
                Lead Report
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-600">
              <div>ID: {submission.id}</div>
              <div>Generated: {new Date().toLocaleDateString()}</div>
              <div className="font-bold text-slate-900 mt-0.5">
                STATUS: {submission.status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500 font-semibold uppercase text-[10px]">Community</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{community?.name || submission.communityId}</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold uppercase text-[10px]">Team</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{team?.name || submission.teamId}</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold uppercase text-[10px]">Period</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{period?.name || submission.periodId}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 font-semibold uppercase text-[10px]">Overall Score</div>
              <div className="font-mono text-xl font-black text-indigo-700 mt-0.5">
                {submission.overallWeightedScore}%
              </div>
            </div>
          </div>

          {/* 10 KPI Breakdown Table */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
              KPI Scores
            </div>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-2 border-r border-slate-200">KPI</th>
                  <th className="p-2 border-r border-slate-200 text-right">Weight</th>
                  <th className="p-2 border-r border-slate-200 text-right">Target</th>
                  <th className="p-2 border-r border-slate-200 text-right">Achieved</th>
                  <th className="p-2 border-r border-slate-200 text-right">Attainment</th>
                  <th className="p-2 border-r border-slate-200 text-right">Points</th>
                  <th className="p-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {submission.results.map((res, idx) => (
                  <tr key={res.key} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-semibold text-slate-900">{res.name}</div>
                      {submission.rawInputs[res.key]?.notes && (
                        <div className="text-[10px] text-slate-500 italic">
                          "{submission.rawInputs[res.key].notes}"
                        </div>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{res.weight}%</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                      {res.target} {res.unit}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-medium">
                      {res.achievedValue !== null ? `${res.achievedValue} ${res.unit}` : 'Pending'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                      {res.attainmentPercentage !== null ? `${res.attainmentPercentage}%` : 'Pending'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold">
                      {res.weightedScore.toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-semibold">
                      <span
                        className={
                          res.status === 'On Track'
                            ? 'text-emerald-700'
                            : res.status === 'Needs Attention'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }
                      >
                        {res.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit & Sign-off Block */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
            <div className="border border-slate-200 rounded p-4 space-y-3">
              <div className="font-bold text-slate-900 uppercase text-[10px]">
                Head Review
              </div>
              <div className="text-slate-600">
                Notes: {submission.communityHeadNotes || 'Scorecard verified and approved by Community Head.'}
              </div>
              <div className="pt-6 border-b border-slate-300 flex justify-between text-[11px] text-slate-500">
                <span>Signature</span>
                <span>Date: {submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleDateString() : 'Pending'}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded p-4 space-y-3">
              <div className="font-bold text-slate-900 uppercase text-[10px]">
                Ops Approval
              </div>
              <div className="text-slate-600">
                Notes: {submission.operationsNotes || 'Validated for executive reporting and archive.'}
              </div>
              <div className="pt-6 border-b border-slate-300 flex justify-between text-[11px] text-slate-500">
                <span>Signature</span>
                <span>Date: {submission.approvedAt ? new Date(submission.approvedAt).toLocaleDateString() : 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

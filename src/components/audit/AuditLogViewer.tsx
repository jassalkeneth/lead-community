import React, { useState } from 'react';
import {
  Clock,
  Filter,
  History,
  Lock,
  Search,
  Shield,
  UserCheck,
} from 'lucide-react';
import { AuditLog } from '../../types/index.ts';

interface AuditLogViewerProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'ALL' && log.entityType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Log
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search logs..."
              aria-label="Search logs, actors, and IDs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium"
          >
            <option value="ALL">All Types</option>
            <option value="SCORECARD">Scorecards</option>
            <option value="ACTION_PLAN">Action Plans</option>
            <option value="PERIOD">Periods</option>
            <option value="USER">Users</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="glass-panel bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="glass-soft border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 font-medium">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Change</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {filteredLogs.map((log) => {
                const isLock = log.action.includes('LOCK');
                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{log.actorName}</div>
                      <div className="text-[10px] text-slate-400">{log.actorRole.replace('_', ' ')}</div>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {log.entityType}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          isLock ? 'text-amber-500' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">
                      {log.previousState && log.newState ? (
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span>{log.previousState}</span>
                          <span>→</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{log.newState}</span>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                      <details>
                        <summary className="cursor-pointer">Details</summary>
                        <p className="mt-1">{log.details}</p>
                      </details>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No matching records.
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

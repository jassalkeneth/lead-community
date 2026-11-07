import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { Community, ReportingPeriod, Team, User } from '../../types/index.ts';

interface MinimalistSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  periods: ReportingPeriod[];
  selectedPeriodId: string;
  onSelectPeriod: (id: string) => void;
  communities: Community[];
  selectedCommunityId: string;
  onSelectCommunity: (id: string) => void;
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (id: string) => void;
  onOpenTestRunner: () => void;
}

export const MinimalistSidebar: React.FC<MinimalistSidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  allUsers,
  onSwitchUser,
  periods,
  selectedPeriodId,
  onSelectPeriod,
  communities,
  selectedCommunityId,
  onSelectCommunity,
  teams,
  selectedTeamId,
  onSelectTeam,
  onOpenTestRunner,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { id: 'scorecard', label: 'Scorecard', icon: FileSpreadsheet },
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'actions', label: 'Action Plans', icon: TrendingUp },
    { id: 'workflow', label: 'Approvals', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log', icon: History },
  ];

  return (
    <aside className="glass-nav w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 z-40 transition-colors">
      {/* Top Brand & Main Navigation */}
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              L
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Community Lead
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Minimal Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Engine Tests quick launch */}
          <button
            onClick={onOpenTestRunner}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
          >
            <FlaskConical className="w-4 h-4 text-slate-400" />
            <span>Tests</span>
          </button>
        </nav>
      </div>

      {/* Bottom Section: Just the Important Data Filters & Persona */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        {/* Period Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1">
            Period
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Community & Team Selectors */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1">
            Community / Team
          </label>
          <select
            value={selectedCommunityId}
            onChange={(e) => onSelectCommunity(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 truncate focus:outline-none"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTeamId}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 truncate focus:outline-none"
          >
            {teams
              .filter((t) => !selectedCommunityId || t.communityId === selectedCommunityId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        {/* Persona Switcher */}
        <div className="relative pt-1">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="glass-soft w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors text-left"
          >
            <div className="truncate pr-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {currentUser.role.replace(/_/g, ' ')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {roleDropdownOpen && (
            <div className="glass-dialog absolute bottom-full left-0 mb-1.5 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">
                Switch User
              </div>
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u.id);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 ${
                    u.id === currentUser.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{u.name}</span>
                  <span className="text-[9px] uppercase text-slate-400 ml-1">
                    {u.role.split('_')[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

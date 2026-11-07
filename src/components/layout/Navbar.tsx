import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Layers,
  Moon,
  Shield,
  Sun,
  UserCheck,
} from 'lucide-react';
import { User } from '../../types/index.ts';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenTestRunner: () => void;
  onOpenNewSubmission: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  activeTab,
  onSelectTab,
  onOpenTestRunner,
  onOpenNewSubmission,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'scorecards', label: 'Scorecards' },
    { id: 'actions', label: 'Action Plans' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'audit', label: 'Audit Logs' },
  ];

  return (
    <header className="glass-nav sticky top-0 z-40 w-full bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            L
          </div>
          <button
            onClick={() => onSelectTab('dashboard')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            Community Lead
          </button>
        </div>

        {/* Zone 2: 4-6 concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onSelectTab(link.id)}
                className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action Zone with role switcher and test runner */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Automated Scoring Tests Trigger */}
          <button
            onClick={onOpenTestRunner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
            title="Run scoring tests"
          >
            <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Tests</span>
          </button>

          {/* New Submission CTA */}
          <button
            onClick={onOpenNewSubmission}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <span>New Scorecard</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Active User & RBAC Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-left transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-semibold uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block leading-tight text-left">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-[110px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {userDropdownOpen && (
              <div className="glass-dialog absolute right-0 mt-2 w-72 rounded-lg bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Switch User
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {allUsers.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u.id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                          isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {u.name}
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.title}</div>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800">
                          {u.role.split('_')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

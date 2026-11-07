import React, { useState, useEffect } from 'react';
import { MinimalistSidebar } from './components/layout/MinimalistSidebar.tsx';
import { MinimalistScorecardView } from './components/scorecard/MinimalistScorecardView.tsx';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard.tsx';
import { ActionPlansManager } from './components/actions/ActionPlansManager.tsx';
import { ApprovalQueue } from './components/workflow/ApprovalQueue.tsx';
import { AuditLogViewer } from './components/audit/AuditLogViewer.tsx';
import { TestRunnerModal } from './components/testing/TestRunnerModal.tsx';
import { PrintableReportModal } from './components/reports/PrintableReportModal.tsx';
import { AiCopilotDrawer } from './components/copilot/AiCopilotDrawer.tsx';
import {
  AuditLog,
  Community,
  CorrectiveActionPlan,
  KpiSubmission,
  ReportingPeriod,
  Team,
  User,
} from './types/index.ts';
import { api } from './lib/api.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(api.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<KpiSubmission[]>([]);
  const [actionPlans, setActionPlans] = useState<CorrectiveActionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Navigation: default to the interactive 'scorecard' view matching the user's screenshots
  const [activeTab, setActiveTab] = useState<string>('scorecard');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals & Drawers
  const [selectedScorecardForAi, setSelectedScorecardForAi] = useState<KpiSubmission | null>(null);
  const [selectedScorecardForPrint, setSelectedScorecardForPrint] = useState<KpiSubmission | null>(null);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initial Data Load
  const loadAllData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      api.loadStoredUser();
      const meRes = await api.getMe();
      setCurrentUser(meRes.user);

      const [usersRes, periodsRes, commRes, teamsRes, subsRes, actionsRes, auditRes] =
        await Promise.all([
          api.getUsers(),
          api.getPeriods(),
          api.getCommunities(),
          api.getTeams(),
          api.getSubmissions(),
          api.getActionPlans(),
          api.getAuditLogs(),
        ]);

      setAllUsers(usersRes.users);
      setPeriods(periodsRes.periods);
      setCommunities(commRes.communities);
      setTeams(teamsRes.teams);
      setSubmissions(subsRes.submissions);
      setActionPlans(actionsRes.actionPlans);
      setAuditLogs(auditRes.logs);

      // Default to active current period
      const curr = periodsRes.periods.find((p) => p.isCurrent) || periodsRes.periods[0];
      if (curr) setSelectedPeriodId(curr.id);

      // Default community & team
      if (commRes.communities[0]) {
        setSelectedCommunityId(commRes.communities[0].id);
        const firstTeam = teamsRes.teams.find((t) => t.communityId === commRes.communities[0].id);
        if (firstTeam) setSelectedTeamId(firstTeam.id);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
      setLoadError(err instanceof Error ? err.message : 'Unable to connect to the backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Update selected team if community changes
  const handleCommunityChange = (newCommId: string) => {
    setSelectedCommunityId(newCommId);
    const validTeams = teams.filter((t) => t.communityId === newCommId);
    if (validTeams.length > 0) {
      setSelectedTeamId(validTeams[0].id);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      const [subsRes, actionsRes, auditRes] = await Promise.all([
        api.getSubmissions(),
        api.getActionPlans(),
        api.getAuditLogs(),
      ]);
      setSubmissions(subsRes.submissions);
      setActionPlans(actionsRes.actionPlans);
      setAuditLogs(auditRes.logs);
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const handleSubmissionSaved = async (newOrUpdated: KpiSubmission) => {
    const [subsRes, auditRes] = await Promise.all([api.getSubmissions(), api.getAuditLogs()]);
    setSubmissions(subsRes.submissions);
    setAuditLogs(auditRes.logs);
  };

  const handleWorkflowAction = async (
    id: string,
    action: 'HEAD_APPROVE' | 'HEAD_REQUEST_CHANGES' | 'OPS_APPROVE' | 'OPS_REQUEST_CHANGES' | 'LOCK_SCORECARD',
    notes?: string
  ) => {
    try {
      await api.workflowAction(id, action, notes);
      const [subsRes, auditRes] = await Promise.all([api.getSubmissions(), api.getAuditLogs()]);
      setSubmissions(subsRes.submissions);
      setAuditLogs(auditRes.logs);
    } catch (err: any) {
      alert(`Workflow error: ${err.message}`);
    }
  };

  // Find active submission for the currently selected period & team
  const currentActiveSubmission =
    submissions.find(
      (s) => s.periodId === selectedPeriodId && s.teamId === selectedTeamId
    ) || null;

  const currentCommunity = communities.find((c) => c.id === selectedCommunityId);
  const currentTeam = teams.find((t) => t.id === selectedTeamId);
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);

  return (
    <div className="lead-app min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased">
      {/* Minimalist Sidebar */}
      <MinimalistSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onSelectPeriod={setSelectedPeriodId}
        communities={communities}
        selectedCommunityId={selectedCommunityId}
        onSelectCommunity={handleCommunityChange}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={setSelectedTeamId}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="py-32 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-slate-500 text-xs font-medium">
              Loading...
            </div>
          </div>
        ) : loadError ? (
          <div role="alert" className="py-24 text-center space-y-4">
            <h1 className="text-lg font-semibold">Unable to load data</h1>
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              onClick={() => void loadAllData()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'scorecard' && (
              <MinimalistScorecardView
                currentUser={currentUser}
                periods={periods}
                communities={communities}
                teams={teams}
                selectedPeriodId={selectedPeriodId}
                selectedCommunityId={selectedCommunityId}
                selectedTeamId={selectedTeamId}
                onPeriodChange={setSelectedPeriodId}
                onCommunityChange={handleCommunityChange}
                onTeamChange={setSelectedTeamId}
                activeSubmission={currentActiveSubmission}
                onSubmissionSaved={handleSubmissionSaved}
                onOpenPrintReport={(sub) => setSelectedScorecardForPrint(sub)}
                onOpenAiCopilot={(sub) => setSelectedScorecardForAi(sub)}
              />
            )}

            {activeTab === 'dashboard' && (
              <ExecutiveDashboard
                currentUser={currentUser}
                periods={periods}
                communities={communities}
                teams={teams}
                submissions={submissions}
                actionPlans={actionPlans}
                selectedPeriodId={selectedPeriodId}
                onSelectPeriod={setSelectedPeriodId}
                selectedCommunityId={selectedCommunityId}
                onSelectCommunity={handleCommunityChange}
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
                selectedStatus={selectedStatus}
                onSelectStatus={setSelectedStatus}
                onOpenScorecard={(sub) => {
                  setSelectedPeriodId(sub.periodId);
                  setSelectedCommunityId(sub.communityId);
                  setSelectedTeamId(sub.teamId);
                  setActiveTab('scorecard');
                }}
                onOpenAiCopilot={(sub) => setSelectedScorecardForAi(sub)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'actions' && (
              <ActionPlansManager
                actionPlans={actionPlans}
                currentUser={currentUser}
                onRefresh={async () => {
                  const [actionsRes, auditRes] = await Promise.all([
                    api.getActionPlans(),
                    api.getAuditLogs(),
                  ]);
                  setActionPlans(actionsRes.actionPlans);
                  setAuditLogs(auditRes.logs);
                }}
              />
            )}

            {activeTab === 'workflow' && (
              <ApprovalQueue
                submissions={submissions}
                periods={periods}
                communities={communities}
                teams={teams}
                currentUser={currentUser}
                onOpenScorecard={(sub) => {
                  setSelectedPeriodId(sub.periodId);
                  setSelectedCommunityId(sub.communityId);
                  setSelectedTeamId(sub.teamId);
                  setActiveTab('scorecard');
                }}
                onOpenAiCopilot={(sub) => setSelectedScorecardForAi(sub)}
                onWorkflowAction={handleWorkflowAction}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogViewer
                logs={auditLogs}
                onRefresh={async () => {
                  const auditRes = await api.getAuditLogs();
                  setAuditLogs(auditRes.logs);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals & AI Copilot Drawer */}
      <AiCopilotDrawer
        isOpen={!!selectedScorecardForAi}
        onClose={() => setSelectedScorecardForAi(null)}
        submission={selectedScorecardForAi}
        period={currentPeriod}
        community={currentCommunity}
        team={currentTeam}
        currentUser={currentUser}
        onActionPlanCreated={async () => {
          const [actionsRes, auditRes, subsRes] = await Promise.all([
            api.getActionPlans(),
            api.getAuditLogs(),
            api.getSubmissions(),
          ]);
          setActionPlans(actionsRes.actionPlans);
          setAuditLogs(auditRes.logs);
          setSubmissions(subsRes.submissions);
        }}
      />

      <PrintableReportModal
        isOpen={!!selectedScorecardForPrint}
        onClose={() => setSelectedScorecardForPrint(null)}
        submission={selectedScorecardForPrint}
        period={currentPeriod}
        community={currentCommunity}
        team={currentTeam}
      />

      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />
    </div>
  );
}

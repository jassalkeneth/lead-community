import {
  AuditLog,
  Community,
  CorrectiveActionPlan,
  KpiSubmission,
  NotificationItem,
  RawKpiInput,
  ReportingPeriod,
  Team,
  User,
} from '../types/index.ts';

class ApiClient {
  private currentUser: User = {
    id: 'usr_super_admin',
    name: 'Elena Rostova',
    email: 'elena.rostova@commpulse.io',
    role: 'SUPER_ADMIN',
    title: 'VP of Global Operations & Super Admin',
  };

  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('commpulse_user', JSON.stringify(user));
  }

  public loadStoredUser() {
    try {
      const stored = localStorage.getItem('commpulse_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUser.id,
      'x-user-name': this.currentUser.name,
      'x-user-role': this.currentUser.role,
    };
  }

  async getMe(): Promise<{ user: User }> {
    const res = await fetch('/api/auth/me', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  }

  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch('/api/auth/users', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  async switchUser(userId: string): Promise<{ user: User }> {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to switch user');
    const data = await res.json();
    this.setCurrentUser(data.user);
    return data;
  }

  async getCommunities(): Promise<{ communities: Community[] }> {
    const res = await fetch('/api/communities', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch communities');
    return res.json();
  }

  async getTeams(communityId?: string): Promise<{ teams: Team[] }> {
    const url = communityId ? `/api/communities/teams?communityId=${communityId}` : '/api/communities/teams';
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  }

  async getPeriods(): Promise<{ periods: ReportingPeriod[] }> {
    const res = await fetch('/api/periods', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch periods');
    return res.json();
  }

  async getSubmissions(params?: {
    periodId?: string;
    communityId?: string;
    teamId?: string;
    status?: string;
  }): Promise<{ submissions: KpiSubmission[] }> {
    const q = new URLSearchParams();
    if (params?.periodId) q.append('periodId', params.periodId);
    if (params?.communityId) q.append('communityId', params.communityId);
    if (params?.teamId) q.append('teamId', params.teamId);
    if (params?.status) q.append('status', params.status);

    const res = await fetch(`/api/scorecards?${q.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch submissions');
    return res.json();
  }

  async previewCalculate(rawInputs: Record<string, RawKpiInput>, scoreCap = 100) {
    const res = await fetch('/api/scorecards/preview-calculate', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ rawInputs, scoreCap }),
    });
    if (!res.ok) throw new Error('Calculation preview failed');
    return res.json();
  }

  async submitScorecard(payload: {
    id?: string;
    periodId: string;
    communityId: string;
    teamId: string;
    rawInputs: Record<string, RawKpiInput>;
    isDraft?: boolean;
  }): Promise<{ submission: KpiSubmission; message: string }> {
    const res = await fetch('/api/scorecards/submit', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit scorecard');
    }
    return res.json();
  }

  async workflowAction(
    id: string,
    action: 'HEAD_APPROVE' | 'HEAD_REQUEST_CHANGES' | 'OPS_APPROVE' | 'OPS_REQUEST_CHANGES' | 'LOCK_SCORECARD',
    notes?: string
  ): Promise<{ submission: KpiSubmission; message: string }> {
    const res = await fetch(`/api/scorecards/${id}/workflow`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to process workflow action');
    }
    return res.json();
  }

  async getActionPlans(params?: {
    submissionId?: string;
    teamId?: string;
    status?: string;
  }): Promise<{ actionPlans: CorrectiveActionPlan[] }> {
    const q = new URLSearchParams();
    if (params?.submissionId) q.append('submissionId', params.submissionId);
    if (params?.teamId) q.append('teamId', params.teamId);
    if (params?.status) q.append('status', params.status);

    const res = await fetch(`/api/actions?${q.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch action plans');
    return res.json();
  }

  async createActionPlan(plan: Partial<CorrectiveActionPlan>): Promise<{ actionPlan: CorrectiveActionPlan }> {
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(plan),
    });
    if (!res.ok) throw new Error('Failed to create action plan');
    return res.json();
  }

  async approveActionPlan(id: string): Promise<{ actionPlan: CorrectiveActionPlan }> {
    const res = await fetch(`/api/actions/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to approve action plan');
    return res.json();
  }

  async updateActionPlan(
    id: string,
    data: { note?: string; progressPercentage?: number; status?: string }
  ): Promise<{ actionPlan: CorrectiveActionPlan }> {
    const res = await fetch(`/api/actions/${id}/update`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update action plan');
    return res.json();
  }

  async analyzeWithAi(payload: {
    communityName: string;
    teamName: string;
    periodName: string;
    overallScore: number;
    underperformingKpis: any[];
    notes?: Record<string, string>;
  }) {
    const res = await fetch('/api/ai/analyze-scorecard', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('AI analysis request failed');
    return res.json();
  }

  async getAuditLogs(params?: { entityType?: string; entityId?: string }): Promise<{ logs: AuditLog[] }> {
    const q = new URLSearchParams();
    if (params?.entityType) q.append('entityType', params.entityType);
    if (params?.entityId) q.append('entityId', params.entityId);

    const res = await fetch(`/api/audit?${q.toString()}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }

  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    const res = await fetch(`/api/audit/notifications?role=${this.currentUser.role}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  }

  async markNotificationRead(id: string) {
    const res = await fetch(`/api/audit/notifications/${id}/read`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
  }

  async runTests() {
    const res = await fetch('/api/tests/run', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to run tests');
    return res.json();
  }
}

export const api = new ApiClient();

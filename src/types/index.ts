export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'OPERATIONS_MANAGER' 
  | 'COMMUNITY_HEAD' 
  | 'TEAM_LEAD';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  title: string;
  assignedCommunityId?: string;
  assignedTeamId?: string;
}

export interface Community {
  id: string;
  name: string;
  code: string;
  region: string;
  communityHeadId: string;
  headName: string;
  memberCount: number;
  teamsCount: number;
  description: string;
  activeStatus: 'ACTIVE' | 'INACTIVE';
}

export interface Team {
  id: string;
  communityId: string;
  name: string;
  teamLeadId: string;
  leadName: string;
  department: string;
  membersCount: number;
}

export interface ReportingPeriod {
  id: string;
  name: string; // e.g. "October 2026", "November 2026"
  periodCode: string; // e.g. "2026-10"
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  status: 'OPEN' | 'REVIEWING' | 'FINAL_APPROVAL' | 'LOCKED' | 'ARCHIVED';
  isCurrent: boolean;
}

export type KpiType = 'ratio' | 'count' | 'binary';
export type KpiStatus = 'On Track' | 'Needs Attention' | 'Pending';

export interface KpiDefinition {
  id: string;
  key: string;
  name: string;
  category: string;
  weight: number; // Percentage, e.g. 15 for 15%
  target: number; // e.g. 95 for 95%, 2 for 2 events, 1 for Yes
  type: KpiType;
  unit: string;
  description: string;
  numeratorLabel?: string;
  denominatorLabel?: string;
  countLabel?: string;
  isSystem: boolean;
}

export interface RawKpiInput {
  // For ratios:
  numerator?: number | null;
  denominator?: number | null;
  // For counts:
  count?: number | null;
  // For binary:
  binaryValue?: boolean | null;
  // Common notes / evidence:
  notes?: string;
  evidenceName?: string;
}

export interface CalculatedKpiResult {
  key: string;
  name: string;
  category: string;
  weight: number;
  target: number;
  type: KpiType;
  unit: string;
  achievedValue: number | null; // e.g. 92.5%, 2 events, or 100% (for Yes)
  attainmentPercentage: number | null; // % of target reached (capped at max cap if applicable)
  weightedScore: number; // (attainmentPercentage * weight) / 100
  status: KpiStatus;
  isMissing: boolean;
  isZeroDenominator: boolean;
  isExplicitZero: boolean;
  validationError?: string;
}

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'COMMUNITY_HEAD_REVIEW' 
  | 'CHANGES_REQUESTED' 
  | 'OPERATIONS_MANAGER_REVIEW' 
  | 'APPROVED' 
  | 'LOCKED';

export interface KpiSubmission {
  id: string;
  periodId: string;
  communityId: string;
  teamId: string;
  submittedById: string;
  submittedByName: string;
  submittedByRole: UserRole;
  status: SubmissionStatus;
  rawInputs: Record<string, RawKpiInput>;
  results: CalculatedKpiResult[];
  overallWeightedScore: number;
  provisionalScore: number;
  isProvisional: boolean;
  validWeightsTotal: number;
  onTrackCount: number;
  needsAttentionCount: number;
  pendingCount: number;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  lockedAt?: string;
  communityHeadNotes?: string;
  operationsNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectiveActionPlan {
  id: string;
  submissionId: string;
  periodId: string;
  communityId: string;
  teamId: string;
  kpiKey: string;
  kpiName: string;
  title: string;
  identifiedRootCause: string;
  verifiedFactVsHypothesis: string;
  recommendedIntervention: string;
  actionOwner: string;
  ownerUserId?: string;
  proposedDeadline: string;
  measurableRecoveryTarget: string;
  currentScoreSummary: string;
  status: 'DRAFT_AI' | 'PENDING_APPROVAL' | 'ACTIVE' | 'RESOLVED' | 'BLOCKED';
  progressPercentage: number;
  aiGenerated: boolean;
  approvedById?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
  updates: Array<{
    id: string;
    note: string;
    progressPercentage: number;
    updatedBy: string;
    timestamp: string;
  }>;
}

export interface AuditLog {
  id: string;
  entityType: 'SCORECARD' | 'ACTION_PLAN' | 'PERIOD' | 'KPI_DEFINITION' | 'USER';
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  previousState?: string;
  newState?: string;
  details: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  recipientRole?: UserRole;
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'DEADLINE' | 'SUBMISSION' | 'APPROVAL' | 'ACTION_REQUIRED' | 'AI_INSIGHT' | 'REVIEW_REQUIRED';
  read: boolean;
  linkTab?: string;
  timestamp: string;
}

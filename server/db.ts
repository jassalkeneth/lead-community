import './env.ts';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  AuditLog,
  Community,
  CorrectiveActionPlan,
  KpiDefinition,
  KpiSubmission,
  NotificationItem,
  ReportingPeriod,
  Team,
  User,
} from '../src/types/index.ts';
import { calculateScorecard, SYSTEM_KPI_DEFINITIONS } from '../src/scoring/scoringEngine.ts';

const PROJECT_DIR = fileURLToPath(new URL('../', import.meta.url));
export const DATABASE_PATH = path.resolve(
  PROJECT_DIR,
  process.env.DATABASE_PATH || path.join('data', 'communitylead.db'),
);
const LEGACY_DB_FILE = path.join(PROJECT_DIR, 'data', 'database.json');

export interface DatabaseSchema {
  users: User[];
  communities: Community[];
  teams: Team[];
  periods: ReportingPeriod[];
  kpiDefinitions: KpiDefinition[];
  submissions: KpiSubmission[];
  actionPlans: CorrectiveActionPlan[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
}

function getInitialDatabase(): DatabaseSchema {
  const users: User[] = [
    {
      id: 'usr_super_admin',
      name: 'Elena Rostova',
      email: 'elena.rostova@commpulse.io',
      role: 'SUPER_ADMIN',
      title: 'VP of Global Operations & Super Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'usr_ops_manager',
      name: 'Marcus Vance',
      email: 'marcus.vance@commpulse.io',
      role: 'OPERATIONS_MANAGER',
      title: 'Global Community Operations Director',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'usr_head_devrel',
      name: 'Priya Sharma',
      email: 'priya.sharma@commpulse.io',
      role: 'COMMUNITY_HEAD',
      title: 'Head of DevRel & Developer Ecosystem',
      assignedCommunityId: 'comm_devrel',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'usr_head_product',
      name: 'Julian Sterling',
      email: 'julian.sterling@commpulse.io',
      role: 'COMMUNITY_HEAD',
      title: 'Head of Product Builders Community',
      assignedCommunityId: 'comm_product',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'usr_lead_apac',
      name: 'Kenji Sato',
      email: 'kenji.sato@commpulse.io',
      role: 'TEAM_LEAD',
      title: 'APAC DevRel Lead',
      assignedCommunityId: 'comm_devrel',
      assignedTeamId: 'team_devrel_apac',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'usr_lead_emea',
      name: 'Amara Diallo',
      email: 'amara.diallo@commpulse.io',
      role: 'TEAM_LEAD',
      title: 'EMEA Community Lead',
      assignedCommunityId: 'comm_devrel',
      assignedTeamId: 'team_devrel_emea',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'usr_lead_americas',
      name: 'Sofia Ramirez',
      email: 'sofia.ramirez@commpulse.io',
      role: 'TEAM_LEAD',
      title: 'Americas Product Champions Lead',
      assignedCommunityId: 'comm_product',
      assignedTeamId: 'team_prod_americas',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    },
  ];

  const communities: Community[] = [
    {
      id: 'comm_devrel',
      name: 'Global Developer Ecosystem',
      code: 'DEVREL-GLBL',
      region: 'Worldwide',
      communityHeadId: 'usr_head_devrel',
      headName: 'Priya Sharma',
      memberCount: 14250,
      teamsCount: 3,
      description: 'Open source developers, technical ambassadors, and developer platform community.',
      activeStatus: 'ACTIVE',
    },
    {
      id: 'comm_product',
      name: 'Product Builders & Innovators',
      code: 'PROD-INNOV',
      region: 'North America & LATAM',
      communityHeadId: 'usr_head_product',
      headName: 'Julian Sterling',
      memberCount: 8920,
      teamsCount: 2,
      description: 'Product managers, enterprise architects, and early beta access testers.',
      activeStatus: 'ACTIVE',
    },
    {
      id: 'comm_ai_guild',
      name: 'AI Engineering Guild',
      code: 'AI-GUILD',
      region: 'EMEA & Global',
      communityHeadId: 'usr_head_devrel',
      headName: 'Priya Sharma',
      memberCount: 6340,
      teamsCount: 2,
      description: 'Machine learning engineers, researchers, and LLM application developers.',
      activeStatus: 'ACTIVE',
    },
  ];

  const teams: Team[] = [
    {
      id: 'team_devrel_apac',
      communityId: 'comm_devrel',
      name: 'APAC Technical Ambassadors',
      teamLeadId: 'usr_lead_apac',
      leadName: 'Kenji Sato',
      department: 'Developer Relations',
      membersCount: 4200,
    },
    {
      id: 'team_devrel_emea',
      communityId: 'comm_devrel',
      name: 'EMEA Community & Meetups',
      teamLeadId: 'usr_lead_emea',
      leadName: 'Amara Diallo',
      department: 'Community Engagement',
      membersCount: 5800,
    },
    {
      id: 'team_prod_americas',
      communityId: 'comm_product',
      name: 'Americas Product Champions',
      teamLeadId: 'usr_lead_americas',
      leadName: 'Sofia Ramirez',
      department: 'Product Operations',
      membersCount: 4950,
    },
    {
      id: 'team_ai_research',
      communityId: 'comm_ai_guild',
      name: 'Applied AI & Open Weights Research',
      teamLeadId: 'usr_lead_apac',
      leadName: 'Kenji Sato',
      department: 'AI Research',
      membersCount: 3100,
    },
  ];

  const periods: ReportingPeriod[] = [
    {
      id: 'period_2026_09',
      name: 'September 2026',
      periodCode: '2026-09',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-09-30T23:59:59Z',
      submissionDeadline: '2026-10-05T23:59:59Z',
      status: 'LOCKED',
      isCurrent: false,
    },
    {
      id: 'period_2026_10',
      name: 'October 2026',
      periodCode: '2026-10',
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-10-31T23:59:59Z',
      submissionDeadline: '2026-11-05T23:59:59Z',
      status: 'OPEN',
      isCurrent: true,
    },
    {
      id: 'period_2026_11',
      name: 'November 2026',
      periodCode: '2026-11',
      startDate: '2026-11-01T00:00:00Z',
      endDate: '2026-11-30T23:59:59Z',
      submissionDeadline: '2026-12-05T23:59:59Z',
      status: 'OPEN',
      isCurrent: false,
    },
  ];

  // Pre-seed some real historical and current scorecards
  const sub1Raw = {
    onboarding_speed: { numerator: 190, denominator: 200, notes: 'Automated welcome cohort cut 12h off onboarding' },
    onboarding_completeness: { numerator: 198, denominator: 200, notes: 'Mandatory profile checklist' },
    community_engagement: { numerator: 2600, denominator: 4200, notes: 'High Discord and GitHub activity' },
    events_held: { count: 3, notes: '2 virtual workshops + 1 Tokyo meetup' },
    event_attendance: { numerator: 340, denominator: 550, notes: 'Strong Tokyo in-person turnout' },
    testimonials_collected: { count: 9, notes: 'Published in APAC dev blog' },
    referral_enrollments: { count: 5, notes: 'Ambassador referral links active' },
    moderation_response: { numerator: 48, denominator: 50, notes: 'SLA maintained at 2.4 hrs avg' },
    team_kpi_attainment: { binaryValue: true, notes: 'All team quarterly milestones met' },
    monthly_report_on_time: { binaryValue: true, notes: 'Submitted 2 days before deadline' },
  };
  const calc1 = calculateScorecard(sub1Raw);

  const sub2Raw = {
    onboarding_speed: { numerator: 140, denominator: 210, notes: 'Delay in manual approval step for EMEA region' },
    onboarding_completeness: { numerator: 170, denominator: 210, notes: 'Profile completion drop-off' },
    community_engagement: { numerator: 2200, denominator: 5800, notes: 'Summer lull in forum questions' },
    events_held: { count: 1, notes: 'London summit delayed to next month' },
    event_attendance: { numerator: 85, denominator: 220, notes: 'No-show rate higher than usual' },
    testimonials_collected: { count: 4, notes: 'Need more structured testimonial outreach' },
    referral_enrollments: { count: 1, notes: 'Referral incentive not yet launched' },
    moderation_response: { numerator: 78, denominator: 95, notes: 'Weekend backlog accumulated' },
    team_kpi_attainment: { binaryValue: false, notes: 'Missed Q3 documentation target' },
    monthly_report_on_time: { binaryValue: true, notes: 'Submitted on time' },
  };
  const calc2 = calculateScorecard(sub2Raw);

  const sub3Raw = {
    onboarding_speed: { numerator: 160, denominator: 170, notes: 'Streamlined Slack onboarding flow' },
    onboarding_completeness: { numerator: 165, denominator: 170, notes: 'Onboarding wizard worked well' },
    community_engagement: { numerator: 3100, denominator: 4950, notes: 'Strong feature feedback participation' },
    events_held: { count: 2, notes: '2 product demo webinars held' },
    event_attendance: { numerator: 210, denominator: 380, notes: '55.2% attendance rate' },
    testimonials_collected: { count: 8, notes: 'Product case studies collected' },
    referral_enrollments: { count: 4, notes: 'VIP customer referral program' },
    moderation_response: { numerator: 65, denominator: 70, notes: 'Response time under 3 hours' },
    team_kpi_attainment: { binaryValue: true, notes: 'Internal beta goals completed' },
    monthly_report_on_time: { binaryValue: true, notes: 'Submitted promptly' },
  };
  const calc3 = calculateScorecard(sub3Raw);

  const submissions: KpiSubmission[] = [
    {
      id: 'sub_2026_09_apac',
      periodId: 'period_2026_09',
      communityId: 'comm_devrel',
      teamId: 'team_devrel_apac',
      submittedById: 'usr_lead_apac',
      submittedByName: 'Kenji Sato',
      submittedByRole: 'TEAM_LEAD',
      status: 'LOCKED',
      rawInputs: sub1Raw,
      results: calc1.results,
      overallWeightedScore: calc1.overallWeightedScore,
      provisionalScore: calc1.provisionalScore,
      isProvisional: calc1.isProvisional,
      validWeightsTotal: calc1.totalValidWeights,
      onTrackCount: calc1.onTrackCount,
      needsAttentionCount: calc1.needsAttentionCount,
      pendingCount: calc1.pendingCount,
      submittedAt: '2026-10-02T14:20:00Z',
      reviewedAt: '2026-10-03T09:15:00Z',
      approvedAt: '2026-10-04T11:00:00Z',
      lockedAt: '2026-10-05T00:00:00Z',
      communityHeadNotes: 'Outstanding execution in APAC. Strong turnout in Tokyo meetup.',
      operationsNotes: 'Verified and locked for executive reporting.',
      createdAt: '2026-10-02T10:00:00Z',
      updatedAt: '2026-10-05T00:00:00Z',
    },
    {
      id: 'sub_2026_10_apac',
      periodId: 'period_2026_10',
      communityId: 'comm_devrel',
      teamId: 'team_devrel_apac',
      submittedById: 'usr_lead_apac',
      submittedByName: 'Kenji Sato',
      submittedByRole: 'TEAM_LEAD',
      status: 'APPROVED',
      rawInputs: sub1Raw,
      results: calc1.results,
      overallWeightedScore: calc1.overallWeightedScore,
      provisionalScore: calc1.provisionalScore,
      isProvisional: calc1.isProvisional,
      validWeightsTotal: calc1.totalValidWeights,
      onTrackCount: calc1.onTrackCount,
      needsAttentionCount: calc1.needsAttentionCount,
      pendingCount: calc1.pendingCount,
      submittedAt: '2026-11-01T11:10:00Z',
      reviewedAt: '2026-11-02T10:00:00Z',
      approvedAt: '2026-11-02T16:30:00Z',
      communityHeadNotes: 'Exceeds target across engagement and referrals. Approved.',
      operationsNotes: 'Final approval granted. Ready for monthly archive.',
      createdAt: '2026-11-01T09:00:00Z',
      updatedAt: '2026-11-02T16:30:00Z',
    },
    {
      id: 'sub_2026_10_emea',
      periodId: 'period_2026_10',
      communityId: 'comm_devrel',
      teamId: 'team_devrel_emea',
      submittedById: 'usr_lead_emea',
      submittedByName: 'Amara Diallo',
      submittedByRole: 'TEAM_LEAD',
      status: 'COMMUNITY_HEAD_REVIEW',
      rawInputs: sub2Raw,
      results: calc2.results,
      overallWeightedScore: calc2.overallWeightedScore,
      provisionalScore: calc2.provisionalScore,
      isProvisional: calc2.isProvisional,
      validWeightsTotal: calc2.totalValidWeights,
      onTrackCount: calc2.onTrackCount,
      needsAttentionCount: calc2.needsAttentionCount,
      pendingCount: calc2.pendingCount,
      submittedAt: '2026-11-02T13:45:00Z',
      communityHeadNotes: 'Multiple KPIs need attention (events held, engagement, referral enrollments). Root cause review in progress.',
      createdAt: '2026-11-02T12:00:00Z',
      updatedAt: '2026-11-02T13:45:00Z',
    },
    {
      id: 'sub_2026_10_americas',
      periodId: 'period_2026_10',
      communityId: 'comm_product',
      teamId: 'team_prod_americas',
      submittedById: 'usr_lead_americas',
      submittedByName: 'Sofia Ramirez',
      submittedByRole: 'TEAM_LEAD',
      status: 'OPERATIONS_MANAGER_REVIEW',
      rawInputs: sub3Raw,
      results: calc3.results,
      overallWeightedScore: calc3.overallWeightedScore,
      provisionalScore: calc3.provisionalScore,
      isProvisional: calc3.isProvisional,
      validWeightsTotal: calc3.totalValidWeights,
      onTrackCount: calc3.onTrackCount,
      needsAttentionCount: calc3.needsAttentionCount,
      pendingCount: calc3.pendingCount,
      submittedAt: '2026-11-01T17:20:00Z',
      reviewedAt: '2026-11-02T14:10:00Z',
      communityHeadNotes: 'Reviewed and endorsed. Strong recovery in testimonials and onboarding completeness.',
      createdAt: '2026-11-01T15:00:00Z',
      updatedAt: '2026-11-02T14:10:00Z',
    },
  ];

  const actionPlans: CorrectiveActionPlan[] = [
    {
      id: 'act_emea_events',
      submissionId: 'sub_2026_10_emea',
      periodId: 'period_2026_10',
      communityId: 'comm_devrel',
      teamId: 'team_devrel_emea',
      kpiKey: 'events_held',
      kpiName: 'Events Held',
      title: 'Accelerate EMEA Regional Meetup Pipeline & Co-Host Cadence',
      identifiedRootCause: 'London summit venue licensing delay left a 4-week gap with no alternative virtual workshops scheduled in the pipeline.',
      verifiedFactVsHypothesis: 'Fact: Only 1 event executed in October vs target of 2. Hypothesis: Virtual events can be organized with 7 days lead time without venue dependencies.',
      recommendedIntervention: 'Institute emergency 2-webinar calendar for November with ecosystem partners; establish dual-track booking so physical venue delays automatically trigger virtual broadcast alternatives.',
      actionOwner: 'Amara Diallo',
      ownerUserId: 'usr_lead_emea',
      proposedDeadline: '2026-11-20T00:00:00Z',
      measurableRecoveryTarget: 'Hold >= 3 events in November to recover quarterly target (attainment >= 150%).',
      currentScoreSummary: 'Current attainment: 50.0% (1 event held vs 2 target). Status: Needs Attention.',
      status: 'ACTIVE',
      progressPercentage: 40,
      aiGenerated: true,
      approvedById: 'usr_head_devrel',
      approvedByName: 'Priya Sharma',
      createdAt: '2026-11-02T14:00:00Z',
      updatedAt: '2026-11-02T15:30:00Z',
      updates: [
        {
          id: 'upd_1',
          note: 'Secured speaker slots for 2 virtual developer roundtables on Nov 12 and Nov 19.',
          progressPercentage: 40,
          updatedBy: 'Amara Diallo',
          timestamp: '2026-11-02T15:30:00Z',
        },
      ],
    },
    {
      id: 'act_emea_referrals',
      submissionId: 'sub_2026_10_emea',
      periodId: 'period_2026_10',
      communityId: 'comm_devrel',
      teamId: 'team_devrel_emea',
      kpiKey: 'referral_enrollments',
      kpiName: 'Referral Enrollments',
      title: 'Deploy Automated Referral Tracking & Member Swag Incentive',
      identifiedRootCause: 'Active ambassadors lack unique referral links or visible attribution dashboards in the community portal.',
      verifiedFactVsHypothesis: 'Fact: 1 referral recorded in October vs target of 3. Hypothesis: Top 20% active contributors will invite peers if given digital referral badges.',
      recommendedIntervention: 'Launch ambassador referral referral link generator in Discord & community forum with automated onboarding attribution.',
      actionOwner: 'Amara Diallo',
      ownerUserId: 'usr_lead_emea',
      proposedDeadline: '2026-11-25T00:00:00Z',
      measurableRecoveryTarget: 'Achieve >= 4 verified referral enrollments in November.',
      currentScoreSummary: 'Current attainment: 33.3% (1 referral vs 3 target). Status: Needs Attention.',
      status: 'PENDING_APPROVAL',
      progressPercentage: 15,
      aiGenerated: true,
      createdAt: '2026-11-02T14:10:00Z',
      updatedAt: '2026-11-02T14:10:00Z',
      updates: [],
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_1',
      entityType: 'SCORECARD',
      entityId: 'sub_2026_09_apac',
      action: 'SCORECARD_APPROVED_AND_LOCKED',
      actorId: 'usr_ops_manager',
      actorName: 'Marcus Vance',
      actorRole: 'OPERATIONS_MANAGER',
      previousState: 'OPERATIONS_MANAGER_REVIEW',
      newState: 'LOCKED',
      details: 'Scorecard finalized with 98.40 overall score. Immutable reporting lock applied.',
      timestamp: '2026-10-05T00:00:00Z',
    },
    {
      id: 'aud_2',
      entityType: 'SCORECARD',
      entityId: 'sub_2026_10_apac',
      action: 'SCORECARD_APPROVED',
      actorId: 'usr_ops_manager',
      actorName: 'Marcus Vance',
      actorRole: 'OPERATIONS_MANAGER',
      previousState: 'OPERATIONS_MANAGER_REVIEW',
      newState: 'APPROVED',
      details: 'October APAC scorecard verified and approved at 98.40 weighted attainment.',
      timestamp: '2026-11-02T16:30:00Z',
    },
    {
      id: 'aud_3',
      entityType: 'SCORECARD',
      entityId: 'sub_2026_10_emea',
      action: 'SCORECARD_SUBMITTED',
      actorId: 'usr_lead_emea',
      actorName: 'Amara Diallo',
      actorRole: 'TEAM_LEAD',
      previousState: 'DRAFT',
      newState: 'COMMUNITY_HEAD_REVIEW',
      details: 'Initial monthly submission for EMEA team with 67.20 weighted score. Flagged 7 underperforming metrics.',
      timestamp: '2026-11-02T13:45:00Z',
    },
    {
      id: 'aud_4',
      entityType: 'ACTION_PLAN',
      entityId: 'act_emea_events',
      action: 'ACTION_PLAN_ACTIVATED',
      actorId: 'usr_head_devrel',
      actorName: 'Priya Sharma',
      actorRole: 'COMMUNITY_HEAD',
      previousState: 'PENDING_APPROVAL',
      newState: 'ACTIVE',
      details: 'Community Head Priya Sharma approved AI-generated recovery intervention for events held.',
      timestamp: '2026-11-02T14:30:00Z',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_1',
      recipientRole: 'COMMUNITY_HEAD',
      title: 'Review Required: EMEA October Scorecard',
      message: 'Amara Diallo submitted October 2026 KPI scorecard (67.20 weighted score). 7 KPIs need attention.',
      type: 'REVIEW_REQUIRED',
      read: false,
      linkTab: 'workflow',
      timestamp: '2026-11-02T13:45:00Z',
    },
    {
      id: 'notif_2',
      recipientRole: 'OPERATIONS_MANAGER',
      title: 'Final Approval Needed: Americas Product Scorecard',
      message: 'Julian Sterling endorsed Americas team scorecard (94.10 score) for final operational sign-off.',
      type: 'APPROVAL',
      read: false,
      linkTab: 'workflow',
      timestamp: '2026-11-02T14:15:00Z',
    },
    {
      id: 'notif_3',
      recipientRole: 'TEAM_LEAD',
      title: 'Upcoming Reporting Deadline: Nov 5',
      message: 'October 2026 reporting period cutoff is in 3 days. Ensure all evidence documents are attached.',
      type: 'DEADLINE',
      read: true,
      linkTab: 'submission',
      timestamp: '2026-11-02T08:00:00Z',
    },
  ];

  return {
    users,
    communities,
    teams,
    periods,
    kpiDefinitions: SYSTEM_KPI_DEFINITIONS,
    submissions,
    actionPlans,
    auditLogs,
    notifications,
  };
}

const TABLES = [
  'users', 'communities', 'teams', 'periods', 'kpiDefinitions',
  'submissions', 'actionPlans', 'auditLogs', 'notifications',
] as const satisfies readonly (keyof DatabaseSchema)[];
const JSON_FIELDS = new Set(['rawInputs', 'results', 'updates']);
const BOOLEAN_FIELDS = new Set(['isCurrent', 'isSystem', 'isProvisional', 'aiGenerated', 'read']);
const OPTIONAL_ACTION_LINKS = new Set(['submissionId', 'periodId', 'communityId', 'teamId']);

function readLegacyDatabase(filename: string): DatabaseSchema {
  const parsed: unknown = JSON.parse(fs.readFileSync(filename, 'utf-8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Legacy database must contain an object.');
  }
  for (const table of TABLES) {
    if (!(table in parsed) || !Array.isArray(Reflect.get(parsed, table))) {
      throw new Error(`Legacy database is missing the ${table} collection.`);
    }
  }
  // SQLite constraints validate individual records during the atomic import.
  return parsed as DatabaseSchema;
}

export class DatabaseManager {
  private connection: DatabaseSync;
  private transactionDepth = 0;
  private columns = new Map<keyof DatabaseSchema, string[]>();
  private columnTypes = new Map<keyof DatabaseSchema, Array<{ name: string; type: string; required: boolean }>>();

  constructor(filename = DATABASE_PATH, legacyFile = LEGACY_DB_FILE) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.connection = new DatabaseSync(filename);
    try {
      this.connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
      const version = this.connection.prepare('PRAGMA user_version').get()?.user_version;
      if (version !== 0 && version !== 1) {
        throw new Error(`Unsupported SQLite schema version: ${version}`);
      }
      if (version === 0) {
        const existingTables = this.connection.prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
        ).all();
        if (existingTables.length > 0) {
          throw new Error('Refusing to initialize an unrecognized database. Choose an empty DATABASE_PATH.');
        }
        this.transaction(() => {
          this.connection.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8'));
          this.loadColumns();
          const initial = fs.existsSync(legacyFile)
            ? readLegacyDatabase(legacyFile)
            : getInitialDatabase();
          for (const table of TABLES) this.set(table, initial[table]);
          this.connection.exec('PRAGMA user_version = 1');
        });
      } else {
        this.loadColumns();
      }
    } catch (error) {
      this.connection.close();
      throw error;
    }
  }

  private loadColumns(): void {
    for (const table of TABLES) {
      const metadata = this.connection.prepare(`PRAGMA table_info("${table}")`).all();
      const columns = metadata.map((column) => String(column.name));
      if (!columns.includes('id') || !columns.includes('sortOrder')) {
        throw new Error(`Invalid SQLite schema for ${table}.`);
      }
      this.columns.set(table, columns);
      this.columnTypes.set(table, metadata.map((column) => ({
        name: String(column.name),
        type: String(column.type),
        required: column.notnull === 1 || column.pk === 1,
      })));
    }
  }

  private assertCollection<K extends keyof DatabaseSchema>(
    key: K,
    records: unknown,
  ): asserts records is DatabaseSchema[K] {
    const metadata = this.columnTypes.get(key);
    if (!metadata || !Array.isArray(records)) throw new Error(`Invalid database collection: ${key}`);
    for (const record of records) {
      if (!record || typeof record !== 'object') throw new Error(`Invalid record in ${key}.`);
      for (const column of metadata) {
        if (column.name === 'sortOrder') continue;
        const value: unknown = Reflect.get(record, column.name);
        if (value === undefined && !column.required) continue;
        let valid: boolean;
        if (JSON_FIELDS.has(column.name)) {
          valid = column.name === 'rawInputs'
            ? value !== null && typeof value === 'object' && !Array.isArray(value)
            : Array.isArray(value);
        } else if (BOOLEAN_FIELDS.has(column.name)) {
          valid = typeof value === 'boolean';
        } else {
          valid = column.type === 'TEXT' ? typeof value === 'string' : typeof value === 'number';
        }
        if (!valid) throw new Error(`Invalid stored value for ${key}.${column.name}.`);
      }
    }
  }

  public transaction<T>(operation: () => T): T {
    if (this.transactionDepth > 0) return operation();
    this.connection.exec('BEGIN IMMEDIATE');
    this.transactionDepth++;
    try {
      const result = operation();
      this.connection.exec('COMMIT');
      return result;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    } finally {
      this.transactionDepth--;
    }
  }

  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    if (!this.columns.has(key)) throw new Error(`Unknown database collection: ${key}`);
    const rows = this.connection.prepare(`SELECT * FROM "${key}" ORDER BY sortOrder`).all();
    const records = rows.map((row) => {
      if (typeof row.id !== 'string') throw new Error(`Invalid record ID in ${key}.`);
      const record: { id: string; [column: string]: unknown } = { id: row.id };
      for (const [column, value] of Object.entries(row)) {
        if (column === 'sortOrder') continue;
        if (value === null) {
          if (key === 'actionPlans' && OPTIONAL_ACTION_LINKS.has(column)) record[column] = '';
        } else if (JSON_FIELDS.has(column)) {
          record[column] = JSON.parse(String(value));
        } else {
          record[column] = BOOLEAN_FIELDS.has(column) ? value === 1 : value;
        }
      }
      return record;
    });
    this.assertCollection(key, records);
    return records;
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]): void {
    this.assertCollection(key, value);
    const columns = this.columns.get(key);
    if (!columns) throw new Error(`Unknown database collection: ${key}`);
    const names = columns.map((column) => `"${column}"`).join(', ');
    const update = columns.filter((column) => column !== 'id')
      .map((column) => `"${column}" = excluded."${column}"`).join(', ');
    const statement = this.connection.prepare(
      `INSERT INTO "${key}" (${names}) VALUES (${columns.map(() => '?').join(', ')})
       ON CONFLICT(id) DO UPDATE SET ${update}`,
    );
    this.transaction(() => {
      for (const [sortOrder, record] of value.entries()) {
        const values = columns.map((column): SQLInputValue => {
          if (column === 'sortOrder') return sortOrder;
          const field: unknown = Reflect.get(record, column);
          if (field === undefined || field === null) return null;
          if (key === 'actionPlans' && OPTIONAL_ACTION_LINKS.has(column) && field === '') return null;
          if (JSON_FIELDS.has(column)) return JSON.stringify(field);
          if (BOOLEAN_FIELDS.has(column)) {
            if (typeof field !== 'boolean') throw new Error(`${key}.${column} must be a boolean.`);
            return field ? 1 : 0;
          }
          if (typeof field !== 'string' && typeof field !== 'number') {
            throw new Error(`Invalid value for ${key}.${column}.`);
          }
          return field;
        });
        statement.run(...values);
      }
      if (value.length === 0) {
        this.connection.exec(`DELETE FROM "${key}"`);
      } else {
        this.connection.prepare(
          `DELETE FROM "${key}" WHERE id NOT IN (${value.map(() => '?').join(', ')})`,
        ).run(...value.map((record) => record.id));
      }
    });
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const fullLog: AuditLog = {
      id: `aud_${randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    const logs = this.get('auditLogs');
    logs.unshift(fullLog);
    this.set('auditLogs', logs);
    return fullLog;
  }

  public addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): NotificationItem {
    const item: NotificationItem = {
      id: `notif_${randomUUID()}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    };
    const notifications = this.get('notifications');
    notifications.unshift(item);
    this.set('notifications', notifications);
    return item;
  }

  public resetToDefaults(): void {
    this.transaction(() => {
      this.connection.exec('PRAGMA defer_foreign_keys = ON');
      for (const table of [...TABLES].reverse()) this.connection.exec(`DELETE FROM "${table}"`);
      const initial = getInitialDatabase();
      for (const table of TABLES) this.set(table, initial[table]);
    });
  }

  public health(): { engine: 'sqlite'; schemaVersion: number } {
    this.connection.prepare('SELECT 1').get();
    return {
      engine: 'sqlite',
      schemaVersion: Number(this.connection.prepare('PRAGMA user_version').get()?.user_version),
    };
  }

  public close(): void {
    this.connection.close();
  }
}

export const db = new DatabaseManager();

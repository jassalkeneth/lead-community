CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'COMMUNITY_HEAD', 'TEAM_LEAD')),
  avatarUrl TEXT,
  title TEXT NOT NULL,
  assignedCommunityId TEXT REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED,
  assignedTeamId TEXT REFERENCES teams(id) DEFERRABLE INITIALLY DEFERRED,
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  communityHeadId TEXT NOT NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
  headName TEXT NOT NULL,
  memberCount INTEGER NOT NULL CHECK (memberCount >= 0),
  teamsCount INTEGER NOT NULL CHECK (teamsCount >= 0),
  description TEXT NOT NULL,
  activeStatus TEXT NOT NULL CHECK (activeStatus IN ('ACTIVE', 'INACTIVE')),
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  communityId TEXT NOT NULL REFERENCES communities(id),
  name TEXT NOT NULL,
  teamLeadId TEXT NOT NULL REFERENCES users(id),
  leadName TEXT NOT NULL,
  department TEXT NOT NULL,
  membersCount INTEGER NOT NULL CHECK (membersCount >= 0),
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE TABLE periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  periodCode TEXT NOT NULL UNIQUE,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  submissionDeadline TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'REVIEWING', 'FINAL_APPROVAL', 'LOCKED', 'ARCHIVED')),
  isCurrent INTEGER NOT NULL CHECK (isCurrent IN (0, 1)),
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE UNIQUE INDEX one_current_period ON periods(isCurrent) WHERE isCurrent = 1;

CREATE TABLE kpiDefinitions (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  weight REAL NOT NULL CHECK (weight >= 0),
  target REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ratio', 'count', 'binary')),
  unit TEXT NOT NULL,
  description TEXT NOT NULL,
  numeratorLabel TEXT,
  denominatorLabel TEXT,
  countLabel TEXT,
  isSystem INTEGER NOT NULL CHECK (isSystem IN (0, 1)),
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  periodId TEXT NOT NULL REFERENCES periods(id),
  communityId TEXT NOT NULL REFERENCES communities(id),
  teamId TEXT NOT NULL REFERENCES teams(id),
  submittedById TEXT NOT NULL REFERENCES users(id),
  submittedByName TEXT NOT NULL,
  submittedByRole TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'COMMUNITY_HEAD_REVIEW', 'CHANGES_REQUESTED', 'OPERATIONS_MANAGER_REVIEW', 'APPROVED', 'LOCKED')),
  rawInputs TEXT NOT NULL CHECK (json_valid(rawInputs)),
  results TEXT NOT NULL CHECK (json_valid(results)),
  overallWeightedScore REAL NOT NULL,
  provisionalScore REAL NOT NULL,
  isProvisional INTEGER NOT NULL CHECK (isProvisional IN (0, 1)),
  validWeightsTotal REAL NOT NULL,
  onTrackCount INTEGER NOT NULL,
  needsAttentionCount INTEGER NOT NULL,
  pendingCount INTEGER NOT NULL,
  submittedAt TEXT,
  reviewedAt TEXT,
  approvedAt TEXT,
  lockedAt TEXT,
  communityHeadNotes TEXT,
  operationsNotes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  sortOrder INTEGER NOT NULL,
  UNIQUE (periodId, teamId)
) STRICT;

CREATE INDEX submissions_community_status ON submissions(communityId, status);

CREATE TABLE actionPlans (
  id TEXT PRIMARY KEY,
  submissionId TEXT REFERENCES submissions(id),
  periodId TEXT REFERENCES periods(id),
  communityId TEXT REFERENCES communities(id),
  teamId TEXT REFERENCES teams(id),
  kpiKey TEXT NOT NULL REFERENCES kpiDefinitions(key),
  kpiName TEXT NOT NULL,
  title TEXT NOT NULL,
  identifiedRootCause TEXT NOT NULL,
  verifiedFactVsHypothesis TEXT NOT NULL,
  recommendedIntervention TEXT NOT NULL,
  actionOwner TEXT NOT NULL,
  ownerUserId TEXT REFERENCES users(id),
  proposedDeadline TEXT NOT NULL,
  measurableRecoveryTarget TEXT NOT NULL,
  currentScoreSummary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT_AI', 'PENDING_APPROVAL', 'ACTIVE', 'RESOLVED', 'BLOCKED')),
  progressPercentage REAL NOT NULL CHECK (progressPercentage BETWEEN 0 AND 100),
  aiGenerated INTEGER NOT NULL CHECK (aiGenerated IN (0, 1)),
  approvedById TEXT REFERENCES users(id),
  approvedByName TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  updates TEXT NOT NULL CHECK (json_valid(updates)),
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE INDEX actions_submission_status ON actionPlans(submissionId, status);

CREATE TABLE auditLogs (
  id TEXT PRIMARY KEY,
  entityType TEXT NOT NULL CHECK (entityType IN ('SCORECARD', 'ACTION_PLAN', 'PERIOD', 'KPI_DEFINITION', 'USER')),
  entityId TEXT NOT NULL,
  action TEXT NOT NULL,
  actorId TEXT NOT NULL REFERENCES users(id),
  actorName TEXT NOT NULL,
  actorRole TEXT NOT NULL,
  previousState TEXT,
  newState TEXT,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  sortOrder INTEGER NOT NULL
) STRICT;

CREATE INDEX audit_entity ON auditLogs(entityType, entityId);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  recipientRole TEXT,
  recipientUserId TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEADLINE', 'SUBMISSION', 'APPROVAL', 'ACTION_REQUIRED', 'AI_INSIGHT', 'REVIEW_REQUIRED')),
  read INTEGER NOT NULL CHECK (read IN (0, 1)),
  linkTab TEXT,
  timestamp TEXT NOT NULL,
  sortOrder INTEGER NOT NULL
) STRICT;

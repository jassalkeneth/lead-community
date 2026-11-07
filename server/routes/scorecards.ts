import { Router } from 'express';
import { db } from '../db.ts';
import { transactionalRoute } from '../transactionalRoute.ts';
import { calculateScorecard, SYSTEM_KPI_DEFINITIONS, validateKpiInput } from '../../src/scoring/scoringEngine.ts';
import { KpiSubmission, RawKpiInput, SubmissionStatus, UserRole } from '../../src/types/index.ts';

const router = Router();

// Get all submissions with filters
router.get('/', (req, res) => {
  const { periodId, communityId, teamId, status } = req.query;
  let submissions = db.get('submissions');

  if (periodId) {
    submissions = submissions.filter((s) => s.periodId === periodId);
  }
  if (communityId) {
    submissions = submissions.filter((s) => s.communityId === communityId);
  }
  if (teamId) {
    submissions = submissions.filter((s) => s.teamId === teamId);
  }
  if (status) {
    submissions = submissions.filter((s) => s.status === status);
  }

  res.json({ submissions });
});

// Get single submission by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const submissions = db.get('submissions');
  const submission = submissions.find((s) => s.id === id);

  if (!submission) {
    return res.status(404).json({ error: 'Scorecard submission not found' });
  }

  res.json({ submission });
});

// Live calculation preview endpoint (pure server calculation without persisting)
router.post('/preview-calculate', (req, res) => {
  const { rawInputs, scoreCap } = req.body;
  if (!rawInputs || typeof rawInputs !== 'object' || Array.isArray(rawInputs)) {
    return res.status(400).json({ error: 'rawInputs object is required' });
  }

  const calculation = calculateScorecard(rawInputs, SYSTEM_KPI_DEFINITIONS, {
    scoreCap: scoreCap || 100,
  });

  res.json({ calculation });
});

// Create or update a scorecard submission
router.post('/submit', transactionalRoute((req) => {
  const {
    id,
    periodId,
    communityId,
    teamId,
    rawInputs,
    isDraft,
  } = req.body;

  const actorId = (req.headers['x-user-id'] as string) || 'usr_lead_apac';
  const actorName = (req.headers['x-user-name'] as string) || 'Team Lead';
  const actorRole = ((req.headers['x-user-role'] as string) || 'TEAM_LEAD') as UserRole;

  if (!periodId || !communityId || !teamId || !rawInputs) {
    return { status: 400, body: { error: 'periodId, communityId, teamId, and rawInputs are required' } };
  }
  if (typeof rawInputs !== 'object' || Array.isArray(rawInputs)) {
    return { status: 400, body: { error: 'rawInputs must be an object.' } };
  }

  const team = db.get('teams').find((item) => item.id === teamId);
  if (!team || team.communityId !== communityId || !db.get('periods').some((period) => period.id === periodId)) {
    return { status: 400, body: { error: 'Select a valid reporting period and a team belonging to the selected community.' } };
  }

  const submissions = db.get('submissions');
  let existingIndex = -1;

  if (id) {
    existingIndex = submissions.findIndex((s) => s.id === id);
    if (existingIndex === -1) {
      return { status: 404, body: { error: 'Scorecard submission not found' } };
    }
  } else {
    // Check if one already exists for this team and period
    existingIndex = submissions.findIndex((s) => s.periodId === periodId && s.teamId === teamId);
  }

  if (existingIndex !== -1) {
    const existing = submissions[existingIndex];
    if (existing.status === 'LOCKED') {
      return { status: 403, body: { error: 'This scorecard has been permanently locked and is immutable.' } };
    }
    if (existing.periodId !== periodId || existing.communityId !== communityId || existing.teamId !== teamId) {
      return { status: 400, body: { error: 'An existing scorecard cannot be moved to another period, community, or team.' } };
    }
  }

  // Validate inputs
  const validationErrors: Record<string, string> = {};
  for (const def of SYSTEM_KPI_DEFINITIONS) {
    const input = rawInputs[def.key] as RawKpiInput | undefined;
    const err = validateKpiInput(def, input);
    if (err) {
      validationErrors[def.key] = err;
    }
  }

  if (Object.keys(validationErrors).length > 0 && !isDraft) {
    return { status: 422, body: {
      error: 'Input validation failed',
      validationErrors,
    } };
  }

  // Calculate using server engine
  const calculation = calculateScorecard(rawInputs, SYSTEM_KPI_DEFINITIONS);
  const now = new Date().toISOString();
  const targetStatus: SubmissionStatus = isDraft ? 'DRAFT' : 'COMMUNITY_HEAD_REVIEW';

  let submissionRecord: KpiSubmission;

  if (existingIndex !== -1) {
    const previous = submissions[existingIndex];
    submissionRecord = {
      ...previous,
      rawInputs,
      results: calculation.results,
      overallWeightedScore: calculation.overallWeightedScore,
      provisionalScore: calculation.provisionalScore,
      isProvisional: calculation.isProvisional,
      validWeightsTotal: calculation.totalValidWeights,
      onTrackCount: calculation.onTrackCount,
      needsAttentionCount: calculation.needsAttentionCount,
      pendingCount: calculation.pendingCount,
      status: targetStatus,
      submittedAt: isDraft ? previous.submittedAt : now,
      updatedAt: now,
    };
    submissions[existingIndex] = submissionRecord;

    db.addAuditLog({
      entityType: 'SCORECARD',
      entityId: submissionRecord.id,
      action: isDraft ? 'SCORECARD_DRAFT_UPDATED' : 'SCORECARD_SUBMITTED',
      actorId,
      actorName,
      actorRole,
      previousState: previous.status,
      newState: targetStatus,
      details: isDraft
        ? `Draft updated for period ${periodId}. Provisional score: ${calculation.provisionalScore}%`
        : `Scorecard submitted for review. Calculated score: ${calculation.overallWeightedScore}% (${calculation.needsAttentionCount} KPIs need attention)`,
    });
  } else {
    const newId = `sub_${periodId.replace('period_', '')}_${Date.now().toString(36)}`;
    submissionRecord = {
      id: newId,
      periodId,
      communityId,
      teamId,
      submittedById: actorId,
      submittedByName: actorName,
      submittedByRole: actorRole,
      status: targetStatus,
      rawInputs,
      results: calculation.results,
      overallWeightedScore: calculation.overallWeightedScore,
      provisionalScore: calculation.provisionalScore,
      isProvisional: calculation.isProvisional,
      validWeightsTotal: calculation.totalValidWeights,
      onTrackCount: calculation.onTrackCount,
      needsAttentionCount: calculation.needsAttentionCount,
      pendingCount: calculation.pendingCount,
      submittedAt: isDraft ? undefined : now,
      createdAt: now,
      updatedAt: now,
    };
    submissions.push(submissionRecord);

    db.addAuditLog({
      entityType: 'SCORECARD',
      entityId: newId,
      action: isDraft ? 'SCORECARD_DRAFT_CREATED' : 'SCORECARD_SUBMITTED',
      actorId,
      actorName,
      actorRole,
      previousState: 'NONE',
      newState: targetStatus,
      details: `New scorecard created for period ${periodId}. Overall score: ${calculation.overallWeightedScore}%`,
    });
  }

  db.set('submissions', submissions);

  // If submitted for review, notify Community Head
  if (!isDraft) {
    db.addNotification({
      recipientRole: 'COMMUNITY_HEAD',
      title: 'New Scorecard Submitted for Review',
      message: `${actorName} submitted monthly scorecard with score of ${calculation.overallWeightedScore}%.`,
      type: 'SUBMISSION',
      linkTab: 'workflow',
    });
  }

  return { body: {
    submission: submissionRecord,
    calculation,
    message: isDraft ? 'Draft saved successfully' : 'Scorecard submitted successfully for review',
  } };
}));

// Workflow transition endpoint (Review & Approval stages)
router.post('/:id/workflow', transactionalRoute((req) => {
  const { id } = req.params;
  const { action, notes } = req.body; // action: 'HEAD_APPROVE' | 'HEAD_REQUEST_CHANGES' | 'OPS_APPROVE' | 'OPS_REQUEST_CHANGES' | 'LOCK_SCORECARD'

  const actorId = (req.headers['x-user-id'] as string) || 'usr_super_admin';
  const actorName = (req.headers['x-user-name'] as string) || 'Reviewer';
  const actorRole = ((req.headers['x-user-role'] as string) || 'SUPER_ADMIN') as UserRole;

  const submissions = db.get('submissions');
  const index = submissions.findIndex((s) => s.id === id);

  if (index === -1) {
    return { status: 404, body: { error: 'Scorecard not found' } };
  }

  const sub = submissions[index];

  if (sub.status === 'LOCKED') {
    return { status: 403, body: { error: 'Scorecard is permanently locked and cannot be modified.' } };
  }

  const previousState = sub.status;
  const now = new Date().toISOString();

  switch (action) {
    case 'HEAD_APPROVE':
      sub.status = 'OPERATIONS_MANAGER_REVIEW';
      sub.reviewedAt = now;
      sub.communityHeadNotes = notes || sub.communityHeadNotes;
      db.addNotification({
        recipientRole: 'OPERATIONS_MANAGER',
        title: 'Scorecard Endorsed by Community Head',
        message: `${actorName} endorsed scorecard ${sub.id} (Score: ${sub.overallWeightedScore}%). Ready for final sign-off.`,
        type: 'APPROVAL',
        linkTab: 'workflow',
      });
      break;

    case 'HEAD_REQUEST_CHANGES':
      sub.status = 'CHANGES_REQUESTED';
      sub.communityHeadNotes = notes || 'Revisions required by Community Head';
      db.addNotification({
        recipientRole: 'TEAM_LEAD',
        title: 'Revisions Requested on Monthly Scorecard',
        message: `${actorName}: ${notes || 'Please update requested metrics and resubmit.'}`,
        type: 'ACTION_REQUIRED',
        linkTab: 'submission',
      });
      break;

    case 'OPS_APPROVE':
      sub.status = 'APPROVED';
      sub.approvedAt = now;
      sub.operationsNotes = notes || sub.operationsNotes;
      db.addNotification({
        recipientRole: 'TEAM_LEAD',
        title: 'Monthly Scorecard Fully Approved',
        message: `Your scorecard for ${sub.periodId} has been given final approval by Operations Management.`,
        type: 'APPROVAL',
        linkTab: 'scorecards',
      });
      break;

    case 'OPS_REQUEST_CHANGES':
      sub.status = 'CHANGES_REQUESTED';
      sub.operationsNotes = notes || 'Revisions requested by Operations Manager';
      db.addNotification({
        recipientRole: 'TEAM_LEAD',
        title: 'Revisions Requested by Operations Manager',
        message: `${actorName}: ${notes || 'Please review operations feedback and update.'}`,
        type: 'ACTION_REQUIRED',
        linkTab: 'submission',
      });
      break;

    case 'LOCK_SCORECARD':
      sub.status = 'LOCKED';
      sub.lockedAt = now;
      break;

    default:
      return { status: 400, body: { error: `Unknown workflow action: ${action}` } };
  }

  sub.updatedAt = now;
  submissions[index] = sub;
  db.set('submissions', submissions);

  db.addAuditLog({
    entityType: 'SCORECARD',
    entityId: sub.id,
    action: `WORKFLOW_${action}`,
    actorId,
    actorName,
    actorRole,
    previousState,
    newState: sub.status,
    details: `${actorName} executed ${action}. Feedback: ${notes || 'None provided'}`,
  });

  return { body: { submission: sub, message: `Workflow transitioned to ${sub.status}` } };
}));

export default router;

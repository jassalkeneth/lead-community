import { Router } from 'express';
import { db } from '../db.ts';
import { transactionalRoute } from '../transactionalRoute.ts';
import { CorrectiveActionPlan, UserRole } from '../../src/types/index.ts';

const router = Router();

// List action plans with filters
router.get('/', (req, res) => {
  const { submissionId, teamId, status, kpiKey } = req.query;
  let actionPlans = db.get('actionPlans');

  if (submissionId) {
    actionPlans = actionPlans.filter((a) => a.submissionId === submissionId);
  }
  if (teamId) {
    actionPlans = actionPlans.filter((a) => a.teamId === teamId);
  }
  if (status) {
    actionPlans = actionPlans.filter((a) => a.status === status);
  }
  if (kpiKey) {
    actionPlans = actionPlans.filter((a) => a.kpiKey === kpiKey);
  }

  res.json({ actionPlans });
});

// Create an action plan
router.post('/', transactionalRoute((req) => {
  const {
    submissionId,
    periodId,
    communityId,
    teamId,
    kpiKey,
    kpiName,
    title,
    identifiedRootCause,
    verifiedFactVsHypothesis,
    recommendedIntervention,
    actionOwner,
    proposedDeadline,
    measurableRecoveryTarget,
    currentScoreSummary,
    status = 'PENDING_APPROVAL',
    aiGenerated = false,
  } = req.body;

  const actorId = (req.headers['x-user-id'] as string) || 'usr_super_admin';
  const actorName = (req.headers['x-user-name'] as string) || 'User';
  const actorRole = ((req.headers['x-user-role'] as string) || 'COMMUNITY_HEAD') as UserRole;

  if (!kpiKey || !title || !recommendedIntervention) {
    return { status: 400, body: { error: 'kpiKey, title, and recommendedIntervention are required' } };
  }

  const now = new Date().toISOString();
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newPlan: CorrectiveActionPlan = {
    id,
    submissionId: submissionId || '',
    periodId: periodId || '',
    communityId: communityId || '',
    teamId: teamId || '',
    kpiKey,
    kpiName: kpiName || kpiKey,
    title,
    identifiedRootCause: identifiedRootCause || 'Under review',
    verifiedFactVsHypothesis: verifiedFactVsHypothesis || 'To be substantiated',
    recommendedIntervention,
    actionOwner: actionOwner || actorName,
    proposedDeadline: proposedDeadline || new Date(Date.now() + 14 * 86400000).toISOString(),
    measurableRecoveryTarget: measurableRecoveryTarget || 'Attain target metric next cycle',
    currentScoreSummary: currentScoreSummary || 'Underperforming',
    status,
    progressPercentage: 0,
    aiGenerated,
    createdAt: now,
    updatedAt: now,
    updates: [],
  };

  const actionPlans = db.get('actionPlans');
  actionPlans.unshift(newPlan);
  db.set('actionPlans', actionPlans);

  db.addAuditLog({
    entityType: 'ACTION_PLAN',
    entityId: id,
    action: 'ACTION_PLAN_CREATED',
    actorId,
    actorName,
    actorRole,
    newState: status,
    details: `Action plan "${title}" created for ${kpiName}. Status: ${status}`,
  });

  return { status: 201, body: { actionPlan: newPlan } };
}));

// Human approval of action plan (moves to ACTIVE)
router.post('/:id/approve', transactionalRoute((req) => {
  const { id } = req.params;
  const actorId = (req.headers['x-user-id'] as string) || 'usr_super_admin';
  const actorName = (req.headers['x-user-name'] as string) || 'Reviewer';
  const actorRole = ((req.headers['x-user-role'] as string) || 'COMMUNITY_HEAD') as UserRole;

  const actionPlans = db.get('actionPlans');
  const index = actionPlans.findIndex((a) => a.id === id);

  if (index === -1) {
    return { status: 404, body: { error: 'Action plan not found' } };
  }

  const prev = actionPlans[index].status;
  actionPlans[index].status = 'ACTIVE';
  actionPlans[index].approvedById = actorId;
  actionPlans[index].approvedByName = actorName;
  actionPlans[index].updatedAt = new Date().toISOString();

  db.set('actionPlans', actionPlans);

  db.addAuditLog({
    entityType: 'ACTION_PLAN',
    entityId: id,
    action: 'ACTION_PLAN_APPROVED',
    actorId,
    actorName,
    actorRole,
    previousState: prev,
    newState: 'ACTIVE',
    details: `${actorName} (${actorRole}) approved action plan "${actionPlans[index].title}". Plan is now active.`,
  });

  return { body: { actionPlan: actionPlans[index], message: 'Action plan approved and activated.' } };
}));

// Update progress or status
router.post('/:id/update', transactionalRoute((req) => {
  const { id } = req.params;
  const { note, progressPercentage, status } = req.body;

  const actorName = (req.headers['x-user-name'] as string) || 'Owner';
  const actorId = (req.headers['x-user-id'] as string) || 'usr_lead_apac';
  const actorRole = ((req.headers['x-user-role'] as string) || 'TEAM_LEAD') as UserRole;

  const actionPlans = db.get('actionPlans');
  const index = actionPlans.findIndex((a) => a.id === id);

  if (index === -1) {
    return { status: 404, body: { error: 'Action plan not found' } };
  }

  const plan = actionPlans[index];
  const now = new Date().toISOString();

  if (progressPercentage !== undefined) {
    const progress = Number(progressPercentage);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return { status: 400, body: { error: 'Progress must be between 0 and 100.' } };
    }
    plan.progressPercentage = progress;
    if (plan.progressPercentage >= 100) {
      plan.status = 'RESOLVED';
    }
  }

  if (status) {
    plan.status = status;
  }

  if (note) {
    plan.updates.unshift({
      id: `upd_${Date.now()}`,
      note,
      progressPercentage: plan.progressPercentage,
      updatedBy: actorName,
      timestamp: now,
    });
  }

  plan.updatedAt = now;
  actionPlans[index] = plan;
  db.set('actionPlans', actionPlans);

  db.addAuditLog({
    entityType: 'ACTION_PLAN',
    entityId: id,
    action: 'ACTION_PLAN_UPDATED',
    actorId,
    actorName,
    actorRole,
    newState: plan.status,
    details: `Progress: ${plan.progressPercentage}%. Note: ${note || 'No note'}. Status: ${plan.status}`,
  });

  return { body: { actionPlan: plan } };
}));

export default router;

import { Router } from 'express';
import { db } from '../db.ts';
import { transactionalRoute } from '../transactionalRoute.ts';
import type { UserRole } from '../../src/types/index.ts';

const router = Router();

// List reporting periods
router.get('/', (req, res) => {
  const periods = db.get('periods');
  res.json({ periods });
});

// Update period status (e.g. lock period, open period)
router.patch('/:id/status', transactionalRoute((req) => {
  const { id } = req.params;
  const { status } = req.body;
  const periods = db.get('periods');
  const index = periods.findIndex((p) => p.id === id);

  if (index === -1) {
    return { status: 404, body: { error: 'Reporting period not found' } };
  }

  const prev = periods[index].status;
  periods[index].status = status;
  db.set('periods', periods);

  const actorName = (req.headers['x-user-name'] as string) || 'Administrator';
  const actorId = (req.headers['x-user-id'] as string) || 'usr_super_admin';
  const actorRole = ((req.headers['x-user-role'] as string) || 'SUPER_ADMIN') as UserRole;

  db.addAuditLog({
    entityType: 'PERIOD',
    entityId: id,
    action: 'PERIOD_STATUS_UPDATED',
    actorId,
    actorName,
    actorRole,
    previousState: prev,
    newState: status,
    details: `Reporting period "${periods[index].name}" status changed from ${prev} to ${status}`,
  });

  return { body: { period: periods[index] } };
}));

export default router;

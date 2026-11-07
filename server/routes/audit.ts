import { Router } from 'express';
import { db } from '../db.ts';
import { transactionalRoute } from '../transactionalRoute.ts';

const router = Router();

// Get audit logs with optional filter
router.get('/', (req, res) => {
  const { entityType, entityId, limit } = req.query;
  let logs = db.get('auditLogs');

  if (entityType) {
    logs = logs.filter((l) => l.entityType === entityType);
  }
  if (entityId) {
    logs = logs.filter((l) => l.entityId === entityId);
  }

  const parsedLimit = limit ? parseInt(limit as string, 10) : 100;
  res.json({ logs: logs.slice(0, parsedLimit) });
});

// Notifications
router.get('/notifications', (req, res) => {
  const { role } = req.query;
  let notifications = db.get('notifications');
  if (role) {
    notifications = notifications.filter(
      (n) => !n.recipientRole || n.recipientRole === role || n.recipientRole === 'SUPER_ADMIN'
    );
  }
  res.json({ notifications });
});

router.post('/notifications/:id/read', transactionalRoute((req) => {
  const { id } = req.params;
  const notifications = db.get('notifications');
  const index = notifications.findIndex((n) => n.id === id);
  if (index === -1) {
    return { status: 404, body: { error: 'Notification not found' } };
  }
  notifications[index].read = true;
  db.set('notifications', notifications);
  return { body: { success: true } };
}));

export default router;

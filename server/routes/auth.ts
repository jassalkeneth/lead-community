import { Router } from 'express';
import { db } from '../db.ts';
import { transactionalRoute } from '../transactionalRoute.ts';

const router = Router();

// Get active session user (defaulting to Super Admin or currently selected user)
router.get('/me', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || 'usr_super_admin';
  const users = db.get('users');
  const user = users.find((u) => u.id === userId) || users[0];
  res.json({ user });
});

// List all system users for role switching / auth
router.get('/users', (req, res) => {
  const users = db.get('users');
  res.json({ users });
});

// Update or switch user profile
router.post('/switch', transactionalRoute((req) => {
  const { userId } = req.body;
  const users = db.get('users');
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { status: 404, body: { error: 'User not found' } };
  }

  db.addAuditLog({
    entityType: 'USER',
    entityId: user.id,
    action: 'USER_SESSION_SWITCHED',
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    details: `Active session switched to ${user.name} (${user.role})`,
  });

  return { body: { user, message: `Switched session to ${user.name}` } };
}));

export default router;

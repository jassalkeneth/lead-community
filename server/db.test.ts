import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import type { DatabaseSchema } from './db.ts';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'communitylead-db-test-'));
process.env.DATABASE_PATH = path.join(directory, 'singleton.db');
const { DatabaseManager, db } = await import('./db.ts');
const missingLegacy = path.join(directory, 'missing.json');

after(() => {
  db.close();
  for (const filename of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, filename));
  fs.rmdirSync(directory);
});

function snapshot(database: InstanceType<typeof DatabaseManager>): DatabaseSchema {
  return {
    users: database.get('users'),
    communities: database.get('communities'),
    teams: database.get('teams'),
    periods: database.get('periods'),
    kpiDefinitions: database.get('kpiDefinitions'),
    submissions: database.get('submissions'),
    actionPlans: database.get('actionPlans'),
    auditLogs: database.get('auditLogs'),
    notifications: database.get('notifications'),
  };
}

test('creates nine relational tables and preserves all seed records and JSON/boolean types', () => {
  const filename = path.join(directory, 'seed.db');
  const database = new DatabaseManager(filename, missingLegacy);
  try {
    const data = snapshot(database);
    assert.equal(data.users.length, 7);
    assert.equal(data.communities.length, 3);
    assert.equal(data.teams.length, 4);
    assert.equal(data.periods.length, 3);
    assert.equal(data.kpiDefinitions.length, 10);
    assert.equal(data.submissions.length, 4);
    assert.equal(data.actionPlans.length, 2);
    assert.equal(data.auditLogs.length, 4);
    assert.equal(data.notifications.length, 3);
    assert.equal(typeof data.periods[0].isCurrent, 'boolean');
    assert.equal(typeof data.submissions[0].isProvisional, 'boolean');
    assert.equal(data.submissions[0].rawInputs.team_kpi_attainment.binaryValue, true);
    assert.equal(data.actionPlans[0].updates[0].progressPercentage, 40);
    assert.equal(data.notifications[0].read, false);
    assert.equal(data.users[0].assignedTeamId, undefined);
    assert.deepEqual(database.health(), { engine: 'sqlite', schemaVersion: 1 });
    const sql = new DatabaseSync(filename, { readOnly: true });
    try {
      assert.equal(sql.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get()?.count, 9);
      assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(), []);
      assert.equal(sql.prepare('SELECT name FROM users WHERE id = ?').get('usr_lead_apac')?.name, 'Kenji Sato');
    } finally {
      sql.close();
    }
  } finally {
    database.close();
  }
});

test('scorecard inputs, plans, notifications, and audit records survive reopening', () => {
  const filename = path.join(directory, 'persist.db');
  let database = new DatabaseManager(filename, missingLegacy);
  let expected: DatabaseSchema;
  try {
    database.transaction(() => {
      const submissions = database.get('submissions');
      submissions[1].rawInputs.events_held = { count: 0, notes: "O'Brien's evidence", evidenceName: 'evidence.pdf' };
      database.set('submissions', submissions);
      const plans = database.get('actionPlans');
      plans[0].progressPercentage = 72;
      plans[0].updates.unshift({
        id: 'update_persistent', note: 'Progress persisted', progressPercentage: 72,
        updatedBy: 'Kenji Sato', timestamp: new Date().toISOString(),
      });
      database.set('actionPlans', plans);
      const notifications = database.get('notifications');
      notifications[0].read = true;
      database.set('notifications', notifications);
      database.addAuditLog({
        entityType: 'SCORECARD', entityId: submissions[1].id, action: 'PERSISTENCE_TEST',
        actorId: 'usr_lead_apac', actorName: 'Kenji Sato', actorRole: 'TEAM_LEAD', details: 'Saved',
      });
    });
    expected = snapshot(database);
  } finally {
    database.close();
  }
  database = new DatabaseManager(filename, missingLegacy);
  try {
    assert.deepEqual(snapshot(database), expected);
  } finally {
    database.close();
  }
});

test('failed transactions roll back scorecards, audit logs, and notifications together', () => {
  const database = new DatabaseManager(path.join(directory, 'rollback.db'), missingLegacy);
  try {
    const before = snapshot(database);
    assert.throws(() => database.transaction(() => {
      const submissions = database.get('submissions');
      submissions[1].status = 'DRAFT';
      database.set('submissions', submissions);
      database.addNotification({ title: 'Rolled back', message: 'Must not persist', type: 'SUBMISSION' });
      database.addAuditLog({
        entityType: 'SCORECARD', entityId: submissions[1].id, action: 'FAILURE_TEST',
        actorId: 'unknown_user', actorName: 'Unknown', actorRole: 'TEAM_LEAD', details: 'Invalid FK',
      });
    }), /FOREIGN KEY/);
    assert.deepEqual(snapshot(database), before);
  } finally {
    database.close();
  }
});

test('constraints reject duplicate team/period scorecards and invalid progress without partial writes', () => {
  const database = new DatabaseManager(path.join(directory, 'constraints.db'), missingLegacy);
  try {
    const submissions = database.get('submissions');
    assert.throws(() => database.set('submissions', [
      ...submissions, { ...submissions[1], id: 'duplicate_scorecard' },
    ]), /UNIQUE/);
    assert.deepEqual(database.get('submissions'), submissions);
    const plans = database.get('actionPlans');
    assert.throws(() => database.set('actionPlans', [
      { ...plans[0], progressPercentage: 101 }, plans[1],
    ]), /CHECK/);
    assert.deepEqual(database.get('actionPlans'), plans);
  } finally {
    database.close();
  }
});

test('imports a legacy JSON database once without changing the original file', () => {
  const legacyFile = path.join(directory, 'legacy.json');
  const legacy = snapshot(db);
  legacy.users[0].name = 'Imported Administrator';
  const raw = JSON.stringify(legacy);
  fs.writeFileSync(legacyFile, raw);
  const filename = path.join(directory, 'migrated.db');
  let database = new DatabaseManager(filename, legacyFile);
  try {
    assert.deepEqual(snapshot(database), legacy);
  } finally {
    database.close();
  }
  fs.writeFileSync(legacyFile, 'invalid content ignored after migration');
  database = new DatabaseManager(filename, legacyFile);
  try {
    assert.deepEqual(snapshot(database), legacy);
    assert.equal(fs.readFileSync(legacyFile, 'utf-8'), 'invalid content ignored after migration');
  } finally {
    database.close();
  }
});

test('malformed legacy data stops initialization instead of silently seeding defaults', () => {
  const legacyFile = path.join(directory, 'bad.json');
  fs.writeFileSync(legacyFile, '{"users": []}');
  const filename = path.join(directory, 'bad-import.db');
  assert.throws(() => new DatabaseManager(filename, legacyFile), /missing the communities collection/);
  const sql = new DatabaseSync(filename);
  try {
    assert.equal(sql.prepare('PRAGMA user_version').get()?.user_version, 0);
    assert.equal(sql.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get()?.count, 0);
  } finally {
    sql.close();
  }
  assert.equal(fs.readFileSync(legacyFile, 'utf-8'), '{"users": []}');
});

test('refuses unrelated SQLite schemas and newer schema versions without overwriting data', () => {
  const filename = path.join(directory, 'unrelated.db');
  const sql = new DatabaseSync(filename);
  sql.exec("CREATE TABLE unrelated (name TEXT); INSERT INTO unrelated VALUES ('keep');");
  sql.close();
  assert.throws(() => new DatabaseManager(filename, missingLegacy), /unrecognized database/);
  const existing = new DatabaseSync(filename);
  try {
    assert.equal(existing.prepare('SELECT name FROM unrelated').get()?.name, 'keep');
    existing.exec('PRAGMA user_version = 2');
  } finally {
    existing.close();
  }
  assert.throws(() => new DatabaseManager(filename, missingLegacy), /Unsupported SQLite schema version/);
});

test('resetting demo data is atomic and does not leave stale records', () => {
  const database = new DatabaseManager(path.join(directory, 'reset.db'), missingLegacy);
  try {
    const initial = snapshot(database);
    database.addNotification({ title: 'Temporary', message: 'Reset me', type: 'SUBMISSION' });
    database.resetToDefaults();
    assert.deepEqual(snapshot(database), initial);
  } finally {
    database.close();
  }
});

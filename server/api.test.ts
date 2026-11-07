import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { after, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { KpiSubmission } from '../src/types/index.ts';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'communitylead-api-test-'));
process.env.DATABASE_PATH = path.join(directory, 'api.db');
process.env.GEMINI_API_KEY = '';
const { createApp } = await import('./app.ts');
const { db, DatabaseManager } = await import('./db.ts');
const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${address.port}`;

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
  for (const filename of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, filename));
  fs.rmdirSync(directory);
});

async function request(endpoint: string, method = 'GET', body?: unknown, actorId = 'usr_lead_apac') {
  const actor = db.get('users').find((user) => user.id === actorId);
  assert.ok(actor);
  return fetch(`${baseUrl}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': actor.id,
      'x-user-name': actor.name,
      'x-user-role': actor.role,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('database-backed APIs support the complete persisted workflow', async (suite) => {
  let submission: KpiSubmission;
  let actionPlanId: string;

  await suite.test('health, identities, communities, teams, periods, and filters load', async () => {
    const health = await request('/health');
    assert.equal(health.status, 200);
    assert.deepEqual((await health.json()).database, { engine: 'sqlite', schemaVersion: 1 });
    const endpoints = [
      ['/auth/users', 'users', 7],
      ['/communities', 'communities', 3],
      ['/communities/teams', 'teams', 4],
      ['/periods', 'periods', 3],
    ] as const;
    for (const [endpoint, field, count] of endpoints) {
      const response = await request(endpoint);
      assert.equal(response.status, 200);
      assert.equal((await response.json())[field].length, count);
    }
    const teams = await (await request('/communities/teams?communityId=comm_product')).json();
    assert.equal(teams.teams.length, 1);
    const switched = await request('/auth/switch', 'POST', { userId: 'usr_ops_manager' });
    assert.equal((await switched.json()).user.id, 'usr_ops_manager');
    assert.equal(db.get('auditLogs')[0].action, 'USER_SESSION_SWITCHED');
  });

  await suite.test('draft creation and submission update the same SQL record with audit and notification', async () => {
    const rawInputs = db.get('submissions')[1].rawInputs;
    const payload = {
      periodId: 'period_2026_11', communityId: 'comm_devrel',
      teamId: 'team_devrel_apac', rawInputs, isDraft: true,
    };
    const response = await request('/scorecards/submit', 'POST', payload);
    assert.equal(response.status, 200);
    submission = (await response.json()).submission;
    assert.equal(submission.status, 'DRAFT');
    const submitted = await request('/scorecards/submit', 'POST', {
      ...payload, id: submission.id, isDraft: false,
    });
    assert.equal(submitted.status, 200);
    submission = (await submitted.json()).submission;
    assert.equal(submission.status, 'COMMUNITY_HEAD_REVIEW');
    assert.equal(db.get('submissions').filter((item) => item.id === submission.id).length, 1);
    assert.equal(db.get('auditLogs')[0].entityId, submission.id);
    assert.equal(db.get('notifications')[0].type, 'SUBMISSION');
    const filtered = await (await request('/scorecards?periodId=period_2026_11&teamId=team_devrel_apac')).json();
    assert.deepEqual(filtered.submissions, [submission]);
  });

  await suite.test('head review, operations approval, and locking persist and preserve immutability', async () => {
    for (const [action, actor, expected] of [
      ['HEAD_APPROVE', 'usr_head_devrel', 'OPERATIONS_MANAGER_REVIEW'],
      ['OPS_APPROVE', 'usr_ops_manager', 'APPROVED'],
      ['LOCK_SCORECARD', 'usr_ops_manager', 'LOCKED'],
    ]) {
      const response = await request(`/scorecards/${submission.id}/workflow`, 'POST', {
        action, notes: 'Verified in integration test',
      }, actor);
      assert.equal(response.status, 200);
      submission = (await response.json()).submission;
      assert.equal(submission.status, expected);
    }
    const blocked = await request('/scorecards/submit', 'POST', {
      id: submission.id, periodId: submission.periodId,
      communityId: submission.communityId, teamId: submission.teamId,
      rawInputs: {}, isDraft: true,
    });
    assert.equal(blocked.status, 403);
    assert.deepEqual(db.get('submissions').find((item) => item.id === submission.id), submission);
  });

  await suite.test('action plan creation, human approval, progress history, and completion persist', async () => {
    const response = await request('/actions', 'POST', {
      submissionId: submission.id, periodId: submission.periodId,
      communityId: submission.communityId, teamId: submission.teamId,
      kpiKey: 'events_held', title: "O'Brien's recovery plan",
      recommendedIntervention: 'Schedule additional events', aiGenerated: true,
    });
    assert.equal(response.status, 201);
    const created = (await response.json()).actionPlan;
    actionPlanId = created.id;
    assert.equal(created.status, 'PENDING_APPROVAL');
    const approval = await request(`/actions/${actionPlanId}/approve`, 'POST', undefined, 'usr_head_devrel');
    assert.equal(approval.status, 200);
    assert.equal((await approval.json()).actionPlan.status, 'ACTIVE');
    const update = await request(`/actions/${actionPlanId}/update`, 'POST', {
      note: 'Completed two events', progressPercentage: 100,
    });
    assert.equal(update.status, 200);
    const plan = (await update.json()).actionPlan;
    assert.equal(plan.status, 'RESOLVED');
    assert.equal(plan.updates[0].note, 'Completed two events');
    const plans = await (await request(`/actions?submissionId=${submission.id}`)).json();
    assert.deepEqual(plans.actionPlans, [plan]);
  });

  await suite.test('report exports, notifications, period updates, and scoring tests read SQL data', async () => {
    const report = await request(`/reports/submission/${submission.id}/json`);
    assert.equal(report.status, 200);
    assert.equal((await report.json()).scorecard.id, submission.id);
    const csv = await request(`/reports/submission/${submission.id}/csv`);
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
    assert.match(await csv.text(), /KPI Key/);
    const summary = await request('/reports/summary/csv');
    assert.match(await summary.text(), new RegExp(submission.id));
    const notificationId = db.get('notifications')[0].id;
    const notification = await request(`/audit/notifications/${notificationId}/read`, 'POST');
    assert.equal(notification.status, 200);
    assert.equal(db.get('notifications').find((item) => item.id === notificationId)?.read, true);
    const period = await request('/periods/period_2026_11/status', 'PATCH', { status: 'REVIEWING' }, 'usr_ops_manager');
    assert.equal(period.status, 200);
    assert.equal((await period.json()).period.status, 'REVIEWING');
    const tests = await (await request('/tests/run')).json();
    assert.equal(tests.failedTests, 0);
    const ai = await request('/ai/analyze-scorecard', 'POST', {
      communityName: 'DevRel', teamName: 'APAC', periodName: 'November',
      overallScore: 100, underperformingKpis: [],
    });
    assert.equal(ai.status, 200);
    assert.deepEqual((await ai.json()).analysis.priorityRecommendations, []);
  });

  await suite.test('validation failures return JSON and leave no partial writes', async () => {
    const plansBefore = db.get('actionPlans');
    const auditBefore = db.get('auditLogs');
    const invalid = await request('/actions', 'POST', {
      submissionId: 'nonexistent', kpiKey: 'events_held',
      title: 'Must not persist', recommendedIntervention: 'Invalid reference',
    });
    assert.equal(invalid.status, 400);
    assert.equal(typeof (await invalid.json()).error, 'string');
    assert.deepEqual(db.get('actionPlans'), plansBefore);
    assert.deepEqual(db.get('auditLogs'), auditBefore);
    const progress = await request(`/actions/${actionPlanId}/update`, 'POST', { progressPercentage: 101 });
    assert.equal(progress.status, 400);
    const missing = await request('/audit/notifications/nonexistent/read', 'POST');
    assert.equal(missing.status, 404);
    const invalidInputs = await request('/scorecards/submit', 'POST', {
      periodId: 'period_2026_11', communityId: 'comm_devrel',
      teamId: 'team_devrel_emea', rawInputs: [], isDraft: true,
    });
    assert.equal(invalidInputs.status, 400);
    const unknown = await request('/nonexistent');
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error, 'API endpoint not found');
    const malformed = await fetch(`${baseUrl}/api/actions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"invalid"',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error, 'Invalid request body.');
  });

  await suite.test('another database connection sees the complete committed workflow', () => {
    const reopened = new DatabaseManager(process.env.DATABASE_PATH, path.join(directory, 'missing.json'));
    try {
      assert.deepEqual(reopened.get('submissions').find((item) => item.id === submission.id), submission);
      const plan = reopened.get('actionPlans').find((item) => item.id === actionPlanId);
      assert.equal(plan?.status, 'RESOLVED');
      assert.equal(plan?.progressPercentage, 100);
      assert.equal(reopened.get('auditLogs').some((log) => log.entityId === actionPlanId), true);
      assert.equal(reopened.get('periods').find((period) => period.id === 'period_2026_11')?.status, 'REVIEWING');
    } finally {
      reopened.close();
    }
  });
});

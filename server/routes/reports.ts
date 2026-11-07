import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// Export single scorecard as raw JSON
router.get('/submission/:id/json', (req, res) => {
  const { id } = req.params;
  const submissions = db.get('submissions');
  const submission = submissions.find((s) => s.id === id);

  if (!submission) {
    return res.status(404).json({ error: 'Scorecard not found' });
  }

  const communities = db.get('communities');
  const teams = db.get('teams');
  const periods = db.get('periods');

  const community = communities.find((c) => c.id === submission.communityId);
  const team = teams.find((t) => t.id === submission.teamId);
  const period = periods.find((p) => p.id === submission.periodId);

  const exportPayload = {
    exportVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    scorecard: {
      ...submission,
      communityName: community?.name || submission.communityId,
      teamName: team?.name || submission.teamId,
      periodName: period?.name || submission.periodId,
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="scorecard-${submission.id}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// Export single scorecard as CSV / Excel-compatible format
router.get('/submission/:id/csv', (req, res) => {
  const { id } = req.params;
  const submissions = db.get('submissions');
  const submission = submissions.find((s) => s.id === id);

  if (!submission) {
    return res.status(404).json({ error: 'Scorecard not found' });
  }

  const communities = db.get('communities');
  const teams = db.get('teams');
  const periods = db.get('periods');

  const community = communities.find((c) => c.id === submission.communityId);
  const team = teams.find((t) => t.id === submission.teamId);
  const period = periods.find((p) => p.id === submission.periodId);

  const header = [
    'KPI Key',
    'KPI Name',
    'Category',
    'Weight (%)',
    'Target',
    'Achieved Value',
    'Attainment (%)',
    'Weighted Score (pts)',
    'Status',
    'Submitter Notes',
  ];

  const rows = submission.results.map((r) => {
    const rawNote = submission.rawInputs[r.key]?.notes || '';
    const cleanNote = `"${rawNote.replace(/"/g, '""')}"`;
    return [
      r.key,
      `"${r.name}"`,
      r.category,
      r.weight,
      `"${r.target} ${r.unit}"`,
      r.achievedValue !== null ? `"${r.achievedValue} ${r.unit}"` : 'Pending',
      r.attainmentPercentage !== null ? `${r.attainmentPercentage}%` : 'Pending',
      r.weightedScore.toFixed(2),
      r.status,
      cleanNote,
    ].join(',');
  });

  const metadataRows = [
    `# Community Performance Scorecard Report`,
    `# Period,${period?.name || submission.periodId}`,
    `# Community,"${community?.name || submission.communityId}"`,
    `# Team,"${team?.name || submission.teamId}"`,
    `# Overall Weighted Score,${submission.overallWeightedScore}%`,
    `# Status,${submission.status}`,
    `# Generated,${new Date().toISOString()}`,
    '',
    header.join(','),
    ...rows,
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="scorecard-${submission.id}.csv"`);
  res.send(metadataRows);
});

// Export all scorecards summary CSV
router.get('/summary/csv', (req, res) => {
  const submissions = db.get('submissions');
  const communities = db.get('communities');
  const teams = db.get('teams');
  const periods = db.get('periods');

  const header = [
    'Submission ID',
    'Period',
    'Community',
    'Team',
    'Submitted By',
    'Status',
    'Overall Weighted Score (%)',
    'On Track Count',
    'Needs Attention Count',
    'Pending Count',
    'Submitted At',
  ];

  const rows = submissions.map((s) => {
    const comm = communities.find((c) => c.id === s.communityId);
    const tm = teams.find((t) => t.id === s.teamId);
    const per = periods.find((p) => p.id === s.periodId);

    return [
      s.id,
      per?.name || s.periodId,
      `"${comm?.name || s.communityId}"`,
      `"${tm?.name || s.teamId}"`,
      `"${s.submittedByName}"`,
      s.status,
      s.overallWeightedScore,
      s.onTrackCount,
      s.needsAttentionCount,
      s.pendingCount,
      s.submittedAt || '',
    ].join(',');
  });

  const content = [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="community-performance-summary.csv"');
  res.send(content);
});

export default router;

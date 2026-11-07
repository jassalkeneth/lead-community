import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// List all communities with calculated live stats
router.get('/', (req, res) => {
  const communities = db.get('communities');
  const teams = db.get('teams');
  const submissions = db.get('submissions');

  const enriched = communities.map((comm) => {
    const commTeams = teams.filter((t) => t.communityId === comm.id);
    const commSubmissions = submissions.filter((s) => s.communityId === comm.id);
    
    // Average score across submitted/approved scorecards
    const scores = commSubmissions
      .filter((s) => s.status !== 'DRAFT')
      .map((s) => s.overallWeightedScore);
    const averageScore = scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0;

    return {
      ...comm,
      teamsCount: commTeams.length,
      averageScore,
      totalSubmissions: commSubmissions.length,
    };
  });

  res.json({ communities: enriched });
});

// List all teams or filter by communityId
router.get('/teams', (req, res) => {
  const { communityId } = req.query;
  let teams = db.get('teams');
  if (communityId) {
    teams = teams.filter((t) => t.communityId === communityId);
  }
  res.json({ teams });
});

export default router;

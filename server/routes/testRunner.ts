import { Router } from 'express';
import { runScoringEngineTests, calculateScorecard, SYSTEM_KPI_DEFINITIONS } from '../../src/scoring/scoringEngine.ts';

const router = Router();

// Run all built-in automated scoring engine tests
router.get('/run', (req, res) => {
  const result = runScoringEngineTests();
  res.json(result);
});

// Run custom edge-case test simulation
router.post('/simulate', (req, res) => {
  const { rawInputs, scoreCap } = req.body;
  const calculation = calculateScorecard(rawInputs || {}, SYSTEM_KPI_DEFINITIONS, {
    scoreCap: scoreCap ?? 100,
  });
  res.json({ calculation });
});

export default router;

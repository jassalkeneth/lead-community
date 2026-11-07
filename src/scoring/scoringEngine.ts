import { CalculatedKpiResult, KpiDefinition, RawKpiInput, KpiStatus } from '../types/index.ts';

export const SYSTEM_KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: 'kpi_onboarding_speed',
    key: 'onboarding_speed',
    name: 'Onboarding speed',
    category: 'STUDENT ONBOARDING' as any,
    weight: 15,
    target: 95,
    type: 'ratio',
    unit: '%',
    description: '95% within 48h',
    numeratorLabel: 'Achieved',
    denominatorLabel: 'Total',
    isSystem: true,
  },
  {
    id: 'kpi_onboarding_completeness',
    key: 'onboarding_completeness',
    name: 'Onboarding completeness',
    category: 'STUDENT ONBOARDING' as any,
    weight: 10,
    target: 100,
    type: 'ratio',
    unit: '%',
    description: '100% confirmed',
    numeratorLabel: 'Achieved',
    denominatorLabel: 'Total',
    isSystem: true,
  },
  {
    id: 'kpi_community_engagement',
    key: 'community_engagement',
    name: 'Community engagement',
    category: 'ENGAGEMENT & EVENTS' as any,
    weight: 15,
    target: 60,
    type: 'ratio',
    unit: '%',
    description: '60% weekly active',
    numeratorLabel: 'Achieved',
    denominatorLabel: 'Total',
    isSystem: true,
  },
  {
    id: 'kpi_events_held',
    key: 'events_held',
    name: 'Events held',
    category: 'ENGAGEMENT & EVENTS' as any,
    weight: 10,
    target: 2,
    type: 'count',
    unit: 'events/mo',
    description: '2 events/mo',
    countLabel: 'Total Count',
    isSystem: true,
  },
  {
    id: 'kpi_event_attendance',
    key: 'event_attendance',
    name: 'Event attendance',
    category: 'ENGAGEMENT & EVENTS' as any,
    weight: 5,
    target: 50,
    type: 'ratio',
    unit: '%',
    description: '50% of invited',
    numeratorLabel: 'Achieved',
    denominatorLabel: 'Total',
    isSystem: true,
  },
  {
    id: 'kpi_testimonials_collected',
    key: 'testimonials_collected',
    name: 'Testimonials collected',
    category: 'GROWTH & REFERRALS' as any,
    weight: 10,
    target: 8,
    type: 'count',
    unit: 'collected',
    description: '8 collected',
    countLabel: 'Total Count',
    isSystem: true,
  },
  {
    id: 'kpi_referral_enrollments',
    key: 'referral_enrollments',
    name: 'Referral enrollments',
    category: 'GROWTH & REFERRALS' as any,
    weight: 10,
    target: 3,
    type: 'count',
    unit: 'enrollments',
    description: '3 enrollments',
    countLabel: 'Total Count',
    isSystem: true,
  },
  {
    id: 'kpi_moderation_response',
    key: 'moderation_response',
    name: 'Moderation response',
    category: 'TEAM LEADERSHIP' as any,
    weight: 10,
    target: 90,
    type: 'ratio',
    unit: '%',
    description: '90% under 12h',
    numeratorLabel: 'Achieved',
    denominatorLabel: 'Total',
    isSystem: true,
  },
  {
    id: 'kpi_team_kpi_attainment',
    key: 'team_kpi_attainment',
    name: 'Team KPI attainment',
    category: 'TEAM LEADERSHIP' as any,
    weight: 10,
    target: 1, // 1 for Yes
    type: 'binary',
    unit: 'Target: Yes',
    description: 'Target: Yes',
    isSystem: true,
  },
  {
    id: 'kpi_monthly_report_on_time',
    key: 'monthly_report_on_time',
    name: 'Monthly report on time',
    category: 'ADMIN' as any,
    weight: 5,
    target: 1, // 1 for Yes
    type: 'binary',
    unit: 'Target: Yes',
    description: 'Target: Yes',
    isSystem: true,
  },
];

export interface ScoringEngineConfig {
  scoreCap?: number; // default 100, can be set to 120
  onTrackThreshold?: number; // default 90% attainment
}

export interface ScorecardCalculationOutput {
  results: CalculatedKpiResult[];
  overallWeightedScore: number;
  provisionalScore: number;
  isProvisional: boolean;
  totalValidWeights: number;
  onTrackCount: number;
  needsAttentionCount: number;
  pendingCount: number;
}

/**
 * Validates raw inputs for logical consistency
 */
export function validateKpiInput(def: KpiDefinition, input?: RawKpiInput): string | undefined {
  if (!input) return undefined;

  if (def.type === 'ratio') {
    if (input.numerator !== undefined && input.numerator !== null) {
      if (input.numerator < 0) return 'Numerator cannot be negative';
    }
    if (input.denominator !== undefined && input.denominator !== null) {
      if (input.denominator < 0) return 'Denominator cannot be negative';
    }
    if (
      input.numerator !== undefined &&
      input.numerator !== null &&
      input.denominator !== undefined &&
      input.denominator !== null
    ) {
      if (input.numerator > input.denominator && input.denominator > 0) {
        // In some specific circumstances attendance might have walk-ins, but we warn
        // Keep it valid but note if desired
      }
    }
  } else if (def.type === 'count') {
    if (input.count !== undefined && input.count !== null) {
      if (input.count < 0) return 'Count value cannot be negative';
    }
  }

  return undefined;
}

/**
 * Computes individual KPI result strictly following requirements:
 * - Missing fields -> Pending
 * - Zero denominator ratios -> Pending (Division by zero protected)
 * - Explicit submitted 0 counts -> Needs Attention (attainment 0%)
 * - Attainment score capped at scoreCap (default 100%)
 */
export function calculateSingleKpi(
  def: KpiDefinition,
  input: RawKpiInput | undefined,
  config: ScoringEngineConfig = { scoreCap: 100, onTrackThreshold: 90 }
): CalculatedKpiResult {
  const cap = config.scoreCap ?? 100;
  const threshold = config.onTrackThreshold ?? 90;
  const valError = validateKpiInput(def, input);

  if (valError) {
    return {
      key: def.key,
      name: def.name,
      category: def.category,
      weight: def.weight,
      target: def.target,
      type: def.type,
      unit: def.unit,
      achievedValue: null,
      attainmentPercentage: null,
      weightedScore: 0,
      status: 'Pending',
      isMissing: true,
      isZeroDenominator: false,
      isExplicitZero: false,
      validationError: valError,
    };
  }

  if (def.type === 'ratio') {
    const num = input?.numerator;
    const den = input?.denominator;

    // Check if missing
    if (num === undefined || num === null || den === undefined || den === null) {
      return {
        key: def.key,
        name: def.name,
        category: def.category,
        weight: def.weight,
        target: def.target,
        type: def.type,
        unit: def.unit,
        achievedValue: null,
        attainmentPercentage: null,
        weightedScore: 0,
        status: 'Pending',
        isMissing: true,
        isZeroDenominator: false,
        isExplicitZero: false,
      };
    }

    // Zero-denominator ratio -> Pending
    if (den === 0) {
      return {
        key: def.key,
        name: def.name,
        category: def.category,
        weight: def.weight,
        target: def.target,
        type: def.type,
        unit: def.unit,
        achievedValue: null,
        attainmentPercentage: null,
        weightedScore: 0,
        status: 'Pending',
        isMissing: false,
        isZeroDenominator: true,
        isExplicitZero: false,
      };
    }

    // Valid ratio
    const rawRatio = (num / den) * 100;
    // Attainment against target
    // e.g. If target is 95% and rawRatio is 90%, attainment is (90 / 95) * 100 = 94.74%
    // If rawRatio is 95%, attainment is 100%
    const rawAttainment = (rawRatio / def.target) * 100;
    const attainment = Math.min(cap, Math.max(0, rawAttainment));
    const weightedScore = (attainment * def.weight) / 100;
    const status: KpiStatus = attainment >= threshold ? 'On Track' : 'Needs Attention';

    return {
      key: def.key,
      name: def.name,
      category: def.category,
      weight: def.weight,
      target: def.target,
      type: def.type,
      unit: def.unit,
      achievedValue: Number(rawRatio.toFixed(2)),
      attainmentPercentage: Number(attainment.toFixed(2)),
      weightedScore: Number(weightedScore.toFixed(3)),
      status,
      isMissing: false,
      isZeroDenominator: false,
      isExplicitZero: num === 0,
    };
  }

  if (def.type === 'count') {
    const countVal = input?.count;

    if (countVal === undefined || countVal === null) {
      return {
        key: def.key,
        name: def.name,
        category: def.category,
        weight: def.weight,
        target: def.target,
        type: def.type,
        unit: def.unit,
        achievedValue: null,
        attainmentPercentage: null,
        weightedScore: 0,
        status: 'Pending',
        isMissing: true,
        isZeroDenominator: false,
        isExplicitZero: false,
      };
    }

    // Explicit submitted zero count -> Needs Attention
    if (countVal === 0) {
      return {
        key: def.key,
        name: def.name,
        category: def.category,
        weight: def.weight,
        target: def.target,
        type: def.type,
        unit: def.unit,
        achievedValue: 0,
        attainmentPercentage: 0,
        weightedScore: 0,
        status: 'Needs Attention',
        isMissing: false,
        isZeroDenominator: false,
        isExplicitZero: true,
      };
    }

    // Attainment
    const rawAttainment = (countVal / def.target) * 100;
    const attainment = Math.min(cap, Math.max(0, rawAttainment));
    const weightedScore = (attainment * def.weight) / 100;
    const status: KpiStatus = attainment >= threshold ? 'On Track' : 'Needs Attention';

    return {
      key: def.key,
      name: def.name,
      category: def.category,
      weight: def.weight,
      target: def.target,
      type: def.type,
      unit: def.unit,
      achievedValue: countVal,
      attainmentPercentage: Number(attainment.toFixed(2)),
      weightedScore: Number(weightedScore.toFixed(3)),
      status,
      isMissing: false,
      isZeroDenominator: false,
      isExplicitZero: false,
    };
  }

  if (def.type === 'binary') {
    const binVal = input?.binaryValue;

    if (binVal === undefined || binVal === null) {
      return {
        key: def.key,
        name: def.name,
        category: def.category,
        weight: def.weight,
        target: def.target,
        type: def.type,
        unit: def.unit,
        achievedValue: null,
        attainmentPercentage: null,
        weightedScore: 0,
        status: 'Pending',
        isMissing: true,
        isZeroDenominator: false,
        isExplicitZero: false,
      };
    }

    const attainment = binVal ? 100 : 0;
    const weightedScore = (attainment * def.weight) / 100;
    const status: KpiStatus = binVal ? 'On Track' : 'Needs Attention';

    return {
      key: def.key,
      name: def.name,
      category: def.category,
      weight: def.weight,
      target: def.target,
      type: def.type,
      unit: def.unit,
      achievedValue: binVal ? 100 : 0,
      attainmentPercentage: attainment,
      weightedScore: Number(weightedScore.toFixed(3)),
      status,
      isMissing: false,
      isZeroDenominator: false,
      isExplicitZero: !binVal,
    };
  }

  // Fallback
  return {
    key: def.key,
    name: def.name,
    category: def.category,
    weight: def.weight,
    target: def.target,
    type: def.type,
    unit: def.unit,
    achievedValue: null,
    attainmentPercentage: null,
    weightedScore: 0,
    status: 'Pending',
    isMissing: true,
    isZeroDenominator: false,
    isExplicitZero: false,
  };
}

/**
 * Calculates complete scorecard across all 10 KPIs
 */
export function calculateScorecard(
  rawInputs: Record<string, RawKpiInput>,
  definitions: KpiDefinition[] = SYSTEM_KPI_DEFINITIONS,
  config: ScoringEngineConfig = { scoreCap: 100, onTrackThreshold: 90 }
): ScorecardCalculationOutput {
  const results: CalculatedKpiResult[] = [];
  let sumWeightedScores = 0;
  let totalValidWeights = 0;
  let onTrackCount = 0;
  let needsAttentionCount = 0;
  let pendingCount = 0;

  for (const def of definitions) {
    const input = rawInputs[def.key];
    const res = calculateSingleKpi(def, input, config);
    results.push(res);

    if (res.status === 'On Track') {
      onTrackCount++;
    } else if (res.status === 'Needs Attention') {
      needsAttentionCount++;
    } else {
      pendingCount++;
    }

    if (res.attainmentPercentage !== null) {
      sumWeightedScores += res.weightedScore;
      totalValidWeights += def.weight;
    }
  }

  const isProvisional = pendingCount > 0;
  // Overall weighted score based on standard 100% total weight
  const overallWeightedScore = Number(sumWeightedScores.toFixed(2));
  // Provisional run-rate score: adjusted for the proportion of completed weights
  const provisionalScore =
    totalValidWeights > 0
      ? Number(((sumWeightedScores / totalValidWeights) * 100).toFixed(2))
      : 0;

  return {
    results,
    overallWeightedScore,
    provisionalScore,
    isProvisional,
    totalValidWeights,
    onTrackCount,
    needsAttentionCount,
    pendingCount,
  };
}

/**
 * Comprehensive Automated Test Suite
 * Evaluates all 10 KPIs, invalid inputs, division-by-zero, explicit zero vs missing,
 * capping, and provisional calculations.
 */
export interface TestCaseResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export function runScoringEngineTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestCaseResult[];
} {
  const testResults: TestCaseResult[] = [];

  const addTest = (
    id: string,
    category: string,
    name: string,
    condition: boolean,
    expected: string,
    actual: string,
    details?: string
  ) => {
    testResults.push({
      id,
      category,
      name,
      passed: condition,
      expected,
      actual,
      details,
    });
  };

  // 1. Total Weight verification
  const totalWeight = SYSTEM_KPI_DEFINITIONS.reduce((acc, k) => acc + k.weight, 0);
  addTest(
    'T01_WEIGHT_SUM',
    'Schema',
    'Sum of 10 KPI weights must equal 100%',
    totalWeight === 100,
    '100%',
    `${totalWeight}%`
  );

  // 2. Division-by-Zero Protection
  const onboardingDef = SYSTEM_KPI_DEFINITIONS.find((k) => k.key === 'onboarding_speed')!;
  const divZeroRes = calculateSingleKpi(onboardingDef, { numerator: 0, denominator: 0 });
  addTest(
    'T02_DIV_ZERO',
    'Edge Case',
    'Ratio with denominator = 0 returns Pending without division-by-zero crash',
    divZeroRes.status === 'Pending' && divZeroRes.isZeroDenominator === true && divZeroRes.attainmentPercentage === null,
    'status: Pending, isZeroDenominator: true',
    `status: ${divZeroRes.status}, isZeroDenominator: ${divZeroRes.isZeroDenominator}`
  );

  // 3. Missing vs. Explicit Zero Count (Needs Attention vs. Pending)
  const eventsDef = SYSTEM_KPI_DEFINITIONS.find((k) => k.key === 'events_held')!;
  const missingEventsRes = calculateSingleKpi(eventsDef, {});
  addTest(
    'T03_MISSING_COUNT',
    'Input Validation',
    'Missing count field evaluates to Pending status',
    missingEventsRes.status === 'Pending' && missingEventsRes.isMissing === true,
    'status: Pending, isMissing: true',
    `status: ${missingEventsRes.status}, isMissing: ${missingEventsRes.isMissing}`
  );

  const zeroEventsRes = calculateSingleKpi(eventsDef, { count: 0 });
  addTest(
    'T04_EXPLICIT_ZERO_COUNT',
    'Input Validation',
    'Explicit submitted 0 count evaluates to Needs Attention with 0% attainment',
    zeroEventsRes.status === 'Needs Attention' && zeroEventsRes.attainmentPercentage === 0 && zeroEventsRes.isExplicitZero === true,
    'status: Needs Attention, attainment: 0%, isExplicitZero: true',
    `status: ${zeroEventsRes.status}, attainment: ${zeroEventsRes.attainmentPercentage}%, isExplicitZero: ${zeroEventsRes.isExplicitZero}`
  );

  // 4. Score Capping
  // Testimonials target is 8. If 16 collected, raw is 200%. Should cap at 100% by default
  const testimonialsDef = SYSTEM_KPI_DEFINITIONS.find((k) => k.key === 'testimonials_collected')!;
  const cappedRes = calculateSingleKpi(testimonialsDef, { count: 16 }, { scoreCap: 100 });
  addTest(
    'T05_SCORE_CAPPING',
    'Calculation Engine',
    'Attainment is capped at configured maximum (100%)',
    cappedRes.attainmentPercentage === 100 && cappedRes.weightedScore === 10,
    'attainment: 100%, weightedScore: 10',
    `attainment: ${cappedRes.attainmentPercentage}%, weightedScore: ${cappedRes.weightedScore}`
  );

  // 5. Binary Scoring (Yes/No)
  const reportOnTimeDef = SYSTEM_KPI_DEFINITIONS.find((k) => k.key === 'monthly_report_on_time')!;
  const onTimeYes = calculateSingleKpi(reportOnTimeDef, { binaryValue: true });
  const onTimeNo = calculateSingleKpi(reportOnTimeDef, { binaryValue: false });
  addTest(
    'T06_BINARY_SCORING',
    'Calculation Engine',
    'Binary metric awards 100% attainment for Yes and 0% for No',
    onTimeYes.attainmentPercentage === 100 && onTimeNo.attainmentPercentage === 0 && onTimeNo.status === 'Needs Attention',
    'Yes: 100% (On Track), No: 0% (Needs Attention)',
    `Yes: ${onTimeYes.attainmentPercentage}%, No: ${onTimeNo.attainmentPercentage}%`
  );

  // 6. Negative Value Rejection
  const negValidation = validateKpiInput(eventsDef, { count: -5 });
  addTest(
    'T07_NEGATIVE_VALIDATION',
    'Input Validation',
    'Negative counts are flagged as validation errors',
    negValidation !== undefined,
    'Validation error returned',
    negValidation || 'No error'
  );

  // 7. Provisional Score Calculation for Incomplete Submissions
  const partialInputs: Record<string, RawKpiInput> = {
    onboarding_speed: { numerator: 95, denominator: 100 }, // 95% ratio vs 95 target = 100% attainment (15 pts)
    events_held: { count: 2 }, // 2 events vs 2 target = 100% attainment (10 pts)
    // Other 8 KPIs are omitted (missing)
  };
  const partialScorecard = calculateScorecard(partialInputs);
  addTest(
    'T08_PROVISIONAL_CALC',
    'Provisional Scoring',
    'Incomplete submission flagged as provisional with accurate normalized score',
    partialScorecard.isProvisional === true &&
      partialScorecard.pendingCount === 8 &&
      partialScorecard.totalValidWeights === 25 &&
      partialScorecard.provisionalScore === 100,
    'isProvisional: true, pendingCount: 8, provisionalScore: 100%',
    `isProvisional: ${partialScorecard.isProvisional}, pendingCount: ${partialScorecard.pendingCount}, provisionalScore: ${partialScorecard.provisionalScore}%`
  );

  // 8. Full Perfect Scorecard Test (100% attainment on all 10 KPIs)
  const perfectInputs: Record<string, RawKpiInput> = {
    onboarding_speed: { numerator: 95, denominator: 100 }, // target 95% -> 100%
    onboarding_completeness: { numerator: 50, denominator: 50 }, // target 100% -> 100%
    community_engagement: { numerator: 60, denominator: 100 }, // target 60% -> 100%
    events_held: { count: 2 }, // target 2 -> 100%
    event_attendance: { numerator: 50, denominator: 100 }, // target 50% -> 100%
    testimonials_collected: { count: 8 }, // target 8 -> 100%
    referral_enrollments: { count: 3 }, // target 3 -> 100%
    moderation_response: { numerator: 90, denominator: 100 }, // target 90% -> 100%
    team_kpi_attainment: { binaryValue: true }, // target Yes -> 100%
    monthly_report_on_time: { binaryValue: true }, // target Yes -> 100%
  };
  const perfectScorecard = calculateScorecard(perfectInputs);
  addTest(
    'T09_PERFECT_SCORECARD',
    'Aggregate Scoring',
    'Target-hitting values across all 10 KPIs yield exactly 100.00 overall score',
    perfectScorecard.overallWeightedScore === 100 &&
      perfectScorecard.onTrackCount === 10 &&
      perfectScorecard.needsAttentionCount === 0 &&
      perfectScorecard.pendingCount === 0,
    'overallWeightedScore: 100.00, onTrackCount: 10',
    `overallWeightedScore: ${perfectScorecard.overallWeightedScore}, onTrackCount: ${perfectScorecard.onTrackCount}`
  );

  // 9. Realistic Sub-Par Scorecard Test
  const realisticInputs: Record<string, RawKpiInput> = {
    onboarding_speed: { numerator: 70, denominator: 100 }, // 70% / 95% = 73.68% * 15 = 11.052 pts
    onboarding_completeness: { numerator: 45, denominator: 50 }, // 90% / 100% = 90% * 10 = 9 pts
    community_engagement: { numerator: 40, denominator: 100 }, // 40% / 60% = 66.67% * 15 = 10 pts
    events_held: { count: 1 }, // 1 / 2 = 50% * 10 = 5 pts
    event_attendance: { numerator: 30, denominator: 100 }, // 30% / 50% = 60% * 5 = 3 pts
    testimonials_collected: { count: 4 }, // 4 / 8 = 50% * 10 = 5 pts
    referral_enrollments: { count: 1 }, // 1 / 3 = 33.33% * 10 = 3.333 pts
    moderation_response: { numerator: 80, denominator: 100 }, // 80% / 90% = 88.89% * 10 = 8.889 pts
    team_kpi_attainment: { binaryValue: false }, // 0% * 10 = 0 pts
    monthly_report_on_time: { binaryValue: true }, // 100% * 5 = 5 pts
  };
  const realisticScorecard = calculateScorecard(realisticInputs);
  addTest(
    'T10_REALISTIC_SCORING',
    'Aggregate Scoring',
    'Real-world sub-par scorecard accurately flags Needs Attention metrics and computes sum',
    realisticScorecard.needsAttentionCount >= 7 &&
      realisticScorecard.overallWeightedScore > 50 &&
      realisticScorecard.overallWeightedScore < 70,
    'needsAttentionCount >= 7, score in [50, 70]',
    `needsAttentionCount: ${realisticScorecard.needsAttentionCount}, score: ${realisticScorecard.overallWeightedScore}`
  );

  const passedTests = testResults.filter((t) => t.passed).length;
  const failedTests = testResults.length - passedTests;

  return {
    allPassed: failedTests === 0,
    totalTests: testResults.length,
    passedTests,
    failedTests,
    results: testResults,
  };
}

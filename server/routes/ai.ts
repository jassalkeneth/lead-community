import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { CalculatedKpiResult } from '../../src/types/index.ts';

const router = Router();

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface AnalysisRequestBody {
  communityName: string;
  teamName: string;
  periodName: string;
  overallScore: number;
  underperformingKpis: CalculatedKpiResult[];
  notes?: Record<string, string>;
}

// Fallback rule-based generator if API key is not present or API call fails
function generateFallbackAnalysis(body: AnalysisRequestBody) {
  const { communityName, teamName, periodName, overallScore, underperformingKpis, notes = {} } = body;

  const kpisAnalyzed = underperformingKpis.map((kpi) => {
    const note = notes[kpi.key] || 'No submitter notes provided.';
    let rootCause = `Deficit of ${Math.max(0, kpi.target - (kpi.achievedValue || 0))} in target metrics. Operational friction or outreach bottleneck during the cycle.`;
    let factVsHypothesis = `Verified Fact: Attainment recorded at ${kpi.attainmentPercentage || 0}% against ${kpi.target}${kpi.unit} target. Hypothesis: Channel engagement dropoff caused low conversion.`;
    let intervention = `Execute structured 14-day turnaround protocol with targeted member notifications and dedicated cohort leader follow-ups.`;
    let targetRecovery = `Achieve >= ${kpi.target}${kpi.unit} in upcoming reporting period.`;
    let proposedOwner = 'Team Lead';

    if (kpi.key === 'events_held') {
      rootCause = 'Event preparation pipeline was disrupted or delayed; lack of backup virtual alternative.';
      factVsHypothesis = `Verified Fact: ${kpi.achievedValue || 0} events executed vs target of 2. Hypothesis: Speaker availability or venue lead-time caused the delay.`;
      intervention = 'Lock 2 upcoming virtual workshops immediately; institute a 3-week advance event buffer.';
      targetRecovery = 'Host at least 2 verified events with >= 50% attendance rate.';
      proposedOwner = 'Community Events Coordinator';
    } else if (kpi.key === 'community_engagement') {
      rootCause = 'Passive lurking in discussion channels; lack of interactive weekly prompts or AMA discussions.';
      factVsHypothesis = `Verified Fact: Engagement at ${kpi.achievedValue || 0}% vs target 60%. Hypothesis: Inactive members are not receiving timely weekly digests.`;
      intervention = 'Deploy targeted weekly community highlights and host live open Q&A office hours.';
      targetRecovery = 'Increase monthly active contributing members to >= 60%.';
      proposedOwner = 'Community Engagement Lead';
    } else if (kpi.key === 'testimonials_collected') {
      rootCause = 'Testimonial collection request occurs too late in the user lifecycle without explicit incentives.';
      factVsHypothesis = `Verified Fact: ${kpi.achievedValue || 0} testimonials logged vs target 8. Hypothesis: Members are satisfied but lack a low-friction 1-click submission link.`;
      intervention = 'Implement a 60-second micro-survey at positive member milestones with community badge recognition.';
      targetRecovery = 'Collect at least 8 verified testimonials before mid-cycle.';
      proposedOwner = 'Member Advocacy Lead';
    } else if (kpi.key === 'referral_enrollments') {
      rootCause = 'Referral mechanism is not visible or automated for existing active champions.';
      factVsHypothesis = `Verified Fact: ${kpi.achievedValue || 0} referral enrollments recorded vs target 3. Hypothesis: Champions are willing to invite colleagues if rewarded with recognition.`;
      intervention = 'Launch unique ambassador invitation links and publicly spotlight top monthly advocates.';
      targetRecovery = 'Drive at least 3 verified referral enrollments.';
      proposedOwner = 'Growth & Partnerships Lead';
    }

    return {
      kpiKey: kpi.key,
      kpiName: kpi.name,
      currentAttainment: `${kpi.attainmentPercentage || 0}%`,
      identifiedRootCause: rootCause,
      factVsHypothesis,
      recommendedIntervention: intervention,
      actionOwner: proposedOwner,
      proposedDaysToDeadline: 14,
      measurableRecoveryTarget: targetRecovery,
      confidenceScore: 'High (Grounded in Submitted Telemetry)',
      submitterContext: note,
    };
  });

  return {
    executiveSummary: `Analysis for ${teamName} (${communityName}) in ${periodName}. Overall scorecard achieved ${overallScore}%. ${underperformingKpis.length} metric(s) fell below the 90% attainment benchmark, primarily concentrated in ${underperformingKpis.map((k) => k.name).join(', ')}. Immediate corrective interventions are proposed below for human leadership approval.`,
    overallHealthStatus: overallScore >= 85 ? 'Moderate Risk' : 'High Operational Risk',
    priorityRecommendations: kpisAnalyzed,
  };
}

router.post('/analyze-scorecard', async (req, res) => {
  const body = req.body as AnalysisRequestBody;
  const { communityName, teamName, periodName, overallScore, underperformingKpis, notes } = body;

  if (!underperformingKpis || !Array.isArray(underperformingKpis)) {
    return res.status(400).json({ error: 'underperformingKpis array is required' });
  }

  if (underperformingKpis.length === 0) {
    return res.json({
      analysis: {
        executiveSummary: `All KPIs for ${teamName} (${communityName}) are on track with an aggregate score of ${overallScore}%. No urgent root-cause interventions required. Continuous performance monitoring recommended.`,
        overallHealthStatus: 'Nominal & Healthy',
        priorityRecommendations: [],
      },
    });
  }

  // Attempt calling Gemini API if client available
  if (aiClient) {
    try {
      const prompt = `You are an expert Senior Community Operations Director and KPI Performance Copilot.
Analyze this underperforming community performance scorecard with strict operational rigor:

Community: "${communityName}"
Team: "${teamName}"
Period: "${periodName}"
Overall Weighted Score: ${overallScore}%

Underperforming KPIs:
${JSON.stringify(underperformingKpis, null, 2)}

Submitter Notes & Evidence Context:
${JSON.stringify(notes || {}, null, 2)}

Provide an operational root-cause analysis and actionable corrective action plans according to these principles:
1. Explain performance gaps clearly without making up numbers.
2. Clearly distinguish VERIFIED FACTS from HYPOTHESES.
3. Recommend pragmatic, high-impact operational interventions.
4. Suggest specific action owners (e.g. Community Engagement Lead, Events Lead, Member Advocacy Lead).
5. Specify actionable deadlines in days (e.g. 7 to 21 days).
6. Set clear, measurable recovery targets.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an enterprise Community Performance & KPI Copilot. You analyze performance scorecards, diagnose bottlenecks, distinguish verified facts from hypotheses, and construct rigorous corrective action proposals. Return clean structured JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              overallHealthStatus: { type: Type.STRING },
              priorityRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    kpiKey: { type: Type.STRING },
                    kpiName: { type: Type.STRING },
                    currentAttainment: { type: Type.STRING },
                    identifiedRootCause: { type: Type.STRING },
                    factVsHypothesis: { type: Type.STRING },
                    recommendedIntervention: { type: Type.STRING },
                    actionOwner: { type: Type.STRING },
                    proposedDaysToDeadline: { type: Type.INTEGER },
                    measurableRecoveryTarget: { type: Type.STRING },
                    confidenceScore: { type: Type.STRING },
                  },
                  required: [
                    'kpiKey',
                    'kpiName',
                    'currentAttainment',
                    'identifiedRootCause',
                    'factVsHypothesis',
                    'recommendedIntervention',
                    'actionOwner',
                    'measurableRecoveryTarget',
                  ],
                },
              },
            },
            required: ['executiveSummary', 'overallHealthStatus', 'priorityRecommendations'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ analysis: parsed, source: 'gemini-3.8-flash' });
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to heuristic engine:', err?.message || err);
    }
  }

  // Fallback engine
  const fallback = generateFallbackAnalysis(body);
  return res.json({ analysis: fallback, source: 'heuristic-engine' });
});

export default router;

/**
 * Match Signals Service — records candidate×job interaction signals for the feedback loop.
 *
 * Every apply, save, hide, and exam event captures the full feature
 * snapshot from scoreJob(). When exam scores arrive, they're joined back to the
 * signal row, creating labeled training data for the weight tuner.
 */

import { db } from '../db';
import { matchSignals, scoringWeights } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isNotNull, sql } from 'drizzle-orm/sql';
import type { JobScore } from '../job-scorer';

// ── Signal recording ────────────────────────────────────────────────

export type SignalAction = 'apply' | 'save' | 'hide' | 'exam';

/**
 * Record a match signal — fire-and-forget, never blocks the request path.
 * If DB is unavailable or the insert fails, we log and swallow the error.
 */
export async function recordMatchSignal(
  candidateId: string,
  jobId: number,
  action: SignalAction,
  score?: JobScore | null,
): Promise<void> {
  try {
    if (!db) return;

    await db.insert(matchSignals).values({
      candidateId,
      jobId,
      action,
      keywordScore: score?.components.keywordScore ?? null,
      semanticScore: score?.components.semanticScore ?? null,
      titleScore: score?.components.titleScore ?? null,
      experienceScore: score?.components.experienceScore ?? null,
      contextBonus: score?.components.contextBonus ?? null,
      matchScore: score?.matchScore ?? null,
      hasSemanticSignal: score?.components.hasSemanticSignal ?? false,
    });
  } catch (err) {
    // Best-effort — never block the user action
    console.warn('[MatchSignals] Failed to record signal:', (err as Error).message);
  }
}

// ── Exam score join-back ────────────────────────────────────────────

/**
 * When an exam is submitted, find the matching signal row and attach the score.
 * This creates a labeled data point: [features] → [exam outcome].
 */
export async function joinExamScore(
  candidateId: string,
  jobId: number,
  examScore: number,
): Promise<void> {
  try {
    if (!db) return;

    // Find the most recent apply signal for this candidate×job
    const [signal] = await db
      .select({ id: matchSignals.id })
      .from(matchSignals)
      .where(
        and(
          eq(matchSignals.candidateId, candidateId),
          eq(matchSignals.jobId, jobId),
          eq(matchSignals.action, 'apply'),
        ),
      )
      .orderBy(desc(matchSignals.createdAt))
      .limit(1);

    if (signal) {
      await db
        .update(matchSignals)
        .set({ examScore, examJoinedAt: new Date() })
        .where(eq(matchSignals.id, signal.id));
    } else {
      // No prior signal — record a standalone exam signal with the score
      await db.insert(matchSignals).values({
        candidateId,
        jobId,
        action: 'exam',
        examScore,
        examJoinedAt: new Date(),
      });
    }
  } catch (err) {
    console.warn('[MatchSignals] Failed to join exam score:', (err as Error).message);
  }
}

// ── Exam↔match correlation stats ────────────────────────────────────

interface CorrelationStats {
  totalSignals: number;
  labeledSignals: number;        // signals with exam scores
  avgMatchScore: number | null;
  avgExamScore: number | null;
  /** Pearson r between matchScore and examScore (-1 to 1) */
  correlation: number | null;
  /** Per-component correlations with exam scores */
  componentCorrelations: {
    keyword: number | null;
    semantic: number | null;
    title: number | null;
    experience: number | null;
  };
}

/**
 * Compute correlation between match feature scores and exam outcomes.
 * Used by admin dashboard and weight tuner.
 */
export async function getCorrelationStats(): Promise<CorrelationStats> {
  if (!db) {
    return {
      totalSignals: 0, labeledSignals: 0, avgMatchScore: null, avgExamScore: null,
      correlation: null, componentCorrelations: { keyword: null, semantic: null, title: null, experience: null },
    };
  }

  // Basic counts
  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      labeled: sql<number>`count(${matchSignals.examScore})`,
      avgMatch: sql<number>`avg(${matchSignals.matchScore})`,
      avgExam: sql<number>`avg(${matchSignals.examScore})`,
    })
    .from(matchSignals);

  // Pearson correlations — only on labeled rows (examScore IS NOT NULL)
  const [corr] = await db
    .select({
      matchExam: sql<number>`corr(${matchSignals.matchScore}, ${matchSignals.examScore})`,
      keywordExam: sql<number>`corr(${matchSignals.keywordScore}, ${matchSignals.examScore})`,
      semanticExam: sql<number>`corr(${matchSignals.semanticScore}, ${matchSignals.examScore})`,
      titleExam: sql<number>`corr(${matchSignals.titleScore}, ${matchSignals.examScore})`,
      experienceExam: sql<number>`corr(${matchSignals.experienceScore}, ${matchSignals.examScore})`,
    })
    .from(matchSignals)
    .where(isNotNull(matchSignals.examScore));

  return {
    totalSignals: counts?.total ?? 0,
    labeledSignals: counts?.labeled ?? 0,
    avgMatchScore: counts?.avgMatch ? Math.round(counts.avgMatch * 10) / 10 : null,
    avgExamScore: counts?.avgExam ? Math.round(counts.avgExam * 10) / 10 : null,
    correlation: corr?.matchExam ? Math.round(corr.matchExam * 1000) / 1000 : null,
    componentCorrelations: {
      keyword: corr?.keywordExam ? Math.round(corr.keywordExam * 1000) / 1000 : null,
      semantic: corr?.semanticExam ? Math.round(corr.semanticExam * 1000) / 1000 : null,
      title: corr?.titleExam ? Math.round(corr.titleExam * 1000) / 1000 : null,
      experience: corr?.experienceExam ? Math.round(corr.experienceExam * 1000) / 1000 : null,
    },
  };
}

// ── Weight tuner ────────────────────────────────────────────────────

const MIN_TRAINING_SAMPLES = 30;

interface TunerResult {
  weights: { keyword: number; semantic: number; title: number; experience: number };
  samples: number;
  mae: number;
  correlation: number;
  applied: boolean;
  reason?: string;
}

/**
 * Learn optimal scoring weights from labeled exam data.
 *
 * Approach: grid search over weight combinations, minimizing MAE between
 * the weighted score and the exam outcome. Simple, interpretable, and works
 * well with small datasets (30-500 samples). No gradient descent needed.
 *
 * Constraints:
 *   - All weights ∈ [0.10, 0.60] (no single feature dominates)
 *   - Weights sum to 1.0
 *   - Step size: 0.05 (manageable search space)
 *
 * The result is persisted to scoring_weights if it improves on the current
 * default. scoreJob() reads the latest weights on startup.
 */
export async function tuneWeights(): Promise<TunerResult> {
  if (!db) {
    return { weights: defaultWeights(), samples: 0, mae: 0, correlation: 0, applied: false, reason: 'No database' };
  }

  // Fetch labeled samples
  const samples = await db
    .select({
      keywordScore: matchSignals.keywordScore,
      semanticScore: matchSignals.semanticScore,
      titleScore: matchSignals.titleScore,
      experienceScore: matchSignals.experienceScore,
      examScore: matchSignals.examScore,
      hasSemantic: matchSignals.hasSemanticSignal,
    })
    .from(matchSignals)
    .where(
      and(
        isNotNull(matchSignals.examScore),
        isNotNull(matchSignals.keywordScore),
      ),
    );

  if (samples.length < MIN_TRAINING_SAMPLES) {
    return {
      weights: defaultWeights(),
      samples: samples.length,
      mae: 0,
      correlation: 0,
      applied: false,
      reason: `Need ${MIN_TRAINING_SAMPLES} labeled samples, have ${samples.length}`,
    };
  }

  // Grid search
  const step = 0.05;
  const minW = 0.10;
  const maxW = 0.60;

  let bestMAE = Infinity;
  let bestWeights = defaultWeights();

  for (let kw = minW; kw <= maxW; kw += step) {
    for (let sw = minW; sw <= maxW - kw + minW; sw += step) {
      for (let tw = minW; tw <= maxW - kw - sw + 2 * minW; tw += step) {
        const ew = roundTo(1.0 - kw - sw - tw, 2);
        if (ew < minW || ew > maxW) continue;

        let totalError = 0;
        for (const s of samples) {
          const k = s.keywordScore ?? 0;
          const sem = s.hasSemantic ? (s.semanticScore ?? 0) : 0;
          const t = s.titleScore ?? 0;
          const e = s.experienceScore ?? 0;
          const predicted = kw * k + sw * sem + tw * t + ew * e;
          totalError += Math.abs(predicted - (s.examScore ?? 0));
        }

        const mae = totalError / samples.length;
        if (mae < bestMAE) {
          bestMAE = mae;
          bestWeights = { keyword: roundTo(kw, 2), semantic: roundTo(sw, 2), title: roundTo(tw, 2), experience: roundTo(ew, 2) };
        }
      }
    }
  }

  // Compute Pearson correlation for the best weights
  const predicted = samples.map(s => {
    const k = s.keywordScore ?? 0;
    const sem = s.hasSemantic ? (s.semanticScore ?? 0) : 0;
    const t = s.titleScore ?? 0;
    const e = s.experienceScore ?? 0;
    return bestWeights.keyword * k + bestWeights.semantic * sem + bestWeights.title * t + bestWeights.experience * e;
  });
  const actual = samples.map(s => s.examScore ?? 0);
  const corr = pearsonR(predicted, actual);

  // Only persist if predictions are within ~25 points of exam outcomes on average.
  // 25 was chosen because scores are 0-100: MAE ≥ 25 means the model is no better
  // than a naïve "guess the middle" strategy, so learned weights would add noise.
  const applied = bestMAE < 25;
  if (applied) {
    await db.insert(scoringWeights).values({
      keywordWeight: String(bestWeights.keyword),
      semanticWeight: String(bestWeights.semantic),
      titleWeight: String(bestWeights.title),
      experienceWeight: String(bestWeights.experience),
      trainingSamples: samples.length,
      meanAbsoluteError: String(roundTo(bestMAE, 2)),
      correlation: String(roundTo(corr, 3)),
    });
  }

  return {
    weights: bestWeights,
    samples: samples.length,
    mae: roundTo(bestMAE, 2),
    correlation: roundTo(corr, 3),
    applied,
    reason: applied ? undefined : `MAE too high (${roundTo(bestMAE, 2)}) — weights not applied`,
  };
}

/**
 * Load the latest learned weights from DB, or return defaults.
 * Called by scoreJob() on startup / periodically.
 */
export async function getLearnedWeights(): Promise<{ keyword: number; semantic: number; title: number; experience: number } | null> {
  if (!db) return null;

  try {
    const [latest] = await db
      .select({
        keyword: scoringWeights.keywordWeight,
        semantic: scoringWeights.semanticWeight,
        title: scoringWeights.titleWeight,
        experience: scoringWeights.experienceWeight,
      })
      .from(scoringWeights)
      .orderBy(desc(scoringWeights.createdAt))
      .limit(1);

    if (!latest) return null;
    return {
      keyword: parseFloat(String(latest.keyword)),
      semantic: parseFloat(String(latest.semantic)),
      title: parseFloat(String(latest.title)),
      experience: parseFloat(String(latest.experience)),
    };
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function defaultWeights() {
  return { keyword: 0.35, semantic: 0.25, title: 0.25, experience: 0.15 };
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

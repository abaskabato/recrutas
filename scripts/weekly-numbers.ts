/**
 * Weekly Numbers — standalone snapshot script
 *
 * Pulls the core startup metrics from Supabase + PostHog and prints a
 * markdown summary ready to paste into Notion's Weekly Numbers DB.
 *
 * Usage:
 *   npx tsx scripts/weekly-numbers.ts
 *   npx tsx scripts/weekly-numbers.ts --json   # machine-readable output
 *
 * Env required:
 *   DATABASE_URL               (Supabase)
 *   POSTHOG_PERSONAL_API_KEY   (optional — funnel section skipped if absent)
 *   POSTHOG_PROJECT_ID         (optional)
 *   POSTHOG_HOST               (optional, defaults to us.i.posthog.com)
 */

import { db, client } from '../server/db.js';
import { sql } from 'drizzle-orm/sql';

type Row = Record<string, any>;

const NOW = new Date();
const WEEK_AGO = new Date(NOW.getTime() - 7 * 86400000);
const TWO_WEEKS_AGO = new Date(NOW.getTime() - 14 * 86400000);

async function q(stmt: any): Promise<Row[]> {
  const res: any = await db!.execute(stmt);
  return (res.rows ?? res) as Row[];
}

async function supabaseNumbers() {
  const [userRows, appRows, examRows, jobRows, slaRows] = await Promise.all([
    q(sql`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" >= ${WEEK_AGO.toISOString()})::int AS users_this_week,
        COUNT(*) FILTER (WHERE "createdAt" >= ${TWO_WEEKS_AGO.toISOString()} AND "createdAt" < ${WEEK_AGO.toISOString()})::int AS users_prior_week,
        COUNT(*)::int AS users_total,
        COUNT(*) FILTER (WHERE role = 'candidate')::int AS candidates_total,
        COUNT(*) FILTER (WHERE role = 'talent_owner')::int AS talent_owners_total
      FROM users
    `),
    q(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${WEEK_AGO.toISOString()})::int AS apps_this_week,
        COUNT(*) FILTER (WHERE created_at >= ${TWO_WEEKS_AGO.toISOString()} AND created_at < ${WEEK_AGO.toISOString()})::int AS apps_prior_week,
        COUNT(*)::int AS apps_total
      FROM job_applications
    `),
    q(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${WEEK_AGO.toISOString()})::int AS attempts_this_week,
        COUNT(*) FILTER (WHERE created_at >= ${WEEK_AGO.toISOString()} AND passed_exam = true)::int AS passes_this_week,
        COUNT(*)::int AS attempts_total
      FROM exam_attempts
    `),
    q(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${WEEK_AGO.toISOString()})::int AS jobs_added_this_week,
        COUNT(*)::int AS jobs_total,
        COUNT(DISTINCT company)::int AS companies_total
      FROM job_postings
      WHERE status = 'active'
    `),
    q(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= ${WEEK_AGO.toISOString()} AND status IN ('interview','offer','hired'))::int AS positive_responses,
        COUNT(*) FILTER (WHERE created_at >= ${WEEK_AGO.toISOString()} AND status = 'rejected')::int AS rejections
      FROM job_applications
    `),
  ]);

  const u = userRows[0] || {};
  const a = appRows[0] || {};
  const e = examRows[0] || {};
  const j = jobRows[0] || {};
  const s = slaRows[0] || {};

  const growth = (curr: number, prior: number) =>
    prior > 0 ? `${Math.round(((curr - prior) / prior) * 100)}%` : curr > 0 ? '∞' : '0%';

  return {
    users: {
      total: u.users_total ?? 0,
      candidates: u.candidates_total ?? 0,
      talent_owners: u.talent_owners_total ?? 0,
      this_week: u.users_this_week ?? 0,
      prior_week: u.users_prior_week ?? 0,
      wow_growth: growth(u.users_this_week ?? 0, u.users_prior_week ?? 0),
    },
    applications: {
      total: a.apps_total ?? 0,
      this_week: a.apps_this_week ?? 0,
      prior_week: a.apps_prior_week ?? 0,
      wow_growth: growth(a.apps_this_week ?? 0, a.apps_prior_week ?? 0),
    },
    exams: {
      total_attempts: e.attempts_total ?? 0,
      attempts_this_week: e.attempts_this_week ?? 0,
      passes_this_week: e.passes_this_week ?? 0,
      pass_rate_this_week:
        (e.attempts_this_week ?? 0) > 0
          ? `${Math.round(((e.passes_this_week ?? 0) / e.attempts_this_week) * 100)}%`
          : '—',
    },
    jobs: {
      active_total: j.jobs_total ?? 0,
      added_this_week: j.jobs_added_this_week ?? 0,
      companies_total: j.companies_total ?? 0,
    },
    responses: {
      positive_this_week: s.positive_responses ?? 0,
      rejections_this_week: s.rejections ?? 0,
    },
  };
}

async function posthogFunnel() {
  const token = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
  if (!token || !projectId) return null;

  const steps = [
    { event: '$identify', label: 'signed_in' },
    { event: 'resume_uploaded', label: 'resume_uploaded' },
    { event: 'application_created', label: 'application_created' },
    { event: 'exam_graded', label: 'exam_graded' },
    { event: 'sla_response_sent', label: 'sla_response_sent' },
  ];

  const results: Array<{ label: string; users: number; total: number }> = [];
  for (const { event, label } of steps) {
    try {
      const r = await fetch(`${host}/api/projects/${projectId}/query/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: {
            kind: 'HogQLQuery',
            query: `SELECT count(DISTINCT distinct_id), count() FROM events WHERE event = '${event}' AND timestamp >= toDateTime('${WEEK_AGO.toISOString()}')`,
          },
        }),
      });
      if (!r.ok) {
        results.push({ label, users: 0, total: 0 });
        continue;
      }
      const data: any = await r.json();
      const row = data?.results?.[0] ?? [0, 0];
      results.push({ label, users: Number(row[0] ?? 0), total: Number(row[1] ?? 0) });
    } catch {
      results.push({ label, users: 0, total: 0 });
    }
  }
  return results;
}

function toMarkdown(db: any, funnel: any[] | null) {
  const weekOf = WEEK_AGO.toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`# Weekly Numbers — week of ${weekOf}`);
  lines.push('');
  lines.push('## Users');
  lines.push(`- Total: **${db.users.total}** (${db.users.candidates} candidates, ${db.users.talent_owners} employers)`);
  lines.push(`- New this week: **${db.users.this_week}** (prior: ${db.users.prior_week}, WoW: **${db.users.wow_growth}**)`);
  lines.push('');
  lines.push('## Applications');
  lines.push(`- Total: **${db.applications.total}**`);
  lines.push(`- This week: **${db.applications.this_week}** (prior: ${db.applications.prior_week}, WoW: **${db.applications.wow_growth}**)`);
  lines.push(`- Positive responses: ${db.responses.positive_this_week} · rejections: ${db.responses.rejections_this_week}`);
  lines.push('');
  lines.push('## Exams (24h SLA channel)');
  lines.push(`- Attempts this week: **${db.exams.attempts_this_week}** (passes: ${db.exams.passes_this_week}, pass rate: ${db.exams.pass_rate_this_week})`);
  lines.push(`- Total attempts all time: ${db.exams.total_attempts}`);
  lines.push('');
  lines.push('## Supply');
  lines.push(`- Active jobs: **${db.jobs.active_total}** across ${db.jobs.companies_total} companies`);
  lines.push(`- Added this week: ${db.jobs.added_this_week}`);
  lines.push('');
  if (funnel) {
    lines.push('## PostHog funnel (7 days)');
    const top = funnel[0]?.users || 0;
    for (const step of funnel) {
      const conv = top > 0 ? ` (${Math.round((step.users / top) * 100)}%)` : '';
      lines.push(`- ${step.label}: **${step.users}** users / ${step.total} events${conv}`);
    }
  } else {
    lines.push('_PostHog funnel skipped — set POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID._');
  }
  return lines.join('\n');
}

async function main() {
  const asJson = process.argv.includes('--json');
  const dbNumbers = await supabaseNumbers();
  const funnel = await posthogFunnel();

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: NOW.toISOString(), supabase: dbNumbers, funnel }, null, 2));
  } else {
    console.log(toMarkdown(dbNumbers, funnel));
  }
}

main()
  .then(() => { client?.end(); process.exit(0); })
  .catch((err) => { console.error('[WeeklyNumbers] Fatal:', err); client?.end(); process.exit(1); });

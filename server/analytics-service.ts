import { db } from "./db";
import { jobApplications, jobPostings, users } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getHiringFunnel(talentOwnerId: string) {
  const applications = await db
    .select()
    .from(jobApplications)
    .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
    .where(eq(jobPostings.talentOwnerId, talentOwnerId));

  const funnel = {
    applied: applications.length,
    viewed: applications.filter((a) => a.job_applications.status !== "submitted").length,
    screening: applications.filter((a) =>
      ["screening", "interview_scheduled", "interview_completed", "offer", "hired"].includes(a.job_applications.status)
    ).length,
    interview: applications.filter((a) =>
      ["interview_scheduled", "interview_completed", "offer", "hired"].includes(a.job_applications.status)
    ).length,
    offer: applications.filter((a) => ["offer", "hired"].includes(a.job_applications.status)).length,
    hired: applications.filter((a) => a.job_applications.status === "hired").length,
  };

  return funnel;
}

export async function getResponseTimes(talentOwnerId: string) {
  const applications = await db
    .select()
    .from(jobApplications)
    .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
    .where(and(eq(jobPostings.talentOwnerId, talentOwnerId), eq(jobApplications.status, "viewed")));

  const responseTimes = applications.map((a) => {
    const appliedAt = new Date(a.job_applications.appliedAt).getTime();
    const viewedAt = new Date(a.job_applications.viewedByEmployerAt!).getTime();
    return (viewedAt - appliedAt) / 1000 / 60 / 60; // in hours
  });

  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

  return {
    averageResponseTime,
    responseTimes,
  };
}

export async function getTopSkills(talentOwnerId: string) {
  const jobs = await db.select().from(jobPostings).where(eq(jobPostings.talentOwnerId, talentOwnerId));

  const allSkills = jobs.flatMap((j) => j.skills);
  const skillCounts = allSkills.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return sortedSkills;
}

export async function getJobPerformance(talentOwnerId: string) {
  const jobs = await db.select().from(jobPostings).where(eq(jobPostings.talentOwnerId, talentOwnerId));

  const performance = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    views: j.viewCount,
    applications: j.applicationCount,
    conversionRate: j.viewCount > 0 ? (j.applicationCount / j.viewCount) * 100 : 0,
  }));

  return performance;
}

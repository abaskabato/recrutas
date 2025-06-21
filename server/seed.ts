import { db } from "./db";
import { users, candidateProfiles, jobPostings, jobMatches, activityLogs } from "@shared/schema";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");

    // Create sample recruiters
    const recruiter1 = await db.insert(users).values({
      id: "recruiter_1",
      email: "recruiter@techcorp.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "recruiter",
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=150",
    }).returning();

    const recruiter2 = await db.insert(users).values({
      id: "recruiter_2", 
      email: "hr@startup.io",
      firstName: "Mike",
      lastName: "Chen",
      role: "recruiter",
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    }).returning();

    // Create sample candidates
    const candidate1 = await db.insert(users).values({
      id: "candidate_1",
      email: "john.dev@email.com",
      firstName: "John",
      lastName: "Smith",
      role: "candidate",
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    }).returning();

    const candidate2 = await db.insert(users).values({
      id: "candidate_2",
      email: "jane.designer@email.com", 
      firstName: "Jane",
      lastName: "Wilson",
      role: "candidate",
      profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    }).returning();

    // Create candidate profiles
    await db.insert(candidateProfiles).values({
      userId: "candidate_1",
      skills: ["JavaScript", "React", "Node.js", "TypeScript", "PostgreSQL"],
      experience: "5 years of full-stack development experience",
      industry: "Technology",
      workType: "Remote",
      salaryMin: 90000,
      salaryMax: 130000,
      location: "San Francisco, CA",
      bio: "Passionate full-stack developer with expertise in modern web technologies",
    });

    await db.insert(candidateProfiles).values({
      userId: "candidate_2",
      skills: ["UI/UX Design", "Figma", "Adobe Creative Suite", "Prototyping"],
      experience: "3 years of product design experience",
      industry: "Technology", 
      workType: "Hybrid",
      salaryMin: 75000,
      salaryMax: 100000,
      location: "New York, NY",
      bio: "Creative product designer focused on user-centered design",
    });

    // Create job postings
    const job1 = await db.insert(jobPostings).values({
      recruiterId: "recruiter_1",
      title: "Senior Full Stack Developer",
      description: "Join our team to build scalable web applications",
      skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
      requirements: ["5+ years experience", "CS degree preferred"],
      industry: "Technology",
      workType: "Remote",
      salaryMin: 100000,
      salaryMax: 140000,
      location: "San Francisco, CA",
      status: "active",
    }).returning();

    const job2 = await db.insert(jobPostings).values({
      recruiterId: "recruiter_2",
      title: "Product Designer",
      description: "Design beautiful and intuitive user experiences",
      skills: ["UI/UX Design", "Figma", "Prototyping"],
      requirements: ["3+ years design experience", "Portfolio required"],
      industry: "Technology",
      workType: "Hybrid", 
      salaryMin: 80000,
      salaryMax: 110000,
      location: "New York, NY",
      status: "active",
    }).returning();

    // Create job matches
    await db.insert(jobMatches).values({
      jobId: job1[0].id,
      candidateId: "candidate_1",
      matchScore: "0.85",
      matchReasons: ["Strong JavaScript skills", "React experience", "Salary range match"],
      status: "pending",
    });

    await db.insert(jobMatches).values({
      jobId: job2[0].id,
      candidateId: "candidate_2", 
      matchScore: "0.92",
      matchReasons: ["Perfect design skills match", "Figma expertise", "Location compatibility"],
      status: "viewed",
    });

    // Create activity logs
    await db.insert(activityLogs).values({
      userId: "candidate_1",
      type: "profile_update",
      description: "Updated profile with new skills",
    });

    await db.insert(activityLogs).values({
      userId: "recruiter_1",
      type: "job_posted",
      description: "Posted new job: Senior Full Stack Developer",
    });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
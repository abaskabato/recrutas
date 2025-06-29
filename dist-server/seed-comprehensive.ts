import { db } from "./db";
import { users, candidateProfiles, jobPostings, jobMatches } from "@shared/schema";

export async function seedComprehensiveData() {
  try {
    console.log("Seeding comprehensive database...");

    // Create 25 talent owners
    const talentOwners = [];
    for (let i = 1; i <= 25; i++) {
      const talentOwner = await db.insert(users).values({
        id: `talent_owner_${i}`,
        email: `recruiter${i}@company${i}.com`,
        firstName: `Recruiter`,
        lastName: `${i}`,
        role: "talent_owner",
        profileImageUrl: `https://images.unsplash.com/photo-150739810875${i % 9 + 1}?w=150`,
      }).returning();
      talentOwners.push(talentOwner[0]);
    }

    // Create 150 candidates
    const candidates = [];
    for (let i = 1; i <= 150; i++) {
      const candidate = await db.insert(users).values({
        id: `candidate_${i}`,
        email: `candidate${i}@email.com`,
        firstName: `Candidate`,
        lastName: `${i}`,
        role: "candidate",
        profileImageUrl: `https://images.unsplash.com/photo-147209964578${i % 9 + 5}?w=150`,
      }).returning();
      candidates.push(candidate[0]);
    }

    // Create candidate profiles
    const skills = [
      ["JavaScript", "React", "Node.js", "TypeScript"],
      ["Python", "Django", "PostgreSQL", "AWS"],
      ["Java", "Spring Boot", "MySQL", "Docker"],
      ["C#", ".NET", "SQL Server", "Azure"],
      ["Go", "Kubernetes", "Redis", "MongoDB"],
      ["PHP", "Laravel", "Vue.js", "MySQL"],
      ["Ruby", "Rails", "PostgreSQL", "Heroku"],
      ["Swift", "iOS", "Core Data", "SwiftUI"],
      ["Kotlin", "Android", "Firebase", "Jetpack"]
    ];

    for (let i = 0; i < candidates.length; i++) {
      const skillSet = skills[i % skills.length];
      await db.insert(candidateProfiles).values({
        userId: candidates[i].id,
        skills: skillSet,
        experience: `${Math.floor(Math.random() * 8) + 1} years of experience`,
        location: `City ${i % 20}`,
        workType: ["remote", "hybrid", "onsite"][i % 3],
        salaryMin: 60000 + (i % 10) * 10000,
        salaryMax: 100000 + (i % 15) * 15000,
        preferredIndustry: ["Technology", "Finance", "Healthcare", "E-commerce", "Gaming"][i % 5],
        profileStrength: Math.floor(Math.random() * 40) + 60,
      });
    }

    // Create 75 job postings
    const jobTitles = [
      "Senior Full Stack Developer",
      "Frontend React Developer", 
      "Backend Python Engineer",
      "DevOps Engineer",
      "Mobile Developer",
      "Data Scientist",
      "Product Manager",
      "UX/UI Designer",
      "Software Architect"
    ];

    const companies = [
      "TechCorp", "InnovateLabs", "DataSolutions", "CloudFirst", "DevBoost",
      "StartupX", "FinTechPro", "HealthTech", "GameStudio", "EcommerceHub"
    ];

    const jobs = [];
    for (let i = 1; i <= 75; i++) {
      const job = await db.insert(jobPostings).values({
        talentOwnerId: talentOwners[i % talentOwners.length].id,
        title: jobTitles[i % jobTitles.length],
        company: companies[i % companies.length],
        description: `We are looking for a talented ${jobTitles[i % jobTitles.length]} to join our growing team.`,
        requirements: ["Bachelor's degree", "3+ years experience", "Strong communication skills"],
        skills: skills[i % skills.length],
        location: `City ${i % 20}`,
        workType: ["remote", "hybrid", "onsite"][i % 3],
        salaryMin: 70000 + (i % 8) * 10000,
        salaryMax: 120000 + (i % 12) * 10000,
        industry: ["Technology", "Finance", "Healthcare", "E-commerce", "Gaming"][i % 5],
        status: "active",
        applicationCount: Math.floor(Math.random() * 50),
      }).returning();
      jobs.push(job[0]);
    }

    // Create 300 job matches
    for (let i = 1; i <= 300; i++) {
      const candidateIndex = Math.floor(Math.random() * candidates.length);
      const jobIndex = Math.floor(Math.random() * jobs.length);
      
      await db.insert(jobMatches).values({
        jobId: jobs[jobIndex].id,
        candidateId: candidates[candidateIndex].id,
        matchScore: `${Math.floor(Math.random() * 30) + 70}%`,
        matchReasons: ["Skills match", "Location preference", "Salary range"],
        confidenceLevel: Math.floor(Math.random() * 30) + 70,
        skillMatches: skills[candidateIndex % skills.length].slice(0, 2),
        aiExplanation: "Strong match based on technical skills and experience level.",
        status: ["pending", "viewed", "interested"][Math.floor(Math.random() * 3)],
      });
    }

    console.log("✅ Database seeded with comprehensive data:");
    console.log(`- ${talentOwners.length} talent owners`);
    console.log(`- ${candidates.length} candidates`);
    console.log(`- ${jobs.length} job postings`);
    console.log(`- 300 job matches`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

// Run if called directly
seedComprehensiveData().then(() => process.exit(0));
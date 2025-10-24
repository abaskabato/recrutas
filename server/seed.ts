import dotenv from 'dotenv';
dotenv.config({ path: '/home/abaskabato/recrutas/.env' });

import { db } from "./db";
import { users, candidateProfiles, jobPostings, jobMatches, activityLogs, jobApplications } from "@shared/schema";
import { supabaseAdmin } from "./lib/supabase-admin";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");
    console.log("DATABASE_URL in seed.ts:", process.env.DATABASE_URL);
    console.log("SUPABASE_URL in seed.ts:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("SUPABASE_SERVICE_ROLE_KEY in seed.ts:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "*****" : "Not set");

    // Clear existing data
    await db.delete(jobApplications);
    await db.delete(jobMatches);
    await db.delete(jobPostings);
    await db.delete(candidateProfiles);
    await db.delete(activityLogs);
    // await db.delete(users);

    // Create a specific user
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: "abaskabato@gmail.com",
      password: "123456",
      email_confirm: true,
      user_metadata: { role: 'candidate' }
    });

    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }

    if (!user) {
      console.error('User not created');
      return;
    }

    await db.insert(users).values({
      id: user.id,
      email: user.email,
      firstName: "Abas",
      lastName: "Kabato",
      role: "candidate",
    });

    // Create candidate profile
    await db.insert(candidateProfiles).values({
      userId: user.id,
      skills: ["JavaScript", "React", "Node.js", "TypeScript", "PostgreSQL"],
      experience: "5 years of full-stack development experience",
      industry: "Technology",
      workType: "Remote",
      salaryMin: 90000,
      salaryMax: 130000,
      location: "San Francisco, CA",
      bio: "Passionate full-stack developer with expertise in modern web technologies",
    });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
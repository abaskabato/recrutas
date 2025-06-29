import { db } from "./db";
import { notifications, users } from "@shared/schema";

async function seedNotifications() {
  console.log("Seeding sample notifications...");

  // Get existing users
  const existingUsers = await db.select().from(users).limit(5);
  
  if (existingUsers.length === 0) {
    console.log("No users found, skipping notification seeding");
    return;
  }

  const sampleNotifications = [
    // Candidate notifications
    {
      userId: existingUsers[0].id,
      type: "application_viewed",
      title: "Application Viewed",
      message: "TechCorp has viewed your application for Senior Software Engineer position",
      priority: "medium" as const,
      data: { jobId: 1, company: "TechCorp" },
    },
    {
      userId: existingUsers[0].id,
      type: "application_ranked",
      title: "High Match Score",
      message: "You scored 95% match for Full Stack Developer at StartupXYZ",
      priority: "high" as const,
      data: { jobId: 2, score: 95 },
    },
    {
      userId: existingUsers[0].id,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: "Interview scheduled for tomorrow at 2 PM with MetaCorp",
      priority: "urgent" as const,
      data: { jobId: 3, date: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    },
    {
      userId: existingUsers[0].id,
      type: "direct_connection",
      title: "Direct Connection Request",
      message: "Hiring Manager at Google wants to connect directly",
      priority: "high" as const,
      data: { company: "Google", role: "Software Engineer" },
    },
    {
      userId: existingUsers[0].id,
      type: "new_match",
      title: "New Job Match",
      message: "5 new jobs match your profile in San Francisco",
      priority: "medium" as const,
      data: { count: 5, location: "San Francisco" },
    },

    // Recruiter notifications
    {
      userId: existingUsers[1]?.id || existingUsers[0].id,
      type: "candidate_message",
      title: "New Candidate Message",
      message: "Sarah Johnson sent you a message about the React Developer position",
      priority: "medium" as const,
      data: { candidateId: "sarah-johnson", jobId: 4 },
    },
    {
      userId: existingUsers[1]?.id || existingUsers[0].id,
      type: "exam_completed",
      title: "Exam Completed",
      message: "Alex Chen completed the technical assessment with 87% score",
      priority: "high" as const,
      data: { candidateId: "alex-chen", score: 87, examId: 1 },
    },
    {
      userId: existingUsers[1]?.id || existingUsers[0].id,
      type: "high_score_alert",
      title: "High Score Alert",
      message: "Maria Rodriguez scored 96% on your Python Developer screening",
      priority: "urgent" as const,
      data: { candidateId: "maria-rodriguez", score: 96, jobId: 5 },
    },
    {
      userId: existingUsers[1]?.id || existingUsers[0].id,
      type: "application_accepted",
      title: "Application Accepted",
      message: "John Smith accepted your interview invitation",
      priority: "medium" as const,
      data: { candidateId: "john-smith", jobId: 6 },
    },
    {
      userId: existingUsers[1]?.id || existingUsers[0].id,
      type: "status_update",
      title: "Application Status Update",
      message: "3 candidates moved to final interview stage",
      priority: "low" as const,
      data: { count: 3, stage: "final_interview" },
    },

    // Additional notifications for demo
    {
      userId: existingUsers[2]?.id || existingUsers[0].id,
      type: "application_viewed",
      title: "Profile Viewed",
      message: "Amazon viewed your profile for Cloud Engineer position",
      priority: "medium" as const,
      data: { company: "Amazon", role: "Cloud Engineer" },
    },
    {
      userId: existingUsers[2]?.id || existingUsers[0].id,
      type: "direct_connection",
      title: "Direct Connection",
      message: "Netflix hiring manager wants to schedule a call",
      priority: "high" as const,
      data: { company: "Netflix", role: "Senior Developer" },
    },
  ];

  // Insert notifications
  for (const notification of sampleNotifications) {
    try {
      await db.insert(notifications).values({
        ...notification,
        read: Math.random() > 0.7, // 30% chance of being read
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
      });
    } catch (error) {
      console.error("Error inserting notification:", error);
    }
  }

  console.log(`Seeded ${sampleNotifications.length} notifications`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedNotifications()
    .then(() => {
      console.log("Notification seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding notifications:", error);
      process.exit(1);
    });
}

export { seedNotifications };
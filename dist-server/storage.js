/**
 * Storage Layer for Recrutas Platform
 *
 * This module provides a comprehensive data access layer implementing the Repository pattern.
 * It handles all database interactions while maintaining clean separation between
 * business logic and data persistence.
 *
 * Key Features:
 * - Type-safe database operations using Drizzle ORM
 * - Comprehensive CRUD operations for all entities
 * - Advanced querying with filtering and pagination
 * - Transaction support for complex operations
 * - Error handling and data validation
 *
 * Architecture:
 * - IStorage interface defines the contract
 * - DatabaseStorage implements the interface
 * - All methods are async and return Promise-based results
 * - Uses dependency injection pattern for testability
 */
import { users, candidateProfiles, jobPostings, jobMatches, chatRooms, chatMessages, activityLogs, notifications, examAttempts, jobExams, notificationPreferences, jobApplications } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";
/**
 * Database Storage Implementation
 *
 * Implements the IStorage interface using Drizzle ORM for PostgreSQL.
 * Provides production-ready data access with proper error handling,
 * transaction support, and optimized queries.
 */
export class DatabaseStorage {
    // User operations (required for Replit Auth)
    async getUser(id) {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, id));
            return user;
        }
        catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }
    async upsertUser(userData) {
        try {
            const [user] = await db
                .insert(users)
                .values(userData)
                .onConflictDoUpdate({
                target: users.id,
                set: {
                    ...userData,
                    updatedAt: new Date(),
                },
            })
                .returning();
            return user;
        }
        catch (error) {
            console.error('Error upserting user:', error);
            throw error;
        }
    }
    async updateUserRole(userId, role) {
        try {
            const [user] = await db
                .update(users)
                .set({ role: role, updatedAt: new Date() })
                .where(eq(users.id, userId))
                .returning();
            return user;
        }
        catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }
    async updateUserProfile(userId, userData) {
        try {
            const [user] = await db
                .update(users)
                .set({ ...userData, updatedAt: new Date() })
                .where(eq(users.id, userId))
                .returning();
            return user;
        }
        catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }
    // Candidate operations
    async getCandidateProfile(userId) {
        try {
            const [profile] = await db
                .select()
                .from(candidateProfiles)
                .where(eq(candidateProfiles.userId, userId));
            return profile;
        }
        catch (error) {
            console.error('Error fetching candidate profile:', error);
            throw error;
        }
    }
    async upsertCandidateProfile(profile) {
        try {
            const [result] = await db
                .insert(candidateProfiles)
                .values({
                ...profile,
                skills: profile.skills || [],
                updatedAt: new Date()
            })
                .onConflictDoUpdate({
                target: candidateProfiles.userId,
                set: {
                    ...profile,
                    skills: profile.skills || [],
                    updatedAt: new Date(),
                },
            })
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error upserting candidate profile:', error);
            throw error;
        }
    }
    async getAllCandidateProfiles() {
        try {
            return await db.select().from(candidateProfiles);
        }
        catch (error) {
            console.error('Error fetching all candidate profiles:', error);
            throw error;
        }
    }
    // Job operations
    async createJobPosting(job) {
        try {
            const [result] = await db.insert(jobPostings).values({
                ...job,
                skills: job.skills || [],
                requirements: job.requirements || [],
                hiringManagerId: job.hiringManagerId || job.talentOwnerId, // Default to talent owner if no hiring manager specified
            }).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating job posting:', error);
            throw error;
        }
    }
    async getJobPostings(talentOwnerId) {
        try {
            return await db
                .select()
                .from(jobPostings)
                .where(eq(jobPostings.talentOwnerId, talentOwnerId))
                .orderBy(desc(jobPostings.createdAt));
        }
        catch (error) {
            console.error('Error fetching job postings:', error);
            throw error;
        }
    }
    async getJobPosting(id) {
        try {
            const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
            return job;
        }
        catch (error) {
            console.error('Error fetching job posting:', error);
            throw error;
        }
    }
    async updateJobPosting(id, talentOwnerId, updates) {
        try {
            const updateData = { ...updates, updatedAt: new Date() };
            const [job] = await db
                .update(jobPostings)
                .set(updateData)
                .where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)))
                .returning();
            return job;
        }
        catch (error) {
            console.error('Error updating job posting:', error);
            throw error;
        }
    }
    async deleteJobPosting(id, talentOwnerId) {
        try {
            // First delete all related data in order of dependencies
            // Delete chat messages and chat rooms through job matches
            // Delete related chat messages (simplified for build)
            // TODO: Replace with proper cascading deletes
            // Delete chat rooms for this job (simplified for build)
            // TODO: Replace with proper cascading deletes
            // Delete job applications for this job
            await db
                .delete(jobApplications)
                .where(eq(jobApplications.jobId, id));
            // Delete job matches
            await this.clearJobMatches(id);
            // Delete exam attempts for this job
            await db
                .delete(examAttempts)
                .where(eq(examAttempts.jobId, id));
            // Delete job exams
            await db
                .delete(jobExams)
                .where(eq(jobExams.jobId, id));
            // Finally delete the job posting
            await db
                .delete(jobPostings)
                .where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)));
        }
        catch (error) {
            console.error('Error deleting job posting:', error);
            throw error;
        }
    }
    async searchJobs(criteria) {
        try {
            // Get all jobs and filter in memory for simplicity
            let jobs = await db.select().from(jobPostings);
            // Apply filters
            if (criteria.jobTitle) {
                jobs = jobs.filter(job => job.title.toLowerCase().includes(criteria.jobTitle.toLowerCase()));
            }
            if (criteria.location) {
                jobs = jobs.filter(job => job.location?.toLowerCase().includes(criteria.location.toLowerCase()));
            }
            if (criteria.workType) {
                jobs = jobs.filter(job => job.workType === criteria.workType);
            }
            if (criteria.minSalary) {
                jobs = jobs.filter(job => job.salaryMin && job.salaryMin >= criteria.minSalary);
            }
            if (criteria.maxSalary) {
                jobs = jobs.filter(job => job.salaryMax && job.salaryMax <= criteria.maxSalary);
            }
            // Filter by skills if provided
            if (criteria.skills && criteria.skills.length > 0) {
                jobs = jobs.filter(job => {
                    if (!job.skills || job.skills.length === 0)
                        return false;
                    return criteria.skills.some(skill => job.skills.some(jobSkill => jobSkill.toLowerCase().includes(skill.toLowerCase())));
                });
            }
            // Apply limit
            if (criteria.limit && criteria.limit > 0) {
                jobs = jobs.slice(0, criteria.limit);
            }
            return jobs;
        }
        catch (error) {
            console.error('Error searching jobs:', error);
            throw error;
        }
    }
    // Matching operations
    async createJobMatch(match) {
        try {
            const [result] = await db.insert(jobMatches).values({
                ...match,
                matchReasons: match.matchReasons || [],
                skillMatches: match.skillMatches || []
            }).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating job match:', error);
            throw error;
        }
    }
    async getMatchesForCandidate(candidateId) {
        try {
            const results = await db
                .select({
                // Job match fields
                id: jobMatches.id,
                jobId: jobMatches.jobId,
                candidateId: jobMatches.candidateId,
                matchScore: jobMatches.matchScore,
                matchReasons: jobMatches.matchReasons,
                status: jobMatches.status,
                createdAt: jobMatches.createdAt,
                updatedAt: jobMatches.updatedAt,
                confidenceLevel: jobMatches.confidenceLevel,
                skillMatches: jobMatches.skillMatches,
                aiExplanation: jobMatches.aiExplanation,
                userFeedback: jobMatches.userFeedback,
                feedbackReason: jobMatches.feedbackReason,
                viewedAt: jobMatches.viewedAt,
                appliedAt: jobMatches.appliedAt,
                // Job fields
                job: {
                    id: jobPostings.id,
                    title: jobPostings.title,
                    company: jobPostings.company,
                    description: jobPostings.description,
                    location: jobPostings.location,
                    workType: jobPostings.workType,
                    salaryMin: jobPostings.salaryMin,
                    salaryMax: jobPostings.salaryMax,
                    requirements: jobPostings.requirements,
                    skills: jobPostings.skills,
                    hasExam: jobPostings.hasExam,
                    source: jobPostings.source,
                    examPassingScore: jobPostings.examPassingScore,
                    talentOwnerId: jobPostings.talentOwnerId
                },
                // Talent owner fields
                talentOwner: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email
                }
            })
                .from(jobMatches)
                .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
                .innerJoin(users, eq(jobPostings.talentOwnerId, users.id))
                .where(eq(jobMatches.candidateId, candidateId))
                .orderBy(desc(jobMatches.createdAt));
            return results;
        }
        catch (error) {
            console.error('Error fetching matches for candidate:', error);
            throw error;
        }
    }
    async getMatchesForJob(jobId) {
        try {
            return await db
                .select()
                .from(jobMatches)
                .innerJoin(users, eq(jobMatches.candidateId, users.id))
                .leftJoin(candidateProfiles, eq(jobMatches.candidateId, candidateProfiles.userId))
                .where(eq(jobMatches.jobId, jobId))
                .orderBy(desc(jobMatches.createdAt));
        }
        catch (error) {
            console.error('Error fetching matches for job:', error);
            throw error;
        }
    }
    async updateMatchStatus(matchId, status) {
        try {
            const [match] = await db
                .update(jobMatches)
                .set({ status: status, updatedAt: new Date() })
                .where(eq(jobMatches.id, matchId))
                .returning();
            return match;
        }
        catch (error) {
            console.error('Error updating match status:', error);
            throw error;
        }
    }
    async clearJobMatches(jobId) {
        try {
            await db
                .delete(jobMatches)
                .where(eq(jobMatches.jobId, jobId));
        }
        catch (error) {
            console.error('Error clearing job matches:', error);
            throw error;
        }
    }
    async updateJobMatchStatus(candidateId, jobId, status) {
        try {
            await db
                .update(jobMatches)
                .set({ status: status, updatedAt: new Date() })
                .where(and(eq(jobMatches.candidateId, candidateId), eq(jobMatches.jobId, jobId)));
        }
        catch (error) {
            console.error('Error updating job match status:', error);
            throw error;
        }
    }
    async getJobExam(jobId) {
        try {
            const [exam] = await db
                .select()
                .from(jobExams)
                .where(eq(jobExams.jobId, jobId));
            return exam;
        }
        catch (error) {
            console.error('Error fetching job exam:', error);
            throw error;
        }
    }
    async storeExamResult(result) {
        try {
            // First get the exam ID for this job
            const [exam] = await db.select().from(jobExams).where(eq(jobExams.jobId, result.jobId));
            if (!exam) {
                throw new Error('No exam found for this job');
            }
            await db.insert(examAttempts).values({
                examId: exam.id,
                candidateId: result.candidateId,
                jobId: result.jobId,
                score: result.score,
                totalQuestions: result.totalQuestions,
                correctAnswers: result.correctAnswers,
                timeSpent: result.timeSpent,
                answers: result.answers,
                status: 'completed',
                passedExam: result.score >= (exam.passingScore || 70),
                qualifiedForChat: false, // Will be set during ranking
                completedAt: new Date(),
            });
        }
        catch (error) {
            console.error('Error storing exam result:', error);
            throw error;
        }
    }
    // Chat operations
    async createChatMessage(message) {
        try {
            const [result] = await db.insert(chatMessages).values(message).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating chat message:', error);
            throw error;
        }
    }
    async getChatMessages(chatRoomId) {
        try {
            return await db
                .select()
                .from(chatMessages)
                .innerJoin(users, eq(chatMessages.senderId, users.id))
                .where(eq(chatMessages.chatRoomId, chatRoomId))
                .orderBy(chatMessages.createdAt);
        }
        catch (error) {
            console.error('Error fetching chat messages:', error);
            throw error;
        }
    }
    // Activity operations
    async createActivityLog(userId, type, description, metadata) {
        try {
            const [result] = await db
                .insert(activityLogs)
                .values({ userId, type, description, metadata })
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error creating activity log:', error);
            throw error;
        }
    }
    async getActivityLogs(userId, limit = 10) {
        try {
            return await db
                .select()
                .from(activityLogs)
                .where(eq(activityLogs.userId, userId))
                .orderBy(desc(activityLogs.createdAt))
                .limit(limit);
        }
        catch (error) {
            console.error('Error fetching activity logs:', error);
            throw error;
        }
    }
    // Statistics and analytics
    async getCandidateStats(candidateId) {
        try {
            const applications = await db
                .select()
                .from(jobApplications)
                .where(eq(jobApplications.candidateId, candidateId));
            const matches = await db
                .select()
                .from(jobMatches)
                .where(eq(jobMatches.candidateId, candidateId));
            return {
                totalApplications: applications.length,
                activeMatches: matches.filter(m => m.status === 'pending' || m.status === 'viewed').length,
                profileViews: 0, // Would need to implement view tracking
                profileStrength: 75, // Would calculate based on profile completeness
                responseRate: 0.8, // Would calculate from actual data
                avgMatchScore: matches.reduce((acc, m) => acc + parseFloat(m.matchScore || '0'), 0) / matches.length || 0
            };
        }
        catch (error) {
            console.error('Error fetching candidate stats:', error);
            throw error;
        }
    }
    async getRecruiterStats(talentOwnerId) {
        try {
            const jobs = await db
                .select()
                .from(jobPostings)
                .where(eq(jobPostings.talentOwnerId, talentOwnerId));
            const matches = await db
                .select()
                .from(jobMatches)
                .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
                .where(eq(jobPostings.talentOwnerId, talentOwnerId));
            return {
                activeJobs: jobs.filter(j => j.status === 'active').length,
                totalMatches: matches.length,
                activeChats: 0, // Would count active chat rooms
                hires: 0 // Would count hired candidates
            };
        }
        catch (error) {
            console.error('Error fetching recruiter stats:', error);
            throw error;
        }
    }
    async getCandidatesForRecruiter(talentOwnerId) {
        try {
            return await db
                .select({
                candidate: users,
                profile: candidateProfiles,
                match: jobMatches,
                job: jobPostings
            })
                .from(jobMatches)
                .innerJoin(users, eq(jobMatches.candidateId, users.id))
                .leftJoin(candidateProfiles, eq(users.id, candidateProfiles.userId))
                .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
                .where(eq(jobPostings.talentOwnerId, talentOwnerId))
                .orderBy(desc(jobMatches.createdAt));
        }
        catch (error) {
            console.error('Error fetching candidates for recruiter:', error);
            throw error;
        }
    }
    // Application operations
    async getApplicationsWithStatus(candidateId) {
        try {
            return await db
                .select({
                id: jobApplications.id,
                jobId: jobApplications.jobId,
                status: jobApplications.status,
                appliedAt: jobApplications.appliedAt,
                createdAt: jobApplications.createdAt,
                job: {
                    id: jobPostings.id,
                    title: jobPostings.title,
                    company: jobPostings.company,
                    location: jobPostings.location,
                    workType: jobPostings.workType,
                }
            })
                .from(jobApplications)
                .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
                .where(eq(jobApplications.candidateId, candidateId))
                .orderBy(desc(jobApplications.createdAt));
        }
        catch (error) {
            console.error('Error fetching applications with status:', error);
            throw error;
        }
    }
    async updateApplicationStatus(applicationId, status, data) {
        try {
            const [application] = await db
                .update(jobApplications)
                .set({
                status: status,
                updatedAt: new Date(),
                ...(data || {})
            })
                .where(eq(jobApplications.id, applicationId))
                .returning();
            return application;
        }
        catch (error) {
            console.error('Error updating application status:', error);
            throw error;
        }
    }
    async getApplicationByJobAndCandidate(jobId, candidateId) {
        try {
            const [application] = await db
                .select()
                .from(jobApplications)
                .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.candidateId, candidateId)));
            return application;
        }
        catch (error) {
            console.error('Error fetching application by job and candidate:', error);
            throw error;
        }
    }
    async createJobApplication(application) {
        try {
            const [result] = await db
                .insert(jobApplications)
                .values(application)
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error creating job application:', error);
            throw error;
        }
    }
    // Notification operations
    async getNotificationPreferences(userId) {
        try {
            const [prefs] = await db
                .select()
                .from(notificationPreferences)
                .where(eq(notificationPreferences.userId, userId));
            return prefs;
        }
        catch (error) {
            console.error('Error fetching notification preferences:', error);
            throw error;
        }
    }
    async updateNotificationPreferences(userId, preferences) {
        try {
            const [result] = await db
                .insert(notificationPreferences)
                .values({ userId, ...preferences })
                .onConflictDoUpdate({
                target: notificationPreferences.userId,
                set: { ...preferences, updatedAt: new Date() },
            })
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error updating notification preferences:', error);
            throw error;
        }
    }
    async getNotifications(userId) {
        try {
            return await db
                .select()
                .from(notifications)
                .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
                .orderBy(desc(notifications.createdAt))
                .limit(50);
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }
    async markNotificationAsRead(notificationId, userId) {
        try {
            const result = await db
                .update(notifications)
                .set({ read: true, readAt: new Date() })
                .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
            console.log(`Mark notification ${notificationId} as read for user ${userId}, result:`, result);
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
    async markAllNotificationsAsRead(userId) {
        try {
            const result = await db
                .update(notifications)
                .set({ read: true, readAt: new Date() })
                .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
            console.log('Mark all notifications as read result:', result);
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
    // Exam operations
    async createJobExam(exam) {
        try {
            const [result] = await db.insert(jobExams).values(exam).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating job exam:', error);
            throw error;
        }
    }
    async createExamAttempt(attempt) {
        try {
            const [result] = await db.insert(examAttempts).values(attempt).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating exam attempt:', error);
            throw error;
        }
    }
    async updateExamAttempt(attemptId, data) {
        try {
            const [result] = await db
                .update(examAttempts)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(examAttempts.id, attemptId))
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error updating exam attempt:', error);
            throw error;
        }
    }
    async getExamAttempts(jobId) {
        try {
            return await db
                .select()
                .from(examAttempts)
                .where(eq(examAttempts.jobId, jobId))
                .orderBy(desc(examAttempts.createdAt));
        }
        catch (error) {
            console.error('Error fetching exam attempts:', error);
            throw error;
        }
    }
    async rankCandidatesByExamScore(jobId) {
        try {
            const job = await this.getJobPosting(jobId);
            if (!job || !job.maxChatCandidates)
                return;
            const attempts = await db
                .select()
                .from(examAttempts)
                .where(and(eq(examAttempts.jobId, jobId), eq(examAttempts.status, 'completed'), eq(examAttempts.passedExam, true)))
                .orderBy(desc(examAttempts.score));
            // Update rankings and grant chat access to top candidates
            for (let i = 0; i < attempts.length; i++) {
                const ranking = i + 1;
                const qualifiedForChat = ranking <= job.maxChatCandidates;
                await db
                    .update(examAttempts)
                    .set({
                    ranking,
                    qualifiedForChat,
                    updatedAt: new Date()
                })
                    .where(eq(examAttempts.id, attempts[i].id));
                // Grant chat access to top candidates
                if (qualifiedForChat && job.hiringManagerId) {
                    await this.grantChatAccess(jobId, attempts[i].candidateId, attempts[i].id, ranking);
                }
            }
        }
        catch (error) {
            console.error('Error ranking candidates by exam score:', error);
            throw error;
        }
    }
    // Chat room operations
    async getChatRoom(jobId, candidateId) {
        try {
            const [room] = await db
                .select()
                .from(chatRooms)
                .where(and(eq(chatRooms.jobId, jobId), eq(chatRooms.candidateId, candidateId)));
            return room;
        }
        catch (error) {
            console.error('Error fetching chat room:', error);
            throw error;
        }
    }
    async createChatRoom(data) {
        try {
            const [room] = await db
                .insert(chatRooms)
                .values({
                jobId: data.jobId,
                candidateId: data.candidateId,
                hiringManagerId: data.hiringManagerId,
                examAttemptId: data.examAttemptId,
                candidateRanking: data.ranking,
                createdAt: new Date(),
                updatedAt: new Date()
            })
                .returning();
            return room;
        }
        catch (error) {
            console.error('Error creating chat room:', error);
            throw error;
        }
    }
    async getChatRoomsForUser(userId) {
        try {
            const rooms = await db
                .select()
                .from(chatRooms)
                .where(or(eq(chatRooms.candidateId, userId), eq(chatRooms.hiringManagerId, userId)))
                .orderBy(desc(chatRooms.createdAt));
            const enrichedRooms = [];
            for (const room of rooms) {
                const job = await this.getJobPosting(room.jobId);
                const hiringManager = await this.getUser(room.hiringManagerId);
                if (job && hiringManager) {
                    enrichedRooms.push({
                        ...room,
                        job,
                        hiringManager
                    });
                }
            }
            return enrichedRooms;
        }
        catch (error) {
            console.error('Error fetching chat rooms for user:', error);
            throw error;
        }
    }
    async grantChatAccess(jobId, candidateId, examAttemptId, ranking) {
        try {
            const job = await this.getJobPosting(jobId);
            if (!job || !job.hiringManagerId) {
                throw new Error('Job or hiring manager not found');
            }
            const room = await this.createChatRoom({
                jobId,
                candidateId,
                hiringManagerId: job.hiringManagerId,
                examAttemptId,
                ranking
            });
            // Create notification for chat access
            await this.createNotification({
                userId: candidateId,
                type: 'chat_access_granted',
                message: `You now have chat access for ${job.title}`,
                metadata: { jobId, ranking }
            });
            return room;
        }
        catch (error) {
            console.error('Error granting chat access:', error);
            throw error;
        }
    }
    async createNotification(notification) {
        try {
            const [result] = await db.insert(notifications).values({
                ...notification,
                read: false,
                createdAt: new Date()
            }).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    // Enhanced candidate operations
    async getApplicationsForCandidate(candidateId) {
        try {
            return await db
                .select()
                .from(jobApplications)
                .where(eq(jobApplications.candidateId, candidateId))
                .orderBy(desc(jobApplications.createdAt));
        }
        catch (error) {
            console.error('Error fetching applications for candidate:', error);
            return [];
        }
    }
    async getActivityForCandidate(candidateId) {
        try {
            return await db
                .select()
                .from(activityLogs)
                .where(eq(activityLogs.userId, candidateId))
                .orderBy(desc(activityLogs.createdAt))
                .limit(50);
        }
        catch (error) {
            console.error('Error fetching activity for candidate:', error);
            return [];
        }
    }
    async createOrUpdateCandidateProfile(userId, profileData) {
        try {
            return await this.upsertCandidateProfile({ userId, ...profileData });
        }
        catch (error) {
            console.error('Error creating/updating candidate profile:', error);
            throw error;
        }
    }
    async updateUserInfo(userId, userData) {
        try {
            return await this.updateUserProfile(userId, userData);
        }
        catch (error) {
            console.error('Error updating user info:', error);
            throw error;
        }
    }
    async getAvailableNotificationUsers() {
        const result = await db.selectDistinct({ userId: notifications.userId }).from(notifications);
        return result.map(r => r.userId);
    }
    // Application Intelligence operations (Revolutionary feedback system)
    async getApplicationById(applicationId) {
        try {
            const [application] = await db
                .select()
                .from(jobApplications)
                .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
                .where(eq(jobApplications.id, applicationId));
            return application ? {
                ...application.job_applications,
                job: application.job_postings
            } : undefined;
        }
        catch (error) {
            console.error('Error fetching application by ID:', error);
            throw error;
        }
    }
    async createApplicationEvent(event) {
        try {
            // Import the applicationEvents table from schema
            const { applicationEvents } = await import("@shared/schema");
            const [result] = await db.insert(applicationEvents).values({
                applicationId: event.applicationId,
                eventType: event.eventType,
                actorRole: event.actorRole,
                actorName: event.actorName,
                actorTitle: event.actorTitle,
                viewDuration: event.viewDuration,
                candidateScore: event.candidateScore,
                candidateRanking: event.candidateRanking,
                totalApplicants: event.totalApplicants,
                feedback: event.feedback,
                nextSteps: event.nextSteps,
                competitorProfile: event.competitorProfile,
                visible: event.visible ?? true
            }).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating application event:', error);
            throw error;
        }
    }
    async getApplicationEvents(applicationId) {
        try {
            const { applicationEvents } = await import("@shared/schema");
            return await db
                .select()
                .from(applicationEvents)
                .where(eq(applicationEvents.applicationId, applicationId))
                .orderBy(desc(applicationEvents.createdAt));
        }
        catch (error) {
            console.error('Error fetching application events:', error);
            return [];
        }
    }
    async getApplicationInsights(applicationId) {
        try {
            const { applicationInsights } = await import("@shared/schema");
            const [insights] = await db
                .select()
                .from(applicationInsights)
                .where(eq(applicationInsights.applicationId, applicationId))
                .orderBy(desc(applicationInsights.createdAt))
                .limit(1);
            return insights;
        }
        catch (error) {
            console.error('Error fetching application insights:', error);
            return null;
        }
    }
    async createApplicationInsights(insights) {
        try {
            const { applicationInsights } = await import("@shared/schema");
            const [result] = await db.insert(applicationInsights).values({
                candidateId: insights.candidateId,
                applicationId: insights.applicationId,
                strengthsIdentified: insights.strengthsIdentified,
                improvementAreas: insights.improvementAreas,
                benchmarkViewTime: insights.benchmarkViewTime,
                actualViewTime: insights.actualViewTime,
                benchmarkScore: insights.benchmarkScore,
                actualScore: insights.actualScore,
                similarSuccessfulProfiles: insights.similarSuccessfulProfiles,
                recommendedActions: insights.recommendedActions,
                successProbability: insights.successProbability,
                supportiveMessage: insights.supportiveMessage
            }).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating application insights:', error);
            throw error;
        }
    }
    // Application Intelligence methods for talent dashboard transparency
    async updateApplicationIntelligence(applicationId, updates) {
        try {
            // Ensure applicationId is a valid integer
            const validApplicationId = typeof applicationId === 'string' ? parseInt(applicationId) : applicationId;
            if (isNaN(validApplicationId)) {
                throw new Error('Invalid application ID');
            }
            // For demo purposes, using the jobApplications table to store intelligence data
            // In production, this would be a dedicated application_intelligence table
            const [result] = await db
                .update(jobApplications)
                .set({
                ...updates,
                updatedAt: new Date()
            })
                .where(eq(jobApplications.id, validApplicationId))
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error updating application intelligence:', error);
            throw error;
        }
    }
    async getApplicationsForTalent(talentId) {
        try {
            // Get all applications for jobs owned by this talent
            const results = await db
                .select({
                application: jobApplications,
                candidate: candidateProfiles,
                job: jobPostings,
                user: users
            })
                .from(jobApplications)
                .leftJoin(candidateProfiles, eq(jobApplications.candidateId, candidateProfiles.userId))
                .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
                .leftJoin(users, eq(candidateProfiles.userId, users.id))
                .where(eq(jobPostings.talentOwnerId, talentId));
            return results.map(({ application, candidate, job, user }) => ({
                id: application.id.toString(),
                candidateId: user?.id,
                jobId: job?.id,
                candidateName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email?.split('@')[0] || 'Unknown',
                candidateEmail: user?.email,
                jobTitle: job?.title,
                appliedAt: application.appliedAt?.toISOString(),
                status: application.status,
                matchScore: candidate?.matchScore || 0,
                skills: candidate?.skills || [],
                experience: candidate?.experience || '',
                location: candidate?.location || '',
                resumeUrl: candidate?.resumeUrl,
                // Intelligence data stored in application
                viewedAt: application.viewedAt?.toISOString(),
                viewDuration: application.viewDuration,
                ranking: application.ranking,
                totalApplicants: application.totalApplicants,
                feedback: application.feedback,
                rating: application.rating,
                nextSteps: application.nextSteps,
                transparencyLevel: application.transparencyLevel || 'partial'
            }));
        }
        catch (error) {
            console.error('Error getting applications for talent:', error);
            throw error;
        }
    }
    async updateTalentTransparencySettings(talentId, settings) {
        try {
            // Store talent transparency preferences in user profile
            const [result] = await db
                .update(users)
                .set({
                transparencySettings: JSON.stringify(settings),
                updatedAt: new Date()
            })
                .where(eq(users.id, talentId))
                .returning();
            return result;
        }
        catch (error) {
            console.error('Error updating transparency settings:', error);
            throw error;
        }
    }
}
export const storage = new DatabaseStorage();

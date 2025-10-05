import { pgTable, varchar, timestamp, integer, boolean, text, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { users, candidateProfiles, jobPostings, jobMatches, chatMessages, notifications, notificationPreferences, interviews, connectionStatus } from './schema';

export const insertUserSchema = createInsertSchema(users);
export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles);
export const insertJobPostingSchema = createInsertSchema(jobPostings);
export const insertJobMatchSchema = createInsertSchema(jobMatches);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const insertInterviewSchema = createInsertSchema(interviews);
export const insertConnectionStatusSchema = createInsertSchema(connectionStatus);
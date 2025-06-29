import { db } from "./db";
import { 
  notifications, 
  notificationPreferences, 
  connectionStatus,
  users,
  jobPostings,
  jobApplications,
  jobMatches,
  type InsertNotification,
  type NotificationPreferences,
  type User 
} from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { WebSocket } from "ws";

interface NotificationData {
  userId: string;
  type: InsertNotification['type'];
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  relatedJobId?: number;
  relatedApplicationId?: number;
  relatedMatchId?: number;
}

interface WebSocketClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class NotificationService {
  private connectedClients: Map<string, WebSocketClient[]> = new Map();

  // WebSocket connection management
  addConnection(userId: string, ws: WebSocketClient) {
    ws.userId = userId;
    ws.isAlive = true;
    
    const userConnections = this.connectedClients.get(userId) || [];
    userConnections.push(ws);
    this.connectedClients.set(userId, userConnections);

    // Update connection status in database
    this.updateConnectionStatus(userId, true);

    // Set up heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      this.removeConnection(userId, ws);
    });

    ws.on('error', () => {
      this.removeConnection(userId, ws);
    });
  }

  removeConnection(userId: string, ws: WebSocketClient) {
    const userConnections = this.connectedClients.get(userId) || [];
    const filteredConnections = userConnections.filter(client => client !== ws);
    
    if (filteredConnections.length === 0) {
      this.connectedClients.delete(userId);
      this.updateConnectionStatus(userId, false);
    } else {
      this.connectedClients.set(userId, filteredConnections);
    }
  }

  private async updateConnectionStatus(userId: string, isOnline: boolean) {
    try {
      await db.insert(connectionStatus).values({
        userId,
        isOnline,
        lastSeen: new Date(),
      }).onConflictDoUpdate({
        target: connectionStatus.userId,
        set: {
          isOnline,
          lastSeen: new Date(),
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }

  // Core notification creation
  async createNotification(data: NotificationData): Promise<void> {
    try {
      // Check user notification preferences
      const preferences = await this.getUserPreferences(data.userId);
      if (!this.shouldSendNotification(data, preferences)) {
        return;
      }

      // Store notification in database
      const [notification] = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        data: data.data,
        relatedJobId: data.relatedJobId,
        relatedApplicationId: data.relatedApplicationId,
        relatedMatchId: data.relatedMatchId,
      }).returning();

      // Send real-time notification if user is connected
      await this.sendRealTimeNotification(data.userId, {
        id: notification.id,
        ...data,
        createdAt: notification.createdAt,
      });

      // Send email notification if enabled
      if (preferences?.emailNotifications && this.isPriorityEmailWorthy(data.priority)) {
        await this.sendEmailNotification(data.userId, data);
      }

    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const [preferences] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));
      
      return preferences || null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  private shouldSendNotification(data: NotificationData, preferences: NotificationPreferences | null): boolean {
    if (!preferences) return true; // Default to sending if no preferences set

    // Check if in quiet hours
    if (this.isInQuietHours(preferences)) {
      return data.priority === 'urgent';
    }

    // Check specific notification type preferences
    switch (data.type) {
      case 'application_viewed':
      case 'application_ranked':
      case 'application_accepted':
      case 'application_rejected':
      case 'status_update':
        return preferences.applicationUpdates;
      case 'exam_completed':
      case 'high_score_alert':
        return preferences.examAlerts;
      case 'candidate_message':
      case 'direct_connection':
        return preferences.messageNotifications;
      default:
        return preferences.inAppNotifications;
    }
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const quietHours = preferences.quietHours as { start: string; end: string };
    
    const startHour = parseInt(quietHours.start.split(':')[0]);
    const endHour = parseInt(quietHours.end.split(':')[0]);

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  private isPriorityEmailWorthy(priority?: string): boolean {
    return priority === 'high' || priority === 'urgent';
  }

  private async sendRealTimeNotification(userId: string, notification: any) {
    const userConnections = this.connectedClients.get(userId) || [];
    
    const message = JSON.stringify({
      type: 'notification',
      data: notification,
    });

    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private async sendEmailNotification(userId: string, data: NotificationData) {
    // Email notification logic would go here
    // For now, we'll just log it
    console.log(`Email notification would be sent to user ${userId}:`, data);
  }

  // Specific notification creators
  async notifyApplicationViewed(candidateId: string, jobTitle: string, companyName: string, applicationId: number) {
    await this.createNotification({
      userId: candidateId,
      type: 'application_viewed',
      title: 'Application Viewed',
      message: `${companyName} has viewed your application for ${jobTitle}`,
      priority: 'medium',
      relatedApplicationId: applicationId,
      data: { jobTitle, companyName }
    });
  }

  async notifyApplicationRanked(candidateId: string, jobTitle: string, ranking: number, totalCandidates: number, applicationId: number) {
    const priority = ranking <= 3 ? 'high' : 'medium';
    const message = ranking <= 3 
      ? `You're ranked #${ranking} out of ${totalCandidates} candidates for ${jobTitle}!`
      : `You're ranked #${ranking} out of ${totalCandidates} candidates for ${jobTitle}`;

    await this.createNotification({
      userId: candidateId,
      type: 'application_ranked',
      title: 'Application Ranked',
      message,
      priority,
      relatedApplicationId: applicationId,
      data: { jobTitle, ranking, totalCandidates }
    });
  }

  async notifyApplicationAccepted(candidateId: string, jobTitle: string, companyName: string, applicationId: number) {
    await this.createNotification({
      userId: candidateId,
      type: 'application_accepted',
      title: 'Application Accepted!',
      message: `Congratulations! ${companyName} has accepted your application for ${jobTitle}`,
      priority: 'high',
      relatedApplicationId: applicationId,
      data: { jobTitle, companyName }
    });
  }

  async notifyApplicationRejected(candidateId: string, jobTitle: string, companyName: string, applicationId: number) {
    await this.createNotification({
      userId: candidateId,
      type: 'application_rejected',
      title: 'Application Update',
      message: `${companyName} has made a decision on your ${jobTitle} application`,
      priority: 'medium',
      relatedApplicationId: applicationId,
      data: { jobTitle, companyName }
    });
  }

  async notifyExamCompleted(talentOwnerId: string, candidateName: string, jobTitle: string, score: number, applicationId: number) {
    const priority = score >= 80 ? 'high' : 'medium';
    
    await this.createNotification({
      userId: talentOwnerId,
      type: 'exam_completed',
      title: 'Screening Exam Completed',
      message: `${candidateName} completed the ${jobTitle} screening exam with ${score}% score`,
      priority,
      relatedApplicationId: applicationId,
      data: { candidateName, jobTitle, score }
    });
  }

  async notifyHighScoreAlert(talentOwnerId: string, candidateName: string, jobTitle: string, score: number, applicationId: number) {
    await this.createNotification({
      userId: talentOwnerId,
      type: 'high_score_alert',
      title: 'High-Scoring Candidate!',
      message: `${candidateName} achieved ${score}% on ${jobTitle} screening - Top performer!`,
      priority: 'high',
      relatedApplicationId: applicationId,
      data: { candidateName, jobTitle, score }
    });
  }

  async notifyDirectConnection(recipientId: string, senderName: string, jobTitle: string, matchId: number) {
    await this.createNotification({
      userId: recipientId,
      type: 'direct_connection',
      title: 'Direct Connection Request',
      message: `${senderName} wants to connect about the ${jobTitle} position`,
      priority: 'high',
      relatedMatchId: matchId,
      data: { senderName, jobTitle }
    });
  }

  async notifyCandidateMessage(recipientId: string, senderName: string, jobTitle: string, messagePreview: string, matchId: number) {
    await this.createNotification({
      userId: recipientId,
      type: 'candidate_message',
      title: 'New Message',
      message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      priority: 'medium',
      relatedMatchId: matchId,
      data: { senderName, jobTitle, messagePreview }
    });
  }

  async notifyInterviewScheduled(candidateId: string, companyName: string, jobTitle: string, interviewDate: string, applicationId: number) {
    await this.createNotification({
      userId: candidateId,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `${companyName} has scheduled an interview for ${jobTitle} on ${interviewDate}`,
      priority: 'high',
      relatedApplicationId: applicationId,
      data: { companyName, jobTitle, interviewDate }
    });
  }

  async notifyNewMatch(candidateId: string, jobTitle: string, companyName: string, matchScore: string, jobId: number, matchId: number) {
    const priority = parseInt(matchScore) >= 85 ? 'high' : 'medium';
    
    await this.createNotification({
      userId: candidateId,
      type: 'new_match',
      title: 'New Job Match!',
      message: `${matchScore}% match found: ${jobTitle} at ${companyName}`,
      priority,
      relatedJobId: jobId,
      relatedMatchId: matchId,
      data: { jobTitle, companyName, matchScore }
    });
  }

  // Utility methods
  async getUnreadNotifications(userId: string, limit: number = 20) {
    try {
      return await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }

  async getAllNotifications(userId: string, limit: number = 50) {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting all notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: number, userId: string) {
    try {
      await db
        .update(notifications)
        .set({ 
          read: true, 
          readAt: new Date() 
        })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead(userId: string) {
    try {
      await db
        .update(notifications)
        .set({ 
          read: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));
      
      return result.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Heartbeat for WebSocket connections
  startHeartbeat() {
    setInterval(() => {
      this.connectedClients.forEach((connections, userId) => {
        connections.forEach((ws, index) => {
          if (!ws.isAlive) {
            ws.terminate();
            this.removeConnection(userId, ws);
            return;
          }
          
          ws.isAlive = false;
          ws.ping();
        });
      });
    }, 30000); // 30 seconds
  }
}

export const notificationService = new NotificationService();
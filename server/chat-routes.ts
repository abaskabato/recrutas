import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./middleware/auth";

// Maximum message length (5000 characters)
const MAX_MESSAGE_LENGTH = 5000;

// Simple HTML sanitizer - strips all HTML tags to prevent XSS
function sanitizeMessage(message: string): string {
  if (!message) return '';

  // Remove HTML tags
  let sanitized = message.replace(/<[^>]*>/g, '');

  // Decode HTML entities to prevent double-encoding
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  // Re-escape potentially dangerous characters
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return sanitized.trim();
}

/**
 * Chat API Routes
 * Handles real-time messaging between candidates and talent owners
 */
export function registerChatRoutes(app: Express) {
    // Get all chat rooms for current user (both candidate and talent owner)
    app.get('/api/chat/rooms', isAuthenticated, async (req: any, res) => {
        try {
            const rooms = await storage.getChatRoomsForUser(req.user.id);
            res.json(rooms);
        } catch (error) {
            console.error("Error fetching chat rooms:", error);
            res.status(500).json({ message: "Failed to fetch chat rooms" });
        }
    });

    // Get messages for a specific chat room
    app.get('/api/chat/rooms/:roomId/messages', isAuthenticated, async (req: any, res) => {
        try {
            const roomId = parseInt(req.params.roomId);

            // Verify user has access to this room
            const rooms = await storage.getChatRoomsForUser(req.user.id);
            const hasAccess = rooms.some(room => room.id === roomId);

            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied to this chat room" });
            }

            const messages = await storage.getChatMessages(roomId);
            res.json(messages);
        } catch (error) {
            console.error("Error fetching chat messages:", error);
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    });

    // Send a message in a chat room
    app.post('/api/chat/rooms/:roomId/messages', isAuthenticated, async (req: any, res) => {
        try {
            const roomId = parseInt(req.params.roomId);
            const { message } = req.body;

            if (!message || message.trim().length === 0) {
                return res.status(400).json({ message: "Message cannot be empty" });
            }

            // Validate message length
            if (message.length > MAX_MESSAGE_LENGTH) {
                return res.status(400).json({ message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` });
            }

            // Sanitize message content to prevent XSS
            const sanitizedMessage = sanitizeMessage(message);

            if (sanitizedMessage.length === 0) {
                return res.status(400).json({ message: "Message cannot be empty after sanitization" });
            }

            // Verify user has access to this room
            const rooms = await storage.getChatRoomsForUser(req.user.id);
            const hasAccess = rooms.some(room => room.id === roomId);

            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied to this chat room" });
            }

            const newMessage = await storage.createChatMessage({
                chatRoomId: roomId,
                senderId: req.user.id,
                message: sanitizedMessage
            });

            res.json(newMessage);
        } catch (error) {
            console.error("Error sending message:", error);
            res.status(500).json({ message: "Failed to send message" });
        }
    });

    // Create or get chat room for candidate (called when talent owner initiates chat)
    app.post('/api/chat/rooms/create', isAuthenticated, async (req: any, res) => {
        try {
            const { jobId, candidateId } = req.body;

            // Only talent owners can create chat rooms
            if (req.user.role !== 'talent_owner') {
                return res.status(403).json({ message: "Only talent owners can initiate chats" });
            }

            // Check if room already exists
            const existingRoom = await storage.getChatRoom(jobId, candidateId);
            if (existingRoom) {
                return res.json(existingRoom);
            }

            // Create new chat room
            const room = await storage.createChatRoom({
                jobId,
                candidateId,
                hiringManagerId: req.user.id
            });

            res.json(room);
        } catch (error) {
            console.error("Error creating chat room:", error);
            res.status(500).json({ message: "Failed to create chat room" });
        }
    });
}

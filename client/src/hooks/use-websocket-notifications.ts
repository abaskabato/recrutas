import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: string;
  data: any;
}

interface NotificationData {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

export function useWebSocketNotifications(userId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'notification') {
            const notification: NotificationData = message.data;
            
            // Invalidate notification queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
            
            // Show toast notification for high priority items
            if (notification.priority === 'high' || notification.priority === 'urgent') {
              toast({
                title: notification.title,
                description: notification.message,
                variant: notification.priority === 'urgent' ? "destructive" : "default",
              });
            }
            
            // Play notification sound for urgent notifications
            if (notification.priority === 'urgent') {
              playNotificationSound();
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [userId, queryClient, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const markNotificationAsRead = useCallback((notificationId: number) => {
    sendMessage({
      type: 'mark_notification_read',
      notificationId,
    });
  }, [sendMessage]);

  const markAllNotificationsAsRead = useCallback(() => {
    sendMessage({
      type: 'mark_all_notifications_read',
    });
  }, [sendMessage]);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    reconnect: connect,
  };
}

function playNotificationSound() {
  try {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Notification sound not supported in this browser
  }
}
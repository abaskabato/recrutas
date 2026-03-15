import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";

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

const MAX_WS_RETRIES = 3;
const POLL_INTERVAL_MS = 30_000;

export function useWebSocketNotifications(userId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
  }, [queryClient]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    pollingIntervalRef.current = setInterval(refreshNotifications, POLL_INTERVAL_MS);
  }, [refreshNotifications]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.debug('[WS] No access token, falling back to polling');
        startPolling();
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        stopPolling();
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

            refreshNotifications();

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
          console.debug('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        retryCountRef.current += 1;

        if (retryCountRef.current <= MAX_WS_RETRIES) {
          // Exponential backoff: 3s, 6s, 12s
          const delay = 3000 * Math.pow(2, retryCountRef.current - 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          // WebSocket not available in this environment — fall back to polling
          console.debug('[WS] Max retries reached, switching to polling fallback');
          startPolling();
        }
      };

      ws.onerror = () => {
        // onerror always fires before onclose — close will handle retry logic
        console.debug('[WS] Connection failed (expected in serverless environments)');
        ws.close();
      };

    } catch (error) {
      console.debug('Failed to create WebSocket:', error);
    }
  }, [userId, refreshNotifications, startPolling, stopPolling, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopPolling();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [stopPolling]);

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
  } catch (_error) {
    // Notification sound not supported in this browser
  }
}
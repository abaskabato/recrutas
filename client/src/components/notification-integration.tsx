import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocketNotifications } from "@/hooks/use-websocket-notifications";
import { NotificationCenter } from "./notification-center";

interface NotificationIntegrationProps {
  userId?: string;
  children: React.ReactNode;
}

export function NotificationIntegration({ userId, children }: NotificationIntegrationProps) {
  // Initialize WebSocket connection for real-time notifications
  const { isConnected } = useWebSocketNotifications(userId);

  // Get current user data
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!userId,
  });

  return (
    <div className="relative">
      {children}
      {/* Notification indicator for connection status */}
      {userId && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2">
            <NotificationCenter />
            {/* Connection status indicator */}
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isConnected ? 'Connected' : 'Disconnected'} />
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationIntegration;
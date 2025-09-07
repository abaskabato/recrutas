import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useRoleBasedAuth";
import { useToast } from "@/hooks/use-toast";
import { Bell, BriefcaseIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function RealTimeNotifications() {
  const { user } = useRoleBasedAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        userId: user.id,
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'test') {
        const notification: Notification = {
          id: Date.now().toString(),
          type: 'test',
          message: data.message || 'Test notification',
          timestamp: new Date(),
          read: false,
        };
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: "Test Notification",
          description: notification.message,
        });
      } else if (data.type === 'new_match') {
        const notification: Notification = {
          id: Date.now().toString(),
          type: 'match',
          message: `New job match: ${data.match.job?.title || 'Job'}`,
          timestamp: new Date(),
          read: false,
        };
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: "New Job Match!",
          description: notification.message,
        });
      } else if (data.type === 'new_message') {
        const notification: Notification = {
          id: Date.now().toString(),
          type: 'message',
          message: "New message received",
          timestamp: new Date(),
          read: false,
        };
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };

    return () => {
      socket.close();
    };
  }, [user?.id]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Notifications</h3>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notifications yet
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-2 p-2 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="mt-1">
                    {notification.type === 'match' ? (
                      <BriefcaseIcon className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Bell className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useRoleBasedAuth as useAuth } from "@/hooks/useRoleBasedAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  BellRing,
  MessageSquare,
  Briefcase,
  UserCheck,
  Calendar,
  Settings,
  Check,
  X,
  Eye,
  Clock,
  Building,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  type: 'match' | 'message' | 'application' | 'interview' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: {
    jobId?: number;
    jobTitle?: string;
    company?: string;
    candidateName?: string;
    matchScore?: number;
  };
}

interface NotificationPreferences {
  emailMatches: boolean;
  emailMessages: boolean;
  emailApplications: boolean;
  pushMatches: boolean;
  pushMessages: boolean;
  pushApplications: boolean;
}

export default function AdvancedNotificationCenter() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch notification preferences
  const { data: preferences } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notifications/preferences'],
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PUT", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/notifications/mark-all-read", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      return apiRequest("PUT", "/api/notifications/preferences", newPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    }
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const filteredNotifications = notifications?.filter(notification => {
    if (activeTab === 'all') return true;
    return notification.type === activeTab;
  }) || [];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match': return <UserCheck className="w-5 h-5 text-green-600" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'application': return <Briefcase className="w-5 h-5 text-purple-600" />;
      case 'interview': return <Calendar className="w-5 h-5 text-orange-600" />;
      default: return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-blue-600" />
        ) : (
          <Bell className="w-5 h-5 text-slate-600" />
        )}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 shadow-lg z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="match" className="text-xs">Matches</TabsTrigger>
                <TabsTrigger value="message" className="text-xs">Messages</TabsTrigger>
                <TabsTrigger value="application" className="text-xs">Jobs</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-72">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.isRead ? 'text-slate-900' : 'text-slate-700'
                            }`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {notification.metadata && (
                            <div className="flex items-center space-x-2 mt-2">
                              {notification.metadata.company && (
                                <div className="flex items-center space-x-1">
                                  <Building className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    {notification.metadata.company}
                                  </span>
                                </div>
                              )}
                              {notification.metadata.matchScore && (
                                <Badge variant="secondary" className="text-xs">
                                  {notification.metadata.matchScore}% match
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Notification Preferences */}
            <div className="border-t border-slate-200 p-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  // Open preferences modal
                  setIsOpen(false);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
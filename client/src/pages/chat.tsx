import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, User } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatInterface from "@/components/chat-interface";

export default function Chat() {
  const params = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const jobId = params.jobId ? parseInt(params.jobId) : null;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/auth");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  const { data: chatRoom, isLoading: roomLoading } = useQuery({
    queryKey: ["/api/jobs", jobId, "chat"],
    queryFn: () => apiRequest(`/api/jobs/${jobId}/chat`),
    enabled: !!jobId && !!user,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: chatRooms = [], isLoading: roomsLoadingList } = useQuery({
    queryKey: ["/api/chat-rooms"],
    queryFn: () => apiRequest("/api/chat-rooms"),
    enabled: !jobId && !!user,
  });

  if (isLoading || roomLoading || roomsLoadingList) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (jobId) {
    if (!chatRoom) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <h2 className="text-xl font-semibold">Chat Not Available</h2>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                You do not have access to this chat room. You may need to pass the exam first.
              </p>
              <Button onClick={() => setLocation("/candidate-dashboard")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <ChatInterface roomId={chatRoom.id} room={chatRoom} />;
  }

  // Show chat rooms list
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold">Messages</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold">Your Conversations</h2>
          </CardHeader>
          <CardContent>
            {chatRooms.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-600">
                  When you pass an exam for a job, you'll be able to chat with the hiring manager here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatRooms.map((room: any) => {
                  const otherUser = user.role === 'candidate' ? room.hiringManager : room.candidate;
                  const jobTitle = room.job?.title || 'Job';
                  
                  return (
                    <Button
                      key={room.id}
                      variant="ghost"
                      className="w-full justify-start p-4 h-auto"
                      onClick={() => setLocation(`/chat/${room.jobId}`)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={otherUser.profileImageUrl} />
                        <AvatarFallback>
                          {(otherUser.firstName?.[0] || otherUser.email?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3 text-left flex-1">
                        <p className="font-medium">
                          {otherUser.firstName || otherUser.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-sm text-gray-600">{jobTitle}</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

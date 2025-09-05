import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, User } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatInterface from "@/components/chat-interface";

export default function Chat() {
  const { roomId } = useParams();
  const session = useSession();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [session, toast]);

  const { data: chatRooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/chat/rooms"],
    enabled: !!session?.user,
    retry: false,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat", roomId, "messages"],
    enabled: !!roomId && !!session?.user,
    retry: false,
  });

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!roomId) {
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
              {roomsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3 p-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : chatRooms.length === 0 ? (
                <div className="text-center py-12">
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-600">Start chatting with matched candidates or recruiters!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatRooms.map((room: any) => {
                    const otherUser = session.user.user_metadata.role === 'candidate' ? room.match.recruiter : room.match.candidate;
                    const jobTitle = room.match.job?.title || 'Job';
                    
                    return (
                      <Button
                        key={room.id}
                        variant="ghost"
                        className="w-full justify-start p-4 h-auto"
                        onClick={() => window.location.href = `/chat/${room.id}`}
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

  // Show specific chat room
  const currentRoom = chatRooms.find((room: any) => room.id.toString() === roomId);
  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chat room not found</p>
      </div>
    );
  }

  return <ChatInterface roomId={parseInt(roomId)} room={currentRoom} />;
}

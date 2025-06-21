import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, X } from "lucide-react";

interface ChatInterfaceProps {
  roomId: number;
  room: any;
  onClose?: () => void;
}

export default function ChatInterface({ roomId, room, onClose }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat", roomId, "messages"],
    enabled: !!roomId,
  });

  const { socket } = useWebSocket();

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (socket) {
        socket.send(JSON.stringify({
          type: 'chat_message',
          data: {
            chatRoomId: roomId,
            senderId: user.id,
            message: messageText,
          }
        }));
      }
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", roomId, "messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
          queryClient.invalidateQueries({ queryKey: ["/api/chat", roomId, "messages"] });
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket, roomId, queryClient]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const otherUser = user.role === 'candidate' ? room.match.recruiter : room.match.candidate;
  const jobTitle = room.match.job?.title || 'Job Position';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        {/* Chat Header */}
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={otherUser.profileImageUrl} />
                <AvatarFallback>
                  {(otherUser.firstName?.[0] || otherUser.email?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-neutral-800">
                  {otherUser.firstName || otherUser.email?.split('@')[0] || 'User'}
                </h3>
                <p className="text-sm text-neutral-600">{jobTitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose || (() => window.history.back())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Chat Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
                      <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isCurrentUser = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex items-start space-x-3 ${isCurrentUser ? 'justify-end' : ''}`}>
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender.profileImageUrl} />
                      <AvatarFallback>
                        {(msg.sender.firstName?.[0] || msg.sender.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-lg p-3 max-w-xs ${
                    isCurrentUser 
                      ? 'bg-primary text-white' 
                      : 'bg-neutral-100 text-neutral-800'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-blue-200' : 'text-neutral-500'
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {isCurrentUser && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback>
                        {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Chat Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <Input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  MessageCircle, 
  Phone, 
  Video, 
  MoreVertical,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
  };
}

interface ChatRoom {
  id: number;
  matchId: number;
  createdAt: string;
  match: {
    id: number;
    jobId: number;
    candidateId: string;
    status: string;
    job: {
      id: number;
      title: string;
      company: string;
    };
    candidate: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
    recruiter: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
}

interface RealTimeChatProps {
  roomId?: number;
  onClose?: () => void;
}

export default function RealTimeChat({ roomId, onClose }: RealTimeChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch chat room details
  const { data: chatRoom } = useQuery<ChatRoom>({
    queryKey: ['/api/chat/room', roomId],
    enabled: !!roomId,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/chat/messages', roomId],
    enabled: !!roomId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${roomId}/messages`, { content });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', roomId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!roomId || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join chat room
      ws.send(JSON.stringify({
        type: 'join_chat',
        roomId,
        userId: user.id,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message' && data.roomId === roomId) {
        // Invalidate messages to fetch new ones
        queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', roomId] });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [roomId, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId) return;
    
    sendMessageMutation.mutate(newMessage.trim());
  };

  const getOtherParticipant = () => {
    if (!chatRoom || !user) return null;
    
    const isCandidate = user.role === 'candidate';
    return isCandidate ? chatRoom.match.recruiter : chatRoom.match.candidate;
  };

  const otherParticipant = getOtherParticipant();

  if (!roomId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <MessageCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-slate-500">Select a conversation to start chatting</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Chat Header */}
      <CardHeader className="border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {otherParticipant?.firstName?.[0] || otherParticipant?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-slate-900">
                {otherParticipant?.firstName && otherParticipant?.lastName 
                  ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                  : otherParticipant?.email || 'Unknown User'
                }
              </h3>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-slate-500">
                  {chatRoom?.match.job.title} at {chatRoom?.match.job.company}
                </p>
                <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                  {isConnected ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!isOwn && (
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                            {message.sender.firstName?.[0] || message.sender.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`rounded-lg px-3 py-2 ${
                        isOwn 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center space-x-1 mt-1 ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}>
                          <Clock className="w-3 h-3 opacity-70" />
                          <span className="text-xs opacity-70">
                            {new Date(message.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {isOwn && <CheckCircle2 className="w-3 h-3 opacity-70" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="border-t border-slate-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
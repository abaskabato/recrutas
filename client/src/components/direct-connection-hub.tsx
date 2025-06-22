import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Calendar, 
  Send, 
  Phone, 
  Video, 
  Clock,
  CheckCircle,
  User,
  Building,
  Zap,
  Star,
  ExternalLink,
  Paperclip,
  MoreVertical,
  Bell,
  BellOff
} from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'candidate' | 'hiring_manager';
  content: string;
  timestamp: string;
  type: 'text' | 'scheduling_link' | 'interview_request' | 'system';
  metadata?: {
    schedulingUrl?: string;
    interviewType?: 'phone' | 'video' | 'in_person';
    proposedTimes?: string[];
  };
}

interface DirectConnection {
  id: string;
  candidateId: string;
  hiringManagerId: string;
  jobId: number;
  status: 'initiated' | 'active' | 'scheduled' | 'completed' | 'declined';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  lastMessageAt?: string;
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    skills: string[];
    totalScore: number;
    rank: number;
  };
  hiringManager: {
    name: string;
    email: string;
    title: string;
    schedulingUrl?: string;
  };
  job: {
    title: string;
    company: string;
  };
  messages: ChatMessage[];
  unreadCount: number;
}

interface SchedulingRequest {
  interviewType: 'phone' | 'video' | 'in_person';
  duration: number;
  proposedTimes: string[];
  message: string;
}

export default function DirectConnectionHub({ 
  hiringManagerId, 
  onConnectionUpdate 
}: {
  hiringManagerId: string;
  onConnectionUpdate?: (connection: DirectConnection) => void;
}) {
  const [selectedConnection, setSelectedConnection] = useState<DirectConnection | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showSchedulingDialog, setShowSchedulingDialog] = useState(false);
  const [schedulingRequest, setSchedulingRequest] = useState<SchedulingRequest>({
    interviewType: 'video',
    duration: 30,
    proposedTimes: [],
    message: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time messaging
  const { sendMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'new_message' && selectedConnection) {
        // Update messages in real-time
        setSelectedConnection(prev => prev ? {
          ...prev,
          messages: [...prev.messages, data.message]
        } : null);
      }
    }
  });

  // Fetch all direct connections for this hiring manager
  const { data: connections = [], refetch } = useQuery<DirectConnection[]>({
    queryKey: ['/api/hiring-manager', hiringManagerId, 'connections'],
    refetchInterval: 30000, // Real-time updates
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ connectionId, content, type = 'text', metadata }: {
      connectionId: string;
      content: string;
      type?: ChatMessage['type'];
      metadata?: ChatMessage['metadata'];
    }) => {
      const response = await fetch(`/api/connections/${connectionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type, metadata }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (newMessage) => {
      if (selectedConnection) {
        setSelectedConnection(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage]
        } : null);
      }
      setMessageInput('');
      
      // Send via WebSocket for real-time delivery
      sendMessage({
        type: 'chat_message',
        connectionId: selectedConnection?.id,
        message: newMessage
      });
    },
  });

  // Schedule interview mutation
  const scheduleInterviewMutation = useMutation({
    mutationFn: async (request: SchedulingRequest & { connectionId: string }) => {
      const response = await fetch(`/api/connections/${request.connectionId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Failed to schedule interview');
      return response.json();
    },
    onSuccess: () => {
      setShowSchedulingDialog(false);
      refetch();
    },
  });

  // Update connection status
  const updateConnectionStatus = useMutation({
    mutationFn: async ({ connectionId, status }: { connectionId: string; status: string }) => {
      const response = await fetch(`/api/connections/${connectionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => refetch(),
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConnection?.messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConnection) return;
    
    sendMessageMutation.mutate({
      connectionId: selectedConnection.id,
      content: messageInput.trim()
    });
  };

  const handleScheduleInterview = () => {
    if (!selectedConnection) return;
    
    scheduleInterviewMutation.mutate({
      ...schedulingRequest,
      connectionId: selectedConnection.id
    });
  };

  const sendQuickMessage = (template: string) => {
    if (!selectedConnection) return;
    
    sendMessageMutation.mutate({
      connectionId: selectedConnection.id,
      content: template
    });
  };

  const getConnectionPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-[700px] flex border rounded-lg overflow-hidden bg-white">
      {/* Connections Sidebar */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-4 border-b bg-white">
          <h3 className="font-semibold text-lg">Direct Connections</h3>
          <p className="text-sm text-gray-600">{connections.length} active conversations</p>
        </div>
        
        <div className="overflow-y-auto h-full">
          {connections.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No direct connections yet</p>
              <p className="text-sm text-gray-400">Top candidates will appear here automatically</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {connections.map((connection) => (
                <Card 
                  key={connection.id}
                  className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                    getConnectionPriorityColor(connection.priority)
                  } ${selectedConnection?.id === connection.id ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => setSelectedConnection(connection)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {connection.candidate.firstName[0]}{connection.candidate.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-sm">
                            {connection.candidate.firstName} {connection.candidate.lastName}
                          </h4>
                          <p className="text-xs text-gray-600">{connection.job.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={getStatusColor(connection.status)} variant="secondary">
                          {connection.status}
                        </Badge>
                        {connection.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-xs">
                            {connection.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Rank #{connection.candidate.rank}</span>
                      <span>{Math.round(connection.candidate.totalScore)}% match</span>
                      {connection.lastMessageAt && (
                        <span>{format(new Date(connection.lastMessageAt), 'MMM d, h:mm a')}</span>
                      )}
                    </div>
                    
                    {connection.messages.length > 0 && (
                      <p className="text-sm text-gray-600 mt-2 truncate">
                        {connection.messages[connection.messages.length - 1].content}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {selectedConnection ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {selectedConnection.candidate.firstName[0]}{selectedConnection.candidate.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedConnection.candidate.firstName} {selectedConnection.candidate.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedConnection.job.title} at {selectedConnection.job.company}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {Math.round(selectedConnection.candidate.totalScore)}% match
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSchedulingDialog(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 bg-gray-50 border-b">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => sendQuickMessage("Hi! I'm impressed with your application and would love to chat about this opportunity.")}
                >
                  Welcome Message
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => sendQuickMessage("Could you tell me more about your experience with [relevant skill]?")}
                >
                  Ask About Skills
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => sendQuickMessage("I'd like to schedule a brief 15-minute call to discuss this role. When would work best for you?")}
                >
                  Schedule Call
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConnection.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderRole === 'hiring_manager' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderRole === 'hiring_manager'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {message.type === 'system' && (
                      <div className="flex items-center space-x-2 text-xs opacity-75 mb-1">
                        <Zap className="h-3 w-3" />
                        <span>System Message</span>
                      </div>
                    )}
                    
                    <p className="text-sm">{message.content}</p>
                    
                    {message.metadata?.schedulingUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => window.open(message.metadata?.schedulingUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Book Interview
                      </Button>
                    )}
                    
                    <p className="text-xs opacity-75 mt-1">
                      {format(new Date(message.timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-600">Choose a candidate connection to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Scheduling Dialog */}
      <Dialog open={showSchedulingDialog} onOpenChange={setShowSchedulingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Interview Type</label>
              <select 
                value={schedulingRequest.interviewType}
                onChange={(e) => setSchedulingRequest(prev => ({ 
                  ...prev, 
                  interviewType: e.target.value as any 
                }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="video">Video Call</option>
                <option value="phone">Phone Call</option>
                <option value="in_person">In Person</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
              <select 
                value={schedulingRequest.duration}
                onChange={(e) => setSchedulingRequest(prev => ({ 
                  ...prev, 
                  duration: parseInt(e.target.value) 
                }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <Textarea
                value={schedulingRequest.message}
                onChange={(e) => setSchedulingRequest(prev => ({ 
                  ...prev, 
                  message: e.target.value 
                }))}
                placeholder="Add a personal message about the interview..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSchedulingDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleScheduleInterview}
                disabled={scheduleInterviewMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Send Interview Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
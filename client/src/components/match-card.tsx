import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, Clock, Lightbulb, MessageCircle } from "lucide-react";

interface MatchCardProps {
  match: any;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest('PATCH', `/api/matches/${match.id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate/matches"] });
      toast({
        title: "Status Updated",
        description: "Match status has been updated successfully.",
      });
    },
  });

  const createChatRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/chat/${match.id}/room`);
      return response.json();
    },
    onSuccess: (room) => {
      window.location.href = `/chat/${room.id}`;
    },
  });

  const getMatchBadgeColor = (score: number) => {
    if (score >= 90) return "bg-secondary/10 text-secondary";
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const matchScore = parseFloat(match.matchScore) || 0;

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-lg font-semibold text-neutral-800">
                {match.job.title}
              </h4>
              <Badge className={getMatchBadgeColor(matchScore)}>
                {matchScore}% Match
              </Badge>
            </div>
            <p className="text-neutral-600 mb-2">
              {match.job.company} • {match.job.location} • 
              {match.job.salaryMin && match.job.salaryMax && (
                ` $${(match.job.salaryMin / 1000).toFixed(0)}k-$${(match.job.salaryMax / 1000).toFixed(0)}k`
              )}
            </p>
            
            {/* Match Explanation */}
            {match.matchReasons && match.matchReasons.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-primary p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="text-primary h-4 w-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-800">Why you're a great match:</p>
                    <p className="text-sm text-neutral-600">
                      {match.matchReasons.join(" + ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-neutral-600">
              {match.status === 'viewed' && (
                <span className="flex items-center space-x-1">
                  <Eye className="text-green-500 h-4 w-4" />
                  <span>Viewed your profile</span>
                </span>
              )}
              <span className="flex items-center space-x-1">
                <Clock className="text-neutral-400 h-4 w-4" />
                <span>{new Date(match.createdAt).toLocaleDateString()}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col space-y-2 ml-4">
            <Button 
              size="sm"
              onClick={() => createChatRoomMutation.mutate()}
              disabled={createChatRoomMutation.isPending}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {match.status === 'pending' ? 'Start Chat' : 'Continue Chat'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => updateStatusMutation.mutate('viewed')}
              disabled={updateStatusMutation.isPending}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

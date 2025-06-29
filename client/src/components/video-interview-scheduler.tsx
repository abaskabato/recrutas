import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Video, Users, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VideoInterviewSchedulerProps {
  candidateId: string;
  jobId: number;
  applicationId: number;
}

export default function VideoInterviewScheduler({ candidateId, jobId, applicationId }: VideoInterviewSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [platform, setPlatform] = useState("zoom");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/interviews/schedule", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Interview Scheduled",
        description: "The candidate will receive an email with meeting details.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScheduleInterview = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for the interview.",
        variant: "destructive",
      });
      return;
    }

    const interviewDateTime = new Date(`${selectedDate}T${selectedTime}`);
    
    scheduleInterviewMutation.mutate({
      candidateId,
      jobId,
      applicationId,
      scheduledAt: interviewDateTime.toISOString(),
      duration: parseInt(duration),
      platform,
      notes,
    });
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-500" />
          Schedule Video Interview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interview-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Interview Date
            </Label>
            <Input
              id="interview-date"
              type="date"
              value={selectedDate}
              min={getMinDate()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interview-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Interview Time
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeSlots().map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Platform
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="meet">Google Meet</SelectItem>
                <SelectItem value="teams">Microsoft Teams</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interview-notes" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Interview Notes (optional)
          </Label>
          <Textarea
            id="interview-notes"
            placeholder="Add any specific topics to discuss or preparation instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Candidate receives email with meeting details</li>
            <li>• Calendar invite is automatically sent</li>
            <li>• {platform === 'phone' ? 'Phone number' : 'Meeting link'} will be provided</li>
            <li>• Both parties get reminder notifications</li>
          </ul>
        </div>

        <Button 
          onClick={handleScheduleInterview}
          disabled={scheduleInterviewMutation.isPending || !selectedDate || !selectedTime}
          className="w-full"
        >
          {scheduleInterviewMutation.isPending ? "Scheduling..." : "Schedule Interview"}
        </Button>
      </CardContent>
    </Card>
  );
}
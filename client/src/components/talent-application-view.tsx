import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationIntelligence } from "@shared/types/application-intelligence";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface TalentApplicationViewProps {
  application: ApplicationIntelligence;
}

export default function TalentApplicationView({ application }: TalentApplicationViewProps) {
  const queryClient = useQueryClient();
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDescription, setAssessmentDescription] = useState("");
  const [codilityAssessmentTitle, setCodilityAssessmentTitle] = useState("");
  const [codilityAssessmentDescription, setCodilityAssessmentDescription] = useState("");

  const eventMutation = useMutation({
    mutationFn: (eventType: string) => {
      return apiRequest(`/api/applications/${application.id}/events`, {
        method: "POST",
        body: JSON.stringify({ eventType }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/applications"] });
    },
  });

  const createAssessmentMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/integrations/hackerrank/create-assessment", {
        method: "POST",
        body: JSON.stringify({ title: assessmentTitle, description: assessmentDescription }),
      });
    },
  });

  const inviteCandidateMutation = useMutation({
    mutationFn: (assessmentId: number) => {
      return apiRequest("/api/integrations/hackerrank/invite-candidate", {
        method: "POST",
        body: JSON.stringify({ assessmentId, candidateEmail: application.candidateEmail }),
      });
    },
  });

  const { data: assessmentResult } = useQuery({
    queryKey: ["/api/integrations/hackerrank/assessment-result", application.hackerrankAssessmentId],
    enabled: !!application.hackerrankAssessmentId,
  });

  const createCodilityAssessmentMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/integrations/codility/create-assessment", {
        method: "POST",
        body: JSON.stringify({ title: codilityAssessmentTitle, description: codilityAssessmentDescription }),
      });
    },
  });

  const inviteCandidateToCodilityMutation = useMutation({
    mutationFn: (assessmentId: number) => {
      return apiRequest("/api/integrations/codility/invite-candidate", {
        method: "POST",
        body: JSON.stringify({ assessmentId, candidateEmail: application.candidateEmail }),
      });
    },
  });

  const { data: codilityAssessmentResult } = useQuery({
    queryKey: ["/api/integrations/codility/assessment-result", application.codilityAssessmentId],
    enabled: !!application.codilityAssessmentId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application from {application.candidateName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-4">
          <Button onClick={() => eventMutation.mutate("viewed")}>Mark as Viewed</Button>
          <Button onClick={() => eventMutation.mutate("screening")}>Move to Screening</Button>
          <Button onClick={() => eventMutation.mutate("interview_scheduled")}>Schedule Interview</Button>
          <Button onClick={() => eventMutation.mutate("rejected")} variant="destructive">
            Reject Application
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">HackerRank Assessment</h3>
          {application.hackerrankAssessmentId ? (
            <div>
              <p>Assessment ID: {application.hackerrankAssessmentId}</p>
              {assessmentResult ? (
                <div>
                  <p>Status: {assessmentResult.status}</p>
                  <p>Score: {assessmentResult.score}</p>
                </div>
              ) : (
                <Button onClick={() => inviteCandidateMutation.mutate(application.hackerrankAssessmentId)}>
                  Invite Candidate
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Assessment Title"
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
              />
              <Textarea
                placeholder="Assessment Description"
                value={assessmentDescription}
                onChange={(e) => setAssessmentDescription(e.target.value)}
              />
              <Button onClick={() => createAssessmentMutation.mutate()}>
                Create Assessment
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Codility Assessment</h3>
          {application.codilityAssessmentId ? (
            <div>
              <p>Assessment ID: {application.codilityAssessmentId}</p>
              {codilityAssessmentResult ? (
                <div>
                  <p>Status: {codilityAssessmentResult.status}</p>
                  <p>Score: {codilityAssessmentResult.score}</p>
                </div>
              ) : (
                <Button onClick={() => inviteCandidateToCodilityMutation.mutate(application.codilityAssessmentId)}>
                  Invite Candidate
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Assessment Title"
                value={codilityAssessmentTitle}
                onChange={(e) => setCodilityAssessmentTitle(e.target.value)}
              />
              <Textarea
                placeholder="Assessment Description"
                value={codilityAssessmentDescription}
                onChange={(e) => setCodilityAssessmentDescription(e.target.value)}
              />
              <Button onClick={() => createCodilityAssessmentMutation.mutate()}>
                Create Assessment
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

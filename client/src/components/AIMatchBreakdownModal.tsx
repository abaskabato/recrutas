
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { AIJobMatch } from "./ai-job-feed"; // Assuming AIJobMatch is exported from ai-job-feed

interface AIMatchBreakdownModalProps {
  match: AIJobMatch | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function AIMatchBreakdownModal({ match, isOpen, onOpenChange }: AIMatchBreakdownModalProps) {
  if (!match) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            AI Match Breakdown
          </DialogTitle>
          <DialogDescription>
            An AI-powered analysis of how your profile matches this job.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <h4 className="font-semibold text-md mb-2">AI Explanation</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{match.aiExplanation}</p>
          </div>
          <div>
            <h4 className="font-semibold text-md mb-2">Your Matching Skills</h4>
            <div className="flex flex-wrap gap-2">
              {match.skillMatches.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <h4 className="font-semibold text-md mb-2">Match Score</h4>
              <p className="text-2xl font-bold text-blue-600">{match.matchScore}</p>
            </div>
            <div>
              <h4 className="font-semibold text-md mb-2">Confidence Level</h4>
              <p className="text-2xl font-bold text-green-600">{match.confidenceLevel}%</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

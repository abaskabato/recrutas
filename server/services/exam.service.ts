
import { storage } from "../storage";
import { notificationService } from '../notification-service';

class ExamProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExamProcessingError";
  }
}

export class ExamService {
  constructor(private storage: typeof storage, private notificationService: typeof notificationService) {}

  async submitExam(jobId: number, userId: string, answers: any): Promise<{ score: number }> {
    console.log(`[ExamService] Submitting exam for job ${jobId} and user ${userId}`);

    try {
      const job = await this.storage.getJobPosting(jobId);
      if (!job) {
        throw new ExamProcessingError("Job not found");
      }

      const exam = await this.storage.getJobExam(jobId);
      if (!exam) {
        throw new ExamProcessingError("Exam not found for this job");
      }

      const score = this.calculateScore(exam.questions, answers);

      const examResult = {
        jobId,
        candidateId: userId,
        score,
        answers,
        totalQuestions: exam.questions.length,
        correctAnswers: 0, // Simplified for now
        timeSpent: 0, // Simplified for now
      };

      await this.storage.storeExamResult(examResult);
      console.log(`[ExamService] Exam result stored for job ${jobId} and user ${userId}`);

      if (job.autoRankCandidates) {
        console.log(`[ExamService] Autoranking candidates for job ${jobId}`);
        await this.storage.rankCandidatesByExamScore(jobId);
      }
      
      const candidate = await this.storage.getCandidateUser(userId);
      await this.notificationService.notifyExamCompleted(job.talentOwnerId, `${candidate?.firstName} ${candidate?.lastName}`, job.title, score, 0);


      return { score };
    } catch (error) {
      console.error("[ExamService] Error submitting exam:", error);
      if (error instanceof ExamProcessingError) {
        throw error;
      }
      throw new ExamProcessingError("Failed to submit exam");
    }
  }

  private calculateScore(questions: any[], answers: any): number {
    let score = 0;
    // Simplified scoring logic
    for (const question of questions) {
        if (answers[question.id]) {
            score += question.points || 10;
        }
    }
    return Math.min(100, score);
  }
}

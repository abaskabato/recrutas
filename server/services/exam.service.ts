import { IStorage } from "../storage";

// Interface for notification service to avoid circular dependency
interface INotificationService {
  notifyExamCompleted(talentOwnerId: string, candidateName: string, jobTitle: string, score: number, timeSpent: number): Promise<void>;
}

class ExamProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExamProcessingError";
  }
}

export class ExamService {
  constructor(private storage: IStorage, private notificationService: INotificationService) {}

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

      const { score, correctAnswers } = this.calculateScoreWithDetails(exam.questions, answers);

      const examResult = {
        jobId,
        candidateId: userId,
        score,
        answers,
        totalQuestions: exam.questions.length,
        correctAnswers,
        timeSpent: 0, // Will be passed from frontend later
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
    const { score } = this.calculateScoreWithDetails(questions, answers);
    return score;
  }

  private calculateScoreWithDetails(questions: any[], answers: any): { score: number; correctAnswers: number } {
    let earnedPoints = 0;
    let totalPoints = 0;
    let correctAnswers = 0;

    for (const question of questions) {
      const questionPoints = question.points || 10;
      totalPoints += questionPoints;

      const userAnswer = answers[question.id];
      if (userAnswer !== undefined && userAnswer !== null) {
        // For multiple choice, check if the answer matches correctAnswer
        if (question.type === 'multiple-choice') {
          if (userAnswer === question.correctAnswer) {
            earnedPoints += questionPoints;
            correctAnswers++;
          }
        }
        // For short-answer questions, give full points if answered (no correct answer defined)
        // These can be manually reviewed or use AI scoring later
        else if (question.type === 'short-answer' && userAnswer.toString().trim().length > 0) {
          earnedPoints += questionPoints;
          correctAnswers++;
        }
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    return { score, correctAnswers };
  }
}

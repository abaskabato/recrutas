import { IStorage } from '../storage';
import { AIResumeParser } from '../ai-resume-parser';
import { User } from '@shared/schema'; // Assuming User type is available from shared schema

// Define a custom error for resume processing failures
export class ResumeProcessingError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ResumeProcessingError';
    Object.setPrototypeOf(this, ResumeProcessingError.prototype);
  }
}

// Define the result structure for resume processing
export interface ResumeProcessingResult {
  resumeUrl: string;
  parsed: boolean;
  aiParsing: {
    success: boolean;
    confidence: number;
    processingTime: number;
  };
  extractedInfo: {
    skillsCount: number;
    softSkillsCount: number;
    experience: string;
    workHistoryCount: number;
    educationCount: number;
    certificationsCount: number;
    projectsCount: number;
    hasContactInfo: boolean;
    extractedName: string;
    extractedLocation: string;
    linkedinFound: boolean;
    githubFound: boolean;
  } | null;
  autoMatchingTriggered: boolean;
}

export class ResumeService {
  constructor(
    private storage: IStorage,
    private aiResumeParser: AIResumeParser
  ) {}

  /**
   * Upload and process resume synchronously.
   * Waits for both file upload and AI parsing to complete before returning.
   * This ensures processing completes on serverless platforms like Vercel.
   */
  async uploadAndProcessResume(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string
  ): Promise<ResumeProcessingResult> {
    const startTime = Date.now();
    console.log(`[ResumeService] Starting resume upload for user: ${userId}`);

    try {
      // Set processing status
      await this.storage.upsertCandidateUser({
        userId,
        resumeProcessingStatus: 'processing'
      });

      // Step 1: Upload file to storage
      console.log(`[ResumeService] Uploading file (${fileBuffer.length} bytes)...`);
      const resumeUrl = await this.storage.uploadResume(fileBuffer, mimetype);
      console.log(`[ResumeService] File uploaded to: ${resumeUrl}`);

      // Step 2: Parse with AI
      console.log(`[ResumeService] Starting AI parsing...`);
      const parseResult = await this.aiResumeParser.parseFile(fileBuffer, mimetype);
      const processingTime = Date.now() - startTime;
      console.log(`[ResumeService] AI parsing completed in ${processingTime}ms`);

      const aiExtracted = parseResult.aiExtracted || {};
      console.log(`[ResumeService] Extracted skills:`, aiExtracted.skills?.technical);

      // Step 3: Build profile update
      const profileUpdate: any = {
        userId,
        resumeUrl,
        resumeText: parseResult.text || '',
        resumeProcessingStatus: 'completed',
        parsedAt: new Date(),
        resumeParsingData: {
          confidence: parseResult.confidence || 0,
          processingTime,
          extractedSkillsCount: aiExtracted.skills?.technical?.length || 0,
          extractedPositionsCount: aiExtracted.experience?.positions?.length || 0,
          educationCount: aiExtracted.education?.length || 0,
          certificationsCount: aiExtracted.certifications?.length || 0,
          projectsCount: aiExtracted.projects?.length || 0,
        },
      };

      // Merge skills
      if (aiExtracted.skills?.technical?.length > 0) {
        const existingProfile = await this.storage.getCandidateUser(userId);
        const allSkills = [
          ...(existingProfile?.skills || []),
          ...aiExtracted.skills.technical,
        ];
        profileUpdate.skills = Array.from(new Set(allSkills)).slice(0, 25);
      }

      if (aiExtracted.experience?.level) {
        profileUpdate.experienceLevel = aiExtracted.experience.level;
      }
      if (aiExtracted.personalInfo?.location) {
        profileUpdate.location = aiExtracted.personalInfo.location;
      }
      if (aiExtracted.personalInfo?.linkedin) {
        profileUpdate.linkedinUrl = aiExtracted.personalInfo.linkedin;
      }
      if (aiExtracted.personalInfo?.github) {
        profileUpdate.githubUrl = aiExtracted.personalInfo.github;
      }

      // Step 4: Save to database
      await this.storage.upsertCandidateUser(profileUpdate);
      console.log(`[ResumeService] Profile updated for user: ${userId}`);

      // Log activity
      await this.storage.createActivityLog(
        userId,
        "resume_parsing_complete",
        `Resume parsed with ${parseResult.confidence}% confidence. Extracted ${aiExtracted.skills?.technical?.length || 0} skills.`
      );

      // Return full results
      return {
        resumeUrl,
        parsed: true,
        aiParsing: {
          success: true,
          confidence: parseResult.confidence || 0,
          processingTime,
        },
        extractedInfo: {
          skillsCount: aiExtracted.skills?.technical?.length || 0,
          softSkillsCount: aiExtracted.skills?.soft?.length || 0,
          experience: aiExtracted.experience?.level || 'unknown',
          workHistoryCount: aiExtracted.experience?.positions?.length || 0,
          educationCount: aiExtracted.education?.length || 0,
          certificationsCount: aiExtracted.certifications?.length || 0,
          projectsCount: aiExtracted.projects?.length || 0,
          hasContactInfo: !!(aiExtracted.personalInfo?.email || aiExtracted.personalInfo?.phone),
          extractedName: aiExtracted.personalInfo?.name || '',
          extractedLocation: aiExtracted.personalInfo?.location || '',
          linkedinFound: !!aiExtracted.personalInfo?.linkedin,
          githubFound: !!aiExtracted.personalInfo?.github,
        },
        autoMatchingTriggered: (aiExtracted.skills?.technical?.length || 0) > 0,
      };

    } catch (error: any) {
      console.error(`[ResumeService] Error processing resume for user ${userId}:`, error);

      // Update status to failed
      await this.storage.upsertCandidateUser({
        userId,
        resumeProcessingStatus: 'failed'
      }).catch(e => console.error('[ResumeService] Failed to update status:', e));

      await this.storage.createActivityLog(
        userId,
        "resume_parsing_failed",
        `Resume parsing failed: ${error?.message || 'Unknown error'}`
      ).catch(e => console.error('[ResumeService] Failed to log activity:', e));

      throw new ResumeProcessingError(`Failed to process resume: ${error?.message}`, error);
    }
  }

}

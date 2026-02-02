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
   * FAST upload - returns immediately without waiting for file storage
   * Both file upload and AI parsing happen asynchronously in background
   *
   * This eliminates the 504 timeout that occurred when uploading large files
   * to Supabase Storage (which can take 10-20+ seconds)
   */
  async uploadAndProcessResume(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string
  ): Promise<ResumeProcessingResult> {
    // Generate a temporary file name immediately
    const tempFileName = `resume-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // STEP 1: Return immediately without waiting for storage/AI (<100ms)
    // Both file upload and parsing happen in background
    console.log('ResumeService: Queueing file upload and AI parsing to background');
    this.uploadResumeInBackground(userId, fileBuffer, mimetype, tempFileName)
      .catch(err => console.error('ResumeService: Background upload failed (non-critical):', err));

    // STEP 2: Log activity (fire and forget)
    this.storage.createActivityLog(userId, "resume_upload", "Resume upload queued for processing")
      .catch(err => console.error('ResumeService: Activity log failed (non-critical):', err));

    // STEP 3: Return immediately with quick response (<100ms)
    return {
      resumeUrl: tempFileName,
      parsed: false,
      aiParsing: {
        success: false,
        confidence: 0,
        processingTime: 0,
      },
      extractedInfo: null,
      autoMatchingTriggered: false,
    };
  }

  /**
   * Background job for file upload and AI parsing - no timeout pressure
   * Uploads file to storage, then parses with AI
   */
  private async uploadResumeInBackground(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string,
    fileName: string
  ): Promise<void> {
    try {
      console.log(`[ResumeService] Starting background file upload for user: ${userId}`);
      const resumeUrl = await this.storage.uploadResume(fileBuffer, mimetype);
      console.log(`[ResumeService] File uploaded to: ${resumeUrl}`);
      await this.storage.upsertCandidateUser({ userId, resumeUrl });
      console.log(`[ResumeService] Basic resume data saved for user: ${userId}`);
      await this.parseResumeInBackground(userId, fileBuffer, mimetype, resumeUrl);
      console.log(`[ResumeService] Finished background file upload for user: ${userId}`);
    } catch (error) {
      console.error(`[ResumeService] Background upload/parse error for user ${userId}:`, error);
      await this.storage.createActivityLog(
        userId,
        "resume_upload_failed",
        `Resume upload failed: ${error?.message || 'Unknown error'}`
      ).catch(() => {});
    }
  }

  /**
   * Background job for AI parsing - no timeout pressure
   * This runs independently and updates profile when complete
   */
  private async parseResumeInBackground(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string,
    resumeUrl: string
  ): Promise<void> {
    try {
      console.log(`[ResumeService] Starting background AI parsing for user: ${userId}`);
      const startTime = Date.now();
      const result = await this.aiResumeParser.parseFile(fileBuffer, mimetype);
      const processingTime = Date.now() - startTime;
      console.log(`[ResumeService] AI parsing completed in ${processingTime}ms for user: ${userId}`);

      const aiExtracted = result.aiExtracted || {};
      console.log(`[ResumeService] Extracted skills for user ${userId}:`, aiExtracted.skills?.technical);

      const profileUpdate: any = {
        userId,
        resumeUrl,
        resumeText: result.text || '',
        resumeParsingData: {
          confidence: result.confidence || 0,
          processingTime: processingTime,
          extractedSkillsCount: aiExtracted.skills?.technical?.length || 0,
          extractedPositionsCount: aiExtracted.experience?.positions?.length || 0,
          educationCount: aiExtracted.education?.length || 0,
          certificationsCount: aiExtracted.certifications?.length || 0,
          projectsCount: aiExtracted.projects?.length || 0,
        },
      };

      if (aiExtracted.skills?.technical?.length > 0) {
        const existingProfile = await this.storage.getCandidateUser(userId);
        const allSkills = [
          ...(existingProfile?.skills || []),
          ...aiExtracted.skills.technical,
        ];
        profileUpdate.skills = Array.from(new Set(allSkills)).slice(0, 25);
      }

      if (aiExtracted.experience?.totalYears > 0) {
        profileUpdate.experience = aiExtracted.experience.level || 'entry';
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

      await this.storage.upsertCandidateUser(profileUpdate);
      console.log(`[ResumeService] Background parsing completed and profile updated for user: ${userId}`);

      const skillsCount = aiExtracted.skills?.technical?.length || 0;
      const experienceYears = aiExtracted.experience?.totalYears || 0;
      const positionsCount = aiExtracted.experience?.positions?.length || 0;
      const confidence = result.confidence || 0;

      await this.storage.createActivityLog(
        userId,
        "resume_parsing_complete",
        `Resume parsed successfully with ${confidence}% confidence. Extracted ${skillsCount} skills, ${experienceYears} years experience, ${positionsCount} positions.`
      );
    } catch (error) {
      console.error(`[ResumeService] Background parsing error for user ${userId}:`, error);
      await this.storage.createActivityLog(
        userId,
        "resume_parsing_failed",
        `Resume parsing failed: ${error?.message || 'Unknown error'}. Resume is still uploaded.`
      ).catch(() => {}); // Ignore if logging fails
    }
  }
}

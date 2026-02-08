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
   * Upload always succeeds; AI parsing failures are handled gracefully.
   */
  async uploadAndProcessResume(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string
  ): Promise<ResumeProcessingResult> {
    const startTime = Date.now();
    console.log(`[ResumeService] Starting resume upload for user: ${userId}`);

    let resumeUrl = '';

    try {
      // Set processing status
      await this.storage.upsertCandidateUser({
        userId,
        resumeProcessingStatus: 'processing'
      });

      // Step 1: Upload file to storage (this must succeed)
      console.log(`[ResumeService] Uploading file (${fileBuffer.length} bytes)...`);
      resumeUrl = await this.storage.uploadResume(fileBuffer, mimetype);
      console.log(`[ResumeService] File uploaded to: ${resumeUrl}`);

      // Save resume URL immediately
      await this.storage.upsertCandidateUser({ userId, resumeUrl });

    } catch (uploadError: any) {
      console.error(`[ResumeService] Upload failed for user ${userId}:`, uploadError);
      await this.storage.upsertCandidateUser({
        userId,
        resumeProcessingStatus: 'failed'
      }).catch((e: any) => console.warn('[ResumeService] Failed to update status after upload error:', e?.message));
      throw new ResumeProcessingError(`Failed to upload resume: ${uploadError?.message}`, uploadError);
    }

    // Step 2: Try AI parsing (failures don't break the upload)
    let parseResult: any = null;
    let aiExtracted: any = {};
    let parsingSuccess = false;

    try {
      console.log(`[ResumeService] Starting AI parsing...`);
      parseResult = await this.aiResumeParser.parseFile(fileBuffer, mimetype);
      aiExtracted = parseResult?.aiExtracted || {};
      parsingSuccess = (aiExtracted.skills?.technical?.length > 0);
      console.log(`[ResumeService] AI parsing completed:`, {
        hasText: !!parseResult?.text,
        textLength: parseResult?.text?.length || 0,
        skillsCount: aiExtracted.skills?.technical?.length || 0,
        confidence: parseResult?.confidence || 0,
        parsingSuccess
      });
    } catch (parseError: any) {
      console.error(`[ResumeService] AI parsing failed (non-fatal):`, {
        error: parseError?.message,
        stack: parseError?.stack?.split('\n').slice(0, 3).join('\n')
      });
      // Continue - upload succeeded, parsing failed
    }

    const processingTime = Date.now() - startTime;

    // Step 3: Build and save profile update
    try {
      const profileUpdate: any = {
        userId,
        resumeUrl,
        resumeText: parseResult?.text || '',
        resumeProcessingStatus: parsingSuccess ? 'completed' : 'failed',
        parsedAt: new Date(),
        resumeParsingData: {
          confidence: parseResult?.confidence || 0,
          processingTime,
          extractedSkillsCount: aiExtracted.skills?.technical?.length || 0,
          parsingError: parsingSuccess ? null : 'AI parsing failed',
        },
      };

      // Merge skills if we got any
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

      await this.storage.upsertCandidateUser(profileUpdate);
      console.log(`[ResumeService] Profile updated for user: ${userId}`);

      // Log activity
      await this.storage.createActivityLog(
        userId,
        parsingSuccess ? "resume_parsing_complete" : "resume_upload_complete",
        parsingSuccess
          ? `Resume parsed with ${parseResult?.confidence || 0}% confidence. Extracted ${aiExtracted.skills?.technical?.length || 0} skills.`
          : `Resume uploaded. AI parsing failed - you can add skills manually.`
      ).catch((e: any) => console.warn('[ResumeService] Failed to create activity log:', e?.message));

    } catch (saveError: any) {
      console.error(`[ResumeService] Failed to save profile:`, saveError);
      // Still return success since file was uploaded
    }

    // Return results (always succeeds if upload succeeded)
    return {
      resumeUrl,
      parsed: parsingSuccess,
      aiParsing: {
        success: parsingSuccess,
        confidence: parseResult?.confidence || 0,
        processingTime,
      },
      extractedInfo: parsingSuccess ? {
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
      } : null,
      autoMatchingTriggered: (aiExtracted.skills?.technical?.length || 0) > 0,
    };
  }

}

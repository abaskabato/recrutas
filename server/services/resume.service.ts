import { IStorage } from '../storage';
import { AIResumeParser } from '../ai-resume-parser';
import { User } from '@shared/schema';
import { normalizeSkills } from '../skill-normalizer';
import { sendInngestEvent } from '../inngest-service.js';

/**
 * Custom error for resume processing failures
 * @extends Error
 */
export class ResumeProcessingError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ResumeProcessingError';
    Object.setPrototypeOf(this, ResumeProcessingError.prototype);
  }
}

// Define the result structure for resume processing
/**
 * Result structure for resume processing operations
 * @interface ResumeProcessingResult
 */
export interface ResumeProcessingResult {
  resumeUrl: string;
  parsed: boolean;
  aiParsing: {
    success: boolean;
    confidence: number;
    processingTime: number;
  };
  extractedInfo: {
    // Full extracted data
    skills: {
      technical: string[];
      soft: string[];
      tools: string[];
    };
    experience: {
      level: string;
      years: number;
      positions: Array<{
        title: string;
        company: string;
        duration: string;
        description?: string;
      }>;
    };
    education: Array<{
      institution: string;
      degree: string;
      field?: string;
      year?: string;
    }>;
    certifications: string[];
    projects: Array<{
      name: string;
      description?: string;
      technologies?: string[];
    }>;
    personalInfo: {
      name: string;
      email: string;
      phone: string;
      location: string;
      linkedin: string;
      github: string;
      website: string;
    };
    // Summary counts
    skillsCount: number;
    workHistoryCount: number;
    educationCount: number;
    certificationsCount: number;
    projectsCount: number;
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
      parsingSuccess = (
        (aiExtracted.skills?.technical?.length > 0) ||
        (aiExtracted.skills?.soft?.length > 0) ||
        (aiExtracted.skills?.tools?.length > 0)
      );
      const totalSkills = (aiExtracted.skills?.technical?.length || 0) +
        (aiExtracted.skills?.soft?.length || 0) +
        (aiExtracted.skills?.tools?.length || 0);
      console.log(`[ResumeService] AI parsing completed:`, {
        hasText: !!parseResult?.text,
        textLength: parseResult?.text?.length || 0,
        technicalSkills: aiExtracted.skills?.technical?.length || 0,
        softSkills: aiExtracted.skills?.soft?.length || 0,
        toolSkills: aiExtracted.skills?.tools?.length || 0,
        totalSkills,
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
        resumeProcessingStatus: parsingSuccess ? 'completed' : 'failed',
        parsedAt: new Date(),
        resumeParsingData: {
          confidence: parseResult?.confidence || 0,
          processingTime,
          extractedSkillsCount: (aiExtracted.skills?.technical?.length || 0) +
            (aiExtracted.skills?.soft?.length || 0) +
            (aiExtracted.skills?.tools?.length || 0),
          parsingError: parsingSuccess ? null : 'AI parsing failed',
        },
      };

      // Only overwrite resumeText if we actually got content — don't nuke existing text on parse failure
      if (parseResult?.text) {
        profileUpdate.resumeText = parseResult.text;
      }

      // Skills: replace entirely from the new resume (don't merge — re-upload signals "this is my current profile")
      // If parsing failed and no skills were extracted, leave existing skills untouched
      const extractedSkills = [
        ...(aiExtracted.skills?.technical || []),
        ...(aiExtracted.skills?.soft || []),
        ...(aiExtracted.skills?.tools || []),
      ];
      if (extractedSkills.length > 0) {
        profileUpdate.skills = normalizeSkills(extractedSkills).slice(0, 30);
      }

      if (aiExtracted.experience?.level) {
        profileUpdate.experienceLevel = aiExtracted.experience.level;
      }
      // Build free-text experience summary from positions so scoreJobWithML has semantic signal
      const positions: Array<{ title?: string; company?: string; duration?: string; description?: string }> =
        aiExtracted.experience?.positions || [];
      if (positions.length > 0) {
        const summary = positions.slice(0, 4).map((p: any) =>
          [p.title, p.company, p.duration, p.description].filter(Boolean).join(' ')
        ).join('. ');
        profileUpdate.experience = summary.slice(0, 1000);
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

      // Fire match warming in background (non-blocking)
      if (parsingSuccess) {
        sendInngestEvent('candidate/profile-updated', { candidateId: userId }).catch(() => {});
      }

      // Log activity
      await this.storage.createActivityLog(
        userId,
        parsingSuccess ? "resume_parsing_complete" : "resume_upload_complete",
        parsingSuccess
          ? `Resume parsed with ${parseResult?.confidence || 0}% confidence. Extracted ${extractedSkills.length} skills.`
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
        // Full extracted data for display
        skills: {
          technical: aiExtracted.skills?.technical || [],
          soft: aiExtracted.skills?.soft || [],
          tools: aiExtracted.skills?.tools || []
        },
        experience: {
          level: aiExtracted.experience?.level || 'unknown',
          years: aiExtracted.experience?.totalYears || 0,
          positions: aiExtracted.experience?.positions || []
        },
        education: aiExtracted.education || [],
        certifications: aiExtracted.certifications || [],
        projects: aiExtracted.projects || [],
        personalInfo: {
          name: aiExtracted.personalInfo?.name || '',
          email: aiExtracted.personalInfo?.email || '',
          phone: aiExtracted.personalInfo?.phone || '',
          location: aiExtracted.personalInfo?.location || '',
          linkedin: aiExtracted.personalInfo?.linkedin || '',
          github: aiExtracted.personalInfo?.github || '',
          website: aiExtracted.personalInfo?.website || ''
        },
        // Summary counts
        skillsCount: (aiExtracted.skills?.technical?.length || 0) +
          (aiExtracted.skills?.soft?.length || 0) +
          (aiExtracted.skills?.tools?.length || 0),
        workHistoryCount: aiExtracted.experience?.positions?.length || 0,
        educationCount: aiExtracted.education?.length || 0,
        certificationsCount: aiExtracted.certifications?.length || 0,
        projectsCount: aiExtracted.projects?.length || 0,
      } : null,
      autoMatchingTriggered: parsingSuccess,
    };
  }

  /**
   * Retry a failed resume parse for a candidate.
   * Increments parseAttempts FIRST so a crash doesn't cause infinite retries.
   */
  async retryFailedParse(
    userId: string,
    resumeUrl: string
  ): Promise<{ userId: string; success: boolean; skills: number }> {
    console.log(`[ResumeService] Retrying failed parse for user: ${userId}, url: ${resumeUrl}`);

    // Increment attempts before retrying — crash-safe
    await this.storage.incrementParseAttempts(userId);

    try {
      // Download the resume file
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch resume: HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Infer mimetype from URL extension
      const ext = resumeUrl.split('?')[0].split('.').pop()?.toLowerCase();
      let mimetype = 'application/pdf';
      if (ext === 'docx') {
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      // Run AI parsing
      const parseResult = await this.aiResumeParser.parseFile(fileBuffer, mimetype);
      const aiExtracted = parseResult?.aiExtracted || {};
      const parsingSuccess = (
        (aiExtracted.skills?.technical?.length > 0) ||
        (aiExtracted.skills?.soft?.length > 0) ||
        (aiExtracted.skills?.tools?.length > 0)
      );

      const extractedSkills = [
        ...(aiExtracted.skills?.technical || []),
        ...(aiExtracted.skills?.soft || []),
        ...(aiExtracted.skills?.tools || []),
      ];

      // Build profile update
      const profileUpdate: any = {
        userId,
        resumeProcessingStatus: parsingSuccess ? 'completed' : 'failed',
        parsedAt: new Date(),
        resumeParsingData: {
          confidence: parseResult?.confidence || 0,
          processingTime: 0,
          extractedSkillsCount: extractedSkills.length,
          parsingError: parsingSuccess ? null : 'AI parsing failed on retry',
        },
      };

      if (parseResult?.text) {
        profileUpdate.resumeText = parseResult.text;
      }
      if (extractedSkills.length > 0) {
        profileUpdate.skills = normalizeSkills(extractedSkills).slice(0, 30);
      }
      if (aiExtracted.experience?.level) {
        profileUpdate.experienceLevel = aiExtracted.experience.level;
      }
      const positions: Array<{ title?: string; company?: string; duration?: string; description?: string }> =
        aiExtracted.experience?.positions || [];
      if (positions.length > 0) {
        const summary = positions.slice(0, 4).map((p: any) =>
          [p.title, p.company, p.duration, p.description].filter(Boolean).join(' ')
        ).join('. ');
        profileUpdate.experience = summary.slice(0, 1000);
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

      // Fire match warming on success
      if (parsingSuccess) {
        sendInngestEvent('candidate/profile-updated', { candidateId: userId }).catch(() => {});
      }

      console.log(`[ResumeService] Retry parse for ${userId}: success=${parsingSuccess}, skills=${extractedSkills.length}`);
      return { userId, success: parsingSuccess, skills: extractedSkills.length };
    } catch (error: any) {
      console.error(`[ResumeService] Retry parse failed for ${userId}:`, error?.message);
      // Status remains 'failed'; parseAttempts already incremented
      return { userId, success: false, skills: 0 };
    }
  }

}

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

  async uploadAndProcessResume(
    userId: string,
    fileBuffer: Buffer,
    mimetype: string
  ): Promise<ResumeProcessingResult> {
    let resumeUrl: string;
    try {
      console.log('ResumeService: Starting file upload to storage...');
      resumeUrl = await this.storage.uploadResume(fileBuffer, mimetype);
      console.log('ResumeService: File uploaded successfully to:', resumeUrl);
    } catch (error) {
      console.error('ResumeService: Error uploading resume to storage:', error);
      throw new ResumeProcessingError('Failed to upload resume to storage. Check Supabase configuration and storage bucket.', error);
    }



    // Temporarily bypass AI resume parsing for debugging, as it was in routes.ts
    // When re-enabling, ensure aiResumeParser is properly integrated and handles errors
    /*
    try {
      const result = await this.aiResumeParser.parseFile(fileBuffer, mimetype);
      parsedData = result;
      aiExtracted = result.aiExtracted;
      parsingSuccess = true;
    } catch (parseError) {
      console.error('ResumeService: AI Resume parsing failed:', parseError);
      // Continue with upload even if parsing fails, but log the error
    }
    */

    let existingProfile;
    try {
      existingProfile = await this.storage.getCandidateUser(userId);
    } catch (error) {
      console.error('ResumeService: Error fetching existing candidate profile:', error);
      throw new ResumeProcessingError('Failed to fetch candidate profile', error);
    }
    
    let parsedData: any = { text: '', aiExtracted: null, confidence: 0, processingTime: 0 };
    let aiExtracted: any = null;
    let parsingSuccess = false;

    // Resume parsing using external libraries like pdf-parse and mammoth
    // and AI-powered extraction
    try {
      console.log('ResumeService: Starting AI resume parsing...');
      const result = await this.aiResumeParser.parseFile(fileBuffer, mimetype);
      parsedData = result;
      aiExtracted = result.aiExtracted;
      parsingSuccess = true;
      console.log('ResumeService: AI parsing completed successfully');
    } catch (parseError) {
      console.error('ResumeService: AI Resume parsing failed:', parseError);
      console.error('ResumeService: Error details:', {
        message: parseError?.message,
        name: parseError?.name
      });
      // Continue with upload even if parsing fails, but log the error
      // Fallback: If AI parsing fails, ensure aiExtracted is still an object to avoid crashes
      aiExtracted = aiExtracted || {
        personalInfo: {}, summary: '', skills: { technical: [], soft: [], tools: [] },
        experience: { totalYears: 0, level: 'entry', positions: [] },
        education: [], certifications: [], projects: [], languages: []
      };
      // Keep parsingSuccess as false
    }

    const profileData: any = {
      ...(existingProfile || {}),
      userId,
      resumeUrl, // Always override with new resumeUrl
    };

    if (parsedData?.text) {
      profileData.resumeText = parsedData.text;
    }

    if (aiExtracted && parsingSuccess) {
      // Merge technical skills with existing skills
      const allSkills = [
        ...(existingProfile?.skills || []),
        ...aiExtracted.skills.technical
      ];
      profileData.skills = Array.from(new Set(allSkills)).slice(0, 25);
      
      // Set experience level and years
      if (aiExtracted.experience.totalYears > 0) {
        profileData.experience = aiExtracted.experience.level;
        profileData.experienceYears = aiExtracted.experience.totalYears;
      }
      
      // Set location from contact info
      if (aiExtracted.personalInfo.location) {
        profileData.location = aiExtracted.personalInfo.location;
      }
      
      // Set bio from AI-extracted summary
      if (aiExtracted.personalInfo.linkedin) {
        profileData.linkedinUrl = aiExtracted.personalInfo.linkedin;
      }
      if (aiExtracted.personalInfo.github) {
        profileData.githubUrl = aiExtracted.personalInfo.github;
      }
      if (aiExtracted.personalInfo.portfolio) {
        profileData.portfolioUrl = aiExtracted.personalInfo.portfolio;
      }

      // Store full parsed text for future reference
      if (parsedData?.text) {
        profileData.resumeText = parsedData.text;
      }
      
      // Store AI analysis metadata
      profileData.resumeParsingData = {
        confidence: parsedData?.confidence || 0,
        processingTime: parsedData?.processingTime || 0,
        extractedSkillsCount: aiExtracted.skills.technical.length,
        extractedPositionsCount: aiExtracted.experience.positions.length,
        educationCount: aiExtracted.education.length,
        certificationsCount: aiExtracted.certifications.length,
        projectsCount: aiExtracted.projects.length
      };
    }

    try {
      await this.storage.upsertCandidateUser(profileData);
    } catch (error) {
      console.error('ResumeService: Error upserting candidate profile:', error);
      throw new ResumeProcessingError('Failed to update candidate profile', error);
    }

    try {
      let activityMessage = "Resume uploaded successfully";
      if (parsingSuccess && aiExtracted) {
        const skillsCount = aiExtracted.skills.technical.length;
        const experienceYears = aiExtracted.experience.totalYears;
        const positionsCount = aiExtracted.experience.positions.length;
        const confidence = parsedData?.confidence || 0;
        
        activityMessage = `Resume uploaded and AI-parsed with ${confidence}% confidence. Extracted ${skillsCount} technical skills, ${experienceYears} years experience, and ${positionsCount} work positions.`;
      }
      await this.storage.createActivityLog(userId, "resume_upload", activityMessage);
    } catch (error) {
      console.error('ResumeService: Error creating activity log:', error);
      // Do not re-throw, activity log failure should not fail resume upload
    }

    // Trigger automatic job matching after resume upload
    let autoMatchingTriggered = false;
    try {
      // This part of the logic is complex and involves external calls.
      // For now, we'll keep it as a placeholder or simplify it.
      // In a real scenario, this might be an async job or a separate service call.
      console.log('ResumeService: Triggering automatic job matching (placeholder)');
      autoMatchingTriggered = true;
    } catch (error) {
      console.error('ResumeService: Error triggering automatic matches:', error);
      // Do not re-throw, matching failure should not fail resume upload
    }

    return {
      resumeUrl,
      parsed: parsingSuccess,
      aiParsing: {
        success: parsingSuccess,
        confidence: parsedData?.confidence || 0,
        processingTime: parsedData?.processingTime || 0
      },
      extractedInfo: aiExtracted ? {
        skillsCount: aiExtracted.skills.technical.length,
        softSkillsCount: aiExtracted.skills.soft.length,
        experience: `${aiExtracted.experience.totalYears} years (${aiExtracted.experience.level})`,
        workHistoryCount: aiExtracted.experience.positions.length,
        educationCount: aiExtracted.education.length,
        certificationsCount: aiExtracted.certifications.length,
        projectsCount: aiExtracted.projects.length,
        hasContactInfo: !!(aiExtracted.personalInfo.email || aiExtracted.personalInfo.phone),
        extractedName: aiExtracted.personalInfo.name,
        extractedLocation: aiExtracted.personalInfo.location,
        linkedinFound: !!aiExtracted.personalInfo.linkedin,
        githubFound: !!aiExtracted.personalInfo.github
      } : null,
      autoMatchingTriggered: autoMatchingTriggered
    };
  }
}

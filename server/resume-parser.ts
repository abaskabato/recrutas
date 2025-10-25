import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

interface ParsedResume {
  text: string;
  skills: string[];
  experience: string;
  education: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  workHistory: Array<{
    company: string;
    position: string;
    duration: string;
  }>;
  summary?: string;
}

// Common technical skills database
const SKILL_KEYWORDS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R',
  
  // Web Technologies
  'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js', 'Nuxt', 'Svelte', 'HTML', 'CSS', 'SASS', 'LESS',
  
  // Databases
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB', 'SQLite', 'Oracle', 'SQL Server', 'Cassandra', 'Neo4j',
  
  // Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'GitHub Actions', 'Terraform', 'Ansible',
  
  // Mobile
  'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin', 'Ionic',
  
  // Data & AI
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Tableau', 'Power BI', 'Spark', 'Hadoop',
  
  // Design & Marketing
  'Figma', 'Sketch', 'Adobe Creative Suite', 'Photoshop', 'Illustrator', 'InDesign', 'Canva', 'UX', 'UI',
  
  // Other Tools
  'Git', 'Linux', 'Windows', 'macOS', 'Jira', 'Slack', 'Trello', 'Notion', 'Confluence'
];

export class ResumeParser {
  async parseFile(filePath: string): Promise<ParsedResume> {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    try {
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        throw new Error('Unsupported file format');
      }

      return this.parseText(text);
    } catch (error) {
      console.error('Error parsing resume:', error);
      throw new Error('Failed to parse resume file');
    }
  }

  private parseText(text: string): ParsedResume {
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return {
      text: normalizedText,
      skills: this.extractSkills(normalizedText),
      experience: this.extractExperience(normalizedText),
      education: this.extractEducation(normalizedText),
      contactInfo: this.extractContactInfo(normalizedText),
      workHistory: this.extractWorkHistory(normalizedText),
      summary: this.extractSummary(normalizedText)
    };
  }

  private extractSkills(text: string): string[] {
    const foundSkills = new Set<string>();
    const textLower = text.toLowerCase();

    // Match exact skill keywords (case-insensitive)
    SKILL_KEYWORDS.forEach(skill => {
      const skillLower = skill.toLowerCase();
      
      // Check for exact matches with word boundaries
      const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(text)) {
        foundSkills.add(skill);
      }
    });

    // Look for skills in dedicated sections
    const skillsSection = this.extractSection(text, ['skills', 'technical skills', 'technologies', 'tools']);
    if (skillsSection) {
      // Extract comma-separated or bullet-pointed skills
      const skillLines = skillsSection.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      skillLines.forEach(line => {
        // Split by common separators
        const skills = line.split(/[,•·‣▪▫-]/)
          .map(s => s.trim())
          .filter(s => s.length > 1 && s.length < 30);

        skills.forEach(skill => {
          if (skill.match(/^[a-zA-Z0-9\s+#.]+$/)) {
            foundSkills.add(skill);
          }
        });
      });
    }

    return Array.from(foundSkills).slice(0, 20); // Limit to 20 skills
  }

  private extractExperience(text: string): string {
    // Look for years of experience mentioned
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*of\s*experience/gi,
      /(\d+)\+?\s*years?\s*in/gi,
      /(\d+)\+?\s*yrs?\s*experience/gi,
      /experience\s*:\s*(\d+)\+?\s*years?/gi
    ];

    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        const years = match[0].match(/\d+/);
        if (years) {
          return `${years[0]} years`;
        }
      }
    }

    // Calculate based on work history dates
    const workHistory = this.extractWorkHistory(text);
    if (workHistory.length > 0) {
      let totalMonths = 0;
      workHistory.forEach(job => {
        const months = this.calculateDuration(job.duration);
        totalMonths += months;
      });
      const years = Math.floor(totalMonths / 12);
      return years > 0 ? `${years} years` : 'Less than 1 year';
    }

    return 'Not specified';
  }

  private extractEducation(text: string): string[] {
    const education = [];
    const educationSection = this.extractSection(text, ['education', 'academic background', 'qualifications']);
    
    if (educationSection) {
      const degrees = [
        'PhD', 'Ph.D', 'Doctorate', 'Doctor of Philosophy',
        'Masters', 'Master\'s', 'MS', 'MA', 'MBA', 'MSc',
        'Bachelor\'s', 'Bachelors', 'BS', 'BA', 'BSc',
        'Associate', 'Diploma', 'Certificate'
      ];

      const lines = educationSection.split('\n').filter(line => line.trim().length > 0);
      
      lines.forEach(line => {
        const hasdegree = degrees.some(degree => 
          line.toLowerCase().includes(degree.toLowerCase())
        );
        
        if (hasdegree || line.match(/\b(19|20)\d{2}\b/)) {
          education.push(line.trim());
        }
      });
    }

    return education.slice(0, 5); // Limit to 5 education entries
  }

  private extractContactInfo(text: string): ParsedResume['contactInfo'] {
    const contactInfo: ParsedResume['contactInfo'] = {};

    // Email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      contactInfo.email = emailMatch[0];
    }

    // Phone
    const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0];
    }

    // LinkedIn
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/profile\/view\?id=)([A-Za-z0-9_-]+)/i);
    if (linkedinMatch) {
      contactInfo.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;
    }

    // GitHub
    const githubMatch = text.match(/(?:github\.com\/)([A-Za-z0-9_-]+)/i);
    if (githubMatch) {
      contactInfo.github = `https://github.com/${githubMatch[1]}`;
    }

    // Location (basic city, state detection)
    const locationPatterns = [
      /([A-Z][a-z]+),\s*([A-Z]{2})/g, // City, ST
      /([A-Z][a-z\s]+),\s*([A-Z][a-z\s]+)/g // City, State
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        contactInfo.location = match[0];
        break;
      }
    }

    return contactInfo;
  }

  private extractWorkHistory(text: string): ParsedResume['workHistory'] {
    const workHistory = [];
    const workSection = this.extractSection(text, ['experience', 'work experience', 'employment', 'work history', 'professional experience']);
    
    if (workSection) {
      const lines = workSection.split('\n').filter(line => line.trim().length > 0);
      let currentJob = null;

      lines.forEach(line => {
        line = line.trim();
        
        // Check if line contains a date range (likely a job entry)
        const datePattern = /(19|20)\d{2}[\s-]*(present|current|(19|20)\d{2})/i;
        const hasDate = datePattern.test(line);
        
        if (hasDate) {
          if (currentJob) {
            workHistory.push(currentJob);
          }
          
          const dateMatch = line.match(datePattern);
          currentJob = {
            company: this.extractCompanyName(line),
            position: this.extractPosition(line),
            duration: dateMatch ? dateMatch[0] : ''
          };
        } else if (currentJob && line.length > 10 && !line.startsWith('•') && !line.startsWith('-')) {
          // This might be a job title or company name
          if (!currentJob.position || currentJob.position.length < 5) {
            currentJob.position = line;
          } else if (!currentJob.company || currentJob.company.length < 5) {
            currentJob.company = line;
          }
        }
      });

      if (currentJob) {
        workHistory.push(currentJob);
      }
    }

    return workHistory.slice(0, 10); // Limit to 10 work entries
  }

  private extractSummary(text: string): string | undefined {
    const summarySection = this.extractSection(text, ['summary', 'profile', 'objective', 'about', 'overview']);
    
    if (summarySection) {
      const lines = summarySection.split('\n')
        .filter(line => line.trim().length > 20)
        .slice(0, 3); // Take first 3 substantial lines
      
      return lines.join(' ').substring(0, 300); // Limit to 300 characters
    }

    return undefined;
  }

  private extractSection(text: string, sectionNames: string[]): string | null {
    const lines = text.split('\n');
    
    for (const sectionName of sectionNames) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase().trim();
        
        if (line.includes(sectionName.toLowerCase()) && line.length < 50) {
          // Found section header, extract content
          const sectionContent = [];
          
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            
            // Stop if we hit another section header
            const isNextSection = sectionNames.some(name => 
              nextLine.toLowerCase().includes(name.toLowerCase()) && nextLine.length < 50
            ) || nextLine.match(/^[A-Z\s]{2,}$/);
            
            if (isNextSection) break;
            
            if (nextLine.length > 0) {
              sectionContent.push(nextLine);
            }
          }
          
          return sectionContent.join('\n');
        }
      }
    }
    
    return null;
  }

  private extractCompanyName(line: string): string {
    // Remove dates and common separators
    let company = line.replace(/(19|20)\d{2}[\s-]*(present|current|(19|20)\d{2})/gi, '');
    company = company.replace(/[|•·‣▪▫]/g, '');
    company = company.trim();
    
    // Take the last substantial part (usually company name comes after position)
    const parts = company.split(/[-,]/).map(p => p.trim()).filter(p => p.length > 2);
    return parts[parts.length - 1] || company;
  }

  private extractPosition(line: string): string {
    // Remove dates
    let position = line.replace(/(19|20)\d{2}[\s-]*(present|current|(19|20)\d{2})/gi, '');
    position = position.replace(/[|•·‣▪▫]/g, '');
    position = position.trim();
    
    // Take the first substantial part (usually position comes before company)
    const parts = position.split(/[-,]/).map(p => p.trim()).filter(p => p.length > 2);
    return parts[0] || position;
  }

  private calculateDuration(duration: string): number {
    const years = duration.match(/(\d+)\s*years?/i);
    const months = duration.match(/(\d+)\s*months?/i);
    
    let totalMonths = 0;
    if (years) totalMonths += parseInt(years[1]) * 12;
    if (months) totalMonths += parseInt(months[1]);
    
    // If no explicit duration, try to calculate from date range
    const dateMatches = duration.match(/(19|20)\d{2}/g);
    if (dateMatches && dateMatches.length === 2) {
      const startYear = parseInt(dateMatches[0]);
      const endYear = parseInt(dateMatches[1]);
      totalMonths = (endYear - startYear) * 12;
    }
    
    return totalMonths || 12; // Default to 1 year if can't calculate
  }
}

export const resumeParser = new ResumeParser();
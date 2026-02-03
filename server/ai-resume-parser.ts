import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { generateJobMatch } from './ai-service';
import Groq from 'groq-sdk';

// Lazy-initialize Groq client to ensure env vars are loaded (ESM imports hoist before dotenv.config)
let _groq: Groq | null = null;
function getGroqClient(): Groq | null {
  if (_groq === null && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '%GROQ_API_KEY%') {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

interface AIExtractedData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  experience: {
    totalYears: number;
    level: 'entry' | 'mid' | 'senior' | 'executive';
    positions: Array<{
      title: string;
      company: string;
      duration: string;
      responsibilities: string[];
    }>;
  };
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
    gpa?: string;
  }>;
  certifications: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  languages: string[];
}

interface ParsedResume {
  text: string;
  aiExtracted: AIExtractedData;
  confidence: number;
  processingTime: number;
}

export class AIResumeParser {
  private skillsDatabase = [
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell', 'PowerShell',

    // Frontend Technologies
    'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby', 'HTML5', 'CSS3', 'SASS', 'LESS', 'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Ant Design',

    // Backend Technologies
    'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET', 'Ruby on Rails', 'Laravel', 'Symfony', 'NestJS', 'GraphQL', 'REST API',

    // Databases
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB', 'SQLite', 'Oracle', 'SQL Server', 'Cassandra', 'Neo4j', 'Elasticsearch', 'Firebase', 'Supabase',

    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'Terraform', 'Ansible', 'Chef', 'Puppet', 'Helm', 'ArgoCD',

    // Mobile Development
    'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin', 'Ionic', 'Cordova', 'Swift', 'Objective-C', 'Kotlin', 'Java Android',

    // Data Science & AI
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Keras', 'OpenCV', 'NLTK', 'SpaCy', 'Jupyter', 'Tableau', 'Power BI', 'Apache Spark', 'Hadoop',

    // Design & UX
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign', 'Canva', 'Framer', 'Principle', 'InVision', 'Zeplin',

    // Testing & Quality
    'Jest', 'Cypress', 'Selenium', 'Playwright', 'Postman', 'JMeter', 'SonarQube', 'ESLint', 'Prettier', 'Mocha', 'Chai',

    // Project Management & Collaboration
    'Jira', 'Confluence', 'Trello', 'Asana', 'Monday.com', 'Slack', 'Microsoft Teams', 'Notion', 'Linear', 'GitHub', 'GitLab', 'Bitbucket'
  ];

  private softSkills = [
    'Leadership', 'Communication', 'Problem Solving', 'Team Management', 'Project Management', 'Critical Thinking',
    'Analytical Skills', 'Creativity', 'Adaptability', 'Time Management', 'Collaboration', 'Mentoring',
    'Strategic Planning', 'Decision Making', 'Negotiation', 'Presentation Skills', 'Customer Service'
  ];

  async parseFile(fileContent: Buffer | string, mimeType: string): Promise<ParsedResume> {
    const startTime = Date.now();

    try {
      // Extract text from file or use sample for demo
      const text = typeof fileContent === 'string' && fileContent === 'text-input' ? this.getSampleResumeText() : await this.extractText(fileContent as Buffer, mimeType);

      // Use AI-powered extraction
      const aiExtracted = await this.extractWithAI(text);

      // Calculate confidence based on extracted data completeness
      const confidence = this.calculateConfidence(aiExtracted);

      const processingTime = Date.now() - startTime;

      return {
        text,
        aiExtracted,
        confidence,
        processingTime
      };
    } catch (error) {
      console.error('AI Resume parsing error:', error);
      throw new Error('Failed to parse resume with AI');
    }
  }

  async parseText(resumeText: string): Promise<ParsedResume> {
    const startTime = Date.now();

    try {
      // Use AI-powered extraction on provided text
      const aiExtracted = await this.extractWithAI(resumeText);

      // Calculate confidence based on extracted data completeness
      const confidence = this.calculateConfidence(aiExtracted);

      const processingTime = Date.now() - startTime;

      return {
        text: resumeText,
        aiExtracted,
        confidence,
        processingTime
      };
    } catch (error) {
      console.error('AI Resume parsing error:', error);
      throw new Error('Failed to parse resume text with AI');
    }
  }

  private async extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      try {
        const pdf = (await import('pdf-parse')).default;
        const data = await pdf(fileBuffer);
        if (!data.text || data.text.trim().length < 50) {
          throw new Error('PDF extracted text is empty or too short. The PDF may be scanned/image-based.');
        }
        return data.text;
      } catch (error) {
        console.error('[AIResumeParser] PDF parsing failed:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        if (!result.value || result.value.trim().length < 50) {
          throw new Error('Word document extracted text is empty or too short.');
        }
        return result.value;
      } catch (error) {
        console.error('[AIResumeParser] Word document parsing failed:', error);
        throw new Error(`Failed to extract text from Word document: ${error.message}`);
      }
    } else if (mimeType === 'text/plain' || mimeType === 'application/json') {
      return fileBuffer.toString('utf-8');
    } else {
      console.warn(`[AIResumeParser] Unknown mime type: ${mimeType}, attempting to read as text.`);
      return fileBuffer.toString('utf-8');
    }
  }

  private getSampleResumeText(): string {
    return `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

Professional Summary
Experienced full-stack software engineer with 5 years of experience building scalable web applications. 
Proficient in JavaScript, Python, and cloud technologies. Strong problem-solving skills and passion 
for creating efficient, user-friendly solutions.

Technical Skills
Programming Languages: JavaScript, TypeScript, Python, Java, Go
Frontend: React, Vue.js, Angular, HTML5, CSS3, SASS
Backend: Node.js, Express.js, Django, Flask, Spring Boot
Databases: PostgreSQL, MongoDB, Redis, MySQL
Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins, Terraform
Tools: Git, Jira, Postman, VS Code

Professional Experience

Senior Software Engineer | Tech Startup Inc. | 2021 - Present
• Developed and maintained microservices architecture serving 1M+ users
• Led frontend development using React and TypeScript
• Implemented CI/CD pipelines reducing deployment time by 60%
• Mentored junior developers and conducted code reviews

Software Engineer | BigCorp Solutions | 2019 - 2021
• Built REST APIs using Node.js and Express.js
• Optimized database queries improving performance by 40%
• Collaborated with cross-functional teams on product features
• Participated in agile development processes

Education
Bachelor of Science in Computer Science | University of California | 2019
GPA: 3.8/4.0

Certifications
AWS Certified Solutions Architect
Google Cloud Professional Developer
Scrum Master Certified

Projects
E-commerce Platform | Personal Project
• Built full-stack e-commerce application using React and Node.js
• Integrated payment processing with Stripe API
• Deployed on AWS with auto-scaling capabilities

Languages
English (Native), Spanish (Conversational)`;
  }

  private async extractWithAI(text: string): Promise<AIExtractedData> {
    try {
      // Priority 1: Groq (configured and working - same key as job summarization)
      if (getGroqClient()) {
        try {
          console.log('[AIResumeParser] Trying Groq API (primary)...');
          return await this.extractWithGroq(text);
        } catch (groqError) {
          console.warn('[AIResumeParser] Groq failed, trying fallback providers:', groqError.message);
          // Continue to next provider
        }
      }

      // Priority 2: Ollama (free, local option) - only if enabled
      if (process.env.USE_OLLAMA === 'true') {
        try {
          const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
          const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
          console.log(`[AIResumeParser] Trying Ollama at ${ollamaUrl} with model ${ollamaModel}...`);
          return await this.extractWithOllama(text, ollamaUrl, ollamaModel);
        } catch (ollamaError) {
          console.warn('[AIResumeParser] Ollama failed, falling back to Hugging Face:', ollamaError.message);
          // Continue to Hugging Face fallback below
        }
      }

      // Priority 3: Hugging Face Inference API
      const apiKey = process.env.HF_API_KEY;

      if (!apiKey || apiKey === '%HF_API_KEY%') {
        console.warn('[AIResumeParser] HF_API_KEY is not set. Using fallback extraction.');
        return this.extractWithFallback(text);
      }

      console.log('[AIResumeParser] Sending resume text to Hugging Face API for extraction...');

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('HF API request timeout (30s)')), 30000)
      );

      const response = await Promise.race([
        fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistralai/Mistral-7B-Instruct-v0.1',
            messages: [
              {
                role: "system",
                content: "You are an expert resume parser. Extract structured data from resumes and return ONLY valid JSON with no other text."
              },
              {
                role: "user",
                content: `Extract the following information from this resume text and return as JSON (no markdown, no code blocks, just raw JSON):

            {
              "personalInfo": {
                "name": "extracted name",
                "email": "extracted email",
                "phone": "extracted phone",
                "location": "extracted location",
                "linkedin": "linkedin url",
                "github": "github url",
                "portfolio": "portfolio url"
              },
              "summary": "professional summary text",
              "skills": {
                "technical": ["list of technical skills"],
                "soft": ["list of soft skills"],
                "tools": ["list of tools and technologies"]
              },
              "experience": {
                "totalYears": 0,
                "level": "entry|mid|senior|executive",
                "positions": [
                  {
                    "title": "job title",
                    "company": "company name",
                    "duration": "time period",
                    "responsibilities": ["list of responsibilities"]
                  }
                ]
              },
              "education": [
                {
                  "degree": "degree name",
                  "institution": "school name",
                  "year": "graduation year",
                  "gpa": "gpa if mentioned"
                }
              ],
              "certifications": ["list of certifications"],
              "projects": [
                {
                  "name": "project name",
                  "description": "project description",
                  "technologies": ["technologies used"]
                }
              ],
              "languages": ["spoken languages"]
            }

            Resume text:
            ${text}`
              }
            ],
            max_tokens: 2000,
            temperature: 0.7,
          })
        }),
        timeoutPromise
      ]) as any;

      if (!response.ok) {
        throw new Error(`HF API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[AIResumeParser] Successfully received response from Hugging Face API');

      const content = data.choices?.[0]?.message?.content || '{}';
      const extractedData = JSON.parse(content);

      // Ensure all required fields are present with defaults
      return {
        personalInfo: extractedData.personalInfo || {},
        summary: extractedData.summary || '',
        skills: {
          technical: extractedData.skills?.technical || [],
          soft: extractedData.skills?.soft || [],
          tools: extractedData.skills?.tools || []
        },
        experience: {
          totalYears: extractedData.experience?.totalYears || 0,
          level: extractedData.experience?.level || 'entry',
          positions: extractedData.experience?.positions || []
        },
        education: extractedData.education || [],
        certifications: extractedData.certifications || [],
        projects: extractedData.projects || [],
        languages: extractedData.languages || []
      };
    } catch (error) {
      console.warn('[AIResumeParser] AI Resume parsing failed, falling back to rule-based extraction:', error.message);

      // Fallback to rule-based extraction
      return this.extractWithFallback(text);
    }
  }

  private async extractWithOllama(
    text: string,
    ollamaUrl: string,
    ollamaModel: string
  ): Promise<AIExtractedData> {
    console.log(`AIResumeParser: Calling Ollama model "${ollamaModel}"...`);

    const prompt = `You are an expert resume parser. Extract structured information from the following resume text and return ONLY valid JSON with no other text.

Resume text:
${text}

Return JSON with this exact structure:
{
  "personalInfo": {
    "name": "full name if found",
    "email": "email if found",
    "phone": "phone if found",
    "location": "location if found",
    "linkedin": "linkedin url if found",
    "github": "github url if found",
    "portfolio": "portfolio url if found"
  },
  "summary": "professional summary or objective if present",
  "skills": {
    "technical": ["list", "of", "technical", "skills"],
    "soft": ["list", "of", "soft", "skills"],
    "tools": ["list", "of", "tools", "and", "platforms"]
  },
  "experience": {
    "totalYears": 0,
    "level": "entry or mid or senior or executive",
    "positions": [
      {
        "title": "job title",
        "company": "company name",
        "duration": "time period",
        "responsibilities": ["responsibility1", "responsibility2"]
      }
    ]
  },
  "education": [
    {
      "degree": "degree name",
      "institution": "school/university name",
      "year": "graduation year",
      "gpa": "gpa if mentioned"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "projects": [
    {
      "name": "project name",
      "description": "brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "languages": ["language1", "language2"]
}`;

    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: prompt,
          stream: false,
          timeout: 120  // 2 minute timeout for local LLM
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const result = await response.json();
      console.log('AIResumeParser: Ollama extraction complete');

      // Parse the response
      let extractedData;
      try {
        extractedData = JSON.parse(result.response);
      } catch (parseError) {
        console.warn('Failed to parse Ollama response, using fallback:', parseError.message);
        return this.extractWithFallback(text);
      }

      return {
        personalInfo: extractedData.personalInfo || {},
        summary: extractedData.summary || '',
        skills: extractedData.skills || { technical: [], soft: [], tools: [] },
        experience: extractedData.experience || { totalYears: 0, level: 'entry', positions: [] },
        education: extractedData.education || [],
        certifications: extractedData.certifications || [],
        projects: extractedData.projects || [],
        languages: extractedData.languages || []
      };
    } catch (error) {
      console.warn('Ollama extraction failed:', error.message);
      throw error;  // Will be caught by parent extractWithAI and trigger fallback
    }
  }

  private async extractWithGroq(text: string): Promise<AIExtractedData> {
    const groqClient = getGroqClient();
    if (!groqClient) {
      throw new Error('Groq client not initialized');
    }

    console.log('[AIResumeParser] Calling Groq API with llama-3.3-70b-versatile...');

    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume parser. Extract structured data from resumes and return ONLY valid JSON with no other text or markdown formatting.'
        },
        {
          role: 'user',
          content: `Extract the following information from this resume text and return as JSON:

{
  "personalInfo": {
    "name": "extracted name",
    "email": "extracted email",
    "phone": "extracted phone",
    "location": "extracted location",
    "linkedin": "linkedin url",
    "github": "github url",
    "portfolio": "portfolio url"
  },
  "summary": "professional summary text",
  "skills": {
    "technical": ["list of technical skills"],
    "soft": ["list of soft skills"],
    "tools": ["list of tools and technologies"]
  },
  "experience": {
    "totalYears": 0,
    "level": "entry|mid|senior|executive",
    "positions": [
      {
        "title": "job title",
        "company": "company name",
        "duration": "time period",
        "responsibilities": ["list of responsibilities"]
      }
    ]
  },
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "year": "graduation year",
      "gpa": "gpa if mentioned"
    }
  ],
  "certifications": ["list of certifications"],
  "projects": [
    {
      "name": "project name",
      "description": "project description",
      "technologies": ["technologies used"]
    }
  ],
  "languages": ["spoken languages"]
}

Resume text:
${text}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    console.log('[AIResumeParser] Groq API response received, parsing JSON...');

    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.warn('[AIResumeParser] Failed to parse Groq response:', parseError.message);
      throw new Error('Failed to parse Groq JSON response');
    }

    console.log('[AIResumeParser] Successfully extracted data via Groq');

    // Ensure all required fields are present with defaults
    return {
      personalInfo: extractedData.personalInfo || {},
      summary: extractedData.summary || '',
      skills: {
        technical: extractedData.skills?.technical || [],
        soft: extractedData.skills?.soft || [],
        tools: extractedData.skills?.tools || []
      },
      experience: {
        totalYears: extractedData.experience?.totalYears || 0,
        level: extractedData.experience?.level || 'entry',
        positions: extractedData.experience?.positions || []
      },
      education: extractedData.education || [],
      certifications: extractedData.certifications || [],
      projects: extractedData.projects || [],
      languages: extractedData.languages || []
    };
  }

  private async extractWithFallback(text: string): Promise<AIExtractedData> {
    console.log('AIResumeParser: Using fallback rule-based extraction');
    return {
      personalInfo: this.extractPersonalInfo(text),
      summary: this.extractSummary(text),
      skills: this.extractSkillsAI(text),
      experience: this.extractExperienceAI(text),
      education: this.extractEducation(text),
      certifications: this.extractCertifications(text),
      projects: this.extractProjects(text),
      languages: this.extractLanguages(text)
    };
  }

  private extractPersonalInfo(text: string): AIExtractedData['personalInfo'] {
    const lines = text.split('\n').slice(0, 10); // Check first 10 lines
    const info: AIExtractedData['personalInfo'] = {};

    // Extract email using regex
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) info.email = emailMatch[0];

    // Extract phone using regex
    const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) info.phone = phoneMatch[0];

    // Extract LinkedIn URL
    const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
    if (linkedinMatch) info.linkedin = `https://${linkedinMatch[0]}`;

    // Extract GitHub URL
    const githubMatch = text.match(/github\.com\/[\w-]+/i);
    if (githubMatch) info.github = `https://${githubMatch[0]}`;

    // Extract name (usually first line or after certain keywords)
    const namePatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+)/m,
      /Name:\s*([A-Z][a-z]+ [A-Z][a-z]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        info.name = match[1];
        break;
      }
    }

    // Extract location
    const locationPatterns = [
      /([A-Z][a-z]+,\s*[A-Z]{2})/,
      /([A-Z][a-z]+,\s*[A-Z][a-z]+)/,
      /Location:\s*([^,\n]+)/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        info.location = match[1];
        break;
      }
    }

    return info;
  }

  private extractSummary(text: string): string {
    const summaryKeywords = ['summary', 'objective', 'profile', 'about', 'overview'];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (summaryKeywords.some(keyword => line.includes(keyword))) {
        // Extract next few lines as summary
        const summaryLines = [];
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !this.isNewSection(nextLine)) {
            summaryLines.push(nextLine);
          } else {
            break;
          }
        }
        return summaryLines.join(' ');
      }
    }

    // If no explicit summary, take first substantial paragraph
    const paragraphs = text.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.length > 100 && paragraph.length < 500) {
        return paragraph.trim();
      }
    }

    return '';
  }

  private extractSkillsAI(text: string): AIExtractedData['skills'] {
    const textLower = text.toLowerCase();
    const skills = {
      technical: [] as string[],
      soft: [] as string[],
      tools: [] as string[]
    };

    // Find technical skills
    this.skillsDatabase.forEach(skill => {
      const skillPattern = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (skillPattern.test(text)) {
        skills.technical.push(skill);
      }
    });

    // Find soft skills
    this.softSkills.forEach(skill => {
      const skillPattern = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (skillPattern.test(text)) {
        skills.soft.push(skill);
      }
    });

    // Extract skills from dedicated sections
    const skillsSection = this.extractSection(text, ['skills', 'technical skills', 'technologies', 'tools', 'competencies']);
    if (skillsSection) {
      const extractedSkills = this.parseSkillsSection(skillsSection);
      skills.technical.push(...extractedSkills.filter(s => !skills.technical.includes(s)));
    }

    return {
      technical: Array.from(new Set(skills.technical)).slice(0, 25),
      soft: Array.from(new Set(skills.soft)).slice(0, 10),
      tools: Array.from(new Set(skills.tools)).slice(0, 15)
    };
  }

  private extractExperienceAI(text: string): AIExtractedData['experience'] {
    const positions = this.extractWorkHistory(text);
    const totalYears = this.calculateTotalExperience(text, positions);

    let level: 'entry' | 'mid' | 'senior' | 'executive' = 'entry';
    if (totalYears >= 10) level = 'executive';
    else if (totalYears >= 5) level = 'senior';
    else if (totalYears >= 2) level = 'mid';

    return {
      totalYears,
      level,
      positions
    };
  }

  private extractWorkHistory(text: string): Array<{ title: string; company: string; duration: string; responsibilities: string[] }> {
    const positions = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for job title patterns
      const titlePattern = /(Software Engineer|Developer|Manager|Analyst|Designer|Consultant|Director|VP|CEO|CTO|Lead|Senior|Junior|Intern)/i;
      const datePattern = /\b\d{4}\b.*?(?:present|current|\d{4})/i;

      if (titlePattern.test(line) && (datePattern.test(line) || datePattern.test(lines[i + 1] || ''))) {
        const title = line;
        const company = this.extractCompanyFromLine(lines[i + 1] || '');
        const duration = this.extractDurationFromLines([line, lines[i + 1] || '', lines[i + 2] || '']);
        const responsibilities = this.extractResponsibilities(lines, i + 2);

        positions.push({
          title: title.replace(datePattern, '').trim(),
          company,
          duration,
          responsibilities
        });
      }
    }

    return positions.slice(0, 10); // Limit to 10 positions
  }

  private extractEducation(text: string): Array<{ degree: string; institution: string; year?: string; gpa?: string }> {
    const education = [];
    const educationSection = this.extractSection(text, ['education', 'academic', 'university', 'college']);

    if (educationSection) {
      const lines = educationSection.split('\n');
      const degreePattern = /(Bachelor|Master|PhD|B\.S\.|B\.A\.|M\.S\.|M\.A\.|MBA|Associate)/i;

      for (const line of lines) {
        if (degreePattern.test(line)) {
          const yearMatch = line.match(/\b(19|20)\d{2}\b/);
          const gpaMatch = line.match(/GPA:?\s*(\d\.\d+)/i);

          education.push({
            degree: line.trim(),
            institution: this.extractInstitutionFromLine(line),
            year: yearMatch ? yearMatch[0] : undefined,
            gpa: gpaMatch ? gpaMatch[1] : undefined
          });
        }
      }
    }

    return education;
  }

  private extractCertifications(text: string): string[] {
    const certifications: string[] = [];
    const certSection = this.extractSection(text, ['certifications', 'certificates', 'licenses']);

    if (certSection) {
      const lines = certSection.split('\n').filter(line => line.trim().length > 0);
      certifications.push(...lines.slice(0, 10));
    }

    // Common certification patterns
    const certPatterns = [
      /AWS Certified/gi,
      /Google Cloud/gi,
      /Microsoft Certified/gi,
      /Cisco Certified/gi,
      /Oracle Certified/gi,
      /PMP/gi,
      /Agile/gi,
      /Scrum Master/gi
    ];

    certPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        certifications.push(...matches);
      }
    });

    return Array.from(new Set(certifications)).slice(0, 10);
  }

  private extractProjects(text: string): Array<{ name: string; description: string; technologies: string[] }> {
    const projects = [];
    const projectSection = this.extractSection(text, ['projects', 'portfolio', 'personal projects']);

    if (projectSection) {
      const projectBlocks = projectSection.split(/\n\s*\n/);

      for (const block of projectBlocks) {
        if (block.trim().length > 20) {
          const lines = block.split('\n');
          const name = lines[0].trim();
          const description = lines.slice(1).join(' ').trim();
          const technologies = this.extractTechnologiesFromText(description);

          projects.push({
            name,
            description,
            technologies
          });
        }
      }
    }

    return projects.slice(0, 5);
  }

  private extractLanguages(text: string): string[] {
    const languages: string[] = [];
    const langSection = this.extractSection(text, ['languages', 'language skills']);

    if (langSection) {
      const commonLanguages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi'];

      commonLanguages.forEach(lang => {
        if (new RegExp(`\\b${lang}\\b`, 'i').test(langSection)) {
          languages.push(lang);
        }
      });
    }

    return languages;
  }

  // Helper methods
  private extractSection(text: string, keywords: string[]): string | null {
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        const sectionLines = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (this.isNewSection(nextLine)) {
            break;
          }
          sectionLines.push(nextLine);
        }
        return sectionLines.join('\n');
      }
    }

    return null;
  }

  private isNewSection(line: string): boolean {
    const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'references'];
    const lineLower = line.toLowerCase().trim();
    return sectionKeywords.some(keyword => lineLower === keyword || lineLower.endsWith(keyword));
  }

  private parseSkillsSection(section: string): string[] {
    const skills = [];
    const lines = section.split('\n');

    for (const line of lines) {
      const skillsInLine = line.split(/[,•·‣▪▫-]/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 30);

      skills.push(...skillsInLine);
    }

    return skills;
  }

  private calculateTotalExperience(text: string, positions: any[]): number {
    // Try to find explicit experience mentions
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*of\s*experience/gi,
      /(\d+)\+?\s*years?\s*in/gi,
      /(\d+)\+?\s*yrs?\s*experience/gi
    ];

    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        const years = match[0].match(/\d+/);
        if (years) {
          return parseInt(years[0]);
        }
      }
    }

    // Calculate from work history if available
    if (positions.length > 0) {
      let totalMonths = 0;

      positions.forEach(position => {
        const duration = this.parseDuration(position.duration);
        totalMonths += duration;
      });

      return Math.round(totalMonths / 12);
    }

    return 0;
  }

  private parseDuration(duration: string): number {
    const yearMatch = duration.match(/(\d+)\s*years?/i);
    const monthMatch = duration.match(/(\d+)\s*months?/i);

    let months = 0;
    if (yearMatch) months += parseInt(yearMatch[1]) * 12;
    if (monthMatch) months += parseInt(monthMatch[1]);

    return months || 12; // Default to 1 year if no duration found
  }

  private extractCompanyFromLine(line: string): string {
    // Remove common patterns to isolate company name
    return line.replace(/\b\d{4}\b.*?(?:present|current|\d{4})/gi, '').trim();
  }

  private extractDurationFromLines(lines: string[]): string {
    for (const line of lines) {
      const datePattern = /\b\d{4}\b.*?(?:present|current|\d{4})/i;
      const match = line.match(datePattern);
      if (match) {
        return match[0];
      }
    }
    return '';
  }

  private extractResponsibilities(lines: string[], startIndex: number): string[] {
    const responsibilities = [];

    for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        responsibilities.push(line.replace(/^[•\-*]\s*/, ''));
      } else if (this.isNewSection(line) || line.length < 10) {
        break;
      }
    }

    return responsibilities;
  }

  private extractInstitutionFromLine(line: string): string {
    const parts = line.split(/[,\n]/);
    for (const part of parts) {
      if (part.toLowerCase().includes('university') ||
        part.toLowerCase().includes('college') ||
        part.toLowerCase().includes('institute')) {
        return part.trim();
      }
    }
    return parts[parts.length - 1]?.trim() || '';
  }

  private extractTechnologiesFromText(text: string): string[] {
    const technologies: string[] = [];

    this.skillsDatabase.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        technologies.push(skill);
      }
    });

    return technologies.slice(0, 10);
  }

  private calculateConfidence(data: AIExtractedData): number {
    let score = 0;
    let maxScore = 0;

    // Personal info (20 points max)
    maxScore += 20;
    if (data.personalInfo.name) score += 5;
    if (data.personalInfo.email) score += 5;
    if (data.personalInfo.phone) score += 3;
    if (data.personalInfo.location) score += 3;
    if (data.personalInfo.linkedin) score += 2;
    if (data.personalInfo.github) score += 2;

    // Skills (25 points max)
    maxScore += 25;
    score += Math.min(data.skills.technical.length * 2, 20);
    score += Math.min(data.skills.soft.length, 5);

    // Experience (25 points max)
    maxScore += 25;
    score += Math.min(data.experience.positions.length * 5, 20);
    if (data.experience.totalYears > 0) score += 5;

    // Education (15 points max)
    maxScore += 15;
    score += Math.min(data.education.length * 7, 15);

    // Other (15 points max)
    maxScore += 15;
    if (data.summary) score += 5;
    score += Math.min(data.certifications.length * 2, 5);
    score += Math.min(data.projects.length * 1, 5);

    return Math.round((score / maxScore) * 100);
  }
}

export const aiResumeParser = new AIResumeParser();
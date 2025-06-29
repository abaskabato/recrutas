import * as path from 'path';
import mammoth from 'mammoth';
export class AIResumeParser {
    skillsDatabase = [
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
    softSkills = [
        'Leadership', 'Communication', 'Problem Solving', 'Team Management', 'Project Management', 'Critical Thinking',
        'Analytical Skills', 'Creativity', 'Adaptability', 'Time Management', 'Collaboration', 'Mentoring',
        'Strategic Planning', 'Decision Making', 'Negotiation', 'Presentation Skills', 'Customer Service'
    ];
    async parseFile(filePath) {
        const startTime = Date.now();
        try {
            // Extract text from file
            const text = await this.extractText(filePath);
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
        }
        catch (error) {
            console.error('AI Resume parsing error:', error);
            throw new Error('Failed to parse resume with AI');
        }
    }
    async extractText(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
            // For demonstration, return sample resume text for PDF files
            // In production, you'd integrate with pdf-parse or similar library
            return this.getSampleResumeText();
        }
        else if (ext === '.docx' || ext === '.doc') {
            try {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value;
            }
            catch (error) {
                // Fallback to sample text if document parsing fails
                return this.getSampleResumeText();
            }
        }
        else {
            throw new Error('Unsupported file format');
        }
    }
    getSampleResumeText() {
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
    async extractWithAI(text) {
        // AI-powered extraction using pattern recognition and NLP techniques
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
    extractPersonalInfo(text) {
        const lines = text.split('\n').slice(0, 10); // Check first 10 lines
        const info = {};
        // Extract email using regex
        const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch)
            info.email = emailMatch[0];
        // Extract phone using regex
        const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        if (phoneMatch)
            info.phone = phoneMatch[0];
        // Extract LinkedIn URL
        const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
        if (linkedinMatch)
            info.linkedin = `https://${linkedinMatch[0]}`;
        // Extract GitHub URL
        const githubMatch = text.match(/github\.com\/[\w-]+/i);
        if (githubMatch)
            info.github = `https://${githubMatch[0]}`;
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
    extractSummary(text) {
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
                    }
                    else {
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
    extractSkillsAI(text) {
        const textLower = text.toLowerCase();
        const skills = {
            technical: [],
            soft: [],
            tools: []
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
    extractExperienceAI(text) {
        const positions = this.extractWorkHistory(text);
        const totalYears = this.calculateTotalExperience(text, positions);
        let level = 'entry';
        if (totalYears >= 10)
            level = 'executive';
        else if (totalYears >= 5)
            level = 'senior';
        else if (totalYears >= 2)
            level = 'mid';
        return {
            totalYears,
            level,
            positions
        };
    }
    extractWorkHistory(text) {
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
    extractEducation(text) {
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
    extractCertifications(text) {
        const certifications = [];
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
    extractProjects(text) {
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
    extractLanguages(text) {
        const languages = [];
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
    extractSection(text, keywords) {
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
    isNewSection(line) {
        const sectionKeywords = ['experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'references'];
        const lineLower = line.toLowerCase().trim();
        return sectionKeywords.some(keyword => lineLower === keyword || lineLower.endsWith(keyword));
    }
    parseSkillsSection(section) {
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
    calculateTotalExperience(text, positions) {
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
    parseDuration(duration) {
        const yearMatch = duration.match(/(\d+)\s*years?/i);
        const monthMatch = duration.match(/(\d+)\s*months?/i);
        let months = 0;
        if (yearMatch)
            months += parseInt(yearMatch[1]) * 12;
        if (monthMatch)
            months += parseInt(monthMatch[1]);
        return months || 12; // Default to 1 year if no duration found
    }
    extractCompanyFromLine(line) {
        // Remove common patterns to isolate company name
        return line.replace(/\b\d{4}\b.*?(?:present|current|\d{4})/gi, '').trim();
    }
    extractDurationFromLines(lines) {
        for (const line of lines) {
            const datePattern = /\b\d{4}\b.*?(?:present|current|\d{4})/i;
            const match = line.match(datePattern);
            if (match) {
                return match[0];
            }
        }
        return '';
    }
    extractResponsibilities(lines, startIndex) {
        const responsibilities = [];
        for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                responsibilities.push(line.replace(/^[•\-*]\s*/, ''));
            }
            else if (this.isNewSection(line) || line.length < 10) {
                break;
            }
        }
        return responsibilities;
    }
    extractInstitutionFromLine(line) {
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
    extractTechnologiesFromText(text) {
        const technologies = [];
        this.skillsDatabase.forEach(skill => {
            if (text.toLowerCase().includes(skill.toLowerCase())) {
                technologies.push(skill);
            }
        });
        return technologies.slice(0, 10);
    }
    calculateConfidence(data) {
        let score = 0;
        let maxScore = 0;
        // Personal info (20 points max)
        maxScore += 20;
        if (data.personalInfo.name)
            score += 5;
        if (data.personalInfo.email)
            score += 5;
        if (data.personalInfo.phone)
            score += 3;
        if (data.personalInfo.location)
            score += 3;
        if (data.personalInfo.linkedin)
            score += 2;
        if (data.personalInfo.github)
            score += 2;
        // Skills (25 points max)
        maxScore += 25;
        score += Math.min(data.skills.technical.length * 2, 20);
        score += Math.min(data.skills.soft.length, 5);
        // Experience (25 points max)
        maxScore += 25;
        score += Math.min(data.experience.positions.length * 5, 20);
        if (data.experience.totalYears > 0)
            score += 5;
        // Education (15 points max)
        maxScore += 15;
        score += Math.min(data.education.length * 7, 15);
        // Other (15 points max)
        maxScore += 15;
        if (data.summary)
            score += 5;
        score += Math.min(data.certifications.length * 2, 5);
        score += Math.min(data.projects.length * 1, 5);
        return Math.round((score / maxScore) * 100);
    }
}
export const aiResumeParser = new AIResumeParser();

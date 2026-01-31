/**
 * Factory functions for creating consistent test data
 */

/**
 * Create a sample job posting with reasonable defaults
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Job posting object
 */
export function createSampleJob(overrides = {}) {
  return {
    title: 'Software Engineer',
    description: 'We are looking for a software engineer to join our team.',
    company: 'Tech Corp',
    requirements: {
      yearsExperience: 3,
      educationLevel: 'bachelor',
      certifications: [],
    },
    skills: ['JavaScript', 'React', 'Node.js'],
    location: 'Remote',
    workType: 'remote',
    salaryMin: 80000,
    salaryMax: 120000,
    status: 'active',
    talentOwnerId: undefined, // Will be set by test
    ...overrides,
  };
}

/**
 * Create a candidate profile with sample data
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Candidate profile object
 */
export function createCandidateProfile(overrides = {}) {
  return {
    skills: ['TypeScript', 'React', 'Node.js'],
    experience: 'mid',
    yearsExperience: 4,
    location: 'Remote',
    workType: ['remote'],
    minSalary: 70000,
    maxSalary: 150000,
    industry: 'technology',
    resumeUrl: null,
    ...overrides,
  };
}

/**
 * Create an AI extracted resume data structure
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Parsed resume data
 */
export function createParsedResumeData(overrides = {}) {
  return {
    personalInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/johndoe',
      github: 'github.com/johndoe',
      portfolio: 'johndoe.dev',
    },
    summary:
      'Experienced software engineer with 5 years in full-stack development.',
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      soft: ['Leadership', 'Communication', 'Problem Solving'],
      tools: ['Git', 'Docker', 'AWS', 'CI/CD'],
    },
    experience: {
      totalYears: 5,
      level: 'mid',
      positions: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          startDate: '2022-01',
          endDate: null,
          description: 'Led full-stack development team',
          technologies: ['React', 'Node.js', 'PostgreSQL'],
        },
        {
          title: 'Software Engineer',
          company: 'StartUp Inc',
          startDate: '2019-06',
          endDate: '2022-01',
          description: 'Full-stack development',
          technologies: ['JavaScript', 'React', 'Node.js'],
        },
      ],
    },
    education: [
      {
        degree: 'Bachelor of Science',
        institution: 'State University',
        year: 2019,
        gpa: 3.8,
      },
    ],
    certifications: [
      'AWS Solutions Architect Associate',
      'Certified Kubernetes Administrator',
    ],
    projects: [
      {
        name: 'E-commerce Platform',
        description: 'Built full-stack e-commerce system',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
        url: 'https://example.com',
      },
    ],
    languages: ['English', 'Spanish'],
  };
}

/**
 * Create a job match result
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Job match object
 */
export function createJobMatch(overrides = {}) {
  return {
    jobId: 1,
    candidateId: undefined, // Will be set by test
    score: 0.85,
    confidenceLevel: 0.9,
    skillMatches: ['JavaScript', 'React', 'Node.js'],
    aiExplanation:
      'Strong match: candidate has all required skills and relevant experience',
    status: 'unreviewed',
    ...overrides,
  };
}

/**
 * Create an advanced match result with full hybrid scoring
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Advanced match result
 */
export function createAdvancedMatch(overrides = {}) {
  return {
    jobId: 1,
    job: createSampleJob(),
    candidateId: undefined, // Will be set by test
    finalScore: 0.82,
    semanticRelevance: 0.9,
    recency: 0.8,
    liveness: 1.0,
    personalization: 0.75,
    skillMatches: ['JavaScript', 'React', 'Node.js'],
    aiExplanation: 'Excellent match based on technical skills and experience',
    isVerifiedActive: true,
    isDirectFromCompany: false,
    ...overrides,
  };
}

/**
 * Create a resume processing result (immediately returned)
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Resume upload result
 */
export function createResumeUploadResult(overrides = {}) {
  return {
    success: true,
    resumeUrl: 'https://storage.example.com/resume-uuid.pdf',
    parsed: false, // Still processing
    aiParsing: true,
    extractedInfo: null, // Will be populated after async processing
    ...overrides,
  };
}

/**
 * Create activity log entry
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Activity log entry
 */
export function createActivityLogEntry(overrides = {}) {
  return {
    action: 'resume_uploaded',
    userId: undefined, // Will be set by test
    metadata: {
      fileName: 'resume.pdf',
      fileSize: 245000,
      mimeType: 'application/pdf',
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a screening question
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Screening question
 */
export function createScreeningQuestion(overrides = {}) {
  return {
    jobId: 1,
    question: 'Tell us about your experience with React',
    type: 'text', // 'text', 'multipleChoice', 'video'
    required: true,
    options: undefined, // For multiple choice
    ...overrides,
  };
}

/**
 * Create mock jobs for feed testing
 * @param {number} count - Number of jobs to create
 * @param {Object} baseOverrides - Base overrides for all jobs
 * @returns {Array} - Array of job matches
 */
export function createMockJobsForFeed(count = 20, baseOverrides = {}) {
  const jobs = [];
  const skills = [
    ['JavaScript', 'React', 'Node.js'],
    ['Python', 'Django', 'PostgreSQL'],
    ['Java', 'Spring', 'Kubernetes'],
    ['TypeScript', 'Vue.js', 'Express'],
    ['Go', 'Kubernetes', 'Docker'],
  ];
  const companies = ['Tech Corp', 'StartUp Inc', 'BigTech', 'Unicorn Co', 'Startup XYZ'];
  const locations = ['Remote', 'San Francisco, CA', 'New York, NY', 'Austin, TX'];

  for (let i = 0; i < count; i++) {
    jobs.push({
      jobId: i + 1,
      job: createSampleJob({
        title: `Software Engineer - ${i + 1}`,
        company: companies[i % companies.length],
        skills: skills[i % skills.length],
        location: locations[i % locations.length],
        ...baseOverrides,
      }),
      finalScore: 0.6 + Math.random() * 0.35, // 60-95%
      skillMatches: skills[i % skills.length],
      aiExplanation: `Match explanation for job ${i + 1}`,
      isVerifiedActive: i % 3 === 0,
      isDirectFromCompany: i % 5 === 0,
    });
  }

  return jobs;
}

/**
 * Create a test user object with typical structure
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - User object
 */
export function createTestUser(overrides = {}) {
  return {
    id: undefined, // Will be set by auth
    email: `test-${Date.now()}@example.com`,
    displayName: 'Test User',
    role: 'candidate',
    ...overrides,
  };
}

/**
 * Create an exam attempt
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Exam attempt
 */
export function createExamAttempt(overrides = {}) {
  return {
    jobId: 1,
    candidateId: undefined, // Will be set by test
    answers: [],
    score: 0,
    passed: false,
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

/**
 * Create a job application
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Job application
 */
export function createJobApplication(overrides = {}) {
  return {
    jobId: 1,
    candidateId: undefined, // Will be set by test
    status: 'applied',
    appliedAt: new Date().toISOString(),
    screeningAnswers: null,
    examAttemptId: null,
    ...overrides,
  };
}

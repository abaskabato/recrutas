# Recrutas Architecture

## Overview

Recrutas is built as a modern full-stack web application with a clear separation between frontend, backend, and data layers. The architecture prioritizes scalability, maintainability, and developer experience.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                    Frontend (React)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Landing   │ │  Dashboard  │ │    Chat     │              │
│  │    Page     │ │    Pages    │ │   System    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────┴───────────────────────────────────────────┐
│                 Backend (Express.js)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │     API     │ │ WebSocket   │ │    Auth     │              │
│  │   Routes    │ │   Server    │ │  Service    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ AI Matching │ │ Job Scraper │ │ Notification│              │
│  │   Engine    │ │   Service   │ │   Service   │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                 Data Layer                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ PostgreSQL  │ │    Redis    │ │  External   │              │
│  │  Database   │ │    Cache    │ │     APIs    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **React 18**: Component-based UI framework
- **TypeScript**: Type safety and developer experience
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Consistent component library
- **TanStack Query**: Server state management
- **Wouter**: Lightweight routing
- **Framer Motion**: Animations and transitions

### Directory Structure
```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── forms/          # Form components
│   ├── charts/         # Data visualization
│   └── modals/         # Modal dialogs
├── pages/              # Application pages
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   └── chat/           # Chat interface
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
└── types/              # TypeScript type definitions
```

### Component Patterns

#### Compound Components
```typescript
export function JobCard({ job }: JobCardProps) {
  return (
    <Card>
      <JobCard.Header>
        <JobCard.Title>{job.title}</JobCard.Title>
        <JobCard.Company>{job.company}</JobCard.Company>
      </JobCard.Header>
      <JobCard.Content>
        <JobCard.Description>{job.description}</JobCard.Description>
        <JobCard.Skills skills={job.skills} />
      </JobCard.Content>
      <JobCard.Actions>
        <JobCard.ApplyButton jobId={job.id} />
        <JobCard.SaveButton jobId={job.id} />
      </JobCard.Actions>
    </Card>
  );
}
```

#### Custom Hooks
```typescript
export function useJobApplication(jobId: number) {
  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/jobs/${jobId}/apply`),
    onSuccess: () => {
      toast({ title: 'Application submitted successfully!' });
      queryClient.invalidateQueries(['applications']);
    }
  });

  return { apply: mutate, isApplying: isPending, error };
}
```

## Backend Architecture

### Technology Stack
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **TypeScript**: Type safety
- **Drizzle ORM**: Database management
- **Better Auth**: Authentication
- **WebSocket**: Real-time communication

### Directory Structure
```
server/
├── routes.ts           # API route definitions
├── storage.ts          # Data access layer
├── auth.ts             # Authentication logic
├── db.ts               # Database configuration
├── websocket.ts        # WebSocket handlers
├── services/           # Business logic services
│   ├── matching.ts     # AI matching algorithm
│   ├── scraper.ts      # Job scraping service
│   └── notifications.ts # Notification service
├── middleware/         # Express middleware
└── utils/              # Utility functions
```

### Service Layer Pattern

```typescript
// services/matching.ts
export class MatchingService {
  async findJobMatches(candidateId: string): Promise<JobMatch[]> {
    const candidate = await storage.getCandidateProfile(candidateId);
    const jobs = await storage.getAllJobPostings();
    
    return this.calculateMatches(candidate, jobs);
  }

  private calculateMatches(candidate: CandidateProfile, jobs: JobPosting[]): JobMatch[] {
    return jobs.map(job => ({
      jobId: job.id,
      candidateId: candidate.userId,
      score: this.calculateCompatibilityScore(candidate, job),
      factors: this.analyzeMatchFactors(candidate, job)
    }));
  }
}
```

### API Layer Pattern

```typescript
// routes.ts
app.get('/api/candidates/matches', isAuthenticated, async (req, res) => {
  try {
    const matches = await matchingService.findJobMatches(req.user.id);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Data Architecture

### Database Schema

```sql
-- Core entities
Users (id, email, name, role, created_at)
CandidateProfiles (user_id, bio, skills, experience, location)
JobPostings (id, title, company, description, requirements)

-- Relationships
JobMatches (id, job_id, candidate_id, score, status)
Applications (id, job_id, candidate_id, status, applied_at)
ChatRooms (id, job_id, candidate_id, hiring_manager_id)
ChatMessages (id, room_id, sender_id, message, created_at)

-- Features
JobExams (id, job_id, questions, time_limit, passing_score)
ExamAttempts (id, exam_id, candidate_id, score, completed_at)
Notifications (id, user_id, type, title, message, read)
```

### Data Access Patterns

#### Repository Pattern
```typescript
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Job operations
  getJobPostings(): Promise<JobPosting[]>;
  createJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  
  // Application operations
  createApplication(app: InsertApplication): Promise<Application>;
  getApplications(candidateId: string): Promise<Application[]>;
}
```

#### Query Optimization
```typescript
// Optimized query with joins
const matches = await db
  .select({
    match: jobMatches,
    job: jobPostings,
    company: companies
  })
  .from(jobMatches)
  .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
  .innerJoin(companies, eq(jobPostings.companyId, companies.id))
  .where(eq(jobMatches.candidateId, candidateId))
  .orderBy(desc(jobMatches.score));
```

## AI Matching Engine

### Algorithm Architecture

```typescript
interface MatchingCriteria {
  skills: string[];
  experience: string;
  location: string;
  salaryExpectation: number;
  workType: 'remote' | 'hybrid' | 'onsite';
}

interface MatchResult {
  score: number;
  confidence: number;
  factors: {
    skillMatch: number;
    experienceMatch: number;
    locationMatch: number;
    salaryMatch: number;
  };
  explanation: string;
}
```

### Semantic Analysis
```typescript
async function calculateSemanticMatch(
  candidateSkills: string[],
  jobRequirements: string[]
): Promise<number> {
  const embeddings = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: [...candidateSkills, ...jobRequirements]
  });
  
  return calculateCosineSimilarity(
    embeddings.data.slice(0, candidateSkills.length),
    embeddings.data.slice(candidateSkills.length)
  );
}
```

## Real-time Communication

### WebSocket Architecture

```typescript
interface WebSocketMessage {
  type: 'new_message' | 'new_notification' | 'match_update';
  data: any;
  timestamp: string;
}

class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  
  broadcast(userId: string, message: WebSocketMessage) {
    const connection = this.connections.get(userId);
    if (connection?.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }
}
```

## Caching Strategy

### Multi-layer Caching

```typescript
// 1. Application-level cache
const cache = new Map<string, { data: any; expiry: number }>();

// 2. Database query cache
const queryCache = new LRUCache({
  max: 1000,
  ttl: 5 * 60 * 1000 // 5 minutes
});

// 3. Redis cache for sessions and temporary data
const redis = new Redis(process.env.REDIS_URL);
```

## Security Architecture

### Authentication Flow
1. User credentials validated
2. Session created and stored
3. JWT token issued (optional)
4. Middleware validates requests
5. Role-based access control applied

### Data Protection
- Input validation with Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection with Content Security Policy
- Rate limiting to prevent abuse
- HTTPS enforcement in production

## Performance Considerations

### Database Optimization
- Indexed columns for frequent queries
- Connection pooling for concurrent requests
- Read replicas for scaling
- Query optimization with EXPLAIN ANALYZE

### Application Optimization
- Lazy loading for large datasets
- Image optimization and CDN usage
- Code splitting for faster initial loads
- Caching strategies at multiple levels

## Monitoring and Observability

### Metrics Collection
```typescript
// Performance metrics
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// Business metrics
const jobApplications = new Counter({
  name: 'job_applications_total',
  help: 'Total number of job applications'
});
```

### Error Tracking
```typescript
// Structured logging
logger.error('Database connection failed', {
  error: error.message,
  query: query,
  duration: endTime - startTime,
  userId: req.user?.id
});
```

This architecture supports the platform's core mission of disrupting traditional hiring by providing a scalable, maintainable foundation for AI-powered talent acquisition.
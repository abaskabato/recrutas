# Recrutas Improvement Roadmap
## Addressing All MVP Limitations

---

## 🚨 PHASE 1: CRITICAL FIXES (Week 1-2)

### 1. Fix Data Staleness (Real-time Jobs)

**Current:** 2x daily scraping, 90-day old jobs shown
**Target:** Jobs < 7 days old, real-time updates

**Implementation:**

```typescript
// server/services/job-webhook.service.ts
export class JobWebhookService {
  // Greenhouse, Lever, Workday all support webhooks
  async registerGreenhouseWebhook(companyId: string) {
    // Greenhouse sends webhooks when jobs are posted/updated
    await fetch(`https://api.greenhouse.io/v1/partner/webhooks`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa(GREENHOUSE_API_KEY + ':')}` },
      body: JSON.stringify({
        url: 'https://recrutas.com/api/webhooks/greenhouse',
        events: ['job_posted', 'job_updated', 'job_closed']
      })
    });
  }

  // Receive real-time job updates
  async handleWebhook(payload: WebhookPayload) {
    if (payload.event === 'job_posted') {
      await jobIngestionService.ingestExternalJobs([{
        ...payload.job,
        source: 'greenhouse',
        postedDate: new Date().toISOString(), // Real timestamp
        isRealtime: true
      }]);
    }
  }
}
```

**Alternative (No webhook support):**
- **RSS/Atom feeds** - Most ATS systems have job feeds
- **Change detection** - Poll every 15 minutes, only fetch if changed (ETag/Last-Modified)
- **Job board APIs** - LinkedIn, Indeed have real-time APIs (paid)

### 2. Fix Scraping Speed (GPU + Queue)

**Current:** Ollama on CPU = 100+ minutes
**Target:** < 10 minutes for all companies

**Solution:**

```yaml
# .github/workflows/scrape-tech-companies.yml
jobs:
  scrape:
    runs-on: ubuntu-latest
    
    # Option A: Use GitHub Actions with GPU (if available)
    # Option B: Use external GPU service
    
    steps:
      - name: Setup Redis for job queue
        uses: supercharge/redis-github-action@1.7.0
        
      - name: Scrape with parallel workers
        run: npx tsx scripts/scrape-queue.ts
        env:
          REDIS_URL: redis://localhost:6379
          MAX_WORKERS: 10  # Process 10 companies in parallel
```

```typescript
// scripts/scrape-queue.ts
import { Queue } from 'bullmq';
import { Worker } from 'bullmq';

const scrapeQueue = new Queue('job-scraping');

// Add all companies to queue
for (const company of companies) {
  await scrapeQueue.add('scrape-company', { company }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  });
}

// Worker processes jobs in parallel
const worker = new Worker('job-scraping', async (job) => {
  const { company } = job.data;
  
  // Use Groq (fast) if available, fallback to Ollama
  const useGroq = await checkGroqAvailability();
  
  if (useGroq) {
    return await scrapeWithGroq(company);
  } else {
    return await scrapeWithOllama(company);
  }
}, { concurrency: 5 }); // 5 parallel scrapers
```

### 3. Implement Semantic Job Matching (Real AI)

**Current:** Keyword matching
**Target:** Semantic similarity using embeddings

```typescript
// server/services/semantic-matching.service.ts
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

export class SemanticMatchingService {
  // Generate embeddings for jobs
  async embedJob(job: JobPosting): Promise<number[]> {
    const text = `${job.title} ${job.description} ${job.requirements?.join(' ')} ${job.skills?.join(' ')}`;
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text
    });
    return embedding;
  }

  // Generate embeddings for candidate resume
  async embedCandidate(candidate: Candidate): Promise<number[]> {
    const text = `${candidate.skills?.join(' ')} ${candidate.experience?.map(e => e.description).join(' ')} ${candidate.summary}`;
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text
    });
    return embedding;
  }

  // Calculate semantic similarity (cosine similarity)
  calculateSimilarity(jobEmbedding: number[], candidateEmbedding: number[]): number {
    const dot = jobEmbedding.reduce((sum, a, i) => sum + a * candidateEmbedding[i], 0);
    const normA = Math.sqrt(jobEmbedding.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(candidateEmbedding.reduce((sum, b) => sum + b * b, 0));
    return dot / (normA * normB);
  }

  // Find matching jobs
  async findMatchingJobs(candidateId: string, limit: number = 20): Promise<JobMatch[]> {
    const candidate = await storage.getCandidateUser(candidateId);
    const candidateEmbedding = await this.embedCandidate(candidate);
    
    // Get all recent jobs
    const jobs = await storage.getRecentJobs(100);
    
    // Calculate similarity for each job
    const matches = await Promise.all(jobs.map(async (job) => {
      const jobEmbedding = await this.getJobEmbedding(job.id);
      const score = this.calculateSimilarity(jobEmbedding, candidateEmbedding);
      
      return {
        job,
        matchScore: Math.round(score * 100),
        // AI-generated explanation
        explanation: await this.generateExplanation(job, candidate, score)
      };
    }));
    
    // Sort by score and return top matches
    return matches
      .filter(m => m.matchScore > 60) // 60% minimum match
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  async generateExplanation(job: JobPosting, candidate: Candidate, score: number): Promise<string> {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Job: ${job.title} at ${job.company}
Requirements: ${job.requirements?.join(', ')}
Candidate Skills: ${candidate.skills?.join(', ')}
Experience: ${candidate.experience?.map(e => `${e.title} at ${e.company}`).join(', ')}
Match Score: ${score}%

Explain why this is a good match (2 sentences):`
    });
    return text;
  }
}
```

---

## 📈 PHASE 2: DATA EXPANSION (Week 3-4)

### 4. Expand Job Sources (10,000+ companies)

```typescript
// server/services/job-aggregator-v2.service.ts
export class JobAggregatorV2 {
  async getAllJobs(): Promise<Job[]> {
    const [greenhouseJobs, leverJobs, workdayJobs, linkedinJobs, indeedJobs] = await Promise.all([
      this.scrapeGreenhouseCompanies(),      // 5,000+ companies
      this.scrapeLeverCompanies(),           // 2,000+ companies  
      this.scrapeWorkdayCompanies(),         // 500+ enterprises
      this.fetchLinkedInJobs(),              // Requires API key
      this.fetchIndeedJobs(),                // Requires API key
    ]);
    
    return this.deduplicateAndFilter([
      ...greenhouseJobs,
      ...leverJobs,
      ...workdayJobs,
      ...linkedinJobs,
      ...indeedJobs
    ]);
  }

  // Scrape all Greenhouse companies
  async scrapeGreenhouseCompanies(): Promise<Job[]> {
    // Get list of companies using Greenhouse
    const companies = await this.getGreenhouseCompanies();
    
    // Parallel scraping with rate limiting
    const jobs = await Promise.all(
      companies.map(async (company) => {
        try {
          const response = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs`,
            { headers: { 'Accept': 'application/json' } }
          );
          const data = await response.json();
          return data.jobs.map((j: any) => this.transformGreenhouseJob(j, company));
        } catch (error) {
          console.error(`Failed to fetch ${company.name}:`, error);
          return [];
        }
      })
    );
    
    return jobs.flat();
  }
}
```

**Company Discovery Strategy:**
- **Crunchbase API** - Get list of funded startups
- **LinkedIn Sales Navigator** - Find companies with job postings
- **GitHub** - Companies with engineering blogs/open source
- **Y Combinator** - Portfolio companies
- **BuiltIn** - Tech hubs by city
- **AngelList** - Startup database

### 5. Implement Smart Job Deduplication

```typescript
// server/services/deduplication.service.ts
export class DeduplicationService {
  async deduplicateJobs(jobs: Job[]): Promise<Job[]> {
    const uniqueJobs: Job[] = [];
    const seen = new Set<string>();
    
    for (const job of jobs) {
      // Create fingerprint
      const fingerprint = await this.createFingerprint(job);
      
      // Check for duplicates
      const isDuplicate = await this.checkDuplicate(fingerprint, seen);
      
      if (!isDuplicate) {
        uniqueJobs.push(job);
        seen.add(fingerprint);
      }
    }
    
    return uniqueJobs;
  }

  async createFingerprint(job: Job): Promise<string> {
    // Normalize title
    const normalizedTitle = job.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/(senior|junior|lead|principal|staff)/g, '');
    
    // Normalize company
    const normalizedCompany = job.company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    
    // Create hash
    return `${normalizedCompany}_${normalizedTitle}`;
  }

  async checkDuplicate(fingerprint: string, seen: Set<string>): Promise<boolean> {
    // Check memory cache first
    if (seen.has(fingerprint)) return true;
    
    // Check database
    const existing = await db
      .select()
      .from(jobPostings)
      .where(sql`LOWER(REGEXP_REPLACE(CONCAT(company, '_', title), '[^a-z0-9]', '', 'g')) = ${fingerprint}`)
      .limit(1);
    
    return existing.length > 0;
  }
}
```

---

## 🎯 PHASE 3: USER EXPERIENCE (Week 5-6)

### 6. Saved Search & Job Alerts

```typescript
// server/services/job-alerts.service.ts
export class JobAlertsService {
  // User creates a saved search
  async createSavedSearch(userId: string, criteria: SearchCriteria): Promise<void> {
    await db.insert(savedSearches).values({
      userId,
      criteria: JSON.stringify(criteria),
      alertFrequency: 'daily', // daily, weekly, realtime
      lastNotified: new Date()
    });
  }

  // Check for new matching jobs and send alerts
  async processAlerts(): Promise<void> {
    const searches = await db.select().from(savedSearches);
    
    for (const search of searches) {
      const criteria = JSON.parse(search.criteria);
      
      // Find jobs posted since last notification
      const newJobs = await db
        .select()
        .from(jobPostings)
        .where(and(
          eq(jobPostings.status, 'active'),
          sql`${jobPostings.createdAt} > ${search.lastNotified}`,
          this.buildCriteriaFilter(criteria)
        ));
      
      if (newJobs.length > 0) {
        // Send notification
        await this.sendJobAlert(search.userId, newJobs);
        
        // Update last notified
        await db
          .update(savedSearches)
          .set({ lastNotified: new Date() })
          .where(eq(savedSearches.id, search.id));
      }
    }
  }

  async sendJobAlert(userId: string, jobs: Job[]): Promise<void> {
    const user = await storage.getUser(userId);
    
    // Email notification
    await emailService.send({
      to: user.email,
      subject: `${jobs.length} New Jobs Match Your Search`,
      template: 'job-alert',
      data: { jobs, user }
    });
    
    // In-app notification
    await notificationService.create({
      userId,
      type: 'job_alert',
      title: `${jobs.length} New Jobs`,
      body: `Found ${jobs.length} new jobs matching your criteria`,
      data: { jobIds: jobs.map(j => j.id) }
    });
  }
}
```

### 7. Application Tracking System (ATS)

```typescript
// server/services/application-tracking.service.ts
export class ApplicationTrackingService {
  // Track application stages
  async updateApplicationStage(applicationId: number, stage: ApplicationStage): Promise<void> {
    await db.insert(applicationStages).values({
      applicationId,
      stage,
      timestamp: new Date(),
      notes: ''
    });
    
    // Notify user
    const application = await storage.getApplication(applicationId);
    await notificationService.create({
      userId: application.candidateId,
      type: 'application_stage_change',
      title: `Application ${stage}`,
      body: `Your application for ${application.jobTitle} is now ${stage}`,
    });
  }

  // Application stages: applied → resume_viewed → phone_screen → technical_interview → final_interview → offer → hired
}
```

---

## 🏢 PHASE 4: RECRUITER FEATURES (Week 7-8)

### 8. Candidate Sourcing (Passive Candidates)

```typescript
// server/services/candidate-sourcing.service.ts
export class CandidateSourcingService {
  // Import from LinkedIn, GitHub, etc.
  async importCandidateFromLinkedIn(linkedinUrl: string): Promise<Candidate> {
    // Use LinkedIn API or scraping
    const profile = await linkedInService.getProfile(linkedinUrl);
    
    return await storage.createCandidate({
      name: profile.name,
      email: profile.email,
      skills: profile.skills,
      experience: profile.experience,
      education: profile.education,
      linkedInUrl,
      source: 'linkedin',
      isPassive: true // Not actively applying
    });
  }

  // Find candidates matching job
  async findCandidatesForJob(jobId: number): Promise<Candidate[]> {
    const job = await storage.getJobPosting(jobId);
    const jobEmbedding = await semanticMatching.embedJob(job);
    
    // Search candidate database
    const candidates = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.isPassive, true));
    
    // Calculate match scores
    const matches = await Promise.all(
      candidates.map(async (candidate) => {
        const candidateEmbedding = await semanticMatching.embedCandidate(candidate);
        const score = semanticMatching.calculateSimilarity(jobEmbedding, candidateEmbedding);
        return { candidate, score };
      })
    );
    
    return matches
      .filter(m => m.score > 0.7)
      .sort((a, b) => b.score - a.score)
      .map(m => m.candidate);
  }
}
```

### 9. ATS Integrations

```typescript
// server/services/ats-integration.service.ts
export class ATSIntegrationService {
  // Greenhouse integration
  async syncWithGreenhouse(apiKey: string): Promise<void> {
    const greenhouse = new GreenhouseClient(apiKey);
    
    // Sync candidates
    const candidates = await greenhouse.getCandidates();
    for (const candidate of candidates) {
      await storage.upsertCandidate({
        externalId: candidate.id,
        source: 'greenhouse',
        ...candidate
      });
    }
    
    // Sync jobs
    const jobs = await greenhouse.getJobs();
    for (const job of jobs) {
      await storage.upsertJobPosting({
        externalId: job.id,
        source: 'greenhouse',
        ...job
      });
    }
  }

  // Lever, Workday, etc.
}
```

---

## 💰 PHASE 5: MONETIZATION (Week 9-10)

### 10. Revenue Model

**For Candidates (Freemium):**
- **Free:** 10 job matches/day, basic filters
- **Pro ($19/mo):** Unlimited matches, advanced filters, salary insights, 1-on-1 career coaching
- **Premium ($49/mo):** Resume review, mock interviews, priority support

**For Recruiters:**
- **Free:** Post 1 job, basic applicant tracking
- **Pro ($199/mo):** Unlimited jobs, AI candidate matching, ATS integration
- **Enterprise ($999/mo):** Custom integrations, dedicated support, API access

```typescript
// server/services/subscription.service.ts
export class SubscriptionService {
  async createSubscription(userId: string, plan: string): Promise<void> {
    const session = await stripe.checkout.sessions.create({
      customer: userId,
      line_items: [{ price: PLANS[plan].stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${BASE_URL}/subscription/success`,
      cancel_url: `${BASE_URL}/subscription/cancel`
    });
    
    return { url: session.url };
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return PLANS[subscription.plan].features.includes(feature);
  }
}
```

---

## 🔧 PHASE 6: INFRASTRUCTURE (Week 11-12)

### 11. Performance Optimizations

```typescript
// server/middleware/cache.middleware.ts
import { redis } from '@/lib/redis';

export const cacheMiddleware = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      redis.setex(key, duration, JSON.stringify(body));
      return originalJson(body);
    };
    
    next();
  };
};

// Use in routes
app.get('/api/jobs', cacheMiddleware(300), async (req, res) => {
  // Cached for 5 minutes
});
```

### 12. Infrastructure Upgrades

**Move from GitHub Actions to Proper Infrastructure:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
  
  redis:
    image: redis:7-alpine
    
  scraper:
    build: ./scraper
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GROQ_API_KEY=${GROQ_API_KEY}
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]  # GPU for Ollama
  
  worker:
    build: ./worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    scale: 5  # 5 parallel workers
```

**Hosting Options:**
- **Render.com** - Easy deploy, PostgreSQL + Redis included
- **Railway.app** - Great for scaling, automatic deployments
- **AWS/GCP** - Full control, more complex
- **Fly.io** - Edge deployment, fast globally

---

## 📋 PRIORITIZED IMPLEMENTATION ORDER

### Week 1: Foundation
1. ✅ Fix date filtering (already done)
2. ✅ Fix ArbeitNow exclusion (already done) 
3. ✅ Add Ollama fallback (already done)
4. ⏳ **Implement job webhooks** (Greenhouse, Lever)
5. ⏳ **Add Redis + BullMQ** for scraping queue

### Week 2: Core Improvements
6. ⏳ **Semantic matching** with OpenAI embeddings
7. ⏳ **Expand to 500+ companies** (Greenhouse API)
8. ⏳ **Smart deduplication**
9. ⏳ **Fix job liveness checking**

### Week 3-4: Data Expansion
10. ⏳ Add LinkedIn jobs (API)
11. ⏳ Add Indeed jobs (API)
12. ⏳ Auto-discover new companies
13. ⏳ Company enrichment (size, funding, culture)

### Week 5-6: User Experience
14. ⏳ Saved searches + email alerts
15. ⏳ Application tracking (kanban board)
16. ⏳ Salary insights (levels.fyi integration)
17. ⏳ Company research pages

### Week 7-8: Recruiter Features
18. ⏳ Candidate sourcing from LinkedIn
19. ⏳ ATS integrations (Greenhouse, Lever)
20. ⏳ Bulk actions (email templates)
21. ⏳ Analytics dashboard

### Week 9-10: Monetization
22. ⏳ Stripe subscription setup
23. ⏳ Feature gating
24. ⏳ Free trial logic
25. ⏳ Referral program

### Week 11-12: Scale
26. ⏳ Move to production infrastructure (Render/Railway)
27. ⏳ Add Redis caching
28. ⏳ CDN for static assets
29. ⏳ Monitoring (Sentry, LogRocket)
30. ⏳ Performance optimizations

---

## 🎯 SUCCESS METRICS

**After all improvements:**
- **Job freshness:** < 24 hours (from 90 days)
- **Job volume:** 10,000+ active jobs (from 100-200)
- **Match quality:** 85%+ relevance (from keyword matching)
- **Page load:** < 1 second (from 3-5 seconds)
- **Scraper speed:** < 10 minutes (from 100+ minutes)
- **User engagement:** 3x more applications
- **Revenue:** $10K MRR (from $0)

---

**Estimated timeline: 12 weeks (3 months) to full-featured platform**

Want me to start implementing any of these? I'd recommend starting with **Phase 1** (webhooks, Redis queue, semantic matching).
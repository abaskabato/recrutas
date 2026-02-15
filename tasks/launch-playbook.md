# Recrutas Launch Playbook

*Feb 2026 — Pre-launch strategy*

## Principle: Don't Launch. Deploy.

No Product Hunt. No "we're live" announcement. Cold start + zero users + zero jobs = burned first impression. Instead, build silently, seed the feed, then go where the pain is.

---

## Phase 1: Seed the Feed (Now → Week 2)

**Goal**: 500+ verified, fresh, US tech jobs in the feed before anyone sees it.

**Actions**:
- Run SOTA scraper pipeline (94 companies, GitHub Actions 2x daily)
- Ensure hiring.cafe integration is pulling on-demand results
- Let JSearch + RemoteOK + The Muse fill in gaps
- Run liveness checks and ghost detection across all ingested jobs
- Verify the candidate experience end-to-end: signup → resume upload → skill extraction → job feed populated

**Infrastructure is ready.** This phase is about running the pipeline and letting it accumulate.

**Done when**: A new candidate signing up sees a full, quality feed immediately.

---

## Phase 2: Candidates First, No Recruiters (Week 2 → Month 2)

**Goal**: 1,000 candidates with uploaded resumes.

Not signups — resumes. Resume = skills = matchable = valuable to recruiters later.

### Channels

**Reddit** (primary)
- r/cscareerquestions, r/jobs, r/recruitinghell, r/layoffs, r/experienceddevs
- Don't post "check out my app"
- Post value: "I analyzed 1,000 job listings — 35% are ghost jobs. Here's how to tell"
- Link to Recrutas as the data source
- Engage in comments, be helpful, build credibility

**Layoff communities**
- /api/news/layoffs endpoint already tracks layoff news
- When a company lays off 500 people, those people need jobs today
- "Here are 50 verified, active roles matching [company]'s tech stack"
- Be there with value at the moment of pain

**LinkedIn**
- Don't post "we launched"
- Post: "I applied to 100 jobs. 40 were ghost jobs. Here's how I know."
- Share data, insights, frustrations — mention the tool casually
- Target: engineering managers and developers in job search mode

**Twitter/X**
- Same content strategy as LinkedIn
- Tech Twitter cares about tools that solve real problems
- "Every job on this board is verified active in the last 6 hours" gets attention

### What NOT to do
- Don't pay for ads ($0 budget at this stage)
- Don't chase recruiter signups yet
- Don't pitch enterprises

---

## Phase 3: Internal Jobs Pilot (Month 2 → Month 4)

**Goal**: 5-10 companies posting internal jobs with exam flow.

### Who to pitch
- Startup CTOs and engineering managers doing hiring personally
- Small/mid companies (50-500 employees) hiring for tech roles
- People who feel the pain directly and can say yes without procurement

### The pitch
> "I have 1,000 pre-screened candidates with skill profiles. Post your job on our platform — candidates take a skills exam, you get ranked results within 24 hours. You only talk to the top scorers. Free for your first 3 posts."

### Why this works
- Free removes friction
- Exam flow IS the product demo
- 20 qualified, ranked applicants in 24 hours with zero sourcing effort
- Recruiter sees value before paying anything

---

## Phase 4: Monetization (Month 4+)

**Prerequisites**: Active candidate base, returning weekly. Handful of recruiters who've experienced the exam flow. Data on response rates, match quality, retention.

### Candidates (Paid tier)
- Free: Curated feed, matching, internal job exams, skill extraction
- Paid: Agentic apply (5/day), priority matching, salary insights
- Conversion trigger: "I found 3 great jobs but don't want to fill 3 forms"

### Recruiters (Subscription)
- Per job post or monthly subscription
- Value: pre-screened candidates + guaranteed response SLA
- Price below LinkedIn Recruiter ($0 vs $10k/year), above free
- Deprioritize non-responsive recruiters (incentive alignment)

---

## Anti-Patterns (Don't Do)

- **Don't build more features.** Matching, scraping, exams, ghost detection, liveness, hiring.cafe — it's all built. Ship what exists.
- **Don't go multi-country.** US-only is a feature, not a limitation.
- **Don't chase recruiters before candidates.** Every hour on recruiter acquisition without candidate volume is wasted.
- **Don't pay for ads.** Content + community at this stage.
- **Don't do a big launch.** Quiet deployment → organic growth → word of mouth.

---

## The One Metric

### Weekly active candidates who uploaded a resume

Not signups. Not page views. **Resume uploads.**

- Proves the feed is compelling enough to invest effort
- Creates matchable profiles that power everything
- The number you show recruiters ("1,000 pre-screened candidates")
- The number you show investors ("weekly retention with high-intent signal")

---

## Phase Summary

| Phase | Timeline | Goal | Key Metric |
|-------|----------|------|------------|
| 1. Seed | Now → Week 2 | 500+ verified jobs in feed | Job count + liveness % |
| 2. Candidates | Week 2 → Month 2 | 1,000 resume uploads | Weekly resume uploads |
| 3. Recruiters | Month 2 → Month 4 | 5-10 companies with exam posts | Jobs posted + exam completion rate |
| 4. Monetize | Month 4+ | Revenue | MRR + paid conversion rate |

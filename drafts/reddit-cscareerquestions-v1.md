# Reddit Post Draft — r/cscareerquestions

## Title
I built a free tool that matches you to jobs by actual skills (not keywords) and auto-applies for you. Looking for beta testers.

## Body

I'm a software engineer at Amazon. I watch friends and coworkers spend 3-6 months job searching — mass-applying to hundreds of roles, getting ghosted by 95% of them. The process is broken and everyone knows it.

So I built Recrutas on nights and weekends. Here's what it does:

**1. Upload your resume. That's it.**
AI parses your skills, experience level, and what you're actually good at. No manual form-filling.

**2. Skill-based matching — not keyword spam.**
Instead of matching you to "Software Engineer" because your resume says "software," it understands that your React + Node.js + PostgreSQL stack makes you a strong match for fullstack roles at companies actually hiring for that. Each match comes with a score and explanation of *why* you're competitive.

**3. Agent Apply — AI fills out and submits applications for you.**
You click "Apply" and an AI agent opens the company's actual application page, fills in every field correctly (including the annoying dropdowns, EEO questions, and cover letter), and submits it. You get an email confirmation when it's done.

Right now the platform has ~14,000 active jobs across 4,400+ companies. It pulls from company career pages directly (Greenhouse, Lever, Ashby, Workable) plus major aggregators. Jobs are refreshed daily so you're not applying to ghost postings from 3 months ago.

**What this is NOT:**
- Not a spray-and-pray tool. It won't apply to 500 random jobs. It matches you to roles where you're actually competitive.
- Not a paid service. It's free. No premium tier, no paywall, no "upgrade to see your matches."
- Not a recruiter tool. This is for candidates.

**What I'm looking for:**
Beta testers. I want 50 people to upload their resume, see their matches, and try Agent Apply. Tell me what's broken, what's missing, what's confusing.

If you're actively job searching (or about to be), this is built for you.

**60-second demo:** [LOOM LINK]

**Link:** https://recrutas.ai/signup/candidate?code=REDDIT-PNFQ6Z

Happy to answer any questions about how the matching works, what data we use, or the tech behind it. I'm an open book.

---

*Built with: React, Node.js, PostgreSQL, pgvector for semantic search, Groq/Gemini for AI processing. All jobs scraped directly from company ATS systems.*

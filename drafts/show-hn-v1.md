# Show HN Post Draft

## Title
Show HN: Recrutas – AI job matching + auto-apply agent (free, for developers)

## Body

I'm a software engineer at Amazon. I built Recrutas on nights and weekends because job searching is broken — people spend months mass-applying and get ghosted by 95% of companies.

How it works:
1. Upload your resume (PDF)
2. AI matches you to 14,000+ jobs by actual skill fit — not keywords. Each match explains WHY you're competitive.
3. Click Apply → an AI agent opens the company's real application page, fills every field, and submits it for you.

Jobs are pulled directly from company career pages (Greenhouse, Lever, Ashby, Workable) and refreshed daily — no ghost postings.

Tech: React, Node.js, PostgreSQL, pgvector for semantic search, BGE-M3 embeddings, Groq (Llama 3) + Gemini for AI processing. The matching uses cosine similarity on skill embeddings weighted with experience and contextual fit. Agent Apply uses Browser Use (Python) with Llama 4 Scout.

Free. No paywall. No premium tier. I just want real users and honest feedback.

Demo: [LOOM LINK]

Try it: https://recrutas.ai

# Recrutas Agent — Agentic Apply Feature Spec

*Product decisions captured Feb 2026 — not yet in development*

## Concept

"Apply For Me" button on each job card in the feed. Browser automation fills external ATS forms and uploads resume on behalf of the candidate. Human reviews before submit.

## Flow

1. Candidate taps **"Apply For Me"** on a job card
2. Pre-fill screen shows: name, email, resume, common fields — pulled from profile
3. For custom fields ("Why this role?") — AI drafts answer from resume + job description
4. Candidate reviews, edits, approves
5. Agent fills ATS form and submits
6. Confirmation shown with tracking status

## Product Decisions

### Tier & Pricing
- **Free: 0 agentic applies.** This is the conversion trigger — don't give it away as a teaser.
- **Paid: 5/day.** Scarcity preserves application quality, prevents spray-and-pray.
- Upgrade moment: "I found 3 great jobs but don't want to fill 3 forms" → paywall.

### Custom Answer Fields
- **AI drafts, human approves. No exceptions.**
- Don't skip-and-link — inconsistent experience erodes trust.
- AI generates draft from candidate resume + skills + job description.
- Candidate edits/approves in review screen. This is where human touch matters.
- Improves application quality — thoughtful auto-draft beats rushed human answer.

### Failure Handling
- **Fail loud, fail fast, don't charge the daily credit.**
- If agent can't complete: show immediately, return credit, give direct link with pre-filled data.
- Never silently fail. Never say "submitted" when it wasn't.
- Status per apply: `queued → in_progress → submitted | failed`
- Candidate sees failure within minutes, not days.

### Post-Submission Tracking
- **Don't promise what you can't deliver.**
- Can confirm: "form submitted successfully" (HTTP response from ATS).
- Cannot confirm: "application in their pipeline" (inside employer's system).
- Tracking shows: applied, when, job still active (via existing liveness checks).
- No response after 14 days → feeds back into ghost job detection signal.
- Don't build a full ATS tracker — that's a different product.

### Eligible Jobs
- Only jobs with **trust score ≥ 70** and **liveness = active** get the button.
- No auto-applying to ghost jobs or unverified listings.

### Gates
- Candidate must have: resume uploaded + skills extracted + basic profile info.
- Drives profile completion as a side effect.

## How It Reinforces the Mission

> "Apply here, know where you stand — today."

- Agentic apply makes **"apply here"** effortless
- Quality filters make **"know where you stand"** possible
- They reinforce each other — not competing priorities

## Open Questions (For Later)

- Email confirmation parsing (v2 — if candidate connects email)
- Employer-specific ATS quirks (Workday multi-step, Greenhouse simple)
- CAPTCHA / bot detection arms race — feasibility assessment needed
- Analytics: conversion rate of agentic applies vs manual applies
- Whether to show "Applied via Recrutas Agent" badge to employers

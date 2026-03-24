#!/usr/bin/env python3
"""
Browser Use agent for filling job applications.

Uses Gemini 2.0 Flash (free, vision-capable) as the LLM brain.
Outputs JSON result to stdout for the TypeScript worker to parse.

Usage:
    python3 python/apply.py \
        --url "https://boards.greenhouse.io/company/jobs/123" \
        --candidate '{"firstName":"John","lastName":"Doe","email":"john@example.com",...}' \
        --resume-path "/tmp/resume.pdf"
"""

import asyncio
import json
import os
import sys
import time
import argparse
import traceback


async def fill_application(
    url: str,
    candidate: dict,
    resume_path: str | None = None,
) -> dict:
    """Fill a job application form using Browser Use + Gemini Flash."""

    # Late imports so CLI --help is fast
    from browser_use import Agent, Browser, ChatOpenAI

    groq_key = os.environ.get("GROQ_API_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")

    if not groq_key and not gemini_key:
        return {"success": False, "error": "No LLM configured (GROQ_API_KEY or GEMINI_API_KEY)", "steps": 0}

    # Model priority:
    # 1. Groq Llama 4 Scout (free, fast, great at structured output)
    # 2. Gemini 2.0 Flash (free, high daily limits)
    # Note: Modal Qwen 2.5 VL 7B was tested but too small — wraps JSON in
    # markdown fences, can't follow Browser Use's structured output schema.
    model_configs = []
    if groq_key:
        model_configs.append({
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "base_url": "https://api.groq.com/openai/v1",
            "api_key": groq_key,
        })
    if gemini_key:
        model_configs.append({
            "model": "gemini-2.0-flash",
            "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
            "api_key": gemini_key,
        })

    if not model_configs:
        return {"success": False, "error": "No LLM configured", "steps": 0}

    cfg = model_configs[0]
    llm = ChatOpenAI(
        model=cfg["model"],
        base_url=cfg["base_url"],
        api_key=cfg["api_key"],
        temperature=0.0,
        frequency_penalty=None,
        max_completion_tokens=4096,
        add_schema_to_system_prompt=True,
        dont_force_structured_output=True,
        remove_min_items_from_schema=True,
    )

    # Set up fallback if we have a second provider
    fallback_llm = None
    if len(model_configs) > 1:
        fc = model_configs[1]
        fallback_llm = ChatOpenAI(
            model=fc["model"],
            base_url=fc["base_url"],
            api_key=fc["api_key"],
            temperature=0.0,
            frequency_penalty=None,
            max_completion_tokens=4096,
            add_schema_to_system_prompt=True,
            dont_force_structured_output=True,
            remove_min_items_from_schema=True,
        )

    # Chromium path: env override > auto-detect from Python Playwright
    chromium_path = os.environ.get("CHROMIUM_PATH", "")

    browser_kwargs: dict = {
        "headless": True,
        "disable_security": True,
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
        ],
    }
    if chromium_path:
        browser_kwargs["executable_path"] = chromium_path

    browser = Browser(**browser_kwargs)

    # Build candidate info string
    name = f"{candidate.get('firstName', '')} {candidate.get('lastName', '')}".strip()
    info_lines = [
        f"Full Name: {name}",
        f"First Name: {candidate.get('firstName', '')}",
        f"Last Name: {candidate.get('lastName', '')}",
        f"Email: {candidate.get('email', '')}",
    ]
    if candidate.get("phone"):
        info_lines.append(f"Phone: {candidate['phone']}")
    if candidate.get("location"):
        info_lines.append(f"Location: {candidate['location']}")
    if candidate.get("linkedinUrl"):
        info_lines.append(f"LinkedIn: {candidate['linkedinUrl']}")
    if candidate.get("githubUrl"):
        info_lines.append(f"GitHub: {candidate['githubUrl']}")
    if candidate.get("portfolioUrl"):
        info_lines.append(f"Portfolio: {candidate['portfolioUrl']}")
    if candidate.get("skills"):
        skills = candidate["skills"]
        if isinstance(skills, list):
            skills = ", ".join(skills)
        info_lines.append(f"Skills: {skills}")
    if candidate.get("experience"):
        info_lines.append(f"Experience: {candidate['experience'][:500]}")
    if candidate.get("experienceLevel"):
        info_lines.append(f"Experience Level: {candidate['experienceLevel']}")
    if candidate.get("summary"):
        info_lines.append(f"Summary: {candidate['summary'][:500]}")
    if candidate.get("workType"):
        info_lines.append(f"Preferred Work Type: {candidate['workType']}")

    candidate_info = "\n".join(info_lines)

    resume_instruction = ""
    if resume_path and os.path.exists(resume_path):
        resume_instruction = f"""
- There is a resume file at: {resume_path}
- When you find a file upload field (for resume/CV), upload this file."""

    task = f"""Go to {url} and complete the job application form.

## Candidate Information
{candidate_info}

## Instructions
1. Navigate to the URL. If you see the job description but no form, look for and click an "Apply" or "Apply Now" button.
2. Fill ALL form fields using the candidate information above. Be precise with names, email, phone.
3. For dropdown/select fields (including React Select styled dropdowns), click to open them, then select the best matching option.
4. For "Country" fields, select "United States".
5. For work authorization questions, select "Yes".
6. For visa sponsorship questions, select "No".
7. For EEO/demographic questions (gender, race, veteran status, disability), always select "Decline to Self Identify" or "I don't wish to answer" or the equivalent decline option.
8. For "How did you hear about us" questions, select "Job Board" or "Other".
9. For consent/privacy/GDPR checkboxes, check them.
10. For cover letter or "Why do you want to work here" questions, write 2-3 sentences connecting the candidate's skills and experience to the role.
11. For salary/compensation questions, leave blank if possible, or enter "0" if required.
12. NEVER fabricate credentials, degrees, or experience the candidate doesn't have.{resume_instruction}
13. After filling all fields, click the Submit/Apply button to submit the application.
14. After submitting, verify if you see a confirmation message (like "Thank you", "Application received", etc.).
15. Report whether the application was submitted successfully."""

    start_time = time.time()

    try:
        agent = Agent(
            task=task,
            llm=llm,
            fallback_llm=fallback_llm,
            browser=browser,
            use_vision=True,
            max_failures=10,
            generate_gif=False,
        )

        history = await agent.run(max_steps=50)
        duration = time.time() - start_time

        is_done = history.is_done()
        is_successful = history.is_successful()
        final_result = history.final_result()
        errors = [str(e) for e in history.errors() if e is not None]

        return {
            "success": bool(is_successful),
            "is_done": bool(is_done),
            "final_result": final_result,
            "errors": errors,
            "steps": len(history),
            "duration_seconds": round(duration, 1),
        }

    except Exception as e:
        duration = time.time() - start_time
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "steps": 0,
            "duration_seconds": round(duration, 1),
        }
    finally:
        await browser.stop()


def main():
    parser = argparse.ArgumentParser(description="Browser Use job application agent")
    parser.add_argument("--url", required=True, help="Job application URL")
    parser.add_argument("--candidate", required=True, help="JSON string of candidate data")
    parser.add_argument("--resume-path", default=None, help="Path to resume PDF file")
    args = parser.parse_args()

    candidate = json.loads(args.candidate)
    result = asyncio.run(fill_application(args.url, candidate, args.resume_path))

    # Output JSON on the last line — worker parses this
    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()

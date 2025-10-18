
# Recrutas - AI-Powered Hiring Platform

Recrutas is a modern, intelligent hiring platform designed to streamline the connection between talented job seekers and innovative companies. It leverages AI to enhance resume parsing, job matching, and the entire application lifecycle.

## ✨ Core Features

### For Candidates
- **AI-Powered Job Feed:** Discover job opportunities that are intelligently matched to your profile and skills.
- **Simplified Applications:** Apply for jobs with a single click.
- **Resume Parsing:** Automatically build your profile by uploading your resume, powered by Groq and Llama 3.
- **Application Tracking:** Keep track of the status of all your job applications in one place.
- **Real-time Notifications:** Get instant updates on your application status.

### For Recruiters
- **Advanced Job Posting:** Create detailed job postings with custom-built screening exams.
- **Applicant Tracking:** View and manage all candidates who have applied to your jobs.
- **Real-time Notifications:** Receive instant notifications when a new candidate applies.
- **Video Interview Scheduling:** Schedule video interviews directly from the platform.

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** Supabase (PostgreSQL) with Drizzle ORM
- **Real-time:** WebSockets for live notifications
- **AI:**
  - **Resume Parsing:** Groq API (Llama 3)
  - **Job Matching:** Custom-built semantic matching engine

## 🚀 Getting Started

Follow these instructions to get the project running locally for development.

### 1. Prerequisites

- Node.js (v20.x recommended)
- npm

### 2. Installation

Clone the repository to your local machine:
```bash
git clone <repository-url>
cd recrutas
```

Install the project dependencies:
```bash
npm install
```

### 3. Environment Configuration

The application requires a set of environment variables to connect to the database and other services.

Create a `.env` file by copying the example file:
```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the following variables.

- **Supabase Credentials:** Find these in your Supabase project dashboard under `Project Settings > API`.
  - `DATABASE_URL` (the "Connection string" for the "Pooler")
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

- **Groq API Key:** Required for the AI resume parsing. Get this from the [Groq Console](https://console.groq.com/keys).
  - `GROQ_API_KEY`

### 4. Database Setup

Push the database schema to your Supabase instance:
```bash
npm run db:push
```
*(Note: This command may prompt for interactive input. It is recommended to have a fresh database.)*

## 🏃 Running the Application

1.  **Start the Development Servers:**
    Open two terminals or run the following command to start both the frontend and backend servers concurrently:
    ```bash
    npm run dev & npm run dev:server
    ```

2.  **Seed the Database:**
    To populate the application with sample jobs, candidates, and recruiters, run the following command in a new terminal:
    ```bash
    curl -X POST http://localhost:5000/api/dev/seed
    ```

3.  **Access the Application:**
    Open your browser and navigate to `http://localhost:3000`.

You can now log in with one of the sample users created by the seed script (e.g., `john.dev@email.com` for a candidate or `recruiter@techcorp.com` for a recruiter) and explore the application.

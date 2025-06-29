# Recrutas API Documentation

This document provides comprehensive information about the Recrutas API endpoints.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

The API uses session-based authentication. Users must be authenticated to access protected endpoints.

### Authentication Endpoints

#### POST /api/auth/sign-in/email
Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "candidate"
  }
}
```

#### POST /api/auth/sign-up/email
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### POST /api/auth/sign-out
Sign out the current user.

#### GET /api/session
Get current user session information.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "candidate"
  }
}
```

## Job Endpoints

### GET /api/external-jobs
Get external job listings with filtering.

**Query Parameters:**
- `skills`: Comma-separated list of skills
- `jobTitle`: Job title to filter by
- `location`: Location preference
- `workType`: remote, hybrid, or onsite
- `salaryType`: hourly or annual
- `minSalary`: Minimum salary requirement
- `limit`: Number of results (default: 25)

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job_id",
      "title": "Software Engineer",
      "company": "Company Name",
      "location": "San Francisco, CA",
      "salary": "$120k-150k",
      "type": "Full-time",
      "skills": ["JavaScript", "React", "Node.js"],
      "source": "external",
      "externalUrl": "https://company.com/jobs/123"
    }
  ]
}
```

### GET /api/jobs
Get internal job postings.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Senior Developer",
    "company": "Recrutas",
    "description": "We are looking for...",
    "requirements": ["React", "TypeScript"],
    "salaryMin": 100000,
    "salaryMax": 150000,
    "location": "Remote",
    "workType": "remote",
    "hasExam": true,
    "createdAt": "2023-01-01T00:00:00Z"
  }
]
```

### POST /api/jobs
Create a new job posting (talent owners only).

**Request Body:**
```json
{
  "title": "Senior Developer",
  "company": "Company Name",
  "description": "Job description",
  "requirements": ["React", "TypeScript"],
  "salaryMin": 100000,
  "salaryMax": 150000,
  "location": "Remote",
  "workType": "remote"
}
```

## Candidate Endpoints

### GET /api/candidates/matches
Get job matches for the current candidate.

**Response:**
```json
[
  {
    "id": 1,
    "jobId": 123,
    "matchScore": "87%",
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00Z",
    "job": {
      "title": "Software Engineer",
      "company": "Company Name",
      "location": "San Francisco, CA"
    }
  }
]
```

### GET /api/candidates/stats
Get candidate dashboard statistics.

**Response:**
```json
{
  "totalApplications": 15,
  "activeMatches": 8,
  "profileViews": 45,
  "responseRate": 0.75
}
```

### POST /api/candidates/apply/:jobId
Apply to a specific job.

**Response:**
```json
{
  "id": 1,
  "candidateId": "user_id",
  "jobId": 123,
  "status": "applied",
  "appliedAt": "2023-01-01T00:00:00Z"
}
```

## Exam Endpoints

### GET /api/jobs/:jobId/exam
Get exam questions for a job.

**Response:**
```json
{
  "id": 1,
  "jobId": 123,
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is React?",
      "options": ["Library", "Framework", "Language", "Database"],
      "correctAnswer": 0
    }
  ],
  "timeLimit": 3600,
  "passingScore": 70
}
```

### POST /api/jobs/:jobId/exam/submit
Submit exam answers.

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": 1,
      "answer": 0
    }
  ]
}
```

**Response:**
```json
{
  "score": 85,
  "passed": true,
  "totalQuestions": 10,
  "correctAnswers": 8
}
```

## Chat Endpoints

### GET /api/chat/rooms
Get chat rooms for the current user.

**Response:**
```json
[
  {
    "id": 1,
    "jobId": 123,
    "candidateId": "candidate_id",
    "hiringManagerId": "manager_id",
    "createdAt": "2023-01-01T00:00:00Z",
    "job": {
      "title": "Software Engineer",
      "company": "Company Name"
    }
  }
]
```

### GET /api/chat/:roomId/messages
Get messages in a chat room.

**Response:**
```json
[
  {
    "id": 1,
    "roomId": 1,
    "senderId": "user_id",
    "message": "Hello!",
    "createdAt": "2023-01-01T00:00:00Z",
    "sender": {
      "name": "John Doe",
      "role": "candidate"
    }
  }
]
```

### POST /api/chat/:roomId/messages
Send a message in a chat room.

**Request Body:**
```json
{
  "message": "Hello, I'm interested in this position!"
}
```

## Notification Endpoints

### GET /api/notifications
Get user notifications.

**Response:**
```json
[
  {
    "id": 1,
    "userId": "user_id",
    "type": "new_match",
    "title": "New Job Match!",
    "message": "You have a new 87% match for Software Engineer at Company Name",
    "read": false,
    "createdAt": "2023-01-01T00:00:00Z"
  }
]
```

### PUT /api/notifications/:id/read
Mark a notification as read.

### PUT /api/notifications/read-all
Mark all notifications as read.

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP address
- Authenticated users get higher limits
- Rate limit headers are included in responses

## WebSocket Events

Real-time features use WebSocket connections at `/ws`.

### Events

#### new_notification
```json
{
  "type": "new_notification",
  "data": {
    "id": 1,
    "title": "New Message",
    "message": "You have a new message from Company Name"
  }
}
```

#### new_message
```json
{
  "type": "new_message",
  "data": {
    "roomId": 1,
    "message": "Hello!",
    "sender": {
      "name": "John Doe",
      "role": "candidate"
    }
  }
}
```
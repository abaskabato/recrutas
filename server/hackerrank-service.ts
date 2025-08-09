import fetch from "node-fetch";

const HACKERRANK_API_URL = "https://www.hackerrank.com/api/v4";
const HACKERRANK_API_KEY = process.env.HACKERRANK_API_KEY;

async function makeRequest(endpoint: string, options: any = {}) {
  const url = `${HACKERRANK_API_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${HACKERRANK_API_KEY}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HackerRank API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

export async function createAssessment(title: string, description: string) {
  const assessment = await makeRequest("/assessments", {
    method: "POST",
    body: JSON.stringify({
      title,
      description,
    }),
  });

  return assessment;
}

export async function inviteCandidate(assessmentId: number, candidateEmail: string) {
  const invitation = await makeRequest(`/assessments/${assessmentId}/invite`, {
    method: "POST",
    body: JSON.stringify({
      email: candidateEmail,
    }),
  });

  return invitation;
}

export async function getAssessmentResult(assessmentId: number, candidateEmail: string) {
  const result = await makeRequest(`/assessments/${assessmentId}/results/${candidateEmail}`);
  return result;
}

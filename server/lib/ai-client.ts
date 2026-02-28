import Groq from 'groq-sdk';
import { throttledGroqRequest } from './groq-limiter';
import type { GroqPriority } from './groq-limiter';

export type { GroqPriority };

export interface CallAIOptions {
  priority?: GroqPriority;
  estimatedTokens?: number;
  temperature?: number;
  maxOutputTokens?: number;
}

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (!apiKey || apiKey === '%GROQ_API_KEY%') return null;
  return new Groq({ apiKey });
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  opts: CallAIOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: opts.temperature ?? 0.1,
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  type GeminiResponse = {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const data = await res.json() as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

/**
 * Unified AI client. Uses Gemini 1.5 Flash when GEMINI_API_KEY is set,
 * falls back to Groq (rate-limited via groq-limiter).
 * Returns the raw text/JSON string from the model.
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  opts: CallAIOptions = {}
): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(systemPrompt, userPrompt, opts);
    } catch (err) {
      console.warn('[AIClient] Gemini failed, falling back to Groq:', (err as Error).message);
    }
  }

  const groqClient = getGroqClient();
  if (!groqClient) {
    throw new Error('No AI provider available: set GEMINI_API_KEY or GROQ_API_KEY');
  }

  const completion = await throttledGroqRequest(
    () => groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: opts.temperature ?? 0.1,
      ...(opts.maxOutputTokens ? { max_tokens: opts.maxOutputTokens } : {}),
    }),
    opts.priority ?? 'medium',
    opts.estimatedTokens ?? 1000
  );

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error('Groq returned no content');
  return text;
}

/** Returns true if at least one AI provider is configured. */
export function isAIAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || getGroqClient());
}

import { z } from 'zod';

export const assistantQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
  locale: z.enum(['bn', 'en']).default('en'),
}).strict();

// Pre-compiled local keyword fallback (works offline / when AI providers fail).
// Covers prayer-anchored routine help in bn + en.
const FALLBACKS = [
  { keys: ['fajr', 'ফজর'], bn: 'ফজরের পর ১৫ মিনিট পড়ার রুটিন রাখুন।', en: 'Try a 15-min routine after Fajr.' },
  { keys: ['routine', 'রুটিন'], bn: 'ছোট দিয়ে শুরু করুন: প্রতিদিন একই সময়ে ৫ মিনিট।', en: 'Start tiny: 5 minutes at the same time daily.' },
  { keys: ['miss', 'মিস'], bn: 'মিস হলে নিজেকে দোষ দেবেন না — আগামীকাল আবার চেষ্টা করুন।', en: 'Missed a day? No blame — just restart tomorrow.' },
  { keys: ['snooze', 'ঘুম'], bn: 'ঘুমের রুটিন ঠিক রাখতে এশার পর স্ক্রিন বন্ধ করুন।', en: 'For sleep, switch screens off after Isha.' },
];

export function localFallback(query, locale = 'en') {
  const q = (query || '').toLowerCase();
  for (const f of FALLBACKS) {
    if (f.keys.some((k) => q.includes(k))) return locale === 'bn' ? f.bn : f.en;
  }
  return locale === 'bn'
    ? 'আপনার রুটিনটি ছোট রাখুন এবং প্রতিদিন একই সময়ে করুন।'
    : 'Keep your routine tiny and do it at the same time daily.';
}

async function fetchWithTimeout(url, { body, apiKey, timeoutMs = 5000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const json = await res.json();
    const text = json?.answer || json?.choices?.[0]?.message?.content || json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('empty answer');
    return String(text).slice(0, 1000);
  } finally {
    clearTimeout(t);
  }
}

// Gemini (5s timeout) → Groq → local fallback. Never throws: always resolves
// { answer, source } so the route never returns 500 for provider outages.
export async function answerAssistant({ query, locale = 'en' } = {}, { fetchFn = fetchWithTimeout, env = process.env } = {}) {
  if (env.GEMINI_API_KEY) {
    try {
      const answer = await fetchFn('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        body: { contents: [{ parts: [{ text: query }] }] }, apiKey: env.GEMINI_API_KEY, timeoutMs: 5000,
        });
      return { answer, source: 'gemini' };
    } catch { /* fall through to Groq */ }
  }
  if (env.GROQ_API_KEY) {
    try {
      const answer = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
        body: { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: query }] },
        apiKey: env.GROQ_API_KEY, timeoutMs: 5000,
      });
      return { answer, source: 'groq' };
    } catch { /* fall through to local */ }
  }
  return { answer: localFallback(query, locale), source: 'local' };
}

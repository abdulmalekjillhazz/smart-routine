// Server-side reads from the API. Failures return a status, never throw, so pages still render.
import { isSafeSlug } from './seo.js';

const API = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const REVALIDATE = 300;

export async function getLessons() {
  try {
    const res = await fetch(`${API}/api/lessons`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return { ok: false, reason: 'unavailable', lessons: [] };
    const body = await res.json();
    return { ok: true, lessons: body.lessons ?? [] };
  } catch {
    return { ok: false, reason: 'unavailable', lessons: [] };
  }
}

export async function getLesson(slug) {
  if (!isSafeSlug(slug)) return { ok: false, reason: 'not-found' };
  try {
    const res = await fetch(`${API}/api/lessons/${slug}`, { next: { revalidate: REVALIDATE } });
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const body = await res.json();
    return { ok: true, lesson: body.lesson };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function getStories() {
  try {
    const res = await fetch(`${API}/api/stories`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return { ok: false, reason: 'unavailable', stories: [] };
    const body = await res.json();
    return { ok: true, stories: body.stories ?? [] };
  } catch {
    return { ok: false, reason: 'unavailable', stories: [] };
  }
}

export async function getStory(slug) {
  if (!isSafeSlug(slug)) return { ok: false, reason: 'not-found' };
  try {
    const res = await fetch(`${API}/api/stories/${slug}`, { next: { revalidate: REVALIDATE } });
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const body = await res.json();
    return { ok: true, story: body.story };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

import { describe, it, expect } from 'vitest';
import { toPublicLesson, toLessonSummary } from '../../src/services/lessons.js';

// A lesson as stored in the database, including the answer key and internal fields.
const stored = {
  _id: '65f0c0ffee0000000000abcd',
  slug: 'morning-plan',
  status: 'published',
  createdBy: '65f0c0ffee0000000000aaaa',
  reviewedBy: '65f0c0ffee0000000000bbbb',
  version: 2,
  title: { bn: 'শিরোনাম', en: 'Title' },
  body: { bn: 'বিষয়বস্তু', en: 'Body' },
  vocabulary: [{ word: 'routine', meaning: { bn: 'রুটিন', en: 'a habit' } }],
  quiz: [
    {
      question: { bn: 'প্রশ্ন', en: 'Question' },
      options: [{ bn: 'ক', en: 'A' }, { bn: 'খ', en: 'B' }, { bn: 'গ', en: 'C' }, { bn: 'ঘ', en: 'D' }],
      answerIndex: 2,
    },
  ],
};

describe('public lesson output', () => {
  it('never includes the answer key, author, status, or version', () => {
    const json = JSON.stringify(toPublicLesson(stored));
    expect(json).not.toContain('answerIndex');
    expect(json).not.toContain('createdBy');
    expect(json).not.toContain('reviewedBy');
    expect(json).not.toContain('"status"');
    expect(json).not.toContain('version');
  });

  it('keeps the questions and options a learner needs', () => {
    const out = toPublicLesson(stored);
    expect(out.quiz[0].question.en).toBe('Question');
    expect(out.quiz[0].options).toHaveLength(4);
  });

  it('summaries carry the question count but no quiz content', () => {
    const s = toLessonSummary(stored);
    expect(s.questionCount).toBe(1);
    expect(JSON.stringify(s)).not.toContain('Question');
  });
});

import { describe, it, expect } from 'vitest';
import { lessonDraftSchema, lessonAttemptSchema, scoreQuiz } from '../src/index.js';

const bi = (en, bn = 'বাংলা') => ({ en, bn });
const validLesson = () => ({
  slug: 'morning-plan',
  title: bi('Morning plan', 'সকালের পরিকল্পনা'),
  body: bi('Plan five minutes each morning.', 'প্রতিদিন সকালে পাঁচ মিনিট পরিকল্পনা করুন।'),
  quiz: [
    {
      question: bi('When should you plan?'),
      options: [bi('A'), bi('B'), bi('C'), bi('D')],
      answerIndex: 2,
    },
  ],
});

describe('lessonDraftSchema', () => {
  it('accepts a valid bilingual lesson and fills defaults', () => {
    const r = lessonDraftSchema.parse(validLesson());
    expect(r.aiDrafted).toBe(false);
    expect(r.vocabulary).toEqual([]);
  });

  it('rejects an answerIndex outside 0 to 3', () => {
    const l = validLesson();
    l.quiz[0].answerIndex = 4;
    expect(lessonDraftSchema.safeParse(l).success).toBe(false);
  });

  it('rejects a question with three options instead of four', () => {
    const l = validLesson();
    l.quiz[0].options = l.quiz[0].options.slice(0, 3);
    expect(lessonDraftSchema.safeParse(l).success).toBe(false);
  });

  it('rejects a slug with spaces or capitals', () => {
    expect(lessonDraftSchema.safeParse({ ...validLesson(), slug: 'Morning Plan' }).success).toBe(false);
  });

  it('rejects unknown fields (for example a status set by the client)', () => {
    expect(lessonDraftSchema.safeParse({ ...validLesson(), status: 'published' }).success).toBe(false);
  });
});

describe('lessonAttemptSchema', () => {
  it('accepts answers from 0 to 3 only', () => {
    expect(lessonAttemptSchema.safeParse({ answers: [0, 3] }).success).toBe(true);
    expect(lessonAttemptSchema.safeParse({ answers: [4] }).success).toBe(false);
    expect(lessonAttemptSchema.safeParse({ answers: [] }).success).toBe(false);
  });
});

describe('scoreQuiz', () => {
  const quiz = [{ answerIndex: 2 }, { answerIndex: 0 }, { answerIndex: 1 }];
  it('counts correct answers', () => {
    const r = scoreQuiz(quiz, [2, 3, 1]);
    expect(r.score).toBe(2);
    expect(r.total).toBe(3);
    expect(r.results.map((x) => x.correct)).toEqual([true, false, true]);
  });
  it('refuses a wrong number of answers', () => {
    expect(() => scoreQuiz(quiz, [2])).toThrow(TypeError);
  });
});

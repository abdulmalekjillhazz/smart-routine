import { describe, it, expect } from 'vitest';
import { toPublicLesson } from '../../src/services/lessons.js';

const base = {
  _id: '65f0c0ffee0000000000abcd',
  slug: 'x-lesson',
  title: { bn: 'শিরোনাম', en: 'Title' },
  body: { bn: 'বিষয়', en: 'Body' },
  vocabulary: [],
  quiz: [],
  publishedAt: new Date(),
};

describe('public media output', () => {
  it('shows null when no media is attached', () => {
    expect(toPublicLesson(base).media).toBeNull();
  });

  it('shows only the type and the server-built URL, never the public id', () => {
    const out = toPublicLesson({
      ...base,
      media: { publicId: 'smart-routine/lessons/aB3dE5fG7hJ9', resourceType: 'image', url: 'https://res.cloudinary.com/demo/image/upload/smart-routine/lessons/aB3dE5fG7hJ9' },
    });
    expect(out.media).toEqual({
      type: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/smart-routine/lessons/aB3dE5fG7hJ9',
    });
    expect(JSON.stringify(out)).not.toContain('publicId');
  });
});

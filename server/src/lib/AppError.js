// Errors we expect and want to show. Messages are bilingual: English and Bangla (formal).
export class AppError extends Error {
  constructor(status, code, i18nMessage, fields) {
    super(i18nMessage.en);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.i18n = i18nMessage;
    this.fields = fields;
  }
}

export const MSG = Object.freeze({
  invalid: { en: 'Invalid input.', bn: 'ইনপুট সঠিক নয়।' },
  unauthenticated: { en: 'Please sign in to continue.', bn: 'চালিয়ে যেতে অনুগ্রহ করে লগইন করুন।' },
  loginFailed: { en: 'Email or password is incorrect.', bn: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' },
  rateLimited: { en: 'Too many attempts. Please wait and try again later.', bn: 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' },
  csrf: { en: 'Security check failed. Reload the page and try again.', bn: 'নিরাপত্তা যাচাই ব্যর্থ হয়েছে। পেজ রিলোড করে আবার চেষ্টা করুন।' },
  notFound: { en: 'Not found.', bn: 'পাওয়া যায়নি।' },
  conflict: { en: 'This item changed elsewhere. Reload and try again.', bn: 'অন্য জায়গা থেকে এটি বদলেছে। রিলোড করে আবার চেষ্টা করুন।' },
  emailTaken: { en: 'An account with this email already exists.', bn: 'এই ইমেইল দিয়ে অ্যাকাউন্ট আগে থেকেই আছে।' },
  wrongPassword: { en: 'Password is incorrect.', bn: 'পাসওয়ার্ড সঠিক নয়।' },
  futureDate: { en: 'You cannot record a future day.', bn: 'ভবিষ্যতের দিনের জন্য রেকর্ড করা যাবে না।' },
  sameTime: { en: 'End time must be different from start time.', bn: 'শেষের সময় শুরুর সময়ের সমান হতে পারবে না।' },
  unavailable: { en: 'Service is temporarily unavailable.', bn: 'সেবাটি সাময়িকভাবে বন্ধ আছে।' },
  internal: { en: 'Something went wrong. Please try again.', bn: 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।' },
});

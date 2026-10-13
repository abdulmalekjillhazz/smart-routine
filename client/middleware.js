import { NextResponse } from 'next/server';

// Bangla is the default language, so the bare home address goes to /bn.
export function middleware(request) {
  return NextResponse.redirect(new URL('/bn', request.url), 308);
}

export const config = { matcher: ['/'] };

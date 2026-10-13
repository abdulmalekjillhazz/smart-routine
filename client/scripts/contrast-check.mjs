// Checks brand text colours against WCAG 2.2 AA (4.5:1). Exits 1 if any pair fails.
import { fileURLToPath } from 'node:url';
import { PALETTE, TEXT_PAIRS } from '../lib/palette.js';

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Runs only when called directly, so the unit tests can import the functions.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let failed = false;
  for (const [text, bg] of TEXT_PAIRS) {
    const ratio = contrast(PALETTE[text], PALETTE[bg]);
    const ok = ratio >= 4.5;
    if (!ok) failed = true;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${text} on ${bg}: ${ratio.toFixed(2)}:1`);
  }
  process.exit(failed ? 1 : 0);
}

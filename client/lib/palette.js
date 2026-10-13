// Brand colours: golden and sapphire. Every text pair is checked for WCAG 2.2 AA (4.5:1) by scripts/contrast-check.mjs.
export const PALETTE = Object.freeze({
  paper: '#FFFBF0',
  ink: '#1B1B1F',
  sapphire: '#0F3D91',
  sapphireDeep: '#0B2A66',
  gold: '#F2C14E',
  goldSoft: '#FCE9B0',
});

// Pairs that must meet 4.5:1 when used for text.
export const TEXT_PAIRS = Object.freeze([
  ['ink', 'paper'],
  ['sapphire', 'paper'],
  ['sapphireDeep', 'paper'],
  ['ink', 'gold'],
  ['sapphireDeep', 'goldSoft'],
  ['ink', 'goldSoft'],
]);

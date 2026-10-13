import { PALETTE } from './lib/palette.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: PALETTE.gold,
        sapphire: PALETTE.sapphire,
        paper: PALETTE.paper,
        ink: PALETTE.ink,
      },
    },
  },
  plugins: [],
};

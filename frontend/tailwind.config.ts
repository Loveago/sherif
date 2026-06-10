import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#060816',
        foreground: '#f8fafc',
        muted: '#8a94b3',
        border: 'rgba(148, 163, 184, 0.12)',
        card: 'rgba(13, 18, 40, 0.75)',
        primary: '#7c3aed',
        secondary: '#22c55e',
        accent: '#38bdf8',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,58,237,0.16), 0 16px 60px rgba(12,18,44,0.5)',
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(circle at top, rgba(124,58,237,0.28), transparent 45%), radial-gradient(circle at 70% 20%, rgba(56,189,248,0.16), transparent 25%), linear-gradient(180deg, #090b1a 0%, #05070f 100%)',
      },
    },
  },
  plugins: [],
};

export default config;

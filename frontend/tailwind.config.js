/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Night fairway" palette — deliberately not the warm-cream/terracotta
        // default. Deep ink-green ground, a single warm ember accent used
        // sparingly for the one thing that matters per screen (CTA / winnings).
        ink: {
          950: '#0B1410',
          900: '#0F1B15',
          800: '#16261D',
          700: '#203327',
        },
        ember: {
          300: '#F5B880',
          400: '#EDA05E',
          500: '#E08A3C',
          600: '#C96F26',
        },
        parchment: '#F2EFE6',
        mist: '#9FB0A6',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

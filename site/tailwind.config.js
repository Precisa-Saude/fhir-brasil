/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ps-violet-dark': 'oklch(0.39 0.082 292)',
        'ps-violet-light': 'oklch(0.67 0.113 285)',
        'ps-mint': 'oklch(0.90 0.085 181)',
        'ps-sand': 'oklch(0.89 0.023 65)',
        'ps-neutral': 'oklch(0.94 0.008 61)',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        serif: ['Roboto Serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '0.625rem',
        md: 'calc(0.625rem - 2px)',
        sm: 'calc(0.625rem - 4px)',
      },
    },
  },
  plugins: [],
};

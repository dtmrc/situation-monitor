/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        primary: '#00ff88',
        'accent-blue': '#00d4ff',
        'accent-amber': '#ffaa00',
        'accent-red': '#ff3333',
        'muted-foreground': '#a3a3a3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

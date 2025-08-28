/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors that work well in both light and dark modes
        'dark-bg': '#0f1419',
        'dark-surface': '#1a1f2e',
        'dark-border': '#2a3441'
      }
    },
  },
  plugins: [],
}
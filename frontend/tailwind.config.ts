import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
        arabic: ["'Noto Sans Arabic'", "'Tajawal'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config

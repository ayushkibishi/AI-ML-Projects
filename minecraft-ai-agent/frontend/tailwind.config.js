/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          bg: '#080C14',
          card: 'rgba(15, 23, 42, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          neonBlue: '#3b82f6',
          neonCyan: '#06b6d4',
          neonGreen: '#10b981',
          neonRed: '#ef4444',
          neonPurple: '#8b5cf6',
          gold: '#f59e0b'
        }
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)"
      }
    },
  },
  plugins: [],
}

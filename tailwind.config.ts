import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        tight: ['var(--font-inter-tight)', 'Inter Tight', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: {
          DEFAULT: '#f0ebe0',
          50: '#faf7f2',
          100: '#f4ede0',
          200: '#e8e1d6',
          300: '#d9d0c3',
        },
        ink: {
          DEFAULT: '#14100b',
          2: '#58483e',
          3: '#8a7568',
        },
        vouch: {
          blue: '#1448e8',
          green: '#0a9e72',
          amber: '#c8900d',
          red: '#dc2626',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
}

export default config

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#00ff9c',
          matrix: '#00ff41'
        },
        accent: {
          orange: '#ff6b35',
          gold: '#f7931a'
        }
      },
      fontFamily: {
        mono: [
          'ui-monospace','SFMono-Regular','Menlo','Monaco','Consolas','Liberation Mono','Courier New','monospace'
        ]
      },
      boxShadow: {
        glow: '0 0 20px rgba(0,255,65,0.25)',
        hard: '0 0 0 1px rgba(0,255,65,0.25), 0 0 20px rgba(0,255,65,0.15)'
      },
      keyframes: {
        blink: { '0%, 50%': { opacity: 1 }, '51%, 100%': { opacity: 0 } },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        glowpulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(0,255,65,0)' },
          '50%': { boxShadow: '0 0 24px rgba(0,255,65,0.3)' }
        }
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        scan: 'scan 3s linear infinite',
        glowpulse: 'glowpulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
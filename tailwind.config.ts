import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gumroad-inspired palette — cream cornerstone + high-saturation accents.
        oracle: {
          bg: '#FFF1E5', // cream
          card: '#FFFFFF',
          ink: '#0A0A0A',
          mute: '#4A4A4A',
          line: '#0A0A0A',
          pink: '#FF90E8',
          peach: '#FFC5A1',
          mint: '#90EBCD',
          sky: '#A7E5FF',
          lavender: '#B4ADF5',
          yellow: '#FFEB3B',
          yes: '#2AA76E',
          no: '#DC143C',
          warn: '#FF8A00'
        }
      },
      boxShadow: {
        brut: '4px 4px 0 0 #0A0A0A',
        brutLg: '6px 6px 0 0 #0A0A0A',
        brutSm: '2px 2px 0 0 #0A0A0A',
        brutPink: '4px 4px 0 0 #FF90E8',
        brutYes: '4px 4px 0 0 #2AA76E',
        brutNo: '4px 4px 0 0 #DC143C'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Archivo Black', 'ui-sans-serif', 'system-ui'],
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      borderWidth: {
        '3': '3px'
      },
      animation: {
        'wobble': 'wobble 500ms ease-in-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'marquee': 'marquee 40s linear infinite'
      },
      keyframes: {
        wobble: {
          '0%, 100%': { transform: 'rotate(0)' },
          '25%': { transform: 'rotate(-2deg)' },
          '75%': { transform: 'rotate(2deg)' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      }
    }
  },
  plugins: []
};

export default config;

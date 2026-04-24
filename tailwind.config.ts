import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oracle: {
          bg: '#07080c',
          panel: '#0d1016',
          line: '#1b2130',
          ink: '#e6e8ef',
          mute: '#7a869a',
          accent: '#6aa6ff',
          yes: '#19c37d',
          no: '#ef4444',
          warn: '#f59e0b'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2EDE1',
        'paper-line': '#D8CFB8',
        ink: '#201E19',
        sidebar: '#1E1C18',
        accent: {
          blue: '#2B4C7E',
          red: '#A23B2E'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        script: ['"Courier Prime"', 'monospace']
      }
    }
  },
  plugins: []
};
export default config;

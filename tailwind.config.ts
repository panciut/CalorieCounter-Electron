import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:           'var(--bg)',
        'nav-bg':     'var(--nav-bg)',
        card:         'var(--card-bg)',
        'card-hover': 'var(--card-hover)',
        text:         'var(--text)',
        'text-sec':   'var(--text-sec)',
        border:       'var(--border)',
        accent:       'var(--accent)',
        accent2:      'var(--accent2)',
        green:        'var(--green)',
        yellow:       'var(--yellow)',
        orange:       '#ff8c00',
        red:          'var(--red)',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        DEFAULT: '0 2px 12px rgba(0,0,0,0.65)',
        sm: '0 1px 6px rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        '2xs': '10px',
        xs:    '11px',
        sm:    '12px',
        base:  '13px',
        md:    '14px',
        lg:    '15px',
        xl:    '16px',
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
        '5xl': '30px',
      },
    },
  },
} satisfies Config;

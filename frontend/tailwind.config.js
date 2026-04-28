/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['monospace'],
      },
      colors: {
        brand: {
          dark:        '#0B0805',
          surface:     '#141009',
          surface2:    '#1C1610',
          border:      '#2A2018',
          orange:      '#E8622A',
          teal:        '#07C8B5',
          gold:        '#F2C14E',
          text:        '#F7F3F0',
          muted:       '#A1958C',
          cream:       '#F0E8DC',
        },
      },
      animation: {
        marquee:   'marquee 32s linear infinite',
        badgePing: 'badgePing 2s ease infinite',
        scrollPls: 'scrollPls 2s ease infinite',
        slideUp0:  'slideUp 0.9s cubic-bezier(.16,1,.3,1) 0.40s both',
        slideUp1:  'slideUp 0.9s cubic-bezier(.16,1,.3,1) 0.55s both',
        slideUp2:  'slideUp 0.9s cubic-bezier(.16,1,.3,1) 0.70s both',
        fadeUp0:   'fadeUp 0.8s ease 0.20s both',
        fadeUp1:   'fadeUp 0.8s ease 1.00s both',
        fadeUp2:   'fadeUp 0.8s ease 1.12s both',
        fadeLeft:  'fadeLeft 1s cubic-bezier(.16,1,.3,1) 0.70s both',
        fadeUpLg:  'fadeUp 0.8s ease 1.60s both',
      },
      keyframes: {
        marquee:   { from:{ transform:'translateX(0)' }, to:{ transform:'translateX(-50%)' } },
        badgePing: { '0%,100%':{ opacity:'1', transform:'scale(1)' }, '50%':{ opacity:'0.4', transform:'scale(0.6)' } },
        scrollPls: { '0%,100%':{ opacity:'0.25' }, '50%':{ opacity:'1' } },
        fadeUp:    { from:{ opacity:'0', transform:'translateY(22px)' },   to:{ opacity:'1', transform:'translateY(0)' } },
        slideUp:   { from:{ opacity:'0', transform:'translateY(110%)' },   to:{ opacity:'1', transform:'translateY(0)' } },
        fadeLeft:  { from:{ opacity:'0', transform:'translate(60px,-50%)' }, to:{ opacity:'1', transform:'translate(0,-50%)' } },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  content: [
    "./assets/*.liquid",
    "./layout/*.liquid",
    "./sections/*.liquid",
    "./snippets/*.liquid",
    "./templates/*.liquid",
    "./templates/customers/*.liquid",
    "./**/*.{liquid,json}"
  ],
  theme: {
    extend: {
      keyframes: {
        marquee: {
            '0%': { left: '100%' },
            '50%': { left: '-100%' },
            '100%': { left: '-100%' }
        }
      }
    },
  },
  plugins: [],
}


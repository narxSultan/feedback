/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e'
        }
      },
      boxShadow: {
        soft: '0 20px 50px -30px rgba(34, 197, 94, 0.55)'
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Tajawal', 'sans-serif'],
        english: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

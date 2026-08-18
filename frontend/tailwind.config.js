/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6b1530",
          light: "#8f1f42",
          dark: "#4a0e21",
        },
      },
    },
  },
  plugins: [],
};

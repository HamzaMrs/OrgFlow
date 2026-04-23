/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bfd4ff",
          300: "#93b6ff",
          400: "#608eff",
          500: "#3c6bff",
          600: "#274dea",
          700: "#1f3dbd",
          800: "#1d3597",
          900: "#1d3177",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

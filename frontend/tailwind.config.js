/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#2563eb",
        "accent-hover": "#1d4ed8",
        "accent-soft": "#eff6ff",
      },
      fontFamily: {
        sans: [
          '"Inter"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem", letterSpacing: "-0.005em" }],
        base: ["0.9375rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        lg: ["1.0625rem", { lineHeight: "1.625rem", letterSpacing: "-0.015em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.025em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.03em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.035em" }],
      },
      letterSpacing: {
        tight: "-0.015em",
        tighter: "-0.03em",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        card: "0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px 0 rgb(0 0 0 / 0.04)",
        pop: "0 10px 40px -10px rgb(0 0 0 / 0.15), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 220ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

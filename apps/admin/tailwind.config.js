/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B111C",
        cyan: "#60A5FA",
        amber: "#D97706",
        panel: "#121A27",
        borderGlow: "#273449"
      },
      fontFamily: {
        heading: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"]
      },
      boxShadow: {
        glow: "0 18px 40px rgba(0, 0, 0, 0.22)",
        glowAmber: "0 18px 40px rgba(0, 0, 0, 0.22)"
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--color-base) / <alpha-value>)",
        cyan: "rgb(var(--color-accent) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        borderGlow: "rgb(var(--color-border) / <alpha-value>)"
      },
      fontFamily: {
        heading: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        glow: "0 18px 44px rgba(0, 0, 0, 0.28)",
        glowAmber: "0 18px 44px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};

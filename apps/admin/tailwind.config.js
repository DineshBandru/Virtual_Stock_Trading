/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--admin-color-base) / <alpha-value>)",
        cyan: "rgb(var(--admin-color-accent) / <alpha-value>)",
        amber: "rgb(var(--admin-color-amber) / <alpha-value>)",
        panel: "rgb(var(--admin-color-panel) / <alpha-value>)",
        borderGlow: "rgb(var(--admin-color-border) / <alpha-value>)"
      },
      fontFamily: {
        heading: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        glow: "0 18px 40px rgba(0, 0, 0, 0.22)",
        glowAmber: "0 18px 40px rgba(0, 0, 0, 0.22)"
      }
    }
  },
  plugins: []
};

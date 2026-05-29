/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0F",
        cyan: "#00F5FF",
        amber: "#FFB800",
        panel: "#0F111A",
        borderGlow: "#1C2333"
      },
      fontFamily: {
        heading: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"]
      },
      boxShadow: {
        glow: "0 0 12px rgba(0, 245, 255, 0.45)",
        glowAmber: "0 0 12px rgba(255, 184, 0, 0.45)"
      },
      backgroundImage: {
        scanlines:
          "repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)"
      }
    }
  },
  plugins: []
};

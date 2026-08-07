import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production" && !env.VITE_API_URL) {
    throw new Error("VITE_API_URL must be configured for production admin builds");
  }
  if (mode === "production" && !env.VITE_WEBSITE_URL) {
    throw new Error("VITE_WEBSITE_URL must be configured for production admin builds");
  }

  return {
    plugins: [react()],
    server: {
      port: 3016,
      strictPort: true,
      proxy: {
        "/api": "http://localhost:5500",
        "/socket.io": {
          target: "http://localhost:5500",
          ws: true
        }
      }
    }
  };
});

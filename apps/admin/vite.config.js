import { fileURLToPath } from "node:url";
import react from "../website/node_modules/@vitejs/plugin-react/dist/index.js";

const websiteNodeModules = fileURLToPath(new URL("../website/node_modules/", import.meta.url));

export default {
  plugins: [react()],
  resolve: {
    alias: {
      "@vitejs/plugin-react": `${websiteNodeModules}@vitejs/plugin-react`,
      axios: `${websiteNodeModules}axios`,
      "framer-motion": `${websiteNodeModules}framer-motion`,
      "lucide-react": `${websiteNodeModules}lucide-react`,
      react: `${websiteNodeModules}react`,
      "react-dom": `${websiteNodeModules}react-dom`,
      "react-router-dom": `${websiteNodeModules}react-router-dom`
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "axios", "lucide-react", "framer-motion"]
  },
  server: {
    port: 3001,
    proxy: {
      "/api": "http://localhost:5000",
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true
      }
    }
  }
};

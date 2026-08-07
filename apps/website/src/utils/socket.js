import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return "http://localhost:5500";
  throw new Error("VITE_API_URL must be configured for production socket connections");
};

const socket = io(getSocketUrl(), {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: false
});

export default socket;

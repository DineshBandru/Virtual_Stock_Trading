import { useEffect, useState } from "react";
import socket from "../utils/socket";

const useAlertsFeed = (userId) => {
  const [triggered, setTriggered] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    if (!socket.connected) {
      socket.connect();
    }
    const handler = (payload) => {
      if (!payload.userId || payload.userId === userId || payload.userId === String(userId)) {
        setTriggered(payload);
      }
    };
    socket.on("alert-triggered", handler);
    socket.on("alerts:triggered", handler);
    return () => {
      socket.off("alert-triggered", handler);
      socket.off("alerts:triggered", handler);
    };
  }, [userId]);

  return triggered;
};

export default useAlertsFeed;

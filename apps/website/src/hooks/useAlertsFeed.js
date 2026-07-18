import { useEffect, useState } from "react";
import socket from "../utils/socket";

const useAlertsFeed = (userId) => {
  const [triggered, setTriggered] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    const handler = (payload) => {
      if (payload.userId === userId) {
        setTriggered(payload);
      }
    };
    socket.on("alerts:triggered", handler);
    return () => {
      socket.off("alerts:triggered", handler);
    };
  }, [userId]);

  return triggered;
};

export default useAlertsFeed;

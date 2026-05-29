import { useEffect, useState } from "react";
import socket from "../utils/socket";

const useLivePrices = () => {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const handler = (payload) => {
      setPrices(payload || {});
    };

    socket.on("prices:update", handler);
    return () => {
      socket.off("prices:update", handler);
    };
  }, []);

  return prices;
};

export default useLivePrices;

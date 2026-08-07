import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import useAuth from "../hooks/useAuth";
import api from "../utils/api";

const OnboardingTour = () => {
  const { user, refresh } = useAuth();

  useEffect(() => {
    if (user && user.hasSeenTour === false) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { popover: { title: "Welcome to Trade Abhyas", description: "Let's take a quick tour of your new trading terminal." } },
          { element: ".ticker-band", popover: { title: "Market Pulse", description: "Live updates and signals run continuously here.", side: "bottom", align: "start" } },
          { element: ".dashboard-portfolio-card", popover: { title: "Your Portfolio", description: "Track your balance, holdings, and daily PnL.", side: "right", align: "start" } },
          { element: ".dashboard-search", popover: { title: "Search Stocks", description: "Find NSE Indian stocks directly here.", side: "bottom", align: "start" } },
          { popover: { title: "Ready to trade", description: "You are all set. Good luck!" } }
        ],
        onDestroyStarted: async () => {
          try {
            await api.put("/api/auth/tour");
            refresh();
          } catch (error) {
            console.error(error);
          }
          driverObj.destroy();
        }
      });
      driverObj.drive();
    }
  }, [user, refresh]);

  return null;
};

export default OnboardingTour;

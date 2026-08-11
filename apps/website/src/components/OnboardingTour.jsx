import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import useAuth from "../hooks/useAuth";
import api from "../utils/api";
import { firstTradeGuideEventName, replayTourEventName } from "../data/beginnerGuidance";

const firstTradeGuideStorageKey = "tradeabhyas:first-trade-guide-active";

const OnboardingTour = () => {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const replayRef = useRef(false);
  const driverRef = useRef(null);

  useEffect(() => {
    const goToRouteAndContinue = (path) => {
      navigate(path);
      window.setTimeout(() => {
        driverRef.current?.moveNext();
      }, 700);
    };

    const finishTour = async () => {
      if (!replayRef.current) {
        try {
          await api.put("/api/auth/tour");
          refresh();
        } catch (error) {
          console.error(error);
        }
      }
      replayRef.current = false;
    };

    const buildSteps = () => [
      {
        popover: {
          title: "Welcome to Trade Abhyas",
          description: "Practice stock trading using virtual money without risking real funds. Your starting balance is virtual."
        }
      },
      {
        element: "[data-tour='virtual-balance']",
        popover: {
          title: "Your Virtual Balance",
          description: "This is your virtual trading balance. Buying shares uses this balance, and selling shares credits it back.",
          side: "bottom",
          align: "start"
        }
      },
      {
        element: "[data-tour='stock-search']",
        popover: {
          title: "Search Stocks",
          description: "Search for an NSE-listed company such as RELIANCE, TCS or Infosys.",
          side: "bottom",
          align: "start",
          nextBtnText: "Open Stock",
          onNextClick: () => goToRouteAndContinue("/stocks/RELIANCE.NS")
        }
      },
      {
        element: "[data-tour='stock-overview']",
        popover: {
          title: "Stock Detail",
          description: "Here you can view the current market price, price movement and historical chart.",
          side: "bottom",
          align: "start"
        }
      },
      {
        element: "[data-tour='order-ticket']",
        popover: {
          title: "Order Ticket",
          description: "Choose Buy or Sell, select an order type, enter quantity and place your virtual order.",
          side: "left",
          align: "start",
          onNextClick: () => goToRouteAndContinue("/portfolio")
        }
      },
      {
        element: "[data-tour='portfolio-view']",
        popover: {
          title: "Portfolio",
          description: "Stocks you currently own appear in Portfolio with quantity, average price, current value and P&L.",
          side: "bottom",
          align: "start",
          onNextClick: () => goToRouteAndContinue("/orders")
        }
      },
      {
        element: "[data-tour='orders-view']",
        popover: {
          title: "Orders",
          description: "Orders shows the lifecycle of every order: Pending, Triggered, Executed, Cancelled or Rejected.",
          side: "bottom",
          align: "start",
          onNextClick: () => goToRouteAndContinue("/transactions")
        }
      },
      {
        element: "[data-tour='transactions-view']",
        popover: {
          title: "Transactions",
          description: "Transactions contains successfully executed trades.",
          side: "bottom",
          align: "start"
        }
      },
      {
        popover: {
          title: "You're ready to practise.",
          description: "Start by searching for a stock and making a small virtual trade.",
          doneBtnText: "Finish Tour"
        }
      }
    ];

    const buildFirstTradeSteps = () => [
      {
        popover: {
          title: "First Virtual Trade",
          description: "This walkthrough helps you place a careful practice order. You choose the stock yourself; nothing is bought automatically."
        }
      },
      {
        element: "[data-tour='virtual-balance']",
        popover: {
          title: "Check Virtual Cash",
          description: "Buy orders use this virtual balance. Trade Abhyas never needs bank, card, or PAN details for practice trading.",
          side: "bottom",
          align: "start"
        }
      },
      {
        element: "[data-tour='stock-search']",
        popover: {
          title: "Search Any NSE Stock",
          description: "Type a company name or NSE symbol, select a result, then open its stock page. Choose something you want to practise on.",
          side: "bottom",
          align: "start"
        }
      },
      {
        element: "[data-tour='stock-search'] input",
        popover: {
          title: "Your Turn",
          description: "After you open a stock, the stock page and order ticket will show the next steps for a small virtual Buy order.",
          side: "bottom",
          align: "start",
          doneBtnText: "I'll Search"
        }
      }
    ];

    const startTour = ({ replay = false } = {}) => {
      if (!user || driverRef.current?.isActive()) {
        return;
      }
      startedRef.current = true;
      replayRef.current = replay;
      navigate("/");
      window.setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          allowKeyboardControl: true,
          popoverClass: "tradeabhyas-tour",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Finish Tour",
          steps: buildSteps(),
          onDestroyStarted: async () => {
            await finishTour();
            driverObj.destroy();
          }
        });
        driverRef.current = driverObj;
        driverObj.drive();
      }, 500);
    };

    const handleReplay = () => startTour({ replay: true });
    const handleFirstTradeGuide = () => {
      if (!user || driverRef.current?.isActive()) {
        return;
      }
      window.localStorage.setItem(firstTradeGuideStorageKey, "true");
      navigate("/");
      window.setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          allowKeyboardControl: true,
          popoverClass: "tradeabhyas-tour",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "I'll Search",
          steps: buildFirstTradeSteps(),
          onDestroyStarted: () => {
            driverObj.destroy();
            window.setTimeout(() => {
              document.querySelector("[data-tour='stock-search'] input")?.focus();
            }, 150);
          }
        });
        driverRef.current = driverObj;
        driverObj.drive();
      }, 500);
    };
    window.addEventListener(replayTourEventName, handleReplay);
    window.addEventListener(firstTradeGuideEventName, handleFirstTradeGuide);

    if (user && user.hasSeenTour === false && !startedRef.current) {
      startTour();
    }

    return () => {
      window.removeEventListener(replayTourEventName, handleReplay);
      window.removeEventListener(firstTradeGuideEventName, handleFirstTradeGuide);
    };
  }, [user, refresh, navigate]);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return null;
};

export default OnboardingTour;

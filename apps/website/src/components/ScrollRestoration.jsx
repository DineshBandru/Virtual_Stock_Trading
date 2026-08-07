import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getScrollKey = (location) => `${location.pathname}${location.search}${location.hash}`;

const readPosition = (key) => {
  try {
    const saved = sessionStorage.getItem(`scroll:${key}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const savePosition = (key) => {
  try {
    sessionStorage.setItem(
      `scroll:${key}`,
      JSON.stringify({ x: window.scrollX, y: window.scrollY })
    );
  } catch {
    // Ignore storage failures so navigation never breaks.
  }
};

const ScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousKeyRef = useRef(getScrollKey(location));

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const previousKey = previousKeyRef.current;
    const nextKey = getScrollKey(location);

    savePosition(previousKey);
    previousKeyRef.current = nextKey;

    const savedPosition = readPosition(nextKey);
    if (navigationType === "POP" && savedPosition) {
      window.requestAnimationFrame(() => {
        window.scrollTo(savedPosition.x || 0, savedPosition.y || 0);
      });
      return;
    }

    if (navigationType !== "POP") {
      window.requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    }
  }, [location, navigationType]);

  useLayoutEffect(() => {
    const handleBeforeUnload = () => savePosition(getScrollKey(location));
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [location]);

  return null;
};

export default ScrollRestoration;

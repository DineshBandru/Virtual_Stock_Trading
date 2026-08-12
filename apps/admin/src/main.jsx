import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";

const applyStoredTheme = () => {
  const preference = localStorage.getItem("themePreference") || localStorage.getItem("theme") || "system";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const resolvedTheme = preference === "system" ? systemTheme : preference;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
};

applyStoredTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

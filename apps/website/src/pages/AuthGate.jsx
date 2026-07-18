import { useState } from "react";
import Login from "./Login";
import Register from "./Register";

const AuthGate = () => {
  const [tab, setTab] = useState("login");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-full border border-borderGlow/60 bg-base/70 p-1">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            tab === "login"
              ? "border border-cyan/60 bg-cyan/10 text-cyan shadow-glow"
              : "text-slate-300"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            tab === "register"
              ? "border border-amber/60 bg-amber/10 text-amber shadow-glowAmber"
              : "text-slate-300"
          }`}
        >
          Register
        </button>
      </div>

      {tab === "login" ? <Login inline /> : <Register inline />}
    </div>
  );
};

export default AuthGate;

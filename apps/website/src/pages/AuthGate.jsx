import { useState } from "react";
import Login from "./Login";
import Register from "./Register";

const AuthGate = () => {
  const [tab, setTab] = useState("login");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#080910]/70 p-1">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 rounded-2xl px-4 py-2 text-xs font-semibold uppercase transition ${
            tab === "login"
              ? "border border-cyan/50 bg-cyan/10 text-cyan"
              : "text-[#C2C4D2]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex-1 rounded-2xl px-4 py-2 text-xs font-semibold uppercase transition ${
            tab === "register"
              ? "border border-amber/50 bg-amber/10 text-amber"
              : "text-[#C2C4D2]"
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

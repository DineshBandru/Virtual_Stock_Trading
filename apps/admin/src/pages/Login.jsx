import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import { getApiErrorMessage } from "../utils/errorMessage";

const Login = ({ inline = false }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      push("Login successful. Your trading workspace is ready.", "success");
      navigate("/");
    } catch (err) {
      const message = getApiErrorMessage(err, "Login failed");
      setError(message);
      push(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!inline ? (
        <div>
          <div className="flex items-center gap-3">
            <img src="/tradeabhyas-logo.png" alt="Trade Abhyas" className="h-14 w-14 rounded-xl object-contain" />
            <p className="text-xs font-semibold uppercase text-cyan">
              Trade Abhyas Admin
            </p>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Secure access</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Sign in with an authorized admin account to manage users, orders, and platform records.
          </p>
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs font-semibold uppercase text-slate-500">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan"
            placeholder="you@domain.com"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-slate-500">
          Password
          <span className="mt-2 flex rounded-lg border border-borderGlow bg-base transition focus-within:border-cyan">
            <input
              type={passwordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="inline-flex w-12 shrink-0 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-cyan focus:outline-none"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              title={passwordVisible ? "Hide password" : "Show password"}
            >
              {passwordVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </span>
        </label>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default Login;

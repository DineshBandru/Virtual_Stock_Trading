import { useState } from "react";
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
          <p className="text-xs uppercase tracking-[0.3em] text-cyan">
            Virtual Stock Terminal
          </p>
          <h1 className="mt-3 font-heading text-3xl">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-300">
            Authenticate to access your live trading workspace.
          </p>
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white focus:border-cyan focus:outline-none"
            placeholder="you@domain.com"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white focus:border-cyan focus:outline-none"
            placeholder="••••••••"
          />
        </label>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-xl border border-cyan/80 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan shadow-glow transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Enter Terminal"}
        </button>
      </form>
    </div>
  );
};

export default Login;

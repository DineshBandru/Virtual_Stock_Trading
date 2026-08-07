import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";

const Login = ({ inline = false }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setError("");
    setResetMessage("");
    setResetLink("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearMessages();
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

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      setResetMessage(response.data.message);
      setResetLink(response.data.resetLink || "");
      push(response.data.message, "success");
    } catch (err) {
      const message = getApiErrorMessage(err, "Password reset request failed");
      setError(message);
      push(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const localResetPath = resetLink
    ? new URL(resetLink).pathname + new URL(resetLink).search
    : "";

  return (
    <div className="flex flex-col gap-6">
      {!inline ? (
        <div>
          <div className="flex items-center gap-3">
            <img src="/tradeabhyas-logo.png" alt="Trade Abhyas" className="h-14 w-14 rounded-xl object-contain" />
            <p className="text-xs font-medium text-cyan">Trade Abhyas</p>
          </div>
          <h1 className="mt-3 font-heading text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-[#C2C4D2]">
            Sign in to access your trading workspace.
          </p>
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit}>
        <label className="text-xs uppercase text-[#A1A1B5]">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white focus:border-cyan focus:outline-none"
            placeholder="you@domain.com"
          />
        </label>

        {!showForgotPassword ? (
          <label className="text-xs uppercase text-[#A1A1B5]">
            Password
            <span className="mt-2 flex rounded-2xl border border-white/10 bg-[#080910] focus-within:border-cyan">
              <input
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="inline-flex w-12 shrink-0 items-center justify-center rounded-r-2xl text-[#A1A1B5] transition hover:text-cyan focus:outline-none"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                title={passwordVisible ? "Hide password" : "Show password"}
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </label>
        ) : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        {resetMessage ? <p className="text-xs text-cyan">{resetMessage}</p> : null}
        {localResetPath ? (
          <Link className="text-xs text-cyan underline" to={localResetPath}>
            Open local reset link
          </Link>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-2xl border border-cyan/80 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan shadow-none transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? showForgotPassword ? "Generating reset link..." : "Signing in..."
            : showForgotPassword ? "Send Reset Link" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForgotPassword((value) => !value);
            clearMessages();
          }}
          className="text-left text-xs font-semibold text-cyan transition hover:text-cyan/80"
        >
          {showForgotPassword ? "Back to login" : "Forgot password?"}
        </button>
      </form>
    </div>
  );
};

export default Login;

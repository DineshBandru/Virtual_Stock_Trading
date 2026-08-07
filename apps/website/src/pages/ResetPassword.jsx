import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useToast from "../hooks/useToast";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/auth/reset-password", { token, password });
      const successMessage = response.data.message || "Password has been reset successfully";
      setMessage(successMessage);
      push(successMessage, "success");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const resetError = getApiErrorMessage(err, "Password reset failed");
      setError(resetError);
      push(resetError, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase text-cyan">Account Recovery</p>
        <h1 className="mt-3 font-heading text-3xl">Reset Password</h1>
        <p className="mt-2 text-sm text-[#C2C4D2]">Choose a new password for your account.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs font-medium uppercase text-[#A1A1B5]">
          New Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white focus:border-cyan focus:outline-none"
            placeholder="Create a strong password"
          />
        </label>

        <label className="text-xs font-medium uppercase text-[#A1A1B5]">
          Confirm Password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white focus:border-cyan focus:outline-none"
            placeholder="Confirm password"
          />
        </label>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        {message ? <p className="text-xs text-cyan">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-2xl border border-cyan/70 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Resetting password..." : "Reset Password"}
        </button>
        <Link className="text-xs font-semibold text-cyan transition hover:text-cyan/80" to="/login">
          Back to login
        </Link>
      </form>
    </div>
  );
};

export default ResetPassword;

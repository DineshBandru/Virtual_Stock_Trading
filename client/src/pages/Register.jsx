import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";

const Register = ({ inline = false }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ name, email, password });
      push("Virtual desk provisioned", "success");
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
      push("Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!inline ? (
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber">
            Virtual Stock Terminal
          </p>
          <h1 className="mt-3 font-heading text-3xl">Create Your Desk</h1>
          <p className="mt-2 text-sm text-slate-300">
            Start with ₹10,00,000 virtual capital and trade risk-free.
          </p>
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white focus:border-amber focus:outline-none"
            placeholder="Your name"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white focus:border-amber focus:outline-none"
            placeholder="you@domain.com"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white focus:border-amber focus:outline-none"
            placeholder="Create a strong password"
          />
        </label>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-xl border border-amber/80 bg-amber/10 px-4 py-3 text-sm font-semibold text-amber shadow-glowAmber transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Provisioning..." : "Provision Virtual Desk"}
        </button>
      </form>
    </div>
  );
};

export default Register;

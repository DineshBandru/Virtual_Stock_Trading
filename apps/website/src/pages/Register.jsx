import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import { getApiErrorMessage } from "../utils/errorMessage";

const Register = ({ inline = false }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      // client-side validation
      const clientErrors = {};
      if (!name || name.trim().length < 2) clientErrors.name = 'Name must be at least 2 characters';
      const emailRe = /^\S+@\S+\.\S+$/;
      if (!email || !emailRe.test(email)) clientErrors.email = 'Invalid email';
      if (!password || !passwordMeetsCriteria(password)) clientErrors.password = 'Password does not meet requirements';
      if (Object.keys(clientErrors).length) {
        setFieldErrors(clientErrors);
        setLoading(false);
        return;
      }

      await register({ name, email, password });
      push("Account created successfully. Your virtual trading desk now has ₹10,00,000 starting balance.", "success");
      navigate("/");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Registration failed");
      setError(msg);
      push(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // password helpers
  const passwordMeetsCriteria = (pw) => {
    if (!pw || pw.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    return hasUpper && hasLower && hasNumber && hasSpecial && pw.length >= 8;
  };

  const pwChecks = (pw) => ({
    length: pw && pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  });

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
        {/* Top error banner */}
        {error ? (
          <div className="rounded-lg border border-red-500 bg-red-900/60 p-3 text-sm text-red-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-4 rounded bg-red-700/80 px-3 py-1 text-xs font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        ) : null}
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
        {/* Password requirements guidance + live checklist */}
        <div className="mt-2 flex flex-col gap-1 text-xs">
          <div className="text-slate-300">Password must include:</div>
          {(() => {
            const checks = pwChecks(password);
            const items = [
              { ok: checks.length, text: 'At least 8 characters' },
              { ok: checks.upper, text: 'An uppercase letter' },
              { ok: checks.lower, text: 'A lowercase letter' },
              { ok: checks.number, text: 'A number' },
              { ok: checks.special, text: 'A special character' },
            ];
            return items.map((it, idx) => (
              <div key={idx} className={`flex items-center gap-2 ${it.ok ? 'text-emerald-400' : 'text-slate-400'}`}>
                <span className={`inline-block h-4 w-4 flex-none rounded-sm ${it.ok ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span>{it.text}</span>
              </div>
            ));
          })()}
        </div>

        {/* inline field error messages */}
        <div>
          {fieldErrors.name ? <p className="text-xs text-red-400">{fieldErrors.name}</p> : null}
          {fieldErrors.email ? <p className="text-xs text-red-400">{fieldErrors.email}</p> : null}
          {fieldErrors.password ? <p className="text-xs text-red-400">{fieldErrors.password}</p> : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-xl border border-amber/80 bg-amber/10 px-4 py-3 text-sm font-semibold text-amber shadow-glowAmber transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Provision Virtual Desk Account"}
        </button>
      </form>
    </div>
  );
};

export default Register;

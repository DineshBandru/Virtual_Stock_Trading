import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  Bell,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  PlayCircle,
  Save,
  ShieldCheck,
  Sun,
  UserRound
} from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import useAuth from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { replayTourEventName } from "../data/beginnerGuidance";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const settingsSections = [
  { id: "account", label: "Account", path: "/settings/account", icon: UserRound },
  { id: "security", label: "Security", path: "/settings/security", icon: KeyRound },
  { id: "appearance", label: "Appearance", path: "/settings/appearance", icon: Palette }
];

const themeOptions = [
  { id: "system", label: "System", description: "Follow device appearance", icon: Monitor },
  { id: "light", label: "Light", description: "Always use light appearance", icon: Sun },
  { id: "dark", label: "Dark", description: "Always use dark appearance", icon: Moon }
];

const tradingExperienceOptions = [
  { value: "", label: "Select experience" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Professional" }
];

const riskProfileOptions = [
  { value: "", label: "Select risk appetite" },
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" }
];

const tradingStyleOptions = [
  { value: "", label: "Select trading style" },
  { value: "intraday", label: "Intraday" },
  { value: "swing", label: "Swing" },
  { value: "long_term", label: "Long-term investing" },
  { value: "mixed", label: "Mixed" }
];

const defaultNotificationPreferences = {
  orderUpdates: true,
  priceAlerts: true,
  portfolioDigest: false,
  productUpdates: false
};

const buildProfileForm = (user = {}) => ({
  name: user.name || "",
  email: user.email || "",
  phone: user.phone || "",
  tradingExperience: user.tradingExperience || "",
  riskProfile: user.riskProfile || "",
  tradingStyle: user.tradingStyle || "",
  notificationPreferences: {
    ...defaultNotificationPreferences,
    ...(user.notificationPreferences || {})
  }
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "-";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const SettingTab = ({ section, active }) => {
  const Icon = section.icon;
  return (
    <Link
      to={section.path}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-1 shrink-0 items-center justify-center gap-3 rounded-md border px-4 py-2.5 text-sm font-semibold outline-none transition sm:flex-none sm:justify-start focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20 ${
        active
          ? "border-cyan/40 bg-cyan/10 text-white"
          : "border-borderGlow bg-base text-slate-400 hover:border-cyan/30 hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-cyan" : "text-slate-500"}`} aria-hidden="true" />
      {section.label}
    </Link>
  );
};

const PasswordInput = ({ id, label, value, visible, disabled, onChange, onToggle }) => {
  const ToggleIcon = visible ? EyeOff : Eye;
  return (
    <label className="text-sm text-slate-300">
      {label}
      <span className="mt-2 flex rounded-lg border border-borderGlow bg-base focus-within:border-cyan focus-within:ring-2 focus-within:ring-cyan/20">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="inline-flex w-11 items-center justify-center text-slate-400 transition hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <ToggleIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
    </label>
  );
};

const TextField = ({ label, error, className = "", ...props }) => (
  <label className={`text-[13px] font-medium text-slate-300 ${className}`}>
    {label}
    <input
      {...props}
      className="mt-2 min-h-12 w-full rounded-md border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
    />
    {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
  </label>
);

const SelectField = ({ label, error, options, className = "", ...props }) => (
  <label className={`text-[13px] font-medium text-slate-300 ${className}`}>
    {label}
    <select
      {...props}
      className="mt-2 min-h-12 w-full rounded-md border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : null}
  </label>
);

const ToggleRow = ({ label, description, checked, disabled, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-borderGlow py-4 transition last:border-b-0 hover:text-white">
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-white">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 accent-cyan"
    />
  </label>
);

const SettingsCardHeader = ({ eyebrow, title, description, icon: Icon }) => (
  <div className="border-b border-borderGlow px-5 py-5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{eyebrow}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {Icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyan/25 bg-cyan/10 text-cyan">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  </div>
);

const SummaryMetric = ({ label, value }) => (
  <div className="min-h-24 rounded-md border border-borderGlow bg-base p-4">
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-3 font-mono text-lg font-semibold tracking-tight text-white">{value}</p>
  </div>
);

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  const activeSection = location.pathname.split("/")[2] || "account";
  const validSection = settingsSections.some((section) => section.id === activeSection);

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(user));
  const [profileErrors, setProfileErrors] = useState({});
  const [profileStatus, setProfileStatus] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setProfileForm(buildProfileForm(user));
  }, [user]);

  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError("");
      const [analyticsRes, transactionsRes] = await Promise.all([
        api.get("/api/portfolio/analytics"),
        api.get("/api/transactions")
      ]);
      setAnalytics(analyticsRes.data || null);
      setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
    } catch (err) {
      setAnalytics(null);
      setTransactions([]);
      setSummaryError(getApiErrorMessage(err, "Failed to load trading summary"));
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const tradingSummary = useMemo(() => {
    const buys = transactions.filter((transaction) => transaction.type === "BUY").length;
    const sells = transactions.filter((transaction) => transaction.type === "SELL").length;
    return {
      totalTrades: transactions.length,
      buys,
      sells,
      portfolioValue: (Number(user?.balance) || 0) + (Number(analytics?.currentValue) || 0),
      pnl: Number(analytics?.pnl) || 0
    };
  }, [analytics, transactions, user?.balance]);

  const profileCompletion = useMemo(() => {
    const requiredProfileFields = [
      profileForm.name,
      profileForm.email,
      profileForm.phone,
      profileForm.tradingExperience,
      profileForm.riskProfile,
      profileForm.tradingStyle
    ];
    const completedFields = requiredProfileFields.filter((value) => String(value || "").trim()).length;
    return Math.round((completedFields / requiredProfileFields.length) * 100);
  }, [profileForm]);

  if (!validSection) {
    return <Navigate to="/settings/account" replace />;
  }

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.name.trim()) errors.name = "Full name is required.";
    if (!isEmail(profileForm.email.trim())) errors.email = "Enter a valid email address.";
    if (profileForm.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(profileForm.phone.trim())) {
      errors.phone = "Enter a valid phone number.";
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setProfileStatus("");
    if (!validateProfile()) return;

    try {
      setProfileSaving(true);
      const response = await api.patch("/api/auth/profile", {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        tradingExperience: profileForm.tradingExperience,
        riskProfile: profileForm.riskProfile,
        tradingStyle: profileForm.tradingStyle,
        notificationPreferences: profileForm.notificationPreferences
      });
      updateUser(response.data);
      setProfileStatus("Profile updated.");
      setProfileErrors({});
    } catch (err) {
      setProfileStatus("");
      setProfileErrors({ form: getApiErrorMessage(err, "Failed to update profile") });
    } finally {
      setProfileSaving(false);
    }
  };

  const validatePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      return "All password fields are required.";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return "New password confirmation does not match.";
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return "New password must be different from the current password.";
    }
    return "";
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordStatus("");
    const validationError = validatePassword();
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordError("");
      const response = await api.post("/api/auth/change-password", passwordForm, {
        skipAuthRefresh: true
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordStatus(response.data?.message || "Password changed. Please sign in again.");
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, "Failed to change password"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const replayTradingTour = () => {
    window.dispatchEvent(new CustomEvent(replayTourEventName));
  };

  const summaryCards = [
    { label: "Virtual cash", value: formatCurrency(user?.balance) },
    { label: "Portfolio value", value: formatCurrency(tradingSummary.portfolioValue) },
    { label: "Profit / loss", value: formatCurrency(tradingSummary.pnl) },
    { label: "Trade count", value: tradingSummary.totalTrades },
    { label: "Buy count", value: tradingSummary.buys },
    { label: "Sell count", value: tradingSummary.sells }
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6">
      <PageHeader title="Settings" subtitle="Manage account details, security controls, notifications, and appearance." />

      <div className="flex flex-col gap-6">
        <GlassPanel className="p-2">
          <nav className="grid gap-2 sm:grid-cols-3" aria-label="Settings sections">
            {settingsSections.map((section) => (
              <SettingTab key={section.id} section={section} active={activeSection === section.id} />
            ))}
          </nav>
        </GlassPanel>

        <div className="min-w-0">
          {activeSection === "account" ? (
            <div className="flex flex-col gap-6">
              <section className="grid items-stretch gap-6 xl:grid-cols-12">
                <GlassPanel className="overflow-hidden p-0 xl:col-span-4">
                  <SettingsCardHeader eyebrow="Account overview" title={user?.name || "Trader"} description={user?.email || "-"} icon={UserRound} />
                  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-md border border-borderGlow bg-base p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Joined</p>
                      <p className="mt-3 text-sm font-semibold text-white">{formatDate(user?.createdAt)}</p>
                    </div>
                    <div className="rounded-md border border-borderGlow bg-base p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Account type</p>
                      <p className="mt-3 text-sm font-semibold capitalize text-white">{user?.role || "User"}</p>
                    </div>
                  </div>
                </GlassPanel>

                <GlassPanel className="overflow-hidden p-0 xl:col-span-8">
                  <div className="border-b border-borderGlow px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trading summary</p>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">Read-only account totals</h3>
                      </div>
                      {summaryError ? (
                        <button type="button" onClick={loadSummary} className="rounded-lg border border-red-300/40 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/10">
                          Retry
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-5">
                    {summaryLoading ? (
                      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
                      </div>
                    ) : summaryError ? (
                      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{summaryError}</span>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                        {summaryCards.map((card) => (
                          <SummaryMetric key={card.label} label={card.label} value={card.value} />
                        ))}
                      </div>
                    )}
                  </div>
                </GlassPanel>
              </section>

              <form className="grid items-start gap-6 xl:grid-cols-12" onSubmit={submitProfile}>
                <div className="flex min-w-0 flex-col gap-6 xl:col-span-8">
                  <GlassPanel className="overflow-hidden p-0">
                    <SettingsCardHeader
                      eyebrow="Editable profile"
                      title="Identity and contact details"
                      description="Keep your display name, email, and phone number organized for this virtual trading account."
                      icon={UserRound}
                    />
                    <div className="grid gap-5 p-5 md:grid-cols-3">
                      <TextField
                        label="Full name"
                        value={profileForm.name}
                        onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))}
                        disabled={profileSaving}
                        error={profileErrors.name}
                      />
                      <TextField
                        label="Email address"
                        type="email"
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((form) => ({ ...form, email: event.target.value }))}
                        disabled={profileSaving}
                        error={profileErrors.email}
                      />
                      <TextField
                        label="Phone number"
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((form) => ({ ...form, phone: event.target.value }))}
                        disabled={profileSaving}
                        error={profileErrors.phone}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </GlassPanel>

                  <GlassPanel className="overflow-hidden p-0">
                    <SettingsCardHeader eyebrow="Trading profile" title="Experience and preferences" icon={BriefcaseBusiness} />
                    <div className="grid gap-5 p-5 md:grid-cols-3">
                      <SelectField
                        label="Trading experience"
                        value={profileForm.tradingExperience}
                        onChange={(event) => setProfileForm((form) => ({ ...form, tradingExperience: event.target.value }))}
                        disabled={profileSaving}
                        options={tradingExperienceOptions}
                      />
                      <SelectField
                        label="Risk appetite"
                        value={profileForm.riskProfile}
                        onChange={(event) => setProfileForm((form) => ({ ...form, riskProfile: event.target.value }))}
                        disabled={profileSaving}
                        options={riskProfileOptions}
                      />
                      <SelectField
                        label="Preferred trading style"
                        value={profileForm.tradingStyle}
                        onChange={(event) => setProfileForm((form) => ({ ...form, tradingStyle: event.target.value }))}
                        disabled={profileSaving}
                        options={tradingStyleOptions}
                      />
                    </div>
                  </GlassPanel>
                </div>

                <aside className="flex min-w-0 flex-col gap-6 xl:col-span-4">
                  <GlassPanel className="overflow-hidden p-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Account readiness</p>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">{profileCompletion}% complete</h3>
                      </div>
                      <ShieldCheck className="mr-5 mt-5 h-6 w-6 shrink-0 text-cyan" aria-hidden="true" />
                    </div>
                    <div className="mx-5 h-2 overflow-hidden rounded-full bg-base">
                      <div className="h-full rounded-full bg-cyan transition-all duration-300" style={{ width: `${profileCompletion}%` }} />
                    </div>
                    <dl className="grid gap-3 p-5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-500">Primary email</dt>
                        <dd className="truncate text-right font-semibold text-white">{profileForm.email || "Not set"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-500">Risk appetite</dt>
                        <dd className="text-right font-semibold text-white">{profileForm.riskProfile || "Not selected"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-500">Mobile</dt>
                        <dd className="truncate text-right font-semibold text-white">{profileForm.phone || "Not set"}</dd>
                      </div>
                    </dl>
                  </GlassPanel>

                  <GlassPanel className="overflow-hidden p-0">
                    <div className="flex items-center gap-2 border-b border-borderGlow px-5 py-4">
                      <Bell className="h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Notification preferences</h3>
                    </div>
                    <div className="px-5">
                      <ToggleRow
                        label="Order updates"
                        description="Notify me when orders are executed, rejected, cancelled, or queued."
                        checked={profileForm.notificationPreferences.orderUpdates}
                        disabled={profileSaving}
                        onChange={(checked) => setProfileForm((form) => ({
                          ...form,
                          notificationPreferences: { ...form.notificationPreferences, orderUpdates: checked }
                        }))}
                      />
                      <ToggleRow
                        label="Price alerts"
                        description="Notify me when my saved stock-price alerts trigger."
                        checked={profileForm.notificationPreferences.priceAlerts}
                        disabled={profileSaving}
                        onChange={(checked) => setProfileForm((form) => ({
                          ...form,
                          notificationPreferences: { ...form.notificationPreferences, priceAlerts: checked }
                        }))}
                      />
                      <ToggleRow
                        label="Portfolio digest"
                        description="Show periodic summaries for portfolio value and P&L."
                        checked={profileForm.notificationPreferences.portfolioDigest}
                        disabled={profileSaving}
                        onChange={(checked) => setProfileForm((form) => ({
                          ...form,
                          notificationPreferences: { ...form.notificationPreferences, portfolioDigest: checked }
                        }))}
                      />
                      <ToggleRow
                        label="Product updates"
                        description="Receive notices about new simulator features and account tools."
                        checked={profileForm.notificationPreferences.productUpdates}
                        disabled={profileSaving}
                        onChange={(checked) => setProfileForm((form) => ({
                          ...form,
                          notificationPreferences: { ...form.notificationPreferences, productUpdates: checked }
                        }))}
                      />
                    </div>
                  </GlassPanel>

                  <GlassPanel className="space-y-4">
                    <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan">Beginner guidance</p>
                      <p className="mt-2 text-sm leading-5 text-slate-300">Replay the trading walkthrough anytime.</p>
                      <button
                        type="button"
                        onClick={replayTradingTour}
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20"
                      >
                        <PlayCircle className="h-4 w-4" aria-hidden="true" />
                        Replay Trading Tour
                      </button>
                    </div>
                    {profileErrors.form ? <p className="text-sm text-red-300">{profileErrors.form}</p> : null}
                    {profileStatus ? <p className="text-sm text-emerald-300">{profileStatus}</p> : null}
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {profileSaving ? "Saving..." : "Save Profile"}
                    </button>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Trading balance, transactions, and executed order records stay read-only from profile settings.
                    </p>
                  </GlassPanel>
                </aside>
              </form>
            </div>
          ) : null}

          {activeSection === "security" ? (
            <GlassPanel>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Security</p>
                <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <KeyRound className="h-5 w-5 text-cyan" aria-hidden="true" />
                  Change Password
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Changing your password ends the current session and sends you back to login.</p>
              </div>
              <form className="mt-5 flex max-w-2xl flex-col gap-4" onSubmit={submitPassword}>
                {[
                  ["currentPassword", "Current password"],
                  ["newPassword", "New password"],
                  ["confirmPassword", "Confirm new password"]
                ].map(([id, label]) => (
                  <PasswordInput
                    key={id}
                    id={id}
                    label={label}
                    value={passwordForm[id]}
                    visible={passwordVisibility[id]}
                    disabled={passwordSaving}
                    onChange={(field, value) => setPasswordForm((form) => ({ ...form, [field]: value }))}
                    onToggle={(field) => setPasswordVisibility((state) => ({ ...state, [field]: !state[field] }))}
                  />
                ))}
                {passwordError ? <p className="text-sm text-red-300">{passwordError}</p> : null}
                {passwordStatus ? <p className="text-sm text-emerald-300">{passwordStatus}</p> : null}
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-borderGlow bg-base px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan/40 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {passwordSaving ? "Changing..." : "Change Password"}
                </button>
              </form>
            </GlassPanel>
          ) : null}

          {activeSection === "appearance" ? (
            <GlassPanel>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Appearance</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Theme preference</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Choose how the website should look. System follows your browser or device preference.</p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = themePreference === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setThemePreference(option.id)}
                      className={`min-h-[132px] rounded-lg border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-cyan/20 ${
                        selected ? "border-cyan/50 bg-cyan/10" : "border-borderGlow bg-base hover:border-cyan/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-borderGlow bg-panel text-cyan">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        {selected ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan text-slate-950">
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 font-semibold text-white">{option.label}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-400">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 text-sm text-slate-400">Current resolved appearance: <span className="font-semibold capitalize text-white">{resolvedTheme}</span></p>
            </GlassPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Settings;

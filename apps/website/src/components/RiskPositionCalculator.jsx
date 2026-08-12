import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { calculatePositionSize } from "../utils/riskCalculator";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "Unavailable";

const RiskPositionCalculator = ({
  availableBalance = 0,
  entryPrice = "",
  compact = false,
  onUseQuantity
}) => {
  const [entry, setEntry] = useState(entryPrice || "");
  const [stop, setStop] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");

  const accountBalance = Number.isFinite(Number(availableBalance)) ? Number(availableBalance) : 0;

  useEffect(() => {
    if (Number.isFinite(Number(entryPrice)) && Number(entryPrice) > 0) {
      setEntry(String(entryPrice));
    }
  }, [entryPrice]);

  const result = useMemo(
    () =>
      calculatePositionSize({
        availableBalance: accountBalance,
        entryPrice: entry,
        stopLossPrice: stop,
        riskPercent
      }),
    [accountBalance, entry, stop, riskPercent]
  );

  const rows = result.valid
    ? [
        ["Risk Budget", formatCurrency(result.riskBudget)],
        ["Risk Per Share", formatCurrency(result.riskPerShare)],
        ["Suggested Quantity", result.suggestedQuantity.toLocaleString("en-IN")],
        ["Approx. Position Value", formatCurrency(result.approximatePositionValue)],
        ["Approx. Maximum Loss at Stop", formatCurrency(result.approximateMaximumLoss)]
      ]
    : [];

  return (
    <GlassPanel className={compact ? "space-y-4" : "space-y-5"}>
      <div className="flex items-start gap-3">
        <span className="rounded-lg border border-cyan/30 bg-cyan/10 p-2 text-cyan">
          <Calculator className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">Risk / Position Size Calculator</p>
          <h3 className="mt-1 text-base font-semibold text-white">Plan quantity before placing a virtual order</h3>
          <p className="mt-2 text-xs leading-5 text-[#A1A1B5]">
            This calculator is for virtual risk-management practice and does not provide investment advice.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          Available Virtual Balance
          <div className="rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-sm font-semibold text-white">
            {formatCurrency(accountBalance)}
          </div>
          <p className="normal-case leading-5 text-[#A1A1B5]">
            Balance is controlled by executed trades and admin adjustments only.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          Risk %
          <input
            type="number"
            min="0"
            step="0.1"
            value={riskPercent}
            onChange={(event) => setRiskPercent(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-sm text-white outline-none focus:border-cyan"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          Entry Price
          <input
            type="number"
            min="0"
            step="0.05"
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-sm text-white outline-none focus:border-cyan"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          Stop-Loss Price
          <input
            type="number"
            min="0"
            step="0.05"
            value={stop}
            onChange={(event) => setStop(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-sm text-white outline-none focus:border-cyan"
          />
        </label>
      </div>

      {result.valid ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-[#080910] p-3">
              <p className="text-[11px] uppercase text-[#A1A1B5]">{label}</p>
              <p className="mt-2 font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {result.reason}
        </div>
      )}

      {onUseQuantity && result.valid ? (
        <button
          type="button"
          onClick={() => onUseQuantity(result.suggestedQuantity)}
          disabled={result.suggestedQuantity <= 0}
          className="rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use Quantity
        </button>
      ) : null}
    </GlassPanel>
  );
};

export default RiskPositionCalculator;

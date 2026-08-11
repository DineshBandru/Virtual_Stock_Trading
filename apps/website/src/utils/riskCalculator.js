const finitePositive = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const calculatePositionSize = ({
  availableBalance,
  entryPrice,
  stopLossPrice,
  riskPercent
}) => {
  const balance = finitePositive(availableBalance);
  const entry = finitePositive(entryPrice);
  const stop = finitePositive(stopLossPrice);
  const risk = finitePositive(riskPercent);

  if (!balance || !entry || !stop || !risk) {
    return { valid: false, reason: "Enter positive balance, entry, stop-loss, and risk values." };
  }

  if (stop >= entry) {
    return { valid: false, reason: "For long-position practice, stop-loss price must be below entry price." };
  }

  const riskBudget = (balance * risk) / 100;
  const riskPerShare = entry - stop;
  const riskBasedQuantity = Math.floor(riskBudget / riskPerShare);
  const affordableQuantity = Math.floor(balance / entry);
  const suggestedQuantity = Math.max(0, Math.min(riskBasedQuantity, affordableQuantity));
  const approximatePositionValue = suggestedQuantity * entry;
  const approximateMaximumLoss = suggestedQuantity * riskPerShare;

  return {
    valid: true,
    riskBudget,
    riskPerShare,
    riskBasedQuantity,
    affordableQuantity,
    suggestedQuantity,
    approximatePositionValue,
    approximateMaximumLoss
  };
};

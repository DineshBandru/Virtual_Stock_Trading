const calcSma = (prices, window) => {
  const slice = prices.slice(-window);
  if (slice.length === 0) return 0;
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / slice.length;
};

const calcRsi = (prices, period = 14) => {
  if (prices.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i += 1) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
};

const getSignal = (prices) => {
  const sma7 = calcSma(prices, 7);
  const sma14 = calcSma(prices, 14);
  const rsi = calcRsi(prices, 14);

  let signal = "NEUTRAL";
  let confidence = 55;
  let explanation = "SMA and RSI are mixed.";

  if (sma7 > sma14 && rsi < 70) {
    signal = "BULLISH";
    confidence = 72;
    explanation = `SMA7 (${sma7.toFixed(2)}) is above SMA14 (${sma14.toFixed(
      2
    )}), RSI ${rsi.toFixed(1)} shows momentum without overbought pressure.`;
  } else if (sma7 < sma14 || rsi > 70) {
    signal = "BEARISH";
    confidence = 68;
    explanation = `SMA7 (${sma7.toFixed(2)}) is below SMA14 (${sma14.toFixed(
      2
    )}) or RSI ${rsi.toFixed(1)} is elevated.`;
  }

  return { signal, confidence, rsi, sma7, sma14, explanation };
};

module.exports = { getSignal };

const validPoint = (point) => Number.isFinite(Number(point?.close));

const toIndicatorPoint = (point, value) => ({
  time: point.time,
  value: value === null || value === undefined ? null : Number.isFinite(Number(value)) ? Number(value) : null
});

export const calculateSMA = (data = [], period = 20) => {
  if (!Number.isInteger(period) || period <= 0) return [];
  const closes = data.map((point) => (validPoint(point) ? Number(point.close) : null));
  return data.map((point, index) => {
    if (index + 1 < period) return toIndicatorPoint(point, null);
    const window = closes.slice(index + 1 - period, index + 1);
    if (window.some((value) => value === null)) return toIndicatorPoint(point, null);
    return toIndicatorPoint(point, window.reduce((sum, value) => sum + value, 0) / period);
  });
};

export const calculateEMA = (data = [], period = 20, valueKey = "close") => {
  if (!Number.isInteger(period) || period <= 0) return [];
  const multiplier = 2 / (period + 1);
  let ema = null;
  const seed = [];

  return data.map((point) => {
    const value = Number(point?.[valueKey]);
    if (!Number.isFinite(value)) return toIndicatorPoint(point, null);

    if (ema === null) {
      seed.push(value);
      if (seed.length < period) return toIndicatorPoint(point, null);
      ema = seed.reduce((sum, item) => sum + item, 0) / period;
      return toIndicatorPoint(point, ema);
    }

    ema = (value - ema) * multiplier + ema;
    return toIndicatorPoint(point, ema);
  });
};

export const calculateRSI = (data = [], period = 14) => {
  if (!Number.isInteger(period) || period <= 0) return [];
  const output = data.map((point) => toIndicatorPoint(point, null));
  if (data.length <= period) return output;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = Number(data[index]?.close) - Number(data[index - 1]?.close);
    if (!Number.isFinite(change)) return output;
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  const valueFromAverages = () => {
    if (averageLoss === 0) return 100;
    const rs = averageGain / averageLoss;
    return 100 - 100 / (1 + rs);
  };

  output[period] = toIndicatorPoint(data[period], valueFromAverages());

  for (let index = period + 1; index < data.length; index += 1) {
    const change = Number(data[index].close) - Number(data[index - 1].close);
    if (!Number.isFinite(change)) continue;
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    output[index] = toIndicatorPoint(data[index], valueFromAverages());
  }

  return output;
};

export const calculateMACD = (data = [], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fast = calculateEMA(data, fastPeriod);
  const slow = calculateEMA(data, slowPeriod);
  const macdLine = data.map((point, index) => {
    const fastValue = fast[index]?.value;
    const slowValue = slow[index]?.value;
    return toIndicatorPoint(
      point,
      Number.isFinite(fastValue) && Number.isFinite(slowValue) ? fastValue - slowValue : null
    );
  });
  const signalSource = macdLine.map((point) => ({ time: point.time, close: point.value }));
  const signalLine = calculateEMA(signalSource, signalPeriod);
  const histogram = macdLine.map((point, index) => {
    const signal = signalLine[index]?.value;
    return toIndicatorPoint(
      point,
      Number.isFinite(point.value) && Number.isFinite(signal) ? point.value - signal : null
    );
  });

  return { macdLine, signalLine, histogram };
};

export const stripNullValues = (series = []) =>
  series.filter((point) => Number.isFinite(Number(point.value)));

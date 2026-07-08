export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatCurrencyExact = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const formatTermYears = (termYears: number) => {
  const months = Math.round(termYears * 12);
  if (months % 12 === 0) return `${months / 12}-year`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y > 0 ? `${y} yr ${m} mo` : `${m} mo`;
};

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

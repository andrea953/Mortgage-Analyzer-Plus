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

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

export type PaymentFrequency =
  | "Annual"
  | "Semi-annual"
  | "Quarterly"
  | "Monthly"
  | "Semi-monthly"
  | "Bi-weekly"
  | "Weekly"
  | "Accelerated semi-monthly"
  | "Accelerated bi-weekly"
  | "Accelerated weekly";

export const frequencyPeriods: Record<PaymentFrequency, number> = {
  Annual: 1,
  "Semi-annual": 2,
  Quarterly: 4,
  Monthly: 12,
  "Semi-monthly": 24,
  "Bi-weekly": 26,
  Weekly: 52,
  "Accelerated semi-monthly": 24,
  "Accelerated bi-weekly": 26,
  "Accelerated weekly": 52,
};

export type Compounding = "semi-annual" | "monthly";

export function getPerPeriodRate(
  annualRatePct: number,
  frequency: PaymentFrequency,
  compounding: Compounding = "semi-annual",
): number {
  if (annualRatePct === 0) return 0;

  const nominalAnnual = annualRatePct / 100;
  // Canadian mortgage interest convention: fixed rates use semi-annual compounding (Interest Act).
  // Most Big-6 banks compound variable rates monthly; mono-line lenders (e.g. First National, MCAP)
  // typically use semi-annual — about a 0.04% effective-rate difference over a 5-year term.
  const compoundsPerYear = compounding === "monthly" ? 12 : 2;
  const effectiveAnnualRate = Math.pow(1 + nominalAnnual / compoundsPerYear, compoundsPerYear) - 1;

  const actualPeriodsPerYear = frequencyPeriods[frequency];
  return Math.pow(1 + effectiveAnnualRate, 1 / actualPeriodsPerYear) - 1;
}

export function computePayment({
  principal,
  annualRatePct,
  amortizationMonths,
  frequency,
  compounding = "semi-annual",
}: {
  principal: number;
  annualRatePct: number;
  amortizationMonths: number;
  frequency: PaymentFrequency;
  compounding?: Compounding;
}): number {
  if (principal <= 0) return 0;
  if (amortizationMonths <= 0) return 0;
  if (annualRatePct === 0) {
    const totalPeriods = (amortizationMonths / 12) * frequencyPeriods[frequency];
    return principal / totalPeriods;
  }

  // Calculate monthly payment first for standard or accelerated
  const monthlyRate = getPerPeriodRate(annualRatePct, "Monthly", compounding);
  const monthlyPayment =
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortizationMonths));

  if (frequency === "Monthly") return monthlyPayment;

  if (frequency === "Accelerated semi-monthly") return monthlyPayment / 2;
  if (frequency === "Accelerated bi-weekly") return monthlyPayment / 2;
  if (frequency === "Accelerated weekly") return monthlyPayment / 4;

  // Standard non-monthly calculations
  const rate = getPerPeriodRate(annualRatePct, frequency, compounding);
  const totalPeriods = (amortizationMonths / 12) * frequencyPeriods[frequency];
  return (principal * rate) / (1 - Math.pow(1 + rate, -totalPeriods));
}

export type LumpSumType = "amount" | "percent";

export type HousingCosts = {
  propertyTaxMonthly: number;
  condoFeesMonthly: number;
  maintenanceMonthly: number;
  utilitiesMonthly: number;
  insuranceMonthly: number;
  otherMonthly: number;
};

/** Recurring mortgage outflow expressed as a monthly figure (P&I plus recurring extra,
 *  annualized by payment frequency then divided by 12). Excludes one-off lump sums. */
export function recurringMonthlyMortgage({
  principal,
  annualRatePct,
  amortizationMonths,
  frequency,
  extraPerPeriod,
  compounding = "semi-annual",
}: {
  principal: number;
  annualRatePct: number;
  amortizationMonths: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
  compounding?: Compounding;
}): number {
  if (principal <= 0 || amortizationMonths <= 0) return 0;
  const pay = computePayment({ principal, annualRatePct, amortizationMonths, frequency, compounding });
  return ((pay + (extraPerPeriod || 0)) * frequencyPeriods[frequency]) / 12;
}

export function sumHousingCosts(h: HousingCosts): number {
  return (
    (h.propertyTaxMonthly || 0) +
    (h.condoFeesMonthly || 0) +
    (h.maintenanceMonthly || 0) +
    (h.utilitiesMonthly || 0) +
    (h.insuranceMonthly || 0) +
    (h.otherMonthly || 0)
  );
}

export type ScheduleRow = {
  n: number;
  date: Date;
  beginningBalance: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  lumpSum: number;
  endingBalance: number;
};

export function buildSchedule({
  principal,
  annualRatePct,
  amortizationMonths,
  frequency,
  extraPerPeriod,
  lumpSumValue = 0,
  lumpSumType = "amount",
  lumpSumStartYear = 1,
  lumpSumEndYear,
  startDate = new Date(),
  compounding = "semi-annual",
}: {
  principal: number;
  annualRatePct: number;
  amortizationMonths: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
  lumpSumValue?: number;
  lumpSumType?: LumpSumType;
  lumpSumStartYear?: number;
  lumpSumEndYear?: number;
  startDate?: Date;
  compounding?: Compounding;
}): ScheduleRow[] {
  const schedule: ScheduleRow[] = [];
  if (principal <= 0 || amortizationMonths <= 0) return schedule;
  const rate = getPerPeriodRate(annualRatePct, frequency, compounding);
  const regularPayment = computePayment({ principal, annualRatePct, amortizationMonths, frequency, compounding });

  const periodsPerYear = frequencyPeriods[frequency];
  const annualLumpAmount = !lumpSumValue || lumpSumValue <= 0
    ? 0
    : lumpSumType === "percent"
      ? principal * (lumpSumValue / 100)
      : lumpSumValue;

  let balance = principal;
  let n = 1;
  let currentDate = new Date(startDate);

  while (balance > 0.005 && n <= 10000) {
    if (frequency === "Annual") currentDate.setFullYear(currentDate.getFullYear() + 1);
    else if (frequency === "Semi-annual") currentDate.setMonth(currentDate.getMonth() + 6);
    else if (frequency === "Quarterly") currentDate.setMonth(currentDate.getMonth() + 3);
    else if (frequency === "Monthly") currentDate.setMonth(currentDate.getMonth() + 1);
    else if (frequency.includes("semi-monthly")) {
      if (currentDate.getDate() <= 15) currentDate.setDate(currentDate.getDate() + 15);
      else {
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(currentDate.getDate() - 15);
      }
    }
    else if (frequency.includes("bi-weekly")) currentDate.setDate(currentDate.getDate() + 14);
    else if (frequency.includes("weekly")) currentDate.setDate(currentDate.getDate() + 7);

    const interest = balance * rate;
    let payment = regularPayment;
    let extra = extraPerPeriod;

    // Cap payment if it would overpay
    if (balance + interest <= payment) {
      payment = balance + interest;
      extra = 0;
    }

    let principalFromPayment = payment - interest;
    let remainingAfterPayment = balance - principalFromPayment;

    // Cap recurring extra
    if (remainingAfterPayment <= extra) {
      extra = Math.max(0, remainingAfterPayment);
    }
    remainingAfterPayment -= extra;

    // Annual lump sum: applied on the last payment of each completed year, within the chosen year range
    let lumpSum = 0;
    const isAnniversary = annualLumpAmount > 0 && n % periodsPerYear === 0;
    if (isAnniversary && remainingAfterPayment > 0) {
      const completedYear = Math.round(n / periodsPerYear);
      const startY = Math.max(1, lumpSumStartYear || 1);
      const endY = lumpSumEndYear && lumpSumEndYear > 0 ? lumpSumEndYear : Infinity;
      if (completedYear >= startY && completedYear <= endY) {
        lumpSum = Math.min(annualLumpAmount, remainingAfterPayment);
      }
    }

    const totalPrincipalApplied = principalFromPayment + extra + lumpSum;
    const endingBalance = Math.max(0, balance - totalPrincipalApplied);

    schedule.push({
      n,
      date: new Date(currentDate),
      beginningBalance: balance,
      payment: payment + extra + lumpSum,
      interest,
      principal: principalFromPayment,
      extra,
      lumpSum,
      endingBalance,
    });

    balance = endingBalance;
    n++;
  }

  return schedule;
}

export function summarize(schedule: ScheduleRow[], termYears: number, termStartDate?: Date) {
  if (schedule.length === 0) {
    const fallback = termStartDate ? new Date(termStartDate) : new Date();
    fallback.setFullYear(fallback.getFullYear() + termYears);
    return {
      regularPayment: 0,
      totalPayment: 0,
      payoffMonths: 0,
      totalInterest: 0,
      termInterest: 0,
      termEndingBalance: 0,
      renewalDate: fallback,
    };
  }

  const regularPayment = schedule[0].payment - schedule[0].extra - schedule[0].lumpSum;
  const totalPayment = schedule[0].payment - schedule[0].lumpSum;
  const payoffMonths = Math.ceil(
    (schedule[schedule.length - 1].date.getTime() - schedule[0].date.getTime()) /
    (1000 * 60 * 60 * 24 * 30.44)
  );

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);

  // Renewal date = term start + term years. Prefer the provided termStartDate;
  // fall back to the first payment date when not provided.
  const baseStart = termStartDate ? new Date(termStartDate) : new Date(schedule[0].date);
  const renewalDate = new Date(baseStart);
  renewalDate.setFullYear(renewalDate.getFullYear() + termYears);

  const termRows = schedule.filter(row => row.date <= renewalDate);
  const termInterest = termRows.reduce((sum, row) => sum + row.interest, 0);
  const termEndingBalance = termRows.length > 0
    ? termRows[termRows.length - 1].endingBalance
    : schedule[0].beginningBalance;

  return {
    regularPayment,
    totalPayment,
    payoffMonths,
    totalInterest,
    termInterest,
    termEndingBalance,
    renewalDate,
  };
}
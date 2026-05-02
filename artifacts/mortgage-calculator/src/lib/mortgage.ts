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

export function getPerPeriodRate(annualRatePct: number, frequency: PaymentFrequency): number {
  if (annualRatePct === 0) return 0;
  
  const nominalAnnual = annualRatePct / 100;
  // Canadian mortgage interest convention: compounded semi-annually
  const effectiveAnnualRate = Math.pow(1 + nominalAnnual / 2, 2) - 1;
  
  // Base periods per year used for rate calculation
  let baseFrequency: PaymentFrequency = frequency;
  if (frequency === "Accelerated semi-monthly") baseFrequency = "Monthly";
  if (frequency === "Accelerated bi-weekly") baseFrequency = "Monthly";
  if (frequency === "Accelerated weekly") baseFrequency = "Monthly";
  
  const periodsPerYear = frequencyPeriods[baseFrequency];
  const perPeriodRate = Math.pow(1 + effectiveAnnualRate, 1 / periodsPerYear) - 1;
  
  const actualPeriodsPerYear = frequencyPeriods[frequency];
  return Math.pow(1 + effectiveAnnualRate, 1 / actualPeriodsPerYear) - 1;
}

export function computePayment({
  principal,
  annualRatePct,
  amortizationMonths,
  frequency,
}: {
  principal: number;
  annualRatePct: number;
  amortizationMonths: number;
  frequency: PaymentFrequency;
}): number {
  if (principal <= 0) return 0;
  if (annualRatePct === 0) {
    const totalPeriods = (amortizationMonths / 12) * frequencyPeriods[frequency];
    return principal / totalPeriods;
  }

  // Calculate monthly payment first for standard or accelerated
  const monthlyRate = getPerPeriodRate(annualRatePct, "Monthly");
  const monthlyPayment =
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortizationMonths));

  if (frequency === "Monthly") return monthlyPayment;

  if (frequency === "Accelerated semi-monthly") return monthlyPayment / 2;
  if (frequency === "Accelerated bi-weekly") return monthlyPayment / 2;
  if (frequency === "Accelerated weekly") return monthlyPayment / 4;

  // Standard non-monthly calculations
  const rate = getPerPeriodRate(annualRatePct, frequency);
  const totalPeriods = (amortizationMonths / 12) * frequencyPeriods[frequency];
  return (principal * rate) / (1 - Math.pow(1 + rate, -totalPeriods));
}

export type LumpSumType = "amount" | "percent";

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
  startDate = new Date(),
}: {
  principal: number;
  annualRatePct: number;
  amortizationMonths: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
  lumpSumValue?: number;
  lumpSumType?: LumpSumType;
  startDate?: Date;
}): ScheduleRow[] {
  const schedule: ScheduleRow[] = [];
  const rate = getPerPeriodRate(annualRatePct, frequency);
  const regularPayment = computePayment({ principal, annualRatePct, amortizationMonths, frequency });

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

    // Annual lump sum: applied on the last payment of each completed year
    let lumpSum = 0;
    const isAnniversary = annualLumpAmount > 0 && n % periodsPerYear === 0;
    if (isAnniversary && remainingAfterPayment > 0) {
      lumpSum = Math.min(annualLumpAmount, remainingAfterPayment);
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

export function summarize(schedule: ScheduleRow[], termYears: number) {
  if (schedule.length === 0) {
    return {
      regularPayment: 0,
      totalPayment: 0,
      payoffMonths: 0,
      totalInterest: 0,
      termInterest: 0,
      termEndingBalance: 0,
      renewalDate: new Date(),
    };
  }

  const regularPayment = schedule[0].payment - schedule[0].extra - schedule[0].lumpSum;
  const totalPayment = schedule[0].payment - schedule[0].lumpSum;
  const payoffMonths = Math.ceil(
    (schedule[schedule.length - 1].date.getTime() - schedule[0].date.getTime()) / 
    (1000 * 60 * 60 * 24 * 30.44)
  );
  
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);

  // Renewal date = start of loan + term years. We use the date BEFORE the first
  // payment as the loan start (the schedule advances the date before recording).
  const loanStart = new Date(schedule[0].date);
  // Roll back one period to estimate the loan start date
  // (schedule[0].date is the date of the first payment)
  const renewalDate = new Date(loanStart);
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
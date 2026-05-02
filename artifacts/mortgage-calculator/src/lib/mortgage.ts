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

export type ScheduleRow = {
  n: number;
  date: Date;
  beginningBalance: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  endingBalance: number;
};

export function buildSchedule({
  principal,
  annualRatePct,
  amortizationMonths,
  frequency,
  extraPerPeriod,
  startDate = new Date(),
}: {
  principal: number;
  annualRatePct: number;
  amortizationMonths: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
  startDate?: Date;
}): ScheduleRow[] {
  const schedule: ScheduleRow[] = [];
  const rate = getPerPeriodRate(annualRatePct, frequency);
  const regularPayment = computePayment({ principal, annualRatePct, amortizationMonths, frequency });
  
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

    if (balance + interest <= payment + extra) {
      payment = balance + interest;
      extra = 0;
    }

    let principalPaid = payment - interest;
    
    if (balance - principalPaid <= extra) {
      extra = balance - principalPaid;
    }
    
    principalPaid += extra;
    
    const endingBalance = Math.max(0, balance - principalPaid);

    schedule.push({
      n,
      date: new Date(currentDate),
      beginningBalance: balance,
      payment: payment + extra,
      interest,
      principal: principalPaid - extra,
      extra,
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
    };
  }

  const regularPayment = schedule[0].payment - schedule[0].extra;
  const totalPayment = schedule[0].payment;
  const payoffMonths = Math.ceil(
    (schedule[schedule.length - 1].date.getTime() - schedule[0].date.getTime()) / 
    (1000 * 60 * 60 * 24 * 30.44)
  );
  
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  
  const termDate = new Date(schedule[0].date);
  termDate.setFullYear(termDate.getFullYear() + termYears);
  
  const termRows = schedule.filter(row => row.date <= termDate);
  const termInterest = termRows.reduce((sum, row) => sum + row.interest, 0);
  const termEndingBalance = termRows.length > 0 ? termRows[termRows.length - 1].endingBalance : schedule[0].beginningBalance;

  return {
    regularPayment,
    totalPayment,
    payoffMonths,
    totalInterest,
    termInterest,
    termEndingBalance,
  };
}
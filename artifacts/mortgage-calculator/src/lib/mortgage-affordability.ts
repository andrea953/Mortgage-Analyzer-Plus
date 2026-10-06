import { computePayment, getPerPeriodRate } from "@/lib/mortgage";

export type MortgageAffordabilityInputs = {
  annualGrossIncome: number;
  monthlyDebts: number;
  downPayment: number;
  annualInterestRatePct: number;
  amortizationYears: number;
  propertyTaxMonthly: number;
  heatingMonthly: number;
  condoFeesMonthly: number;
  gdsLimitPct: number;
  tdsLimitPct: number;
};

export type MortgageAffordabilityResult = {
  amortizationYearsApplied: number;
  grossMonthlyIncome: number;
  gdsHousingLimit: number;
  tdsHousingLimit: number;
  monthlyHousingCostsBeforeMortgage: number;
  maxMonthlyMortgagePayment: number;
  qualifyingRatePct: number;
  maxMortgageWithInsurance: number;
  maxPurchasePrice: number;
  downPaymentAtMax: number;
  baseMortgageAtMax: number;
  insurancePremiumAtMax: number;
  insurancePremiumRatePct: number;
  insuredMortgageAtMax: number;
  contractPaymentAtMax: number;
  qualifyingPaymentAtMax: number;
  qualifyingGdsPct: number;
  qualifyingTdsPct: number;
  bindingRatio: "GDS" | "TDS";
  eligiblePurchaseFound: boolean;
};

export function minimumDownPayment(purchasePrice: number): number {
  if (purchasePrice <= 0) return 0;
  if (purchasePrice < 500_000) return purchasePrice * 0.05;
  if (purchasePrice < 1_500_000) return 25_000 + (purchasePrice - 500_000) * 0.1;
  return purchasePrice * 0.2;
}

export function mortgageInsurancePremiumRatePct(
  purchasePrice: number,
  downPayment: number,
  amortizationYears = 25,
): number {
  if (purchasePrice <= 0 || purchasePrice >= 1_500_000) return 0;
  const loanToValue = (purchasePrice - Math.min(downPayment, purchasePrice)) / purchasePrice;
  if (loanToValue <= 0.8) return 0;
  const basePremium = loanToValue > 0.9 ? 4 : loanToValue > 0.85 ? 3.1 : 2.8;
  return basePremium + (amortizationYears > 25 ? 0.2 : 0);
}

function mortgagePrincipalForMonthlyPayment(
  payment: number,
  annualRatePct: number,
  amortizationMonths: number,
): number {
  if (payment <= 0 || amortizationMonths <= 0) return 0;
  const periods = amortizationMonths;
  const periodicRate = getPerPeriodRate(annualRatePct, "Monthly", "semi-annual");
  if (periodicRate === 0) return payment * periods;
  return payment * (1 - Math.pow(1 + periodicRate, -periods)) / periodicRate;
}

function financingAtPrice(purchasePrice: number, downPayment: number, amortizationYears: number) {
  const downPaymentUsed = Math.min(downPayment, purchasePrice);
  const baseMortgage = Math.max(0, purchasePrice - downPaymentUsed);
  const insurancePremiumRatePct = mortgageInsurancePremiumRatePct(
    purchasePrice, downPaymentUsed, amortizationYears,
  );
  const insurancePremium = baseMortgage * insurancePremiumRatePct / 100;
  return {
    downPaymentUsed,
    baseMortgage,
    insurancePremiumRatePct,
    insurancePremium,
    insuredMortgage: baseMortgage + insurancePremium,
  };
}

export function computeMortgageAffordability(
  inputs: MortgageAffordabilityInputs,
): MortgageAffordabilityResult {
  const annualGrossIncome = Math.max(0, inputs.annualGrossIncome || 0);
  const monthlyDebts = Math.max(0, inputs.monthlyDebts || 0);
  const downPayment = Math.max(0, inputs.downPayment || 0);
  const annualInterestRatePct = Math.min(25, Math.max(0, inputs.annualInterestRatePct || 0));
  const amortizationMonths = Math.round(
    Math.min(30, Math.max(0, inputs.amortizationYears || 0)) * 12,
  );
  const propertyTaxMonthly = Math.max(0, inputs.propertyTaxMonthly || 0);
  const heatingMonthly = Math.max(0, inputs.heatingMonthly || 0);
  const condoFeesMonthly = Math.max(0, inputs.condoFeesMonthly || 0);
  const gdsLimitPct = Math.min(100, Math.max(0, inputs.gdsLimitPct || 0));
  const tdsLimitPct = Math.min(100, Math.max(0, inputs.tdsLimitPct || 0));

  const grossMonthlyIncome = annualGrossIncome / 12;
  const gdsHousingLimit = grossMonthlyIncome * gdsLimitPct / 100;
  const tdsHousingLimit = Math.max(0, grossMonthlyIncome * tdsLimitPct / 100 - monthlyDebts);
  const monthlyHousingCostsBeforeMortgage =
    propertyTaxMonthly + heatingMonthly + condoFeesMonthly * 0.5;
  const availableHousingBudget = Math.max(0, Math.min(gdsHousingLimit, tdsHousingLimit));
  const maxMonthlyMortgagePayment = Math.max(
    0,
    availableHousingBudget - monthlyHousingCostsBeforeMortgage,
  );
  const qualifyingRatePct = Math.max(5.25, annualInterestRatePct + 2);
  const maxMortgageWithInsurance = mortgagePrincipalForMonthlyPayment(
    maxMonthlyMortgagePayment,
    qualifyingRatePct,
    amortizationMonths,
  );

  const inputAllowsMortgage = grossMonthlyIncome > 0 && amortizationMonths > 0 &&
    availableHousingBudget >= monthlyHousingCostsBeforeMortgage;
  const canFinancePrice = (purchasePrice: number) => {
    if (!inputAllowsMortgage || purchasePrice <= 0) return false;
    const downPaymentUsed = Math.min(downPayment, purchasePrice);
    if (downPaymentUsed + 0.005 < minimumDownPayment(purchasePrice)) return false;
    const financing = financingAtPrice(purchasePrice, downPaymentUsed, amortizationMonths / 12);
    return financing.insuredMortgage <= maxMortgageWithInsurance + 0.005;
  };

  let low = 0;
  let high = downPayment + maxMortgageWithInsurance + 1;
  for (let i = 0; i < 80; i += 1) {
    const middle = (low + high) / 2;
    if (canFinancePrice(middle)) low = middle;
    else high = middle;
  }

  const maxPurchasePrice = Math.floor(low);
  const finalFinancing = financingAtPrice(maxPurchasePrice, downPayment, amortizationMonths / 12);
  const insuredMortgageAtMax = finalFinancing.insuredMortgage;
  const qualifyingPaymentAtMax = computePayment({
    principal: insuredMortgageAtMax,
    annualRatePct: qualifyingRatePct,
    amortizationMonths,
    frequency: "Monthly",
    compounding: "semi-annual",
  });
  const contractPaymentAtMax = computePayment({
    principal: insuredMortgageAtMax,
    annualRatePct: annualInterestRatePct,
    amortizationMonths,
    frequency: "Monthly",
    compounding: "semi-annual",
  });
  const qualifyingHousingCost =
    qualifyingPaymentAtMax + monthlyHousingCostsBeforeMortgage;
  const qualifyingGdsPct = grossMonthlyIncome > 0
    ? qualifyingHousingCost / grossMonthlyIncome * 100
    : 0;
  const qualifyingTdsPct = grossMonthlyIncome > 0
    ? (qualifyingHousingCost + monthlyDebts) / grossMonthlyIncome * 100
    : 0;

  return {
    amortizationYearsApplied: amortizationMonths / 12,
    grossMonthlyIncome,
    gdsHousingLimit,
    tdsHousingLimit,
    monthlyHousingCostsBeforeMortgage,
    maxMonthlyMortgagePayment,
    qualifyingRatePct,
    maxMortgageWithInsurance,
    maxPurchasePrice,
    downPaymentAtMax: finalFinancing.downPaymentUsed,
    baseMortgageAtMax: finalFinancing.baseMortgage,
    insurancePremiumAtMax: finalFinancing.insurancePremium,
    insurancePremiumRatePct: finalFinancing.insurancePremiumRatePct,
    insuredMortgageAtMax,
    contractPaymentAtMax,
    qualifyingPaymentAtMax,
    qualifyingGdsPct,
    qualifyingTdsPct,
    bindingRatio: gdsHousingLimit <= tdsHousingLimit ? "GDS" : "TDS",
    eligiblePurchaseFound: maxPurchasePrice > 0 && canFinancePrice(maxPurchasePrice),
  };
}

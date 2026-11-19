import { createPortal } from "react-dom";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  MortgageAffordabilityInputs,
  MortgageAffordabilityResult,
} from "@/lib/mortgage-affordability";
import modernCentsLogo from "@assets/Big_logo_1777908930945.png";

type Props = {
  clientName: string;
  inputs: MortgageAffordabilityInputs;
  result: MortgageAffordabilityResult;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });

function ReportCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ps-cell">
      <div className="ps-cell-label">{label}</div>
      <div className="ps-cell-value">{value}</div>
      {sub && <div className="ps-cell-sub">{sub}</div>}
    </div>
  );
}

export function AffordabilityPrintSummary({ clientName, inputs, result }: Props) {
  const generated = new Date();
  return createPortal(
    <div
      className="hidden print:block print-summary affordability-print-summary"
      data-no-renewal="true"
      data-testid="affordability-print-summary"
    >
      <div className="ps-fit">
        <div className="ps-header">
          <div className="ps-header-left">
            <img src={modernCentsLogo} alt="Modern Cents" className="ps-logo-img" />
            <div>
              <div className="ps-brand">
                <span className="ps-brand-grad">Modern Cents</span>
                <span className="ps-brand-sep">|</span>
                <span className="ps-brand-sub">Mortgage Affordability Report</span>
              </div>
              <div className="ps-brand-tag">Canadian mortgage affordability estimate</div>
            </div>
          </div>
          <div className="ps-header-right">
            {clientName.trim() && (
              <>
                <div className="ps-meta-label">Prepared for</div>
                <div className="ps-meta-value">{clientName.trim()}</div>
              </>
            )}
            <div className="ps-meta-label">Prepared</div>
            <div className="ps-meta-value">{formatDate(generated)}</div>
          </div>
        </div>

        <section className="affordability-print-section">
          <h2 className="ps-section-title">Estimated purchase budget</h2>
          <div className="ps-grid affordability-print-grid">
            <ReportCell
              label="Maximum purchase price"
              value={result.eligiblePurchaseFound
                ? formatCurrency(result.maxPurchasePrice)
                : "No qualifying estimate"}
              sub={result.eligiblePurchaseFound ? `Limited by ${result.bindingRatio}` : undefined}
            />
            <ReportCell
              label="Mortgage including insurance"
              value={formatCurrency(result.insuredMortgageAtMax)}
            />
            <ReportCell
              label="Down payment applied"
              value={formatCurrency(result.downPaymentAtMax)}
            />
          </div>
        </section>

        <section className="affordability-print-section">
          <h2 className="ps-section-title">Client inputs</h2>
          <div className="ps-grid affordability-print-grid">
            <ReportCell label="Annual gross household income" value={formatCurrency(inputs.annualGrossIncome)} />
            <ReportCell label="Monthly debt payments" value={formatCurrency(inputs.monthlyDebts)} />
            <ReportCell label="Available down payment" value={formatCurrency(inputs.downPayment)} />
            <ReportCell label="Contract interest rate" value={formatPercent(inputs.annualInterestRatePct)} />
            <ReportCell label="Amortization" value={`${result.amortizationYearsApplied} years`} />
          </div>
        </section>

        <section className="affordability-print-section">
          <h2 className="ps-section-title">Monthly housing costs</h2>
          <div className="ps-grid affordability-print-grid">
            <ReportCell label="Property taxes" value={`${formatCurrency(inputs.propertyTaxMonthly)} / mo`} />
            <ReportCell label="Heating" value={`${formatCurrency(inputs.heatingMonthly)} / mo`} />
            <ReportCell
              label="Condo fees"
              value={`${formatCurrency(inputs.condoFeesMonthly)} / mo`}
              sub={`${formatCurrency(inputs.condoFeesMonthly * 0.5)} / mo counted for qualification`}
            />
            <ReportCell
              label="Housing costs before mortgage"
              value={`${formatCurrency(result.monthlyHousingCostsBeforeMortgage)} / mo`}
            />
          </div>
        </section>

        <section className="affordability-print-section">
          <h2 className="ps-section-title">Mortgage payments and qualification</h2>
          <div className="ps-grid affordability-print-grid">
            <ReportCell
              label="Payment at contract rate"
              value={`${formatCurrency(result.contractPaymentAtMax)} / mo`}
              sub={`At ${formatPercent(inputs.annualInterestRatePct)}`}
            />
            <ReportCell
              label="Payment used to qualify"
              value={`${formatCurrency(result.qualifyingPaymentAtMax)} / mo`}
              sub={`At ${formatPercent(result.qualifyingRatePct)}`}
            />
            <ReportCell
              label="GDS at qualifying rate"
              value={`${formatPercent(result.qualifyingGdsPct)} / ${formatPercent(inputs.gdsLimitPct)}`}
              sub="Housing costs ÷ gross monthly income"
            />
            <ReportCell
              label="TDS at qualifying rate"
              value={`${formatPercent(result.qualifyingTdsPct)} / ${formatPercent(inputs.tdsLimitPct)}`}
              sub="Housing costs and debts ÷ gross monthly income"
            />
            <ReportCell
              label="Maximum qualifying mortgage payment"
              value={`${formatCurrency(result.maxMonthlyMortgagePayment)} / mo`}
            />
            <ReportCell
              label="Estimated default-insurance premium"
              value={formatCurrency(result.insurancePremiumAtMax)}
              sub={result.insurancePremiumRatePct > 0
                ? `${formatPercent(result.insurancePremiumRatePct)} of base mortgage`
                : "No premium estimated"}
            />
          </div>
        </section>

        <section className="affordability-print-section affordability-print-assumptions">
          <h2 className="ps-section-title">Qualifying assumptions</h2>
          <ul>
            <li>
              Qualifying rate is the greater of the contract rate plus 2 percentage points or 5.25%.
              GDS limit: {formatPercent(inputs.gdsLimitPct)}; TDS limit: {formatPercent(inputs.tdsLimitPct)}.
            </li>
            <li>
              Qualification counts property taxes, heating, and 50% of monthly condo fees; monthly
              debt payments are included in TDS.
            </li>
            <li>
              Minimum down-payment rules and an estimated mortgage default-insurance premium are
              applied where required. Insured amortizations over 25 years assume eligibility as a
              first-time buyer or purchaser of a new build and include a 0.20% premium surcharge.
            </li>
            <li>
              Provincial sales tax on the insurance premium, where applicable, and closing costs are
              excluded. Lenders may use different rules; this estimate is not a pre-approval.
            </li>
          </ul>
        </section>

        <div className="ps-disclaimer">
          For illustration only. Confirm the figures, eligibility, and lender requirements with a
          mortgage professional.
        </div>
      </div>
    </div>
    ,
    document.body,
  );
}

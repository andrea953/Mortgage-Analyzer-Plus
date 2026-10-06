import React from "react";
import { ScenarioState } from "@/pages/Calculator";
import { ScheduleRow, PaymentFrequency, recurringMonthlyMortgage, sumHousingCosts } from "@/lib/mortgage";
import { formatCurrency, formatTermYears } from "@/lib/format";
import modernCentsLogo from "@assets/Big_logo_1777908930945.png";

type Summary = {
  regularPayment: number;
  totalPayment: number;
  payoffMonths: number;
  totalInterest: number;
  termInterest: number;
  termEndingBalance: number;
  renewalDate: Date;
};

export type PrintRenewalOption = {
  label: string;
  rateType: "fixed" | "variable";
  rate: number;
  termYears: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
  payment: number;
  termInterest: number;
  totalCostInTerm: number;
  termEndingBalance: number;
  termEndDate: Date;
  /** Amortization used for this option (months); flagged when re-amortized vs carried-over */
  amortizationMonths: number;
  isReAmortized: boolean;
};

type Props = {
  clientName?: string;
  scenarioA: ScenarioState;
  summaryA: Summary;
  scheduleA: ScheduleRow[];
  scenarioB?: ScenarioState;
  summaryB?: Summary;
  scheduleB?: ScheduleRow[];
  isCompare: boolean;
  hideOnPrint?: boolean;
  showRenewal?: boolean;
  renewalBalance?: number;
  renewalDate?: Date;
  remainingAmortMonths?: number;
  renewalOptions?: PrintRenewalOption[];
};

const fmtDateLong = (d: Date) =>
  d.toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });

const fmtMonthYear = (d: Date) =>
  d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });

const parseStartLocal = (iso: string) => {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function yearEndRows(schedule: ScheduleRow[], maxYears = 8): ScheduleRow[] {
  if (schedule.length === 0) return [];
  const byYear = new Map<number, ScheduleRow>();
  for (const row of schedule) {
    const y = row.date.getFullYear();
    byYear.set(y, row);
  }
  return Array.from(byYear.values()).slice(0, maxYears);
}

function ScenarioBlock({
  label,
  scenario,
  summary,
  schedule,
}: {
  label?: string;
  scenario: ScenarioState;
  summary: Summary;
  schedule: ScheduleRow[];
}) {
  const startDate = parseStartLocal(scenario.termStartDate);
  const totalAmortMonths = scenario.amortizationYears * 12 + scenario.amortizationMonths;
  const interestSavedVsBaseline = (() => {
    const hasExtra = scenario.extraPerPeriod > 0 || scenario.lumpSumValue > 0;
    if (!hasExtra) return null;
    return null; // not computed here to keep things simple/honest
  })();

  const yearRows = yearEndRows(schedule, 10);
  const yearsToPayoff = Math.floor(summary.payoffMonths / 12);
  const monthsToPayoff = summary.payoffMonths % 12;

  const principalPaidAtRenewal = scenario.principal - summary.termEndingBalance;
  const equityPctAtRenewal = scenario.principal > 0
    ? Math.round((principalPaidAtRenewal / scenario.principal) * 100)
    : 0;

  const lumpSumYearRange = scenario.lumpSumValue > 0
    ? ` (years ${scenario.lumpSumStartYear ?? 1}–${scenario.lumpSumEndYear ?? scenario.amortizationYears})`
    : "";
  const lumpSumLabel = scenario.lumpSumValue > 0
    ? scenario.lumpSumType === "percent"
      ? `${scenario.lumpSumValue}% of original (${formatCurrency((scenario.lumpSumValue / 100) * scenario.principal)}) per anniversary${lumpSumYearRange}`
      : `${formatCurrency(scenario.lumpSumValue)} per anniversary${lumpSumYearRange}`
    : "None";

  const monthlyMortgageEquiv = recurringMonthlyMortgage({
    principal: scenario.principal,
    annualRatePct: scenario.annualRatePct,
    amortizationMonths: totalAmortMonths,
    frequency: scenario.frequency,
    extraPerPeriod: scenario.extraPerPeriod,
    compounding: scenario.compounding,
  });
  const otherHousingMonthly = sumHousingCosts(scenario);
  const totalMonthlyHousing = monthlyMortgageEquiv + otherHousingMonthly;

  return (
    <div className="ps-scenario">
      {label && <div className="ps-scenario-label">{label}</div>}

      {/* Loan inputs */}
      <h3 className="ps-h3">Loan Details</h3>
      <table className="ps-table">
        <tbody>
          <tr>
            <th>Mode</th>
            <td>{scenario.mode === "current" ? "Current balance (existing mortgage)" : "New term"}</td>
          </tr>
          <tr>
            <th>{scenario.mode === "current" ? "Balance as of Date" : "Loan Start Date"}</th>
            <td>{fmtDateLong(startDate)}</td>
          </tr>
          <tr>
            <th>{scenario.mode === "current" ? "Current Balance" : "Loan Amount"}</th>
            <td>{formatCurrency(scenario.principal)}</td>
          </tr>
          <tr>
            <th>Interest Rate</th>
            <td>
              {scenario.annualRatePct.toFixed(2)}%
              {scenario.rateType === "variable" && (
                <>
                  {" "}— Variable: Prime {scenario.primeRatePct.toFixed(2)}%
                  {" "}{scenario.spreadPct >= 0 ? "+" : "−"}{" "}
                  {Math.abs(scenario.spreadPct).toFixed(2)}%
                </>
              )}
              {scenario.rateType === "fixed" && " (fixed)"}
              {" "}· {scenario.compounding === "monthly" ? "Monthly" : "Semi-annual"} compounding
            </td>
          </tr>
          <tr>
            <th>{scenario.mode === "current" ? "Remaining Amortization" : "Amortization"}</th>
            <td>
              {scenario.amortizationYears} yrs
              {scenario.amortizationMonths > 0 && ` ${scenario.amortizationMonths} mos`}
              {" "}({totalAmortMonths} months)
            </td>
          </tr>
          <tr>
            <th>Term</th>
            <td>{formatTermYears(scenario.termYears)}</td>
          </tr>
          <tr>
            <th>Payment Frequency</th>
            <td>{scenario.frequency}</td>
          </tr>
          <tr>
            <th>Extra Payment (per period)</th>
            <td>{scenario.extraPerPeriod > 0 ? formatCurrency(scenario.extraPerPeriod) : "None"}</td>
          </tr>
          <tr>
            <th>Annual Lump Sum</th>
            <td>{lumpSumLabel}</td>
          </tr>
          {otherHousingMonthly > 0 && (
            <tr>
              <th>Other Housing Costs</th>
              <td>{formatCurrency(otherHousingMonthly)}/mo ({formatCurrency(otherHousingMonthly * 12)}/yr)</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Key decision points */}
      <h3 className="ps-h3">Key Decision Points</h3>
      <div className="ps-grid">
        <div className="ps-cell ps-cell-hero">
          <div className="ps-cell-label">{scenario.frequency} Payment</div>
          <div className="ps-cell-value">{formatCurrency(summary.totalPayment)}</div>
          {scenario.extraPerPeriod > 0 && (
            <div className="ps-cell-sub">Includes {formatCurrency(scenario.extraPerPeriod)} extra</div>
          )}
        </div>
        <div className="ps-cell">
          <div className="ps-cell-label">Time to Payoff</div>
          <div className="ps-cell-value">
            {yearsToPayoff > 0 && `${yearsToPayoff} yrs `}{monthsToPayoff} mos
          </div>
          <div className="ps-cell-sub">
            From {fmtMonthYear(startDate)}
          </div>
        </div>
        <div className="ps-cell">
          <div className="ps-cell-label">Total Interest (life of loan)</div>
          <div className="ps-cell-value">{formatCurrency(summary.totalInterest)}</div>
        </div>
        <div className="ps-cell">
          <div className="ps-cell-label">Term Interest ({formatTermYears(scenario.termYears)})</div>
          <div className="ps-cell-value">{formatCurrency(summary.termInterest)}</div>
        </div>
        <div className="ps-cell ps-cell-accent">
          <div className="ps-cell-label">Renewal Date</div>
          <div className="ps-cell-value">{fmtMonthYear(summary.renewalDate)}</div>
          <div className="ps-cell-sub">End of {formatTermYears(scenario.termYears)} term</div>
        </div>
        <div className="ps-cell ps-cell-accent">
          <div className="ps-cell-label">Projected Principal at Renewal</div>
          <div className="ps-cell-value">{formatCurrency(summary.termEndingBalance)}</div>
          <div className="ps-cell-sub">
            {Math.round((summary.termEndingBalance / scenario.principal) * 100)}% of original
            {" · "}
            {equityPctAtRenewal}% paid down
          </div>
        </div>
        {otherHousingMonthly > 0 && (
          <div className="ps-cell ps-cell-hero">
            <div className="ps-cell-label">Total Monthly Housing Cost</div>
            <div className="ps-cell-value">{formatCurrency(totalMonthlyHousing)}</div>
            <div className="ps-cell-sub">
              Mortgage {formatCurrency(monthlyMortgageEquiv)} + other {formatCurrency(otherHousingMonthly)} · ≈ {formatCurrency(totalMonthlyHousing * 12)}/yr
            </div>
          </div>
        )}
      </div>

      {/* Year-end snapshot */}
      {yearRows.length > 0 && (
        <>
          <h3 className="ps-h3">Year-End Balance Snapshot</h3>
          <table className="ps-table ps-table-compact">
            <thead>
              <tr>
                <th>Year</th>
                <th className="ps-num">Ending Balance</th>
                <th className="ps-num">Principal (yr)</th>
                <th className="ps-num">Interest (yr)</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((row) => {
                const year = row.date.getFullYear();
                const yearRowsForY = schedule.filter((r) => r.date.getFullYear() === year);
                const principalY = yearRowsForY.reduce((s, r) => s + r.principal + r.extra + r.lumpSum, 0);
                const interestY = yearRowsForY.reduce((s, r) => s + r.interest, 0);
                const renewalYear = summary.renewalDate.getFullYear();
                const isRenewalYear = year === renewalYear;
                return (
                  <tr key={year} className={isRenewalYear ? "ps-row-highlight" : ""}>
                    <td>{year}{isRenewalYear ? " (renewal)" : ""}</td>
                    <td className="ps-num">{formatCurrency(row.endingBalance)}</td>
                    <td className="ps-num">{formatCurrency(principalY)}</td>
                    <td className="ps-num">{formatCurrency(interestY)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function PrintSummary({
  clientName,
  scenarioA,
  summaryA,
  scheduleA,
  scenarioB,
  summaryB,
  scheduleB,
  isCompare,
  hideOnPrint,
  showRenewal,
  renewalBalance,
  renewalDate,
  remainingAmortMonths,
  renewalOptions,
}: Props) {
  const generated = new Date();
  const renewalSection =
    showRenewal &&
    renewalOptions &&
    renewalOptions.length > 0 &&
    renewalBalance !== undefined &&
    renewalDate !== undefined &&
    remainingAmortMonths !== undefined &&
    renewalBalance > 0.01 &&
    remainingAmortMonths > 0;

  const lowestPayment = renewalSection
    ? renewalOptions!.reduce((m, o) => (o.payment < m.payment ? o : m), renewalOptions![0])
    : undefined;
  const lowestInterest = renewalSection
    ? renewalOptions!.reduce((m, o) => (o.termInterest < m.termInterest ? o : m), renewalOptions![0])
    : undefined;
  const mostPaidDown = renewalSection
    ? renewalOptions!.reduce((m, o) => (o.termEndingBalance < m.termEndingBalance ? o : m), renewalOptions![0])
    : undefined;
  return (
    <div
      className={`hidden ${hideOnPrint ? "print:hidden" : "print:block"} print-summary`}
      data-no-renewal={renewalSection ? undefined : "true"}
    >
      <div className="ps-fit">
      {/* Header */}
      <div className="ps-header">
        <div className="ps-header-left">
          <img src={modernCentsLogo} alt="Modern Cents" className="ps-logo-img" />
          <div>
            <div className="ps-brand">
              <span className="ps-brand-grad">Modern Cents</span>
              <span className="ps-brand-sep">|</span>
              <span className="ps-brand-sub">Mortgage Decision Summary</span>
            </div>
            <div className="ps-brand-tag">
              Canadian semi-annual interest convention
            </div>
          </div>
        </div>
        <div className="ps-header-right">
          {clientName?.trim() && (
            <>
              <div className="ps-meta-label">Prepared for</div>
              <div className="ps-meta-value">{clientName.trim()}</div>
            </>
          )}
          <div className="ps-meta-label">Prepared</div>
          <div className="ps-meta-value">{fmtDateLong(generated)}</div>
        </div>
      </div>

      {isCompare && scenarioB && summaryB && scheduleB ? (
        <div className="ps-compare">
          <ScenarioBlock
            label={scenarioA.title?.trim() || "Scenario A"}
            scenario={scenarioA}
            summary={summaryA}
            schedule={scheduleA}
          />
          <ScenarioBlock
            label={scenarioB.title?.trim() || "Scenario B"}
            scenario={scenarioB}
            summary={summaryB}
            schedule={scheduleB}
          />
          <div className="ps-diff">
            <h3 className="ps-h3">
              At a Glance · Difference ({(scenarioB.title?.trim() || "Scenario B")} − {(scenarioA.title?.trim() || "Scenario A")})
            </h3>
            <table className="ps-table">
              <tbody>
                <tr>
                  <th>{scenarioA.frequency} Payment</th>
                  <td>{formatCurrency(summaryB.totalPayment - summaryA.totalPayment)}</td>
                </tr>
                <tr>
                  <th>Total Interest</th>
                  <td>{formatCurrency(summaryB.totalInterest - summaryA.totalInterest)}</td>
                </tr>
                <tr>
                  <th>Term Interest</th>
                  <td>{formatCurrency(summaryB.termInterest - summaryA.termInterest)}</td>
                </tr>
                <tr>
                  <th>Balance at Renewal</th>
                  <td>{formatCurrency(summaryB.termEndingBalance - summaryA.termEndingBalance)}</td>
                </tr>
                <tr>
                  <th>Time to Payoff</th>
                  <td>{summaryB.payoffMonths - summaryA.payoffMonths} months</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ScenarioBlock scenario={scenarioA} summary={summaryA} schedule={scheduleA} />
      )}

      {/* Renewal Planner section */}
      {renewalSection && (
        <div className="ps-renewal">
          <h3 className="ps-h3">Renewal Options · {fmtMonthYear(renewalDate!)}</h3>
          <div className="ps-renewal-snapshot">
            <div>
              <div className="ps-cell-label">Projected Balance</div>
              <div className="ps-cell-value">{formatCurrency(renewalBalance!)}</div>
            </div>
            <div>
              <div className="ps-cell-label">Remaining Amortization</div>
              <div className="ps-cell-value">
                {Math.floor(remainingAmortMonths! / 12)} yrs {remainingAmortMonths! % 12} mos
              </div>
            </div>
            <div>
              <div className="ps-cell-label">Renewal Date</div>
              <div className="ps-cell-value">{fmtMonthYear(renewalDate!)}</div>
            </div>
          </div>

          <table className="ps-table ps-table-compact ps-renewal-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Type</th>
                <th className="ps-num">Rate</th>
                <th className="ps-num">Term</th>
                <th>Frequency</th>
                <th className="ps-num">Amortization</th>
                <th className="ps-num">Payment</th>
                <th className="ps-num">Term Interest</th>
                <th className="ps-num">Balance at End</th>
                <th>Term Ends</th>
              </tr>
            </thead>
            <tbody>
              {renewalOptions!.map((o, i) => {
                const badges: string[] = [];
                if (lowestPayment && o === lowestPayment) badges.push("↓ pmt");
                if (lowestInterest && o === lowestInterest) badges.push("↓ int");
                if (mostPaidDown && o === mostPaidDown) badges.push("↓ bal");
                return (
                  <tr key={i}>
                    <td>
                      <strong>{o.label}</strong>
                      {badges.length > 0 && (
                        <span className="ps-best-badge"> {badges.join(" · ")}</span>
                      )}
                    </td>
                    <td>{o.rateType === "fixed" ? "Fixed" : "Variable"}</td>
                    <td className="ps-num">{o.rate.toFixed(2)}%</td>
                    <td className="ps-num">{o.termYears} yr</td>
                    <td>{o.frequency}</td>
                    <td className="ps-num">
                      {Math.floor(o.amortizationMonths / 12)}y
                      {o.amortizationMonths % 12 > 0 ? ` ${o.amortizationMonths % 12}m` : ""}
                      {o.isReAmortized ? "*" : ""}
                    </td>
                    <td className="ps-num">{formatCurrency(o.payment)}</td>
                    <td className="ps-num">{formatCurrency(o.termInterest)}</td>
                    <td className="ps-num">{formatCurrency(o.termEndingBalance)}</td>
                    <td>{fmtMonthYear(o.termEndDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {renewalOptions!.some((o) => o.isReAmortized) && (
            <div className="ps-renewal-tips">
              * Re-amortized at renewal (differs from the carried-over remaining
              amortization). Extending amortization typically requires a refinance with
              requalification.
            </div>
          )}

          <div className="ps-renewal-tips">
            <strong>How to choose:</strong> shorter terms usually carry lower rates but
            renew sooner (rate-risk). Longer terms lock in payments for predictability.
            Variable rates float with prime — historically lower but volatile.
            Higher / accelerated frequency shaves interest without changing your contracted rate.
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="ps-disclaimer">
        For informational purposes only. Not financial advice. Calculations assume the
        stated rate is fixed for the entire amortization for illustration; actual mortgage
        rates may change at each renewal. Verify all figures with your mortgage professional.
      </div>
      </div>
    </div>
  );
}

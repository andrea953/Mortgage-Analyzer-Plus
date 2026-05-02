import React from "react";
import { ScenarioState } from "@/pages/Calculator";
import { ScheduleRow } from "@/lib/mortgage";
import { formatCurrency } from "@/lib/format";

type Summary = {
  regularPayment: number;
  totalPayment: number;
  payoffMonths: number;
  totalInterest: number;
  termInterest: number;
  termEndingBalance: number;
  renewalDate: Date;
};

type Props = {
  scenarioA: ScenarioState;
  summaryA: Summary;
  scheduleA: ScheduleRow[];
  scenarioB?: ScenarioState;
  summaryB?: Summary;
  scheduleB?: ScheduleRow[];
  isCompare: boolean;
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

  const lumpSumLabel = scenario.lumpSumValue > 0
    ? scenario.lumpSumType === "percent"
      ? `${scenario.lumpSumValue}% of original (${formatCurrency((scenario.lumpSumValue / 100) * scenario.principal)}) per anniversary`
      : `${formatCurrency(scenario.lumpSumValue)} per anniversary`
    : "None";

  return (
    <div className="ps-scenario">
      {label && <div className="ps-scenario-label">{label}</div>}

      {/* Loan inputs */}
      <h3 className="ps-h3">Loan Details</h3>
      <table className="ps-table">
        <tbody>
          <tr>
            <th>Mode</th>
            <td>{scenario.mode === "current" ? "Current balance (existing mortgage)" : "New mortgage"}</td>
          </tr>
          <tr>
            <th>{scenario.mode === "current" ? "Term Start Date" : "Loan Start Date"}</th>
            <td>{fmtDateLong(startDate)}</td>
          </tr>
          <tr>
            <th>{scenario.mode === "current" ? "Current Balance" : "Loan Amount"}</th>
            <td>{formatCurrency(scenario.principal)}</td>
          </tr>
          <tr>
            <th>Interest Rate</th>
            <td>{scenario.annualRatePct.toFixed(2)}% (Canadian semi-annual convention)</td>
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
            <td>{scenario.termYears} years</td>
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
          <div className="ps-cell-label">Term Interest ({scenario.termYears}y)</div>
          <div className="ps-cell-value">{formatCurrency(summary.termInterest)}</div>
        </div>
        <div className="ps-cell ps-cell-accent">
          <div className="ps-cell-label">Renewal Date</div>
          <div className="ps-cell-value">{fmtMonthYear(summary.renewalDate)}</div>
          <div className="ps-cell-sub">End of {scenario.termYears}-year term</div>
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
  scenarioA,
  summaryA,
  scheduleA,
  scenarioB,
  summaryB,
  scheduleB,
  isCompare,
}: Props) {
  const generated = new Date();
  return (
    <div className="hidden print:block print-summary">
      {/* Header */}
      <div className="ps-header">
        <div className="ps-header-left">
          <div className="ps-logo" aria-hidden="true">$</div>
          <div>
            <div className="ps-brand">
              <span className="ps-brand-grad">Mortgage Lab</span>
              <span className="ps-brand-sep">|</span>
              <span className="ps-brand-sub">Mortgage Decision Summary</span>
            </div>
            <div className="ps-brand-tag">
              Canadian semi-annual interest convention
            </div>
          </div>
        </div>
        <div className="ps-header-right">
          <div className="ps-meta-label">Prepared</div>
          <div className="ps-meta-value">{fmtDateLong(generated)}</div>
        </div>
      </div>

      {isCompare && scenarioB && summaryB && scheduleB ? (
        <div className="ps-compare">
          <ScenarioBlock label="Scenario A" scenario={scenarioA} summary={summaryA} schedule={scheduleA} />
          <ScenarioBlock label="Scenario B" scenario={scenarioB} summary={summaryB} schedule={scheduleB} />
          <div className="ps-diff">
            <h3 className="ps-h3">At a Glance · Difference (B − A)</h3>
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

      {/* Disclaimer */}
      <div className="ps-disclaimer">
        For informational purposes only. Not financial advice. Calculations assume the
        stated rate is fixed for the entire amortization for illustration; actual mortgage
        rates may change at each renewal. Verify all figures with your mortgage professional.
      </div>
    </div>
  );
}

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScenarioState } from "@/pages/Calculator";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AnimatedNumber } from "@/components/animated-number";
import { recurringMonthlyMortgage, sumHousingCosts } from "@/lib/mortgage";

type ScenarioResultsProps = {
  summary: {
    regularPayment: number;
    totalPayment: number;
    payoffMonths: number;
    totalInterest: number;
    termInterest: number;
    termEndingBalance: number;
    renewalDate: Date;
  };
  scenario: ScenarioState;
};

const formatRenewalDate = (d: Date) =>
  d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });

export function ScenarioResults({ summary, scenario }: ScenarioResultsProps) {
  const payoffYears = Math.floor(summary.payoffMonths / 12);
  const payoffRemainingMonths = summary.payoffMonths % 12;

  const monthlyMortgage = recurringMonthlyMortgage({
    principal: scenario.principal,
    annualRatePct: scenario.annualRatePct,
    amortizationMonths: scenario.amortizationYears * 12 + scenario.amortizationMonths,
    frequency: scenario.frequency,
    extraPerPeriod: scenario.extraPerPeriod,
    compounding: scenario.compounding,
  });
  const otherHousing = sumHousingCosts(scenario);
  const totalMonthlyHousing = monthlyMortgage + otherHousing;

  return (
    <div className="space-y-6">
      {otherHousing > 0 ? (
        <>
          <div className="p-6 bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-pink-500/80 text-white rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9 21v-6h6v6"/></svg>
            </div>
            <h3 className="text-white/80 font-medium text-sm mb-2">Total Monthly Housing Cost</h3>
            <div className="text-4xl font-bold tracking-tight">
              <AnimatedNumber value={totalMonthlyHousing} format={formatCurrency} />
            </div>
            <div className="space-y-1.5 text-sm mt-4 pt-4 border-t border-white/20">
              <div className="flex justify-between text-white/80">
                <span>Mortgage (monthly equiv.)</span>
                <span className="tabular-nums text-white font-medium">{formatCurrency(monthlyMortgage)}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Other housing costs</span>
                <span className="tabular-nums text-white font-medium">{formatCurrency(otherHousing)}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/70 mt-3">
              ≈ {formatCurrency(totalMonthlyHousing * 12)} per year. Mortgage shown as a monthly equivalent of your recurring payment; one-off lump sums excluded.
            </p>
          </div>

          <Card className="bg-gradient-to-br from-card to-muted/40 border-2 border-primary/30 ring-1 ring-primary/10 shadow-lg rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Total Mortgage Payment / {scenario.frequency}</h4>
                <div className="text-3xl font-bold text-primary tracking-tight">
                  <AnimatedNumber value={summary.totalPayment} format={formatCurrency} />
                </div>
              </div>
              {scenario.extraPerPeriod > 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  Includes <AnimatedNumber value={scenario.extraPerPeriod} format={formatCurrency} /> extra
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="p-6 bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-pink-500/80 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h3 className="text-white/80 font-medium text-sm mb-2">Total Mortgage Payment / {scenario.frequency}</h3>
          <div className="text-4xl font-bold tracking-tight">
            <AnimatedNumber value={summary.totalPayment} format={formatCurrency} />
          </div>
          {scenario.extraPerPeriod > 0 && (
            <div className="text-sm text-white/80 mt-2">
              Includes <AnimatedNumber value={scenario.extraPerPeriod} format={formatCurrency} /> extra
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Time to Payoff</h4>
            <div className="text-lg font-semibold text-foreground">
              {payoffYears > 0 && <><AnimatedNumber value={payoffYears} /> yrs </>}
              <AnimatedNumber value={payoffRemainingMonths} /> mos
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardContent className="p-4">
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Total Interest</h4>
            <div className="text-lg font-semibold text-destructive">
              <AnimatedNumber value={summary.totalInterest} format={formatCurrency} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Term Interest ({scenario.termYears}y)</h4>
            <div className="text-lg font-semibold text-foreground">
              <AnimatedNumber value={summary.termInterest} format={formatCurrency} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Balance at Renewal</h4>
            <div className="text-lg font-semibold text-foreground">
              <AnimatedNumber value={summary.termEndingBalance} format={formatCurrency} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-card to-muted/30 border-border">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Renewal Date</h4>
            <div className="text-lg font-semibold text-foreground tracking-tight">
              {formatRenewalDate(summary.renewalDate)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              End of {scenario.termYears}-year term
            </p>
          </div>
          <div className="text-right shrink-0">
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Projected Principal</h4>
            <div className="text-lg font-semibold text-primary">
              <AnimatedNumber value={summary.termEndingBalance} format={formatCurrency} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Math.round((summary.termEndingBalance / scenario.principal) * 100)}% of original
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
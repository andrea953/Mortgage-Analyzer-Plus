import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScenarioState } from "@/pages/Calculator";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AnimatedNumber } from "@/components/animated-number";

type ScenarioResultsProps = {
  summary: {
    regularPayment: number;
    totalPayment: number;
    payoffMonths: number;
    totalInterest: number;
    termInterest: number;
    termEndingBalance: number;
  };
  scenario: ScenarioState;
};

export function ScenarioResults({ summary, scenario }: ScenarioResultsProps) {
  const payoffYears = Math.floor(summary.payoffMonths / 12);
  const payoffRemainingMonths = summary.payoffMonths % 12;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h3 className="text-primary-foreground/80 font-medium text-sm mb-2">Total Payment / {scenario.frequency}</h3>
        <div className="text-4xl font-bold tracking-tight">
          <AnimatedNumber value={summary.totalPayment} format={formatCurrency} />
        </div>
        {scenario.extraPerPeriod > 0 && (
          <div className="text-sm text-primary-foreground/80 mt-2">
            Includes <AnimatedNumber value={scenario.extraPerPeriod} format={formatCurrency} /> extra
          </div>
        )}
      </div>

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
            <h4 className="text-xs text-muted-foreground font-medium mb-1">Term End Balance</h4>
            <div className="text-lg font-semibold text-foreground">
              <AnimatedNumber value={summary.termEndingBalance} format={formatCurrency} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
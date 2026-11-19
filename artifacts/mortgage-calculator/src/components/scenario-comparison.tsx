import React from "react";
import { ScenarioState } from "@/pages/Calculator";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AnimatedNumber } from "@/components/animated-number";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Equal } from "lucide-react";

type ScenarioComparisonProps = {
  scenarioA: ScenarioState;
  summaryA: any;
  scenarioB: ScenarioState;
  summaryB: any;
};

export function ScenarioComparison({ scenarioA, summaryA, scenarioB, summaryB }: ScenarioComparisonProps) {
  const interestDiff = summaryA.totalInterest - summaryB.totalInterest;
  const paymentDiff = summaryA.totalPayment - summaryB.totalPayment;
  const samePaymentFrequency = scenarioA.frequency === scenarioB.frequency;
  const payoffMonthsDiff = summaryA.payoffMonths - summaryB.payoffMonths;

  const getDiffIcon = (diff: number, invert = false) => {
    if (diff === 0) return <Equal className="w-4 h-4 text-muted-foreground" />;
    const isGood = invert ? diff > 0 : diff < 0;
    return diff > 0 ? (
      <ArrowDown className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
    ) : (
      <ArrowUp className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
    );
  };

  const titleA = scenarioA.title?.trim() || "Scenario A";
  const titleB = scenarioB.title?.trim() || "Scenario B";

  return (
    <Card className="border-border shadow-md bg-card/50 overflow-hidden">
      <div className="bg-muted p-4 border-b">
        <h3 className="font-semibold text-lg">
          <span className="text-foreground">{titleB}</span>
          <span className="text-muted-foreground font-normal mx-2">vs</span>
          <span className="text-foreground">{titleA}</span>
        </h3>
        <p className="text-sm text-muted-foreground">See how {titleB} performs compared to {titleA}</p>
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Total Interest</p>
            <div className={`text-2xl font-bold flex items-center gap-2 ${interestDiff > 0 ? 'text-green-500' : interestDiff < 0 ? 'text-red-500' : 'text-foreground'}`}>
              {interestDiff > 0 ? 'Saves ' : interestDiff < 0 ? 'Costs extra ' : ''}
              <AnimatedNumber value={Math.abs(interestDiff)} format={formatCurrency} />
              {interestDiff !== 0 && (interestDiff > 0 ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />)}
            </div>
            {interestDiff === 0 && <span className="text-muted-foreground font-medium">Same interest</span>}
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Mortgage Payment</p>
            <div className="space-y-3">
              {[{ scenario: scenarioA, summary: summaryA, key: "a" }, { scenario: scenarioB, summary: summaryB, key: "b" }].map(({ scenario, summary, key }) => (
                <div
                  key={key}
                  data-testid={`scenario-payment-${key}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5"
                >
                  <span className="min-w-0 text-sm text-muted-foreground">
                    <span className="block truncate font-medium text-foreground">{scenario.title?.trim() || `Scenario ${key.toUpperCase()}`}</span>
                    <span className="text-xs">{scenario.frequency} payment</span>
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
                    <AnimatedNumber value={summary.totalPayment} format={formatCurrency} />
                  </span>
                </div>
              ))}
              {samePaymentFrequency ? (
                <div className="flex items-center justify-center gap-2 pt-1 text-sm text-muted-foreground" data-testid="text-payment-difference">
                  Difference: <span className={`font-semibold tabular-nums ${paymentDiff > 0 ? "text-green-500" : paymentDiff < 0 ? "text-red-500" : "text-foreground"}`}>
                    <AnimatedNumber value={Math.abs(paymentDiff)} format={formatCurrency} />
                  </span>
                  {paymentDiff !== 0 && (paymentDiff > 0 ? <ArrowDown className="h-4 w-4 text-green-500" aria-label="Scenario B payment is lower" /> : <ArrowUp className="h-4 w-4 text-red-500" aria-label="Scenario B payment is higher" />)}
                </div>
              ) : (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  Different payment frequencies; compare each amount above.
                </p>
              )}
            </div>
          </div>

          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Payoff Time</p>
            <div className={`text-2xl font-bold flex items-center gap-2 ${payoffMonthsDiff > 0 ? 'text-green-500' : payoffMonthsDiff < 0 ? 'text-red-500' : 'text-foreground'}`}>
              {payoffMonthsDiff !== 0 && (
                <>
                  {Math.floor(Math.abs(payoffMonthsDiff) / 12) > 0 && `${Math.floor(Math.abs(payoffMonthsDiff) / 12)}y `}
                  {Math.abs(payoffMonthsDiff) % 12}m
                  {payoffMonthsDiff > 0 ? ' faster' : ' slower'}
                </>
              )}
              {payoffMonthsDiff === 0 && 'Same payoff'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
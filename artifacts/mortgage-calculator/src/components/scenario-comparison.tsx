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

          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Payment Size ({scenarioB.frequency})</p>
            <div className={`text-2xl font-bold flex items-center gap-2 ${paymentDiff > 0 ? 'text-green-500' : paymentDiff < 0 ? 'text-red-500' : 'text-foreground'}`}>
              <AnimatedNumber value={Math.abs(paymentDiff)} format={formatCurrency} />
              {paymentDiff !== 0 && (paymentDiff > 0 ? <ArrowDown className="w-5 h-5 text-green-500" /> : <ArrowUp className="w-5 h-5 text-red-500" />)}
            </div>
            <span className="text-sm text-muted-foreground mt-1">per period</span>
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
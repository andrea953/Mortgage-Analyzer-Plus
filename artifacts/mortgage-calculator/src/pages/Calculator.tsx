import React, { useState, useMemo } from "react";
import { Moon, Sun, Plus, Calculator as CalculatorIcon, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScenarioForm } from "@/components/scenario-form";
import { ScenarioResults } from "@/components/scenario-results";
import { AmortizationChart } from "@/components/amortization-chart";
import { AmortizationSchedule } from "@/components/amortization-schedule";
import { buildSchedule, summarize, PaymentFrequency } from "@/lib/mortgage";
import { ScenarioComparison } from "@/components/scenario-comparison";
import { Card, CardContent } from "@/components/ui/card";

export type ScenarioState = {
  principal: number;
  annualRatePct: number;
  amortizationYears: number;
  amortizationMonths: number;
  termYears: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
};

const defaultScenario: ScenarioState = {
  principal: 500000,
  annualRatePct: 5.25,
  amortizationYears: 25,
  amortizationMonths: 0,
  termYears: 5,
  frequency: "Monthly",
  extraPerPeriod: 0,
};

export default function Calculator() {
  const { theme, setTheme } = useTheme();
  const [isCompare, setIsCompare] = useState(false);
  const [scenarioA, setScenarioA] = useState<ScenarioState>({ ...defaultScenario });
  const [scenarioB, setScenarioB] = useState<ScenarioState>({ 
    ...defaultScenario, 
    annualRatePct: 4.75,
    frequency: "Accelerated bi-weekly"
  });

  const scheduleA = useMemo(() => buildSchedule({
    principal: scenarioA.principal,
    annualRatePct: scenarioA.annualRatePct,
    amortizationMonths: scenarioA.amortizationYears * 12 + scenarioA.amortizationMonths,
    frequency: scenarioA.frequency,
    extraPerPeriod: scenarioA.extraPerPeriod,
  }), [scenarioA]);

  const scheduleB = useMemo(() => buildSchedule({
    principal: scenarioB.principal,
    annualRatePct: scenarioB.annualRatePct,
    amortizationMonths: scenarioB.amortizationYears * 12 + scenarioB.amortizationMonths,
    frequency: scenarioB.frequency,
    extraPerPeriod: scenarioB.extraPerPeriod,
  }), [scenarioB]);

  const summaryA = useMemo(() => summarize(scheduleA, scenarioA.termYears), [scheduleA, scenarioA.termYears]);
  const summaryB = useMemo(() => summarize(scheduleB, scenarioB.termYears), [scheduleB, scenarioB.termYears]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <CalculatorIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Mortgage Lab</h1>
              <p className="text-xs text-muted-foreground leading-none">Precise scenario modeling</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="compare-mode" className="text-sm font-medium cursor-pointer">
                Compare
              </label>
              <Switch 
                id="compare-mode" 
                checked={isCompare} 
                onCheckedChange={setIsCompare} 
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className={`grid grid-cols-1 ${isCompare ? 'lg:grid-cols-2' : 'lg:grid-cols-12'} gap-8 items-start`}>
          {/* Inputs Section */}
          <div className={`${isCompare ? '' : 'lg:col-span-4'} space-y-6`}>
            {isCompare && <h2 className="text-xl font-semibold flex items-center gap-2">Scenario A</h2>}
            <ScenarioForm state={scenarioA} onChange={setScenarioA} />
            {!isCompare && (
              <div className="mt-8 pt-8 border-t">
                <ScenarioResults summary={summaryA} scenario={scenarioA} />
              </div>
            )}
          </div>

          {isCompare ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">Scenario B</h2>
              <ScenarioForm state={scenarioB} onChange={setScenarioB} />
            </div>
          ) : (
            <div className="lg:col-span-8 space-y-8">
              <AmortizationChart 
                scheduleA={scheduleA} 
                scenarioA={scenarioA}
              />
              <AmortizationSchedule schedule={scheduleA} />
            </div>
          )}
        </div>

        {isCompare && (
          <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ScenarioComparison 
              scenarioA={scenarioA} summaryA={summaryA} 
              scenarioB={scenarioB} summaryB={summaryB} 
            />
            <AmortizationChart 
              scheduleA={scheduleA} scenarioA={scenarioA}
              scheduleB={scheduleB} scenarioB={scenarioB}
              isCompare
            />
          </div>
        )}
      </main>

      <footer className="border-t mt-12 py-8 text-center text-muted-foreground text-sm">
        <p>For informational purposes only. Not financial advice.</p>
        <p className="mt-1">Calculations based on standard Canadian mortgage conventions.</p>
      </footer>
    </div>
  );
}
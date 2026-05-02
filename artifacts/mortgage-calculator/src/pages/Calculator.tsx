import React, { useState, useMemo } from "react";
import { Moon, Sun, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { ScenarioForm } from "@/components/scenario-form";
import { ScenarioResults } from "@/components/scenario-results";
import { AmortizationChart } from "@/components/amortization-chart";
import { AmortizationSchedule } from "@/components/amortization-schedule";
import { buildSchedule, summarize, PaymentFrequency, LumpSumType } from "@/lib/mortgage";
import { ScenarioComparison } from "@/components/scenario-comparison";
import { PrintSummary } from "@/components/print-summary";

export type BalanceMode = "new" | "current";

export type ScenarioState = {
  mode: BalanceMode;
  termStartDate: string;
  principal: number;
  annualRatePct: number;
  amortizationYears: number;
  amortizationMonths: number;
  termYears: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
  lumpSumValue: number;
  lumpSumType: LumpSumType;
};

const todayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const defaultScenario: ScenarioState = {
  mode: "new",
  termStartDate: todayIso(),
  principal: 500000,
  annualRatePct: 5.25,
  amortizationYears: 25,
  amortizationMonths: 0,
  termYears: 5,
  frequency: "Monthly",
  extraPerPeriod: 0,
  lumpSumValue: 0,
  lumpSumType: "amount",
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

  const parseStart = (iso: string) => {
    if (!iso) return new Date();
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const startDateA = useMemo(() => parseStart(scenarioA.termStartDate), [scenarioA.termStartDate]);
  const startDateB = useMemo(() => parseStart(scenarioB.termStartDate), [scenarioB.termStartDate]);

  const scheduleA = useMemo(() => buildSchedule({
    principal: scenarioA.principal,
    annualRatePct: scenarioA.annualRatePct,
    amortizationMonths: scenarioA.amortizationYears * 12 + scenarioA.amortizationMonths,
    frequency: scenarioA.frequency,
    extraPerPeriod: scenarioA.extraPerPeriod,
    lumpSumValue: scenarioA.lumpSumValue,
    lumpSumType: scenarioA.lumpSumType,
    startDate: startDateA,
  }), [scenarioA, startDateA]);

  const scheduleB = useMemo(() => buildSchedule({
    principal: scenarioB.principal,
    annualRatePct: scenarioB.annualRatePct,
    amortizationMonths: scenarioB.amortizationYears * 12 + scenarioB.amortizationMonths,
    frequency: scenarioB.frequency,
    extraPerPeriod: scenarioB.extraPerPeriod,
    lumpSumValue: scenarioB.lumpSumValue,
    lumpSumType: scenarioB.lumpSumType,
    startDate: startDateB,
  }), [scenarioB, startDateB]);

  const summaryA = useMemo(() => summarize(scheduleA, scenarioA.termYears, startDateA), [scheduleA, scenarioA.termYears, startDateA]);
  const summaryB = useMemo(() => summarize(scheduleB, scenarioB.termYears, startDateB), [scheduleB, scenarioB.termYears, startDateB]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="brand-logo-bg w-11 h-11 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-xl font-bold bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">$</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight brand-text-gradient leading-none">
                  Mortgage Lab
                </h1>
                <span className="text-muted-foreground/50 text-lg leading-none">|</span>
                <span className="text-sm font-medium text-foreground/80 leading-none">
                  Canadian Mortgage Modeling
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-none">
                Polished scenario modeling with semi-annual interest, lump sums, and renewal projections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Summary</span>
            </Button>
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

      <PrintSummary
        scenarioA={scenarioA}
        summaryA={summaryA}
        scheduleA={scheduleA}
        scenarioB={isCompare ? scenarioB : undefined}
        summaryB={isCompare ? summaryB : undefined}
        scheduleB={isCompare ? scheduleB : undefined}
        isCompare={isCompare}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 print:hidden">
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

      <footer className="border-t mt-12 py-8 text-center text-muted-foreground text-sm print:hidden">
        <p>For informational purposes only. Not financial advice.</p>
        <p className="mt-1">Calculations based on standard Canadian mortgage conventions.</p>
      </footer>
    </div>
  );
}
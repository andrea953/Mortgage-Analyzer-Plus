import React, { useState, useMemo } from "react";
import { Moon, Sun, Printer, Calculator as CalculatorIcon, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { ScenarioForm } from "@/components/scenario-form";
import { ScenarioResults } from "@/components/scenario-results";
import { AmortizationChart } from "@/components/amortization-chart";
import { AmortizationSchedule } from "@/components/amortization-schedule";
import { buildSchedule, summarize, PaymentFrequency, LumpSumType } from "@/lib/mortgage";
import { ScenarioComparison } from "@/components/scenario-comparison";
import { PrintSummary } from "@/components/print-summary";
import {
  RenewalPlanner,
  RenewalOption,
  defaultRenewalOptions,
  computeRenewals,
} from "@/components/renewal-planner";

export type BalanceMode = "new" | "current";

export type RateType = "fixed" | "variable";

export type ScenarioState = {
  title: string;
  mode: BalanceMode;
  termStartDate: string;
  principal: number;
  annualRatePct: number;
  rateType: RateType;
  primeRatePct: number;
  spreadPct: number;
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

function ScenarioTitleInput({
  value,
  onChange,
  placeholder,
  accentClass,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accentClass: string;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <span className={`w-1.5 h-7 rounded-full ${accentClass} shrink-0`} aria-hidden="true" />
      <div className="relative flex-1 min-w-0">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-xl font-semibold border-transparent bg-transparent hover:bg-muted/50 focus-visible:bg-card focus-visible:border-input px-2 -mx-2 h-9 transition-colors pr-8"
          aria-label="Scenario title"
          maxLength={40}
        />
        <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors pointer-events-none" />
      </div>
    </div>
  );
}

const defaultScenario: ScenarioState = {
  title: "Scenario A",
  mode: "new",
  termStartDate: todayIso(),
  principal: 500000,
  annualRatePct: 5.25,
  rateType: "fixed",
  primeRatePct: 5.45,
  spreadPct: 0,
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
  const [tab, setTab] = useState<"calculator" | "renewal">("calculator");
  const [isCompare, setIsCompare] = useState(false);
  const [scenarioA, setScenarioA] = useState<ScenarioState>({ ...defaultScenario });
  const [scenarioB, setScenarioB] = useState<ScenarioState>({ 
    ...defaultScenario, 
    title: "Scenario B",
    annualRatePct: 4.75,
    frequency: "Accelerated bi-weekly"
  });
  const [renewalOptions, setRenewalOptions] = useState<RenewalOption[]>(defaultRenewalOptions);

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

  const totalAmortMonthsA = scenarioA.amortizationYears * 12 + scenarioA.amortizationMonths;
  const remainingAmortMonths = Math.max(totalAmortMonthsA - scenarioA.termYears * 12, 0);
  const renewalBalance = summaryA.termEndingBalance;
  const renewalDate = summaryA.renewalDate;

  const computedRenewals = useMemo(
    () => computeRenewals(renewalOptions, renewalBalance, remainingAmortMonths, renewalDate),
    [renewalOptions, renewalBalance, remainingAmortMonths, renewalDate],
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="brand-logo-bg w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-base sm:text-xl font-bold bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">$</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold tracking-tight brand-text-gradient leading-none whitespace-nowrap">
                  Mortgage Lab
                </h1>
                <span className="hidden sm:inline text-muted-foreground/50 text-lg leading-none">|</span>
                <span className="hidden sm:inline text-sm font-medium text-foreground/80 leading-none">
                  Canadian Mortgage Modeling
                </span>
              </div>
              <p className="hidden md:block text-xs text-muted-foreground mt-1 leading-none">
                Polished scenario modeling with semi-annual interest, lump sums, and renewal projections
              </p>
              <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5 leading-none truncate">
                Canadian Mortgage Modeling
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 h-8 sm:h-9 px-2 sm:px-3"
              data-testid="button-print"
              aria-label="Print Summary"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden md:inline">Print Summary</span>
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label htmlFor="compare-mode" className="text-xs sm:text-sm font-medium cursor-pointer">
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
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
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
        showRenewal={tab === "renewal"}
        renewalBalance={renewalBalance}
        renewalDate={renewalDate}
        remainingAmortMonths={remainingAmortMonths}
        renewalOptions={computedRenewals.map((c) => ({
          label: c.opt.label,
          rateType: c.opt.rateType,
          rate: c.opt.rate,
          termYears: c.opt.termYears,
          frequency: c.opt.frequency,
          extraPerPeriod: c.opt.extraPerPeriod,
          payment: c.summary.totalPayment,
          termInterest: c.summary.termInterest,
          totalCostInTerm: c.totalCostInTerm,
          termEndingBalance: c.summary.termEndingBalance,
          termEndDate: c.summary.renewalDate,
        }))}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 print:hidden">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "calculator" | "renewal")}>
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto">
            <TabsTrigger value="calculator" className="gap-2">
              <CalculatorIcon className="h-4 w-4" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="renewal" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Renewal Planner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6 sm:space-y-8 mt-0">
            <div className={`grid grid-cols-1 ${isCompare ? 'lg:grid-cols-2' : 'lg:grid-cols-12'} gap-6 sm:gap-8 items-start`}>
              {/* Inputs Section */}
              <div className={`${isCompare ? '' : 'lg:col-span-4'} space-y-6`}>
                {isCompare && (
                  <ScenarioTitleInput
                    value={scenarioA.title}
                    onChange={(t) => setScenarioA({ ...scenarioA, title: t })}
                    placeholder="Scenario A"
                    accentClass="bg-[hsl(var(--chart-1))]"
                  />
                )}
                <ScenarioForm state={scenarioA} onChange={setScenarioA} />
                {!isCompare && (
                  <div className="mt-8 pt-8 border-t">
                    <ScenarioResults summary={summaryA} scenario={scenarioA} />
                  </div>
                )}
              </div>

              {isCompare ? (
                <div className="space-y-6">
                  <ScenarioTitleInput
                    value={scenarioB.title}
                    onChange={(t) => setScenarioB({ ...scenarioB, title: t })}
                    placeholder="Scenario B"
                    accentClass="bg-[hsl(var(--chart-3))]"
                  />
                  <ScenarioForm state={scenarioB} onChange={setScenarioB} />
                </div>
              ) : (
                <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                  <AmortizationChart
                    scheduleA={scheduleA}
                    scenarioA={scenarioA}
                  />
                  <AmortizationSchedule schedule={scheduleA} />
                </div>
              )}
            </div>

            {isCompare && (
              <div className="space-y-6 sm:space-y-8 mt-8 sm:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          </TabsContent>

          <TabsContent value="renewal" className="mt-0">
            <RenewalPlanner
              scenarioA={scenarioA}
              renewalBalance={renewalBalance}
              renewalDate={renewalDate}
              remainingAmortMonths={remainingAmortMonths}
              options={renewalOptions}
              onChange={setRenewalOptions}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-12 py-8 text-center text-muted-foreground text-sm print:hidden">
        <p>For informational purposes only. Not financial advice.</p>
        <p className="mt-1">Calculations based on standard Canadian mortgage conventions.</p>
      </footer>
    </div>
  );
}
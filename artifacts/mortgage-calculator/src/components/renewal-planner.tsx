import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, TrendingDown, Banknote, Award, Info, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ScenarioState } from "@/pages/Calculator";
import { buildSchedule, summarize, PaymentFrequency, frequencyPeriods, ScheduleRow } from "@/lib/mortgage";
import { formatCurrency } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FREQ_OPTIONS: PaymentFrequency[] = [
  "Monthly",
  "Semi-monthly",
  "Bi-weekly",
  "Weekly",
  "Accelerated bi-weekly",
  "Accelerated weekly",
  "Accelerated semi-monthly",
  "Quarterly",
  "Semi-annual",
  "Annual",
];

export type RateType = "fixed" | "variable";

export type RenewalOption = {
  id: string;
  label: string;
  rateType: RateType;
  rate: number;
  termYears: number;
  frequency: PaymentFrequency;
  extraPerPeriod: number;
};

export const defaultRenewalOptions: RenewalOption[] = [
  { id: "opt-1", label: "3-yr fixed", rateType: "fixed", rate: 4.5, termYears: 3, frequency: "Monthly", extraPerPeriod: 0 },
  { id: "opt-2", label: "5-yr fixed", rateType: "fixed", rate: 4.75, termYears: 5, frequency: "Monthly", extraPerPeriod: 0 },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(245 70% 60%)",
  "hsl(330 75% 60%)",
  "hsl(35 90% 55%)",
];

export type ComputedRenewal = {
  opt: RenewalOption;
  schedule: ScheduleRow[];
  summary: ReturnType<typeof summarize>;
  color: string;
  totalCostInTerm: number;
  periodsInTerm: number;
};

export function computeRenewals(
  options: RenewalOption[],
  renewalBalance: number,
  remainingAmortMonths: number,
  renewalDate: Date,
): ComputedRenewal[] {
  return options.map((opt, i) => {
    const schedule = buildSchedule({
      principal: renewalBalance,
      annualRatePct: opt.rate,
      amortizationMonths: Math.max(remainingAmortMonths, 1),
      frequency: opt.frequency,
      extraPerPeriod: opt.extraPerPeriod,
      lumpSumValue: 0,
      lumpSumType: "amount",
      startDate: renewalDate,
    });
    const summary = summarize(schedule, opt.termYears, renewalDate);
    const periodsInTerm = opt.termYears * frequencyPeriods[opt.frequency];
    const totalCostInTerm = summary.totalPayment * periodsInTerm;
    return {
      opt,
      schedule,
      summary,
      color: COLORS[i % COLORS.length],
      totalCostInTerm,
      periodsInTerm,
    };
  });
}

type Props = {
  scenarioA: ScenarioState;
  renewalBalance: number;
  renewalDate: Date;
  remainingAmortMonths: number;
  options: RenewalOption[];
  onChange: (next: RenewalOption[]) => void;
};

export function RenewalPlanner({
  scenarioA,
  renewalBalance,
  renewalDate,
  remainingAmortMonths,
  options,
  onChange,
}: Props) {
  // Edge cases: loan paid off before renewal, or amortization == term
  if (renewalBalance <= 0.01) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">No renewal needed</h3>
          <p className="text-muted-foreground text-sm">
            Your loan is fully paid off before the term ends. Adjust extra payments or lump sums in
            the Calculator to see a renewal scenario.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (remainingAmortMonths <= 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Loan ends with this term</h3>
          <p className="text-muted-foreground text-sm">
            Amortization equals term length, so the loan finishes at the end of the current term.
            There is no balance to renew.
          </p>
        </CardContent>
      </Card>
    );
  }

  const computed = computeRenewals(options, renewalBalance, remainingAmortMonths, renewalDate);

  // Best-for analysis
  const lowestPaymentIdx = computed.length
    ? computed.reduce((best, c, i) => (c.summary.totalPayment < computed[best].summary.totalPayment ? i : best), 0)
    : -1;
  const lowestInterestIdx = computed.length
    ? computed.reduce((best, c, i) => (c.summary.termInterest < computed[best].summary.termInterest ? i : best), 0)
    : -1;
  const lowestBalanceIdx = computed.length
    ? computed.reduce((best, c, i) => (c.summary.termEndingBalance < computed[best].summary.termEndingBalance ? i : best), 0)
    : -1;

  // Chart data: yearly snapshot of balance per option
  const chartData = (() => {
    if (computed.length === 0) return [];
    const maxTerm = Math.max(...computed.map((c) => c.opt.termYears));
    const startYear = renewalDate.getFullYear();
    const data: any[] = [];
    const initial: any = { year: startYear };
    computed.forEach((c) => (initial[c.opt.label] = renewalBalance));
    data.push(initial);
    for (let y = 1; y <= maxTerm; y++) {
      const point: any = { year: startYear + y };
      computed.forEach((c) => {
        const yearRows = c.schedule.filter((r) => r.date.getFullYear() === startYear + y);
        if (yearRows.length > 0) {
          point[c.opt.label] = yearRows[yearRows.length - 1].endingBalance;
        }
      });
      data.push(point);
    }
    return data;
  })();

  const update = (idx: number, patch: Partial<RenewalOption>) => {
    onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const add = () => {
    if (options.length >= 4) return;
    const id = `opt-${Date.now()}`;
    onChange([
      ...options,
      {
        id,
        label: `Option ${options.length + 1}`,
        rateType: "fixed",
        rate: 5.0,
        termYears: 5,
        frequency: "Monthly",
        extraPerPeriod: 0,
      },
    ]);
  };

  const remove = (idx: number) => {
    if (options.length <= 1) return;
    onChange(options.filter((_, i) => i !== idx));
  };

  const fmtMonthYear = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
  const fmtFullMonthYear = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* How this works */}
      <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Set up your mortgage in the Calculator tab first</p>
          <p>
            The Renewal Planner builds on your Calculator inputs (Scenario A when comparing). These
            three figures carry over automatically and anchor every option below:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong className="text-foreground">Projected balance at renewal</strong> — what you'll still owe at the end of your current term (driven by your loan amount, rate, payments, and prepayments)</li>
            <li><strong className="text-foreground">Renewal date</strong> — your term start date plus the term length</li>
            <li><strong className="text-foreground">Remaining amortization</strong> — years left to pay off after renewal (your amortization minus the term)</li>
          </ul>
          <p>To change these, adjust the matching inputs in the Calculator: loan amount, rate, payments, and prepayments shift the projected balance; term start date and term length set the renewal date; amortization and term set the remaining amortization.</p>
        </div>
      </div>

      {/* Snapshot banner */}
      <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-purple-200/60 dark:border-purple-800/40">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">At Renewal</div>
            <div className="text-2xl font-bold mt-1 brand-text-gradient">{fmtFullMonthYear(renewalDate)}</div>
            <div className="text-xs text-muted-foreground mt-1">End of {scenarioA.termYears}-year term</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Projected Balance</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(renewalBalance)}</div>
            <div className="text-xs text-muted-foreground mt-1">From your Calculator scenario</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Remaining Amortization</div>
            <div className="text-2xl font-bold mt-1">
              {Math.floor(remainingAmortMonths / 12)} yrs {remainingAmortMonths % 12} mos
            </div>
            <div className="text-xs text-muted-foreground mt-1">{remainingAmortMonths} months</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Renewal Options</h2>
          <p className="text-sm text-muted-foreground">
            Compare different terms, rates, and frequencies side-by-side.{" "}
            <a
              href="https://www.ratehub.ca/best-mortgage-rates"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              data-testid="link-ratehub"
            >
              Check live rates on ratehub.ca
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <Button onClick={add} disabled={options.length >= 4} size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Add option
        </Button>
      </div>

      {/* Option cards */}
      <div className={`grid grid-cols-1 ${computed.length >= 3 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"} gap-4`}>
        {computed.map((c, idx) => (
          <Card key={c.opt.id} className="relative overflow-hidden" style={{ borderTop: `3px solid ${c.color}` }}>
            <CardContent className="p-4 space-y-4">
              {options.length > 1 && (
                <Button
                  onClick={() => remove(idx)}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-9 w-9"
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Input
                value={c.opt.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                className="font-semibold text-base h-9 pr-9"
              />

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={c.opt.rateType === "fixed" ? "default" : "outline"}
                  onClick={() => update(idx, { rateType: "fixed" })}
                  className="flex-1 h-7 text-xs"
                >
                  Fixed
                </Button>
                <Button
                  size="sm"
                  variant={c.opt.rateType === "variable" ? "default" : "outline"}
                  onClick={() => update(idx, { rateType: "variable" })}
                  className="flex-1 h-7 text-xs"
                >
                  Variable
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Rate %</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={c.opt.rate}
                    onChange={(e) => update(idx, { rate: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Term (yrs)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={c.opt.termYears}
                    onChange={(e) => update(idx, { termYears: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment Frequency</Label>
                <Select
                  value={c.opt.frequency}
                  onValueChange={(v) => update(idx, { frequency: v as PaymentFrequency })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQ_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Extra Payment (per period)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={c.opt.extraPerPeriod}
                    onChange={(e) => update(idx, { extraPerPeriod: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="h-9 pl-7 text-right"
                  />
                </div>
              </div>

              <div className="pt-3 border-t space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Payment / period</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(c.summary.totalPayment)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Interest over term</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(c.summary.termInterest)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total paid in term</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(c.totalCostInTerm)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Balance at term end</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(c.summary.termEndingBalance)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Term ends</span>
                  <span className="font-semibold">{fmtMonthYear(c.summary.renewalDate)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {idx === lowestPaymentIdx && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 inline-flex items-center gap-1 font-medium">
                    <Banknote className="h-3 w-3" />Lowest payment
                  </span>
                )}
                {idx === lowestInterestIdx && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-flex items-center gap-1 font-medium">
                    <TrendingDown className="h-3 w-3" />Least interest
                  </span>
                )}
                {idx === lowestBalanceIdx && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 inline-flex items-center gap-1 font-medium">
                    <Award className="h-3 w-3" />Most paid down
                  </span>
                )}
                {c.opt.rateType === "variable" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1 font-medium">
                    Variable
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {computed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Balance Trajectory After Renewal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor((dataMin * 0.97) / 1000) * 1000),
                    (dataMax: number) => Math.ceil((dataMax * 1.03) / 1000) * 1000,
                  ]}
                  allowDecimals={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {computed.map((c) => (
                  <Line
                    key={c.opt.id}
                    type="monotone"
                    dataKey={c.opt.label}
                    stroke={c.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Decision tips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            How to Choose
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Shorter term (e.g. 3 yrs)</strong> often carries a lower posted rate but renews sooner, exposing you to rate risk again.</p>
          <p><strong className="text-foreground">Longer term (e.g. 5 yrs)</strong> locks in your payment longer for predictability, usually at a slightly higher rate.</p>
          <p><strong className="text-foreground">Variable rate</strong> floats with prime — historically lower on average but volatile. Figures above assume the rate stays constant for illustration; in reality your payment or amortization can move with rate changes.</p>
          <p><strong className="text-foreground">Higher / accelerated frequency</strong> shaves interest and time without changing your contracted rate.</p>
        </CardContent>
      </Card>
    </div>
  );
}

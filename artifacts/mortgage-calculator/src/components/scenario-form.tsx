import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ScenarioState, BalanceMode, RateType } from "@/pages/Calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentFrequency, LumpSumType, Compounding } from "@/lib/mortgage";
import { Button } from "@/components/ui/button";

type ScenarioFormProps = {
  state: ScenarioState;
  onChange: (state: ScenarioState) => void;
};

const frequencies: PaymentFrequency[] = [
  "Annual",
  "Semi-annual",
  "Quarterly",
  "Monthly",
  "Semi-monthly",
  "Bi-weekly",
  "Weekly",
  "Accelerated semi-monthly",
  "Accelerated bi-weekly",
  "Accelerated weekly",
];

export function ScenarioForm({ state, onChange }: ScenarioFormProps) {
  const form = useForm<ScenarioState>({
    defaultValues: state,
    mode: "onChange",
  });

  const { watch, setValue, register } = form;
  const values = watch();

  useEffect(() => {
    const sub = form.watch((v) => {
      if (
        v &&
        typeof v.principal === "number" && !isNaN(v.principal) &&
        typeof v.annualRatePct === "number" && !isNaN(v.annualRatePct) &&
        typeof v.amortizationYears === "number" && !isNaN(v.amortizationYears) &&
        typeof v.amortizationMonths === "number" && !isNaN(v.amortizationMonths) &&
        typeof v.termYears === "number" && !isNaN(v.termYears) &&
        typeof v.extraPerPeriod === "number" && !isNaN(v.extraPerPeriod) &&
      typeof v.lumpSumValue === "number" && !isNaN(v.lumpSumValue) &&
      (v.lumpSumType === "amount" || v.lumpSumType === "percent") &&
      typeof v.lumpSumStartYear === "number" && !isNaN(v.lumpSumStartYear) &&
      typeof v.lumpSumEndYear === "number" && !isNaN(v.lumpSumEndYear) &&
      (v.compounding === "semi-annual" || v.compounding === "monthly") &&
      typeof v.propertyTaxMonthly === "number" && !isNaN(v.propertyTaxMonthly) &&
      typeof v.condoFeesMonthly === "number" && !isNaN(v.condoFeesMonthly) &&
      typeof v.maintenanceMonthly === "number" && !isNaN(v.maintenanceMonthly) &&
      typeof v.utilitiesMonthly === "number" && !isNaN(v.utilitiesMonthly) &&
      typeof v.insuranceMonthly === "number" && !isNaN(v.insuranceMonthly) &&
      typeof v.otherMonthly === "number" && !isNaN(v.otherMonthly) &&
      (v.mode === "new" || v.mode === "current") &&
      (v.rateType === "fixed" || v.rateType === "variable") &&
      typeof v.primeRatePct === "number" && !isNaN(v.primeRatePct) &&
      typeof v.spreadPct === "number" && !isNaN(v.spreadPct) &&
      typeof v.termStartDate === "string" && v.termStartDate.length > 0
      ) {
        onChange(v as ScenarioState);
      }
    });
    return () => sub.unsubscribe();
  }, [form, onChange]);

  // Keep annualRatePct in sync with prime+spread when in variable mode
  useEffect(() => {
    if (values.rateType === "variable") {
      const effective = Math.max(0, (values.primeRatePct ?? 0) + (values.spreadPct ?? 0));
      const rounded = Math.round(effective * 100) / 100;
      if (Math.abs(rounded - (values.annualRatePct ?? 0)) > 0.001) {
        setValue("annualRatePct", rounded, { shouldDirty: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.rateType, values.primeRatePct, values.spreadPct]);

  const isCurrent = values.mode === "current";
  const isVariable = values.rateType === "variable";
  const otherHousingTotal =
    (values.propertyTaxMonthly || 0) +
    (values.condoFeesMonthly || 0) +
    (values.maintenanceMonthly || 0) +
    (values.utilitiesMonthly || 0) +
    (values.insuranceMonthly || 0) +
    (values.otherMonthly || 0);
  const effectiveVariableRate = Math.max(
    0,
    Math.round(((values.primeRatePct ?? 0) + (values.spreadPct ?? 0)) * 100) / 100,
  );

  const handleRateTypeChange = (next: RateType) => {
    if (next === values.rateType) return;
    if (next === "variable") {
      // Preserve effective rate by deriving spread from current annual rate
      const newSpread = Math.round(((values.annualRatePct ?? 0) - (values.primeRatePct ?? 0)) * 100) / 100;
      setValue("spreadPct", newSpread, { shouldDirty: true });
      // Default to Monthly compounding for variable (Big-6 banks except Scotia)
      if (values.compounding === "semi-annual") {
        setValue("compounding", "monthly" as Compounding, { shouldDirty: true });
      }
    } else {
      // Fixed mortgages are semi-annual by Interest Act
      setValue("compounding", "semi-annual" as Compounding, { shouldDirty: true });
    }
    setValue("rateType", next, { shouldDirty: true });
  };

  return (
    <Card className="border-border shadow-sm bg-card hover-elevate no-default-hover-elevate">
      <CardHeader className="pb-4 flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
        <CardTitle className="text-lg font-medium">Loan Details</CardTitle>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
          <Button
            type="button"
            variant={!isCurrent ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-8 px-3 text-xs font-medium"
            onClick={() => setValue("mode", "new" as BalanceMode)}
            aria-pressed={!isCurrent}
          >
            New mortgage
          </Button>
          <Button
            type="button"
            variant={isCurrent ? "default" : "ghost"}
            size="sm"
            className="rounded-none h-8 px-3 text-xs font-medium border-l border-border"
            onClick={() => setValue("mode", "current" as BalanceMode)}
            aria-pressed={isCurrent}
          >
            Current balance
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Term Start Date */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="termStartDate">
                {isCurrent ? "Term Start Date" : "Loan Start Date"}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCurrent
                  ? "When this term begins (used for renewal date)"
                  : "When the loan is funded"}
              </p>
            </div>
            <Input
              id="termStartDate"
              type="date"
              className="w-full sm:w-44"
              {...register("termStartDate")}
            />
          </div>
        </div>

        {/* Loan Amount / Current Balance */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="principal">
                {isCurrent ? "Current Balance" : "Loan Amount"}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCurrent
                  ? "Principal owing at start of this term"
                  : "Original principal at start of term"}
              </p>
            </div>
            <div className="relative w-full sm:w-32">
              <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
              <Input
                id="principal"
                type="number"
                className="pl-7 text-right"
                {...register("principal", { valueAsNumber: true })}
              />
            </div>
          </div>
          <Slider
            min={50000}
            max={2000000}
            step={10000}
            value={[values.principal]}
            onValueChange={([val]) => setValue("principal", val)}
            className="py-2"
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <Label htmlFor="annualRatePct">Interest Rate</Label>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs self-start sm:self-auto">
              <Button
                type="button"
                variant={!isVariable ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-3 text-xs font-medium"
                onClick={() => handleRateTypeChange("fixed")}
                aria-pressed={!isVariable}
              >
                Fixed
              </Button>
              <Button
                type="button"
                variant={isVariable ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-3 text-xs font-medium border-l border-border"
                onClick={() => handleRateTypeChange("variable")}
                aria-pressed={isVariable}
              >
                Variable
              </Button>
            </div>
          </div>

          {!isVariable ? (
            <>
              <div className="flex justify-end">
                <div className="relative w-24">
                  <Input
                    id="annualRatePct"
                    type="number"
                    step="0.01"
                    className="pr-7 text-right"
                    {...register("annualRatePct", { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1.5 text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                min={0}
                max={15}
                step={0.05}
                value={[values.annualRatePct]}
                onValueChange={([val]) => setValue("annualRatePct", val)}
                className="py-2"
              />
            </>
          ) : (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="primeRatePct" className="text-sm">Prime Rate</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your bank's posted prime
                  </p>
                </div>
                <div className="relative w-24">
                  <Input
                    id="primeRatePct"
                    type="number"
                    step="0.05"
                    min={0}
                    className="pr-7 text-right"
                    {...register("primeRatePct", { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1.5 text-muted-foreground">%</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="spreadPct" className="text-sm">Spread</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use negative for prime discount (e.g. −0.50)
                  </p>
                </div>
                <div className="relative w-24">
                  <Input
                    id="spreadPct"
                    type="number"
                    step="0.05"
                    className="pr-7 text-right"
                    {...register("spreadPct", { valueAsNumber: true })}
                  />
                  <span className="absolute right-3 top-1.5 text-muted-foreground">%</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 border-t border-border">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm">Compounding</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Big-6 banks (except Scotia) use Monthly; mono-line lenders (First National, MCAP) use Semi-annual. ~0.04% rate variance.
                  </p>
                </div>
                <div className="inline-flex rounded-md border border-border overflow-hidden self-start sm:self-auto">
                  <Button
                    type="button"
                    variant={values.compounding === "monthly" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none h-8 px-3 text-xs font-medium"
                    onClick={() => setValue("compounding", "monthly" as Compounding, { shouldDirty: true })}
                    aria-pressed={values.compounding === "monthly"}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={values.compounding === "semi-annual" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none h-8 px-3 text-xs font-medium border-l border-border"
                    onClick={() => setValue("compounding", "semi-annual" as Compounding, { shouldDirty: true })}
                    aria-pressed={values.compounding === "semi-annual"}
                  >
                    Semi-annual
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-medium">Effective Rate</span>
                <div className="text-right">
                  <div className="text-base font-semibold tabular-nums">
                    {effectiveVariableRate.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Prime {(values.primeRatePct ?? 0).toFixed(2)}%
                    {" "}{(values.spreadPct ?? 0) >= 0 ? "+" : "−"}{" "}
                    {Math.abs(values.spreadPct ?? 0).toFixed(2)}%
                    {" · "}{values.compounding === "monthly" ? "Monthly" : "Semi-annual"} compounding
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Amortization */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>{isCurrent ? "Remaining Amortization" : "Amortization"}</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-16 text-right"
                  {...register("amortizationYears", { valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">yrs</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-16 text-right"
                  {...register("amortizationMonths", { valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">mos</span>
              </div>
            </div>
          </div>
          <Slider
            min={1}
            max={40}
            step={1}
            value={[values.amortizationYears]}
            onValueChange={([val]) => setValue("amortizationYears", val)}
            className="py-2"
          />
        </div>

        {/* Term */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="termYears">Term</Label>
            <div className="flex items-center gap-2">
              <Input
                id="termYears"
                type="number"
                className="w-16 text-right"
                {...register("termYears", { valueAsNumber: true })}
              />
              <span className="text-sm text-muted-foreground">yrs</span>
            </div>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[values.termYears]}
            onValueChange={([val]) => setValue("termYears", val)}
            className="py-2"
          />
        </div>

        {/* Payment Frequency */}
        <div className="space-y-3">
          <Label htmlFor="frequency">Payment Frequency</Label>
          <Select
            value={values.frequency}
            onValueChange={(val: PaymentFrequency) => setValue("frequency", val)}
          >
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {freq}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Extra Payment */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <Label htmlFor="extraPerPeriod">Extra Payment (per period)</Label>
            <div className="relative w-full sm:w-32">
              <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
              <Input
                id="extraPerPeriod"
                type="number"
                className="pl-7 text-right"
                {...register("extraPerPeriod", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        {/* Annual Lump Sum Prepayment */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="lumpSumValue">Annual Lump Sum</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applied at each anniversary
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden shrink-0">
                <Button
                  type="button"
                  variant={values.lumpSumType === "amount" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-9 px-3 text-xs font-medium"
                  onClick={() => setValue("lumpSumType", "amount" as LumpSumType)}
                  aria-pressed={values.lumpSumType === "amount"}
                >
                  $
                </Button>
                <Button
                  type="button"
                  variant={values.lumpSumType === "percent" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-9 px-3 text-xs font-medium border-l border-border"
                  onClick={() => setValue("lumpSumType", "percent" as LumpSumType)}
                  aria-pressed={values.lumpSumType === "percent"}
                >
                  %
                </Button>
              </div>
              <div className="relative flex-1 sm:flex-none sm:w-28">
                {values.lumpSumType === "amount" ? (
                  <span className="absolute left-3 top-1.5 text-muted-foreground pointer-events-none">$</span>
                ) : (
                  <span className="absolute right-3 top-1.5 text-muted-foreground pointer-events-none">%</span>
                )}
                <Input
                  id="lumpSumValue"
                  type="number"
                  step={values.lumpSumType === "percent" ? "0.1" : "100"}
                  min={0}
                  className={values.lumpSumType === "amount" ? "pl-7 text-right" : "pr-7 text-right"}
                  {...register("lumpSumValue", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
          {values.lumpSumValue > 0 && values.lumpSumType === "percent" && (
            <p className="text-xs text-muted-foreground">
              {values.lumpSumValue}% of original principal = ${(values.principal * values.lumpSumValue / 100).toLocaleString("en-CA", { maximumFractionDigits: 0 })} per year
            </p>
          )}
          {values.lumpSumValue > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="lumpSumStartYear" className="text-xs text-muted-foreground">Apply from year</Label>
                <Input
                  id="lumpSumStartYear"
                  type="number"
                  min={1}
                  max={values.amortizationYears || 30}
                  step={1}
                  className="text-right h-9"
                  {...register("lumpSumStartYear", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lumpSumEndYear" className="text-xs text-muted-foreground">Apply through year</Label>
                <Input
                  id="lumpSumEndYear"
                  type="number"
                  min={values.lumpSumStartYear || 1}
                  max={values.amortizationYears || 30}
                  step={1}
                  className="text-right h-9"
                  {...register("lumpSumEndYear", { valueAsNumber: true })}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Lump sum applied on anniversaries from year {values.lumpSumStartYear || 1} through year {values.lumpSumEndYear || values.amortizationYears}
                {" "}({Math.max(0, (values.lumpSumEndYear || 0) - (values.lumpSumStartYear || 0) + 1)} payment{Math.max(0, (values.lumpSumEndYear || 0) - (values.lumpSumStartYear || 0) + 1) === 1 ? "" : "s"}).
              </p>
            </div>
          )}
        </div>

        {/* Other Housing Costs */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div>
            <Label>Other Monthly Housing Costs</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recurring ownership costs beyond the mortgage — for a total cost-of-ownership picture
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: "propertyTaxMonthly", label: "Property Tax" },
              { key: "condoFeesMonthly", label: "Condo / Strata Fees" },
              { key: "maintenanceMonthly", label: "Maintenance" },
              { key: "utilitiesMonthly", label: "Utilities" },
              { key: "insuranceMonthly", label: "Home Insurance" },
              { key: "otherMonthly", label: "Other" },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="text-xs text-muted-foreground">{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-muted-foreground pointer-events-none">$</span>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    step={10}
                    placeholder="0"
                    className="pl-7 text-right h-9"
                    {...register(key, {
                      setValueAs: (v) => (v === "" || v === null || isNaN(Number(v)) ? 0 : Number(v)),
                    })}
                  />
                </div>
              </div>
            ))}
          </div>
          {otherHousingTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              Adds ${otherHousingTotal.toLocaleString("en-CA", { maximumFractionDigits: 0 })}/mo
              {" "}(${(otherHousingTotal * 12).toLocaleString("en-CA", { maximumFractionDigits: 0 })}/yr) on top of the mortgage.
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
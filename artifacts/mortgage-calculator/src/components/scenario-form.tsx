import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ScenarioState, BalanceMode, RateType } from "@/pages/Calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentFrequency, LumpSumType, Compounding, estimateAmortizationMonthsFromPayment } from "@/lib/mortgage";
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

  const [amortInputMode, setAmortInputMode] = useState<"payment" | "amortization">("payment");
  const [helperPayment, setHelperPayment] = useState("");
  const [termInputMode, setTermInputMode] = useState<"years" | "endDate">("years");
  const [termEndDate, setTermEndDate] = useState("");
  const [housingCostInputUnit, setHousingCostInputUnit] = useState<"monthly" | "annual">("monthly");

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

  const helperPaymentNum = parseFloat(helperPayment);
  const derivedAmortMonths =
    isCurrent && amortInputMode === "payment" && !isNaN(helperPaymentNum) && helperPaymentNum > 0
      ? estimateAmortizationMonthsFromPayment({
          balance: values.principal,
          annualRatePct: values.annualRatePct,
          payment: helperPaymentNum,
          frequency: values.frequency,
          compounding: values.compounding,
        })
      : null;
  const derivedAmortYears = derivedAmortMonths != null ? Math.floor(derivedAmortMonths / 12) : 0;
  const derivedAmortRemMonths = derivedAmortMonths != null ? derivedAmortMonths % 12 : 0;

  // Auto-apply derived amortization while in payment mode
  useEffect(() => {
    if (!isCurrent || amortInputMode !== "payment" || derivedAmortMonths == null) return;
    if (values.amortizationYears !== derivedAmortYears) {
      setValue("amortizationYears", derivedAmortYears, { shouldDirty: true });
    }
    if (values.amortizationMonths !== derivedAmortRemMonths) {
      setValue("amortizationMonths", derivedAmortRemMonths, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent, amortInputMode, derivedAmortMonths]);

  // Term end date mode: derive termYears from termStartDate -> termEndDate
  const termEndMonths = (() => {
    if (termInputMode !== "endDate" || !termEndDate || !values.termStartDate) return null;
    const s = new Date(values.termStartDate + "T00:00:00");
    const e = new Date(termEndDate + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) months -= 1;
    return months;
  })();

  useEffect(() => {
    if (termInputMode !== "endDate" || termEndMonths == null) return;
    if (termEndMonths < 1 || termEndMonths > 120) return;
    const nextTermYears = termEndMonths / 12;
    if (Math.abs(nextTermYears - (values.termYears ?? 0)) > 1e-9) {
      setValue("termYears", nextTermYears, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termInputMode, termEndMonths]);

  const switchTermMode = (mode: "years" | "endDate") => {
    if (mode === termInputMode) return;
    if (mode === "endDate") {
      // Prefill end date from current term
      const s = new Date(values.termStartDate + "T00:00:00");
      if (!isNaN(s.getTime())) {
        const e = new Date(s);
        e.setMonth(e.getMonth() + Math.round((values.termYears ?? 5) * 12));
        setTermEndDate(e.toISOString().slice(0, 10));
      }
    } else {
      // Snap back to whole years for the slider
      const rounded = Math.min(10, Math.max(1, Math.round(values.termYears ?? 5)));
      setValue("termYears", rounded, { shouldDirty: true });
    }
    setTermInputMode(mode);
  };

  // When Current balance is selected, default Term input to End date
  // and amortization entry back to payment-based estimation
  useEffect(() => {
    if (!isCurrent) return;
    if (termInputMode === "years") {
      switchTermMode("endDate");
    }
    setAmortInputMode("payment");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.mode]);

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
            New term
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
                {isCurrent ? "Balance as of Date" : "Loan Start Date"}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCurrent
                  ? "The date your balance applies — treated as the start of your current term (sets the renewal date)"
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
                  ? "Principal owing as of the date above"
                  : "Original principal at start of term"}
              </p>
            </div>
            <div className="relative w-full sm:w-32">
              <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
              <Input
                id="principal"
                type="number"
                className="pl-7 text-right"
                onFocus={(e) => e.currentTarget.select()}
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
                    onFocus={(e) => e.currentTarget.select()}
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
                    onFocus={(e) => e.currentTarget.select()}
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
                    onFocus={(e) => e.currentTarget.select()}
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
          {isCurrent && amortInputMode === "payment" ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="helperPayment">Current Regular Payment</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Principal + interest per {values.frequency.toLowerCase()} period (exclude taxes, fees, extra)
                  </p>
                </div>
                <div className="relative w-full sm:w-32">
                  <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
                  <Input
                    id="helperPayment"
                    type="number"
                    inputMode="decimal"
                    className="pl-7 text-right"
                    onFocus={(e) => e.currentTarget.select()}
                    value={helperPayment}
                    onChange={(e) => setHelperPayment(e.target.value)}
                    data-testid="input-current-payment"
                  />
                </div>
              </div>
              {helperPayment.trim() === "" ? (
                <p className="text-xs text-muted-foreground">
                  Enter your payment to estimate remaining amortization.
                </p>
              ) : derivedAmortMonths != null ? (
                <p className="text-xs text-muted-foreground" data-testid="text-derived-amort">
                  Remaining amortization:{" "}
                  <span className="font-medium text-foreground">
                    {derivedAmortYears} yr{derivedAmortYears === 1 ? "" : "s"}
                    {derivedAmortRemMonths > 0 ? ` ${derivedAmortRemMonths} mo${derivedAmortRemMonths === 1 ? "" : "s"}` : ""}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  That payment is too low to pay down this balance at the current rate. Check the amount.
                </p>
              )}
              <button
                type="button"
                onClick={() => setAmortInputMode("amortization")}
                className="text-xs text-primary underline-offset-2 hover:underline"
                data-testid="button-enter-amort-directly"
              >
                Know your remaining amortization? Enter it directly
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <Label>{isCurrent ? "Remaining Amortization" : "Amortization"}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16 text-right"
                      onFocus={(e) => e.currentTarget.select()}
                      {...register("amortizationYears", { valueAsNumber: true })}
                    />
                    <span className="text-sm text-muted-foreground">yrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16 text-right"
                      onFocus={(e) => e.currentTarget.select()}
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
              {isCurrent && (
                <button
                  type="button"
                  onClick={() => setAmortInputMode("payment")}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  data-testid="button-estimate-from-payment"
                >
                  Don't know it? Estimate from your current payment
                </button>
              )}
            </>
          )}
        </div>

        {/* Term */}
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Label htmlFor="termYears">Term</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={termInputMode === "years" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => switchTermMode("years")}
                data-testid="button-term-mode-years"
              >
                Years
              </Button>
              <Button
                type="button"
                size="sm"
                variant={termInputMode === "endDate" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => switchTermMode("endDate")}
                data-testid="button-term-mode-end-date"
              >
                End date
              </Button>
            </div>
          </div>
          {termInputMode === "years" ? (
            <>
              <div className="flex justify-end items-center gap-2">
                <Input
                  id="termYears"
                  type="number"
                  className="w-16 text-right"
                  onFocus={(e) => e.currentTarget.select()}
                  {...register("termYears", { valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">yrs</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[values.termYears]}
                onValueChange={([val]) => setValue("termYears", val)}
                className="py-2"
              />
            </>
          ) : (
            <div className="space-y-2">
              <Input
                type="date"
                className="w-full sm:w-44 ml-auto"
                value={termEndDate}
                onChange={(e) => setTermEndDate(e.target.value)}
                data-testid="input-term-end-date"
              />
              {termEndMonths == null || termEndDate === "" ? (
                <p className="text-xs text-muted-foreground">Pick the date your term ends.</p>
              ) : termEndMonths < 1 ? (
                <p className="text-xs text-destructive">
                  End date must be at least 1 month after the {isCurrent ? "term" : "loan"} start date.
                </p>
              ) : termEndMonths > 120 ? (
                <p className="text-xs text-destructive">
                  Terms longer than 10 years aren't supported. Pick an earlier end date.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="text-term-derived">
                  Term length: {Math.floor(termEndMonths / 12) > 0 ? `${Math.floor(termEndMonths / 12)} yrs ` : ""}
                  {termEndMonths % 12 > 0 ? `${termEndMonths % 12} mos` : ""}
                  {" "}({termEndMonths} months from {isCurrent ? "term" : "loan"} start)
                </p>
              )}
            </div>
          )}
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
                onFocus={(e) => e.currentTarget.select()}
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
                  onFocus={(e) => e.currentTarget.select()}
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
                  onFocus={(e) => e.currentTarget.select()}
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
                  onFocus={(e) => e.currentTarget.select()}
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Other Housing Costs</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recurring ownership costs beyond the mortgage
              </p>
            </div>
            <div
              role="group"
              aria-label="Housing cost entry period"
              className="flex shrink-0 rounded-md border border-input p-0.5"
            >
              <Button
                type="button"
                size="sm"
                variant={housingCostInputUnit === "monthly" ? "default" : "ghost"}
                className="h-7 rounded-sm px-2 text-xs"
                aria-pressed={housingCostInputUnit === "monthly"}
                onClick={() => setHousingCostInputUnit("monthly")}
                data-testid="button-housing-cost-monthly"
              >
                Monthly
              </Button>
              <Button
                type="button"
                size="sm"
                variant={housingCostInputUnit === "annual" ? "default" : "ghost"}
                className="h-7 rounded-sm px-2 text-xs"
                aria-pressed={housingCostInputUnit === "annual"}
                onClick={() => setHousingCostInputUnit("annual")}
                data-testid="button-housing-cost-annual"
              >
                Annual
              </Button>
            </div>
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
                    step={housingCostInputUnit === "annual" ? 120 : 10}
                    placeholder="0"
                    className="pl-7 text-right h-9"
                    {...register(key, {
                      setValueAs: (v) => (v === "" || v === null || isNaN(Number(v)) ? 0 : Number(v)),
                    })}
                    value={
                      housingCostInputUnit === "annual"
                        ? (values[key] || 0) * 12
                        : values[key] || 0
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => {
                      const entered = Number(event.currentTarget.value) || 0;
                      setValue(
                        key,
                        housingCostInputUnit === "annual" ? entered / 12 : entered,
                        { shouldDirty: true },
                      );
                    }}
                    data-testid={`input-${key}`}
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
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ScenarioState } from "@/pages/Calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentFrequency, LumpSumType } from "@/lib/mortgage";
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
      (v.lumpSumType === "amount" || v.lumpSumType === "percent")
      ) {
        onChange(v as ScenarioState);
      }
    });
    return () => sub.unsubscribe();
  }, [form, onChange]);

  return (
    <Card className="border-border shadow-sm bg-card hover-elevate no-default-hover-elevate">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Loan Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Loan Amount */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="principal">Loan Amount</Label>
            <div className="relative w-32">
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
          <div className="flex justify-between items-center">
            <Label htmlFor="annualRatePct">Interest Rate</Label>
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
        </div>

        {/* Amortization */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Amortization</Label>
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
          <div className="flex justify-between items-center">
            <Label htmlFor="extraPerPeriod">Extra Payment (per period)</Label>
            <div className="relative w-32">
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
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="lumpSumValue">Annual Lump Sum</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applied at each anniversary
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
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
              <div className="relative w-28">
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
        </div>

      </CardContent>
    </Card>
  );
}
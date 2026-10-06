import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Home, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  computeMortgageAffordability,
  MortgageAffordabilityInputs,
} from "@/lib/mortgage-affordability";

type FormValues = Record<keyof MortgageAffordabilityInputs, string>;

const initialValues: FormValues = {
  annualGrossIncome: "120000",
  monthlyDebts: "0",
  downPayment: "100000",
  annualInterestRatePct: "4.5",
  amortizationYears: "25",
  propertyTaxMonthly: "400",
  heatingMonthly: "150",
  condoFeesMonthly: "0",
  gdsLimitPct: "39",
  tdsLimitPct: "44",
};

function numericValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function NumberField({
  name,
  label,
  value,
  onChange,
  step = "100",
  suffix,
  max,
}: {
  name: keyof FormValues;
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  suffix?: string;
  max?: number;
}) {
  const id = `affordability-${name}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min="0"
          max={max}
          step={step}
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const next = event.currentTarget.value;
            const number = Number(next);
            if (next !== "" && number < 0) onChange("0");
            else if (next !== "" && max !== undefined && number > max) onChange(String(max));
            else onChange(next);
          }}
          className={suffix ? "pr-12" : ""}
          data-testid={id}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function RatioMeter({
  label,
  value,
  limit,
}: {
  label: "GDS" | "TDS";
  value: number;
  limit: number;
}) {
  const width = limit > 0 ? Math.min(100, Math.max(0, value / limit * 100)) : 0;
  const overLimit = value > limit + 0.01;
  return (
    <div className="space-y-2" data-testid={`ratio-${label.toLowerCase()}`}>
      <div className="flex justify-between gap-4 text-sm">
        <span className="font-medium">{label} at qualifying rate</span>
        <span className={overLimit ? "font-semibold text-destructive" : "font-semibold tabular-nums"}>
          {formatPercent(value)} / {formatPercent(limit)}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-label={`${label} ratio against its limit`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={value}
      >
        <div
          className={`h-full rounded-full transition-[width] ${overLimit ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function MortgageAffordability() {
  const form = useForm<FormValues>({ defaultValues: initialValues });
  const values = form.watch();
  const inputs = useMemo(
    () => Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, numericValue(value)]),
    ) as unknown as MortgageAffordabilityInputs,
    [values],
  );
  const result = useMemo(() => computeMortgageAffordability(inputs), [inputs]);
  const update = (key: keyof FormValues, value: string) =>
    form.setValue(key, value, { shouldDirty: true });

  return (
    <Form {...form}>
    <div className="space-y-6" data-testid="mortgage-affordability-analysis">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold tracking-tight">Mortgage Affordability</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Estimate a purchase budget using household income, monthly obligations, down payment,
          housing costs, and the Canadian mortgage stress test. This analysis is independent of
          the Calculator and Renewal Planner.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Household and mortgage details</CardTitle>
            <p className="text-xs text-muted-foreground">
              Replace the example values with the client’s information.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Income and obligations</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField
                  name="annualGrossIncome"
                  label="Annual gross household income"
                  value={values.annualGrossIncome}
                  onChange={(value) => update("annualGrossIncome", value)}
                  step="1000"
                />
                <NumberField
                  name="monthlyDebts"
                  label="Monthly debt payments"
                  value={values.monthlyDebts}
                  onChange={(value) => update("monthlyDebts", value)}
                  step="50"
                />
                <NumberField
                  name="downPayment"
                  label="Available down payment"
                  value={values.downPayment}
                  onChange={(value) => update("downPayment", value)}
                  step="5000"
                />
                <NumberField
                  name="annualInterestRatePct"
                  label="Contract interest rate"
                  value={values.annualInterestRatePct}
                  onChange={(value) => update("annualInterestRatePct", value)}
                  step="0.05"
                  suffix="%"
                  max={25}
                />
                <NumberField
                  name="amortizationYears"
                  label="Amortization"
                  value={values.amortizationYears}
                  onChange={(value) => update("amortizationYears", value)}
                  step="1"
                  suffix="years"
                  max={30}
                />
              </div>
            </section>

            <section className="space-y-3 border-t pt-5">
              <h3 className="text-sm font-semibold">Monthly housing costs</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField
                  name="propertyTaxMonthly"
                  label="Property taxes"
                  value={values.propertyTaxMonthly}
                  onChange={(value) => update("propertyTaxMonthly", value)}
                  step="50"
                />
                <NumberField
                  name="heatingMonthly"
                  label="Heating"
                  value={values.heatingMonthly}
                  onChange={(value) => update("heatingMonthly", value)}
                  step="25"
                />
                <NumberField
                  name="condoFeesMonthly"
                  label="Condo fees"
                  value={values.condoFeesMonthly}
                  onChange={(value) => update("condoFeesMonthly", value)}
                  step="50"
                />
              </div>
            </section>

            <section className="space-y-3 border-t pt-5">
              <h3 className="text-sm font-semibold">Qualification guidelines</h3>
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  name="gdsLimitPct"
                  label="GDS limit"
                  value={values.gdsLimitPct}
                  onChange={(value) => update("gdsLimitPct", value)}
                  step="1"
                  suffix="%"
                  max={100}
                />
                <NumberField
                  name="tdsLimitPct"
                  label="TDS limit"
                  value={values.tdsLimitPct}
                  onChange={(value) => update("tdsLimitPct", value)}
                  step="1"
                  suffix="%"
                  max={100}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Starting assumptions are 39% GDS and 44% TDS. Adjust these to reflect the lender
                and borrower profile. GDS measures qualifying housing costs against gross income;
                TDS includes monthly debt payments as well.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-7">
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Home className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Estimated maximum purchase price
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-max-purchase-price">
                    {result.eligiblePurchaseFound ? formatCurrency(result.maxPurchasePrice) : "No qualifying estimate"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Based on a qualifying rate of{" "}
                    <span className="font-medium text-foreground">{formatPercent(result.qualifyingRatePct)}</span>
                    {" "}and a {result.amortizationYearsApplied}-year amortization.
                  </p>
                </div>
              </div>
              {!result.eligiblePurchaseFound && (
                <p className="mt-4 rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                  The current income, monthly costs, and down payment do not produce a qualifying
                  purchase estimate. Review the inputs and lender limits.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Mortgage including insurance</p>
                <p className="mt-1 text-lg font-bold tabular-nums" data-testid="text-max-mortgage">
                  {formatCurrency(result.insuredMortgageAtMax)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Payment at contract rate</p>
                <p className="mt-1 text-lg font-bold tabular-nums" data-testid="text-contract-payment">
                  {formatCurrency(result.contractPaymentAtMax)}<span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Payment used to qualify</p>
                <p className="mt-1 text-lg font-bold tabular-nums" data-testid="text-qualifying-payment">
                  {formatCurrency(result.qualifyingPaymentAtMax)}<span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Qualification breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <RatioMeter label="GDS" value={result.qualifyingGdsPct} limit={numericValue(values.gdsLimitPct)} />
              <RatioMeter label="TDS" value={result.qualifyingTdsPct} limit={numericValue(values.tdsLimitPct)} />
              <div className="grid grid-cols-1 gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Maximum mortgage payment at qualifying rate</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatCurrency(result.maxMonthlyMortgagePayment)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ratio that limits the estimate</p>
                  <p className="mt-1 font-semibold">{result.bindingRatio}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated default-insurance premium</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatCurrency(result.insurancePremiumAtMax)}
                    {result.insurancePremiumRatePct > 0 && ` (${formatPercent(result.insurancePremiumRatePct)})`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Down payment applied</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatCurrency(result.downPaymentAtMax)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">How this estimate works</p>
          <p>
            The qualifying rate is the greater of the contract rate plus 2 percentage points or
            5.25%. The estimate uses the entered GDS/TDS limits, property taxes, heating, and
            50% of condo fees. Minimum down-payment rules and an estimated default-insurance
            premium are included where applicable.
          </p>
          <p>
            Mortgage-insurance premiums are estimates and may vary by insurer or eligibility.
            Provincial sales tax on the premium, where applicable, and closing costs are not
            included. Insured amortizations over 25 years assume eligibility as a first-time
            buyer or purchaser of a new build, and include a 0.20% premium surcharge. This is not a
            pre-approval; lenders may apply different income, debt, and property rules.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>For illustration only. Confirm the figures and eligibility with a mortgage professional.</span>
      </div>
    </div>
    </Form>
  );
}

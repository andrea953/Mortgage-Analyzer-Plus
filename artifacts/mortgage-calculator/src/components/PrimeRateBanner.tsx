import { useState } from "react";
import { TrendingUp, X } from "lucide-react";
import {
  useGetPrimeRate,
  getGetPrimeRateQueryKey,
} from "@workspace/api-client-react";

interface PrimeRateBannerProps {
  appPrimeRatePct: number;
}

function formatObservedDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PrimeRateBanner({ appPrimeRatePct }: PrimeRateBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { data, isError } = useGetPrimeRate({
    query: {
      queryKey: getGetPrimeRateQueryKey(),
      retry: false,
      staleTime: 1000 * 60 * 60,
    },
  });

  // Progressive enhancement: stay invisible unless the check has real data.
  if (isError || !data) return null;

  const livePrimeRatePct = data.primeRatePct;
  const drift = Math.abs(livePrimeRatePct - appPrimeRatePct);

  // No meaningful change, or the user dismissed this session.
  if (drift < 0.01 || dismissed) return null;

  const direction = livePrimeRatePct > appPrimeRatePct ? "risen" : "fallen";

  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-xl border border-[hsl(var(--primary)/0.35)] bg-gradient-to-r from-[hsl(var(--primary)/0.12)] via-[hsl(var(--accent)/0.10)] to-[hsl(var(--chart-3)/0.12)] p-4 sm:p-5 print:hidden"
    >
      <div className="flex items-start gap-3 pr-8">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--primary))]">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Prime rate update available
          </p>
          <p className="text-sm text-muted-foreground">
            The Canadian prime rate has {direction} to{" "}
            <span className="font-semibold text-foreground">
              {livePrimeRatePct.toFixed(2)}%
            </span>{" "}
            (Bank of Canada, observed {formatObservedDate(data.observedDate)}).
            This calculator currently defaults to{" "}
            <span className="font-semibold text-foreground">
              {appPrimeRatePct.toFixed(2)}%
            </span>
            , so variable-rate results may be off until the default is updated.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss prime rate notice"
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[hsl(var(--primary)/0.12)] hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

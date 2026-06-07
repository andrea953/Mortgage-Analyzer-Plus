import React from "react";
import { ScheduleRow } from "@/lib/mortgage";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AmortizationScheduleProps = {
  schedule: ScheduleRow[];
};

export function AmortizationSchedule({ schedule }: AmortizationScheduleProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [expandedYears, setExpandedYears] = React.useState<Record<number, boolean>>({});

  // Group by year
  const rowsByYear: Record<number, ScheduleRow[]> = {};
  schedule.forEach((row) => {
    const year = row.date.getFullYear();
    if (!rowsByYear[year]) rowsByYear[year] = [];
    rowsByYear[year].push(row);
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const handleExportCsv = () => {
    const headers = ["Payment No", "Date", "Beginning Balance", "Payment", "Interest", "Principal", "Extra", "Lump Sum", "Ending Balance"];
    const csvRows = [headers.join(",")];

    schedule.forEach((row) => {
      csvRows.push(
        [
          row.n,
          row.date.toISOString().split("T")[0],
          row.beginningBalance.toFixed(2),
          row.payment.toFixed(2),
          row.interest.toFixed(2),
          row.principal.toFixed(2),
          row.extra.toFixed(2),
          row.lumpSum.toFixed(2),
          row.endingBalance.toFixed(2),
        ].join(",")
      );
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "amortization_schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-muted/50 border-b">
        <h3 className="font-semibold">Amortization Schedule</h3>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4 text-center">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full">
              {isOpen ? "Hide full schedule" : "Show full schedule"}
              {isOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[70px] sm:w-[100px]">Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Beginning</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Total Pmt</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(rowsByYear).map(([yearStr, rows]) => {
                  const year = parseInt(yearStr);
                  const isExpanded = expandedYears[year];
                  const totalInterest = rows.reduce((sum, r) => sum + r.interest, 0);
                  const totalPrincipal = rows.reduce((sum, r) => sum + r.principal + r.extra + r.lumpSum, 0);
                  const yearLumpSum = rows.reduce((sum, r) => sum + r.lumpSum, 0);
                  const endBalance = rows[rows.length - 1].endingBalance;

                  return (
                    <React.Fragment key={year}>
                      {/* Year Summary Row */}
                      <TableRow 
                        className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleYear(year)}
                      >
                        <TableCell colSpan={2} className="font-semibold">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {year}
                            {yearLumpSum > 0 && (
                              <span className="ml-1 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                +{formatCurrency(yearLumpSum)} lump
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm hidden sm:table-cell">--</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm hidden sm:table-cell">--</TableCell>
                        <TableCell className="text-right font-medium text-destructive">{formatCurrency(totalInterest)}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{formatCurrency(totalPrincipal)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(endBalance)}</TableCell>
                      </TableRow>

                      {/* Detailed Rows */}
                      {isExpanded && rows.map((row) => (
                        <TableRow key={row.n} className={`text-sm ${row.lumpSum > 0 ? "bg-primary/5" : ""}`}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {row.n}
                              {row.lumpSum > 0 && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide bg-primary/15 text-primary px-1 py-0.5 rounded">
                                  Lump
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{row.date.toLocaleDateString()}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{formatCurrency(row.beginningBalance)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{formatCurrency(row.payment)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(row.interest)}</TableCell>
                          <TableCell className="text-right text-primary">{formatCurrency(row.principal + row.extra + row.lumpSum)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.endingBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
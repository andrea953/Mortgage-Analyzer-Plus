import React, { useMemo, useState } from "react";
import { ScheduleRow, recurringMonthlyMortgage } from "@/lib/mortgage";
import { ScenarioState } from "@/pages/Calculator";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";

type AmortizationChartProps = {
  scheduleA: ScheduleRow[];
  scenarioA: ScenarioState;
  scheduleB?: ScheduleRow[];
  scenarioB?: ScenarioState;
  isCompare?: boolean;
};

export function AmortizationChart({ scheduleA, scenarioA, scheduleB, scenarioB, isCompare }: AmortizationChartProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("balance");
  
  const yearlyData = useMemo(() => {
    const dataMap: Record<number, any> = {};
    
    let cumPrincipalA = 0;
    let cumInterestA = 0;
    
    scheduleA.forEach(row => {
      const year = row.date.getFullYear();
      cumPrincipalA += (row.principal + row.extra);
      cumInterestA += row.interest;
      
      if (!dataMap[year] || row.date.getMonth() === 11) {
        dataMap[year] = { 
          ...dataMap[year], 
          year, 
          balanceA: row.endingBalance,
          principalA: cumPrincipalA,
          interestA: cumInterestA,
        };
      }
    });

    if (isCompare && scheduleB) {
      let cumPrincipalB = 0;
      let cumInterestB = 0;
      scheduleB.forEach(row => {
        const year = row.date.getFullYear();
        cumPrincipalB += (row.principal + row.extra);
        cumInterestB += row.interest;
        
        if (!dataMap[year] || row.date.getMonth() === 11) {
          dataMap[year] = { 
            ...dataMap[year], 
            year, 
            balanceB: row.endingBalance,
            principalB: cumPrincipalB,
            interestB: cumInterestB,
          };
        }
      });
    }

    return Object.values(dataMap).sort((a: any, b: any) => a.year - b.year);
  }, [scheduleA, scheduleB, isCompare]);

  const housingPalette = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(345 82% 62%)",
    "hsl(220 75% 62%)",
  ];

  const housingCategoryDefs = (s: ScenarioState) => {
    const mortgage = recurringMonthlyMortgage({
      principal: s.principal,
      annualRatePct: s.annualRatePct,
      amortizationMonths: s.amortizationYears * 12 + s.amortizationMonths,
      frequency: s.frequency,
      extraPerPeriod: s.extraPerPeriod,
      compounding: s.compounding,
    });
    return [
      { name: "Mortgage", value: mortgage },
      { name: "Property Tax", value: s.propertyTaxMonthly || 0 },
      { name: "Condo Fees", value: s.condoFeesMonthly || 0 },
      { name: "Maintenance", value: s.maintenanceMonthly || 0 },
      { name: "Utilities", value: s.utilitiesMonthly || 0 },
      { name: "Insurance", value: s.insuranceMonthly || 0 },
      { name: "Other", value: s.otherMonthly || 0 },
    ];
  };

  const housingCatsA = housingCategoryDefs(scenarioA);
  const housingDonutA = housingCatsA
    .map((c, i) => ({ ...c, fill: housingPalette[i] }))
    .filter((c) => c.value > 0);
  const housingTotalA = housingCatsA.reduce((s, c) => s + c.value, 0);
  const hasOtherHousingA = housingCatsA.slice(1).some((c) => c.value > 0);

  const housingCompareData = useMemo(() => {
    if (!isCompare || !scenarioB) return [];
    const a = housingCategoryDefs(scenarioA);
    const b = housingCategoryDefs(scenarioB);
    const rowA: Record<string, any> = { name: scenarioA.title?.trim() || "Scenario A" };
    const rowB: Record<string, any> = { name: scenarioB.title?.trim() || "Scenario B" };
    a.forEach((c) => (rowA[c.name] = c.value));
    b.forEach((c) => (rowB[c.name] = c.value));
    return [rowA, rowB];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompare, scenarioA, scenarioB]);

  const hasAnyHousing =
    hasOtherHousingA || (isCompare && scenarioB ? housingCategoryDefs(scenarioB).slice(1).some((c) => c.value > 0) : false);

  const totalInterestA = scheduleA.reduce((sum, row) => sum + row.interest, 0);
  const totalPrincipalA = scheduleA.reduce((sum, row) => sum + row.principal + row.extra, 0);
  
  const totalInterestB = scheduleB ? scheduleB.reduce((sum, row) => sum + row.interest, 0) : 0;
  const totalPrincipalB = scheduleB ? scheduleB.reduce((sum, row) => sum + row.principal + row.extra, 0) : 0;

  const donutDataA = [
    { name: "Principal", value: totalPrincipalA, fill: "hsl(var(--chart-1))" },
    { name: "Interest", value: totalInterestA, fill: "hsl(var(--chart-5))" }
  ];

  const colors = {
    primary: "hsl(var(--chart-1))",
    secondary: "hsl(var(--chart-3))",
    destructive: "hsl(var(--chart-5))",
    grid: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    text: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"
  };

  return (
    <Card className="bg-card shadow-sm border-border">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg">Visualizations</CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="flex w-full flex-wrap h-auto sm:w-auto">
              <TabsTrigger value="balance" className="flex-1 sm:flex-none">Balance</TabsTrigger>
              <TabsTrigger value="cumulative" className="flex-1 sm:flex-none">Cumulative</TabsTrigger>
              <TabsTrigger value="breakdown" className="flex-1 sm:flex-none">Breakdown</TabsTrigger>
              <TabsTrigger value="housing" className="flex-1 sm:flex-none">Housing</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] sm:h-[350px] w-full mt-4">
          {activeTab === "balance" && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: colors.text, fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} 
                  tick={{ fill: colors.text, fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="balanceA" 
                  name={isCompare ? `${scenarioA.title?.trim() || "Scenario A"} Balance` : "Balance"} 
                  stroke={colors.primary} 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                {isCompare && (
                  <Line 
                    type="monotone" 
                    dataKey="balanceB" 
                    name={`${scenarioB?.title?.trim() || "Scenario B"} Balance`} 
                    stroke={colors.secondary} 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          )}

          {activeTab === "cumulative" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: colors.text, fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} 
                  tick={{ fill: colors.text, fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="principalA" 
                  name="Cumulative Principal" 
                  stackId="1"
                  stroke={colors.primary} 
                  fill={colors.primary} 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="interestA" 
                  name="Cumulative Interest" 
                  stackId="1"
                  stroke={colors.destructive} 
                  fill={colors.destructive} 
                  fillOpacity={0.6}
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeTab === "breakdown" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutDataA}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {donutDataA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {activeTab === "housing" && (
            !hasAnyHousing ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <p className="text-sm font-medium text-foreground mb-1">No other housing costs added yet</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Add property tax, condo fees, utilities, maintenance, or insurance in the form to see your total monthly cost of ownership broken down here.
                </p>
              </div>
            ) : isCompare ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={housingCompareData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                  <XAxis dataKey="name" tick={{ fill: colors.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    tick={{ fill: colors.text, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                  />
                  {housingCatsA.map((c, i) => (
                    <Bar key={c.name} dataKey={c.name} stackId="housing" fill={housingPalette[i]} radius={i === housingCatsA.length - 1 ? [4, 4, 0, 0] : undefined} />
                  ))}
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-1/2 h-[240px] sm:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={housingDonutA}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {housingDonutA.map((entry, index) => (
                          <Cell key={`hcell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total / mo</span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(housingTotalA)}</span>
                  </div>
                </div>
                <div className="w-full sm:w-1/2 space-y-2">
                  {housingDonutA.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                        <span className="text-muted-foreground truncate">{c.name}</span>
                      </div>
                      <span className="tabular-nums font-medium text-foreground">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="font-semibold">Total monthly</span>
                    <span className="tabular-nums font-bold text-primary">{formatCurrency(housingTotalA)}</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
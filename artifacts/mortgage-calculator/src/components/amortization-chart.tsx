import React, { useMemo, useState } from "react";
import { ScheduleRow } from "@/lib/mortgage";
import { ScenarioState } from "@/pages/Calculator";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="balance">Balance</TabsTrigger>
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full mt-4">
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
                  name={isCompare ? "Scenario A Balance" : "Balance"} 
                  stroke={colors.primary} 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                {isCompare && (
                  <Line 
                    type="monotone" 
                    dataKey="balanceB" 
                    name="Scenario B Balance" 
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
        </div>
      </CardContent>
    </Card>
  );
}
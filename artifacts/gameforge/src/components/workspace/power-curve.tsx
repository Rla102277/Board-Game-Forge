import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp } from "lucide-react";

interface PowerCurveData {
  entityId: number;
  entityName: string;
  powerLevel: number;
  turn: number;
}

interface PowerCurveProps {
  data: PowerCurveData[];
  title?: string;
  view?: "bar" | "line";
}

export function PowerCurve({ data, title = "Entity Power Curve", view = "line" }: PowerCurveProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No power data available</p>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = view === "bar" ? BarChart : LineChart;
  const DataComponent = view === "bar" ? Bar : Line;

  const entityNames = [...new Set(data.map(d => d.entityName))];
  const colors = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))", "hsl(var(--accent))"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="turn"
              label={{ value: "Turn", position: "insideBottom", offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              label={{ value: "Power Level", angle: -90, position: "insideLeft" }}
              className="text-xs"
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            
            {entityNames.map((name, index) => (
              <Line
                key={name}
                dataKey="powerLevel"
                name={name}
                data={data.filter(d => d.entityName === name)}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface WinRateData {
  strategy: string;
  winRate: number;
  playCount: number;
}

interface WinRateChartProps {
  data: WinRateData[];
  title?: string;
}

export function WinRateChart({ data, title = "Win Rate by Strategy" }: WinRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No win rate data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="strategy" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Rate"]}
            />
            <Legend />
            <Bar dataKey="winRate" fill="hsl(var(--primary))" name="Win Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

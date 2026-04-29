import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

interface SimulationDataPoint {
  turn: number;
  p10: number;
  p50: number;
  p90: number;
}

interface SimulationChartProps {
  data: SimulationDataPoint[];
  title?: string;
  type?: "line" | "area";
  showConfidenceInterval?: boolean;
}

export function SimulationChart({ data, title = "Simulation Results", type = "line", showConfidenceInterval = true }: SimulationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No simulation data available</p>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = type === "area" ? AreaChart : LineChart;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="turn" 
              label={{ value: "Turn", position: "insideBottom", offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              label={{ value: "Score", angle: -90, position: "insideLeft" }}
              className="text-xs"
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            
            {showConfidenceInterval && type === "area" && (
              <>
                <Area 
                  type="monotone" 
                  dataKey="p90" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  name="90th Percentile"
                />
                <Area 
                  type="monotone" 
                  dataKey="p10" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  name="10th Percentile"
                />
              </>
            )}
            
            <Line 
              type="monotone" 
              dataKey="p50" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Median"
              dot={{ r: 3 }}
            />
            
            {showConfidenceInterval && type === "line" && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="p90" 
                  stroke="hsl(var(--muted))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="90th Percentile"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="p10" 
                  stroke="hsl(var(--muted))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="10th Percentile"
                  dot={false}
                />
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface MultiSimulationChartProps {
  datasets: {
    name: string;
    data: SimulationDataPoint[];
    color: string;
  }[];
  title?: string;
}

export function MultiSimulationChart({ datasets, title = "Comparison" }: MultiSimulationChartProps) {
  if (!datasets || datasets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No simulation data available</p>
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
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="turn" 
              label={{ value: "Turn", position: "insideBottom", offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              label={{ value: "Score", angle: -90, position: "insideLeft" }}
              className="text-xs"
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            
            {datasets.map((dataset) => (
              <Line
                key={dataset.name}
                data={dataset.data}
                dataKey="p50"
                stroke={dataset.color}
                strokeWidth={2}
                name={dataset.name}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

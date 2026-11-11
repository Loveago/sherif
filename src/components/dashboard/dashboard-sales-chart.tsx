"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DATA_7D = [
  { name: "Oct 13", sales: 1200 },
  { name: "Oct 14", sales: 900 },
  { name: "Oct 15", sales: 3200 },
  { name: "Oct 16", sales: 3000 },
  { name: "Oct 17", sales: 5500 },
  { name: "Oct 18", sales: 6800 },
  { name: "Oct 19", sales: 8500 },
];

const DATA_30D = [
  { name: "W1", sales: 4500 },
  { name: "W2", sales: 8200 },
  { name: "W3", sales: 14000 },
  { name: "W4", sales: 22000 },
];

const DATA_90D = [
  { name: "Month 1", sales: 15000 },
  { name: "Month 2", sales: 38000 },
  { name: "Month 3", sales: 62000 },
];

const DATA_1Y = [
  { name: "Q1", sales: 42000 },
  { name: "Q2", sales: 85000 },
  { name: "Q3", sales: 120000 },
  { name: "Q4", sales: 195000 },
];

export function DashboardSalesChart() {
  const [period, setPeriod] = React.useState<"7D" | "30D" | "90D" | "1Y">("7D");

  const data = React.useMemo(() => {
    switch (period) {
      case "30D":
        return DATA_30D;
      case "90D":
        return DATA_90D;
      case "1Y":
        return DATA_1Y;
      default:
        return DATA_7D;
    }
  }, [period]);

  return (
    <div className="pt-2 space-y-4">
      {/* Header + Time range filter pills */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sales Overview</h3>
          <p className="text-[11px] text-slate-400">Total sales from all bundles</p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#070d18] border border-slate-200 dark:border-[#14233a]">
          {(["7D", "30D", "90D", "1Y"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                period === p
                  ? "bg-[#00df82] text-slate-950 font-black shadow-md shadow-[#00df82]/20"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Area Chart with Neon Gradient */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="neonSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00df82" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#00df82" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00df82" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#1e293b", strokeWidth: 1 }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#1e293b", strokeWidth: 1 }}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#070d18",
                borderColor: "#00df82",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 223, 130, 0.2)",
              }}
              formatter={(value: any) => [`GHS ${Number(value).toLocaleString()}`, "Sales"]}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#00df82"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#neonSalesGrad)"
              dot={{ r: 4, fill: "#00df82", stroke: "#070d18", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#00f59b", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

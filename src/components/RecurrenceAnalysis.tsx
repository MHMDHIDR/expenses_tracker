import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { ChevronDown, Repeat, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import type { Item } from "@/types/expenses";

type RecurrencePeriod = "3d" | "7d" | "2w" | "1m" | "3m" | "6m" | "9m" | "1y";

interface RecurrenceData {
  name: string;
  count: number;
  totalSpent: number;
  averagePrice: number;
}

const periodOptions: {
  value: RecurrencePeriod;
  label: string;
  days: number;
}[] = [
  { value: "3d", label: "Last 3 Days", days: 3 },
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "2w", label: "Last 2 Weeks", days: 14 },
  { value: "1m", label: "Last Month", days: 30 },
  { value: "3m", label: "Last 3 Months", days: 90 },
  { value: "6m", label: "Last 6 Months", days: 180 },
  { value: "9m", label: "Last 9 Months", days: 270 },
  { value: "1y", label: "Last Year", days: 365 },
];

// Gradient colors for the bars
const gradientColors = [
  { start: "#10b981", end: "#06b6d4" }, // emerald to cyan
  { start: "#8b5cf6", end: "#a855f7" }, // violet to purple
  { start: "#f59e0b", end: "#ef4444" }, // amber to red
  { start: "#3b82f6", end: "#6366f1" }, // blue to indigo
  { start: "#ec4899", end: "#f43f5e" }, // pink to rose
];

interface RecurrenceAnalysisProps {
  items: Item[];
}

// Custom Tooltip Component
const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RecurrenceData }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl min-w-[180px]">
        <p className="text-white font-semibold mb-2 truncate max-w-[160px]">
          {data.name}
        </p>
        <div className="space-y-1">
          <p className="text-sm flex items-center gap-2">
            <Repeat className="size-3 text-cyan-400" />
            <span className="text-slate-400">Purchases:</span>
            <span className="text-white font-medium">{data.count}</span>
          </p>
          <p className="text-sm flex items-center gap-2">
            <TrendingUp className="size-3 text-emerald-400" />
            <span className="text-slate-400">Total:</span>
            <span className="text-white font-medium">
              {formatCurrency({ price: data.totalSpent })}
            </span>
          </p>
          <p className="text-sm flex items-center gap-2">
            <span className="size-3 text-violet-400">●</span>
            <span className="text-slate-400">Avg:</span>
            <span className="text-white font-medium">
              {formatCurrency({ price: data.averagePrice })}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function RecurrenceAnalysis({ items }: RecurrenceAnalysisProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<RecurrencePeriod>("1m");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedOption = periodOptions.find(
    (opt) => opt.value === selectedPeriod,
  );

  // Calculate item recurrence data
  const recurrenceData = useMemo((): RecurrenceData[] => {
    const days =
      periodOptions.find((p) => p.value === selectedPeriod)?.days ?? 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Filter items within the period
    const filteredItems = items.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });

    // Group by item name (normalized to lowercase for matching)
    const itemMap = new Map<
      string,
      { count: number; totalSpent: number; originalName: string }
    >();

    filteredItems.forEach((item) => {
      const normalizedName = item.name.toLowerCase().trim();
      const existing = itemMap.get(normalizedName);
      const itemTotal = item.price * item.quantity;

      if (existing) {
        itemMap.set(normalizedName, {
          count: existing.count + item.quantity,
          totalSpent: existing.totalSpent + itemTotal,
          originalName: existing.originalName,
        });
      } else {
        itemMap.set(normalizedName, {
          count: item.quantity,
          totalSpent: itemTotal,
          originalName: item.name,
        });
      }
    });

    // Convert to array and sort by count (most frequent first)
    return Array.from(itemMap.entries())
      .map(([_, value]) => ({
        name: value.originalName,
        count: value.count,
        totalSpent: value.totalSpent,
        averagePrice: value.totalSpent / value.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 items
  }, [items, selectedPeriod]);

  const maxCount = Math.max(...recurrenceData.map((d) => d.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="mx-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-2 border border-slate-700/50 mb-6"
    >
      {/* Header with Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-xl">
            <Repeat className="size-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Purchase Recurrence</h2>
            <p className="text-xs text-slate-400">
              Most frequently purchased items
            </p>
          </div>
        </div>

        {/* Period Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors min-w-[160px] justify-between"
          >
            <span>{selectedOption?.label}</span>
            <ChevronDown
              className={`size-4 text-slate-400 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
              >
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedPeriod(option.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      selectedPeriod === option.value
                        ? "bg-violet-500/20 text-violet-300"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      {recurrenceData.length > 0 ? (
        <div className="space-y-4">
          {/* Horizontal Bar Chart */}
          <div style={{ height: Math.max(recurrenceData.length * 50, 200) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={recurrenceData}
                layout="vertical"
                margin={{ top: 0, right: 0, left: -45, bottom: -15 }}
              >
                <defs>
                  {gradientColors.map((color, i) => (
                    <linearGradient
                      key={i}
                      id={`recurrenceGradient${i}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={color.start} />
                      <stop offset="100%" stopColor={color.end} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                  domain={[0, maxCount]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                  width={100}
                  tickFormatter={(value) =>
                    value.length > 12 ? value.substring(0, 12) + "..." : value
                  }
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar
                  dataKey="count"
                  name="Purchases"
                  radius={[0, 6, 6, 0]}
                  barSize={30}
                >
                  {recurrenceData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#recurrenceGradient${index % gradientColors.length})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">
                {recurrenceData.reduce((sum, d) => sum + d.count, 0)}
              </p>
              <p className="text-xs text-slate-400">Total Purchases</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency({
                  price: recurrenceData.reduce(
                    (sum, d) => sum + d.totalSpent,
                    0,
                  ),
                })}
              </p>
              <p className="text-xs text-slate-400">Total Spent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-400">
                {recurrenceData.length}
              </p>
              <p className="text-xs text-slate-400">Unique Items</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Repeat className="size-12 mx-auto mb-3 opacity-50" />
            <p>No purchases in this period.</p>
            <p className="text-sm mt-1">
              Start tracking expenses to see recurrence patterns!
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

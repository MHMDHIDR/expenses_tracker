import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useExpenseData } from "@/hooks/useExpenseData";
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Receipt,
  ShoppingBag,
  PiggyBank,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format-currency";
import { RecurrenceAnalysis } from "@/components/RecurrenceAnalysis";

type FilterPeriod = "3d" | "7d" | "2w" | "1m";

interface ChartDataItem {
  date: string;
  displayDate: string;
  amount: number;
  cumulativeAmount: number;
  averageAmount: number;
}

const filterOptions: { value: FilterPeriod; label: string; days: number }[] = [
  { value: "3d", label: "3 Days", days: 3 },
  { value: "7d", label: "7 Days", days: 7 },
  { value: "2w", label: "2 Weeks", days: 14 },
  { value: "1m", label: "1 Month", days: 30 },
];

// Custom Tooltip Component
const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataItem;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">{data.displayDate}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-indigo-400">● Daily: </span>
            <span className="text-white font-medium">
              {formatCurrency({ price: data.amount })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-purple-400">● Cumulative: </span>
            <span className="text-white font-medium">
              {formatCurrency({ price: data.cumulativeAmount })}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-orange-400">● Avg/Day: </span>
            <span className="text-white font-medium">
              {formatCurrency({ price: data.averageAmount })}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function Home() {
  const {
    weeklySpent,
    weeklyBudget,
    spendingPercentage,
    alerts,
    receipts,
    items,
  } = useExpenseData();
  const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>("7d");

  // Generate chart data based on selected filter
  const chartData = useMemo((): ChartDataItem[] => {
    const filterDays =
      filterOptions.find((f) => f.value === selectedFilter)?.days ?? 7;
    const now = new Date();
    const dailySpending: Record<string, number> = {};

    // Initialize all days in the range
    for (let i = filterDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailySpending[dateKey] = 0;
    }

    // Aggregate spending by date from items
    items.forEach((item) => {
      const itemDate = new Date(item.date);
      const dateKey = itemDate.toISOString().split("T")[0];
      if (dailySpending.hasOwnProperty(dateKey)) {
        dailySpending[dateKey] += item.price * item.quantity;
      }
    });

    // Convert to chart data with cumulative and average
    let cumulative = 0;
    let dayCount = 0;
    return Object.entries(dailySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => {
        cumulative += amount;
        dayCount++;
        const dateObj = new Date(date);

        return {
          date,
          displayDate: dateObj.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          amount,
          cumulativeAmount: cumulative,
          averageAmount: cumulative / dayCount,
        };
      });
  }, [items, selectedFilter]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "danger":
        return <AlertTriangle className="size-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="size-5 text-amber-400" />;
      case "success":
        return <CheckCircle className="size-5 text-emerald-400" />;
      default:
        return <Info className="size-5 text-blue-400" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case "danger":
        return "bg-red-500/10 border-red-500/30";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30";
      case "success":
        return "bg-emerald-500/10 border-emerald-500/30";
      default:
        return "bg-blue-500/10 border-blue-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-12 pb-6"
      >
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Expense Tracker
        </h1>
        <p className="text-slate-400 mt-1">Track your spending habits</p>
      </motion.header>

      {/* Stats Cards - Spending Focused */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingDown className="size-4" />
            <span className="text-xs font-medium">Weekly Spent</span>
          </div>
          <p className="text-2xl font-bold text-rose-400">
            {formatCurrency({ price: weeklySpent })}
          </p>
          <div className="mt-2">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  spendingPercentage >= 100
                    ? "bg-red-500"
                    : spendingPercentage >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {spendingPercentage.toFixed(0)}% of budget
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <PiggyBank className="size-4" />
            <span className="text-xs font-medium">Weekly Budget</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">
            {formatCurrency({ price: weeklyBudget })}
          </p>
          <p className="text-xs text-slate-500 mt-3">Your spending limit</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Receipt className="size-4" />
            <span className="text-xs font-medium">Receipts</span>
          </div>
          <p className="text-2xl font-bold text-violet-400">
            {receipts.length}
          </p>
          <p className="text-xs text-slate-500 mt-3">Total scanned</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <ShoppingBag className="size-4" />
            <span className="text-xs font-medium">Items Tracked</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{items.length}</p>
          <p className="text-xs text-slate-500 mt-3">Total purchases</p>
        </motion.div>
      </div>

      {/* Spending Analysis Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-2 border border-slate-700/50 mb-6"
      >
        {/* Chart Header with Filter Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold">Spending Analysis</h2>
          <div className="flex gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  selectedFilter === option.value
                    ? "bg-linear-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.some((d) => d.amount > 0) ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{
                  top: 1,
                  right: 0,
                  left: -30,
                  bottom: -30,
                }}
              >
                <defs>
                  <linearGradient
                    id="cumulativeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#334155"
                  strokeDasharray="3 3"
                  opacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                  tickFormatter={(value) => `£${value}`}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Cumulative spending area with wave effect */}
                <Area
                  type="monotone"
                  dataKey="cumulativeAmount"
                  fill="url(#cumulativeGradient)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Cumulative"
                  connectNulls={true}
                  dot={false}
                />

                {/* Daily spending bars */}
                <Bar
                  dataKey="amount"
                  barSize={20}
                  fill="url(#barGradient)"
                  name="Daily Spending"
                  radius={[4, 4, 0, 0]}
                />

                {/* Average spending line */}
                <Line
                  type="monotone"
                  dataKey="averageAmount"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#f97316",
                    stroke: "#fff",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: "#f97316",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  name="Running Average"
                  connectNulls={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <ShoppingBag className="size-12 mx-auto mb-3 opacity-50" />
              <p>No expenses in this period.</p>
              <p className="text-sm mt-1">
                Start scanning receipts to see your spending!
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Purchase Recurrence Analysis */}
      <RecurrenceAnalysis items={items} />

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mx-6 space-y-3 mb-6"
        >
          <h2 className="text-lg font-semibold">Alerts</h2>
          {alerts.map((alert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className={`p-4 rounded-xl border ${getAlertBg(alert.type)}`}
            >
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.type)}
                <div>
                  <h3 className="font-semibold text-white">{alert.title}</h3>
                  <p className="text-sm text-slate-300 mt-0.5">
                    {alert.message}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mx-6 grid grid-cols-2 gap-4"
      >
        <Link to="/scan">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-linear-to-br from-emerald-500 to-cyan-500 rounded-2xl p-5 cursor-pointer"
          >
            <Receipt className="size-8 text-white mb-3" />
            <h3 className="font-semibold text-white">Scan Receipt</h3>
            <p className="text-white/70 text-sm mt-1">Add new expenses</p>
          </motion.div>
        </Link>

        <Link to="/history">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-linear-to-br from-violet-500 to-purple-500 rounded-2xl p-5 cursor-pointer"
          >
            <ShoppingBag className="size-8 text-white mb-3" />
            <h3 className="font-semibold text-white">View History</h3>
            <p className="text-white/70 text-sm mt-1">
              {items.length} items tracked
            </p>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}

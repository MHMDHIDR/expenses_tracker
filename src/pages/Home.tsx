import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useExpenseData } from "@/hooks/useExpenseData";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function Home() {
  const { totalSpent, remaining, settings, alerts, receipts, items } =
    useExpenseData();

  const budget = settings?.budget ?? 0;
  const holding = settings?.holding ?? 0;

  const chartData = [
    { name: "Remaining", value: Math.max(remaining, 0) },
    { name: "Spent", value: totalSpent },
    ...(totalSpent > budget
      ? [{ name: "Over Budget", value: totalSpent - budget }]
      : []),
  ].filter((d) => d.value > 0);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "danger":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
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
        <p className="text-slate-400 mt-1">Keep your finances in check</p>
      </motion.header>

      {/* Stats Cards */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Holdings</span>
          </div>
          <p className="text-2xl font-bold text-white">${holding.toFixed(2)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Spent</span>
          </div>
          <p className="text-2xl font-bold text-rose-400">
            ${totalSpent.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Remaining</span>
          </div>
          <p
            className={`text-2xl font-bold ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            ${remaining.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-medium">Receipts</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{receipts.length}</p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6"
      >
        <h2 className="text-lg font-semibold mb-4">Budget Overview</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) =>
                  value != null ? `$${value.toFixed(2)}` : "$0.00"
                }
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-500">
            <p>No expenses yet. Start scanning receipts!</p>
          </div>
        )}
      </motion.div>

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
            <Receipt className="w-8 h-8 text-white mb-3" />
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
            <ShoppingBag className="w-8 h-8 text-white mb-3" />
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

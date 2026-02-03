import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useExpenseData } from "@/hooks/useExpenseData";
import {
  Settings,
  Key,
  Wallet,
  PiggyBank,
  Save,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/db";

export default function SettingsPage() {
  const { settings, updateSettings, receipts, items } = useExpenseData();

  const [budget, setBudget] = useState("");
  const [holding, setHolding] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setBudget(settings.budget?.toString() ?? "500");
      setHolding(settings.holding?.toString() ?? "1000");
      setApiKey(settings.openaiKey ?? "");
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        budget: parseFloat(budget) || 0,
        holding: parseFloat(holding) || 0,
        openaiKey: apiKey,
      });
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearData = async () => {
    try {
      await db.receipts.clear();
      await db.items.clear();
      toast.success("All expense data cleared");
      setShowClearConfirm(false);
    } catch (error) {
      toast.error("Failed to clear data");
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
        <h1 className="text-3xl font-bold bg-linear-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-400 mt-1">Configure your expense tracker</p>
      </motion.header>

      <div className="px-6 space-y-6">
        {/* Budget Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold">Weekly Budget</h2>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Set your weekly spending limit for alerts
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              $
            </span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="500"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pl-8 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </motion.div>

        {/* Holdings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold">Current Holdings</h2>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Your available funds to track spending against
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              $
            </span>
            <input
              type="number"
              value={holding}
              onChange={(e) => setHolding(e.target.value)}
              placeholder="1000"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pl-8 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </motion.div>

        {/* API Key */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-500/20 rounded-xl">
              <Key className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold">OpenAI API Key</h2>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Required for AI-powered receipt scanning
          </p>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showApiKey ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-linear-to-r from-emerald-500 to-cyan-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Settings className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Saving..." : "Save Settings"}
        </motion.button>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold">Data Management</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            You have {receipts.length} receipts and {items.length} items stored
            locally.
          </p>

          {showClearConfirm ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Are you sure?</span>
              </div>
              <p className="text-slate-300 text-sm mb-4">
                This will permanently delete all receipts and items. This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-slate-700 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 bg-red-500 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-3 rounded-xl font-medium hover:bg-red-500/20 transition-colors"
            >
              Clear All Data
            </button>
          )}
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-center text-slate-500 text-sm py-4"
        >
          <p>Expense Tracker PWA v1.0.0</p>
          <p className="mt-1">All data is stored locally on your device</p>
        </motion.div>
      </div>
    </div>
  );
}

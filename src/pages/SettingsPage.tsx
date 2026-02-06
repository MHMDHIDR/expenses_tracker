import { useExpenseData } from "@/hooks/useExpenseData";
import { offlineDB } from "@/services/offlineStorage";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  PiggyBank,
  Save,
  Settings,
  Trash2,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSyncStatus } from "@/hooks/useSyncStatus";

export default function SettingsPage() {
  const { settings, updateSettings, receipts, items } = useExpenseData();
  const { isOnline, isSyncing, lastSyncAt, pendingChanges, syncNow } =
    useSyncStatus();

  const [budget, setBudget] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setBudget(settings.budget?.toString() ?? "500");
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        budget: parseFloat(budget) || 0,
      });
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      const success = await syncNow();
      if (success) {
        toast.success("Synced with cloud successfully");
      } else {
        toast.error("Sync failed");
      }
    } catch (error) {
      toast.error("Sync failed");
    }
  };

  const handleClearData = async () => {
    try {
      await offlineDB.receipts.clear();
      await offlineDB.items.clear();
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
              <PiggyBank className="size-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold">Weekly Budget</h2>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Set your weekly spending limit. You'll receive alerts when
            approaching or exceeding this budget.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              £
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

        {/* Save Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-linear-to-r from-emerald-500 to-cyan-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Settings className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          {isSaving ? "Saving..." : "Save Settings"}
        </motion.button>

        {/* Cloud Sync */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-2 rounded-xl ${isOnline ? "bg-blue-500/20" : "bg-slate-500/20"}`}
            >
              <Cloud
                className={`size-5 ${isOnline ? "text-blue-400" : "text-slate-400"}`}
              />
            </div>
            <h2 className="text-lg font-semibold">Cloud Sync</h2>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <p className="text-slate-300">
                Status:{" "}
                <span
                  className={isOnline ? "text-emerald-400" : "text-slate-500"}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </p>
              <p className="text-slate-400 mt-1">
                Last synced:{" "}
                {lastSyncAt ? lastSyncAt.toLocaleTimeString() : "Never"}
              </p>
              {pendingChanges > 0 && (
                <p className="text-amber-400 mt-1 text-xs">
                  {pendingChanges} changes pending
                </p>
              )}
            </div>

            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                isOnline
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <RefreshCw
                className={`size-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>

          <p className="text-slate-400 text-xs">
            Data is automatically synced when you're online.
          </p>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <Trash2 className="size-5 text-red-400" />
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
                <AlertTriangle className="size-5" />
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
                  <Trash2 className="size-4" />
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
          transition={{ delay: 0.3 }}
          className="text-center text-slate-500 text-sm py-4"
        >
          <p>Expense Tracker PWA v1.1.0</p>
          <p className="mt-1">All data is stored locally on your device</p>
        </motion.div>
      </div>
    </div>
  );
}

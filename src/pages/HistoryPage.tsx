import { motion, AnimatePresence } from "framer-motion";
import { useExpenseData } from "@/hooks/useExpenseData";
import {
  ShoppingBag,
  Calendar,
  Trash2,
  Package,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export default function HistoryPage() {
  const { itemsByDate, items, deleteItem } = useExpenseData();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const dateKeys = Object.keys(itemsByDate);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteItem(id);
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
        <h1 className="text-3xl font-bold bg-linear-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
          Purchase History
        </h1>
        <p className="text-slate-400 mt-1">{items.length} items tracked</p>
      </motion.header>

      <div className="px-6">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-400 mb-2">
              No Items Yet
            </h2>
            <p className="text-slate-500">
              Start scanning receipts to track your purchases
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {dateKeys.map((dateKey, dateIndex) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dateIndex * 0.05 }}
              >
                {/* Date Header */}
                <button
                  onClick={() =>
                    setExpandedDate(expandedDate === dateKey ? null : dateKey)
                  }
                  className="w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-xl">
                      <Calendar className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{dateKey}</p>
                      <p className="text-sm text-slate-400">
                        {itemsByDate[dateKey].length} items • $
                        {itemsByDate[dateKey]
                          .reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0,
                          )
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedDate === dateKey ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </motion.div>
                </button>

                {/* Items List */}
                <AnimatePresence>
                  {expandedDate === dateKey && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-2">
                        {itemsByDate[dateKey].map((item, itemIndex) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.03 }}
                            className="bg-slate-800/30 rounded-xl p-4 ml-4 border-l-2 border-violet-500/50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-700/50 rounded-lg">
                                <ShoppingBag className="w-4 h-4 text-slate-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {item.name}
                                </p>
                                <p className="text-sm text-slate-400">
                                  Qty: {item.quantity} × $
                                  {item.price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-emerald-400">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={(e) => handleDelete(item.id!, e)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

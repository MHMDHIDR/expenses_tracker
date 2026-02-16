import { useEffect, useRef } from "react";
import { useFinancialAdvisor } from "@/hooks/useFinancialAdvisor";
import type { Item } from "@/types/expenses";
import { motion } from "framer-motion";
import { Sparkles, RefreshCcw } from "lucide-react";

interface FinancialAdviceCardProps {
  items: Item[];
}

export function FinancialAdviceCard({ items }: FinancialAdviceCardProps) {
  const { generateAdvice, advice, loading, error } = useFinancialAdvisor();
  const hasFetched = useRef(false);

  useEffect(() => {
    // Only fetch if we have items and haven't fetched yet
    if (items.length > 0 && !hasFetched.current) {
      generateAdvice(items);
      hasFetched.current = true;
    }
  }, [items, generateAdvice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mx-6 bg-linear-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20 mb-6 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <Sparkles className="size-32 text-indigo-400 rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-md border border-indigo-500/30">
              <Sparkles className="size-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                AI Financial Insights
              </h2>
              <p className="text-xs text-indigo-300/80">Powered by Gemini</p>
            </div>
          </div>
          <button
            onClick={() => generateAdvice(items)}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-indigo-300 hover:text-white"
          >
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="min-h-[60px]">
          {loading && !advice ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-2 bg-indigo-400/20 rounded-full w-3/4"></div>
              <div className="h-2 bg-indigo-400/20 rounded-full w-full"></div>
              <div className="h-2 bg-indigo-400/20 rounded-full w-5/6"></div>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <span>Error: {error}</span>
              </p>
            </div>
          ) : (
            <div className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line font-light">
              {advice ||
                "Scanning your expenses to provide personalized actionable advice..."}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

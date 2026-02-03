import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, X } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const { isOnline, hasChanged } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);

  useEffect(() => {
    // Show offline banner when going offline
    if (!isOnline) {
      setShowBanner(true);
      setShowOnlineNotice(false);
    }
    // Show "back online" notice briefly when coming back online
    else if (hasChanged && isOnline) {
      setShowBanner(false);
      setShowOnlineNotice(true);
      const timer = setTimeout(() => setShowOnlineNotice(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasChanged]);

  return (
    <AnimatePresence>
      {/* Offline Banner */}
      {showBanner && !isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div className="bg-amber-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">You're offline</p>
                <p className="text-xs opacity-90">
                  Data is stored locally. Receipt scanning requires internet.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-black/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Back Online Notice */}
      {showOnlineNotice && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-center gap-2">
            <Wifi className="w-5 h-5" />
            <p className="font-medium text-sm">You're back online!</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

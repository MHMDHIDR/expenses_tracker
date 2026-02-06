import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { syncService } from "@/services/syncService";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import ScanPage from "@/pages/ScanPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import OfflineBanner from "@/components/OfflineBanner";

export default function App() {
  useEffect(() => {
    // Initialize sync service
    if (navigator.onLine) {
      syncService.startPeriodicSync();
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#fff",
              border: "1px solid #334155",
            },
          }}
        />
        <OfflineBanner />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

import { useState, useEffect } from "react";
import { syncService, type SyncStatus } from "@/services/syncService";

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    const handleStatusChange = (newStatus: SyncStatus) => {
      setStatus({ ...newStatus });
    };

    // Subscribe to status changes
    syncService.on("status-change", handleStatusChange);

    // Initial status update
    setStatus(syncService.getStatus());

    return () => {
      syncService.off("status-change", handleStatusChange);
    };
  }, []);

  const syncNow = async () => {
    return await syncService.sync();
  };

  const pushAllToCloud = async () => {
    return await syncService.pushAllToCloud();
  };

  const restoreFromCloud = async () => {
    return await syncService.restoreFromCloud();
  };

  return {
    ...status,
    syncNow,
    pushAllToCloud,
    restoreFromCloud,
  };
}

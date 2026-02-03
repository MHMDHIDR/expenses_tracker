import { useState, useEffect, useCallback } from "react";

export interface UseNetworkStatusReturn {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether the network status has changed since mount */
  hasChanged: boolean;
  /** Timestamp of last status change */
  lastChanged: Date | null;
  /** Force a check of the network status */
  checkStatus: () => boolean;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [hasChanged, setHasChanged] = useState(false);
  const [lastChanged, setLastChanged] = useState<Date | null>(null);

  const updateStatus = useCallback((online: boolean) => {
    setIsOnline(online);
    setHasChanged(true);
    setLastChanged(new Date());
  }, []);

  useEffect(() => {
    // Set initial status
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => updateStatus(true);
    const handleOffline = () => updateStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [updateStatus]);

  const checkStatus = useCallback(() => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);
    return online;
  }, []);

  return {
    isOnline,
    hasChanged,
    lastChanged,
    checkStatus,
  };
}

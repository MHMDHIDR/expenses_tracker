import { useLiveQuery } from "dexie-react-hooks";
import { offlineDB, offlineStorage } from "@/services/offlineStorage";
import { syncService } from "@/services/syncService";
import type {
  Receipt,
  Item,
  UserSettings,
  BudgetAlert,
} from "@/types/expenses";
import { useMemo, useCallback, useEffect, useState } from "react";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

// Default settings (OpenAI key is now from env vars, not stored in DB)
const DEFAULT_SETTINGS: UserSettings = {
  id: "user_settings",
  budget: 500, // Weekly Budget limit
};

export function useExpenseData() {
  // Sync status state
  const [syncStatus, setSyncStatus] = useState(syncService.getStatus());

  // Subscribe to sync status changes
  useEffect(() => {
    const handleStatusChange = (status: typeof syncStatus) => {
      setSyncStatus({ ...status });
    };

    syncService.on("status-change", handleStatusChange);

    // Note: syncService is a singleton that handles its own initialization.
    // No need to call startPeriodicSync() here - it's done in the service constructor.

    return () => {
      syncService.off("status-change", handleStatusChange);
    };
  }, []);

  // Live queries for reactive data (using offline storage)
  const receipts = useLiveQuery(() => offlineDB.receipts.toArray()) ?? [];
  const items =
    useLiveQuery(() => offlineDB.items.orderBy("date").reverse().toArray()) ??
    [];
  const settings =
    useLiveQuery(() => offlineDB.settings.get("user_settings")) ??
    DEFAULT_SETTINGS;

  // Data helpers
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Calculated values
  const totalSpent = useMemo(() => {
    return receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts]);

  const weeklySpent = useMemo(() => {
    return items
      .filter((item) => {
        const itemDate = new Date(item.date);
        return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items, weekStart, weekEnd]);

  const weeklyBudget = useMemo(() => {
    return settings?.budget ?? 0;
  }, [settings?.budget]);

  const weeklyRemaining = useMemo(() => {
    return weeklyBudget - weeklySpent;
  }, [weeklyBudget, weeklySpent]);

  const spendingPercentage = useMemo(() => {
    if (!weeklyBudget || weeklyBudget === 0) return 0;
    return Math.min((weeklySpent / weeklyBudget) * 100, 100);
  }, [weeklySpent, weeklyBudget]);

  // Budget alerts - only alert when exceeding budget, no balance tracking
  const alerts = useMemo((): BudgetAlert[] => {
    const alertList: BudgetAlert[] = [];

    if (weeklyBudget > 0) {
      const percentUsed = (weeklySpent / weeklyBudget) * 100;

      if (percentUsed >= 100) {
        alertList.push({
          type: "danger",
          title: "Weekly Budget Exceeded!",
          message: `You've spent £${weeklySpent.toFixed(2)} which is ${(
            percentUsed - 100
          ).toFixed(1)}% over your weekly budget of £${weeklyBudget.toFixed(
            2,
          )}.`,
        });
      } else if (percentUsed >= 80) {
        alertList.push({
          type: "warning",
          title: "Weekly Budget Alert",
          message: `You've used ${percentUsed.toFixed(
            1,
          )}% of your weekly budget (£${weeklySpent.toFixed(
            2,
          )} of £${weeklyBudget.toFixed(2)}).`,
        });
      } else if (percentUsed <= 50 && weeklySpent > 0) {
        alertList.push({
          type: "success",
          title: "On Track!",
          message: `You've only used ${percentUsed.toFixed(
            1,
          )}% of your weekly budget. Keep it up!`,
        });
      }
    }

    return alertList;
  }, [weeklySpent, weeklyBudget]);

  // CRUD Operations - now using offlineStorage with sync support
  const addReceipt = useCallback(async (receipt: Omit<Receipt, "id">) => {
    const id = await offlineStorage.addReceipt(receipt);
    // Trigger sync if online
    if (navigator.onLine) {
      syncService.sync();
    }
    return id;
  }, []);

  const addItem = useCallback(async (item: Omit<Item, "id">) => {
    const id = await offlineStorage.addItem(item);
    if (navigator.onLine) {
      syncService.sync();
    }
    return id;
  }, []);

  const addReceiptWithItems = useCallback(
    async (
      receipt: Omit<Receipt, "id">,
      itemsToAdd: Omit<Item, "id" | "receiptId">[],
    ) => {
      const receiptId = await offlineStorage.addReceipt(receipt);

      const itemsWithReceiptId = itemsToAdd.map((item) => ({
        ...item,
        receiptId: receiptId as number,
        date: receipt.date,
      }));

      await offlineStorage.addItems(itemsWithReceiptId);

      // Trigger sync if online
      if (navigator.onLine) {
        syncService.sync();
      }

      return receiptId;
    },
    [],
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      await offlineStorage.updateSettings(newSettings);
      if (navigator.onLine) {
        syncService.sync();
      }
    },
    [],
  );

  const deleteReceipt = useCallback(async (id: number) => {
    await offlineStorage.deleteReceipt(id);
    if (navigator.onLine) {
      syncService.sync();
    }
  }, []);

  const deleteItem = useCallback(async (id: number) => {
    await offlineStorage.deleteItem(id);
    if (navigator.onLine) {
      syncService.sync();
    }
  }, []);

  const getItemsByDate = useCallback(
    (date: Date) => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return items.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
    },
    [items],
  );

  // Group items by date for history view
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, Item[]> = {};
    items.forEach((item) => {
      const dateKey = new Date(item.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [items]);

  // Sync actions
  const triggerSync = useCallback(async () => {
    return await syncService.sync();
  }, []);

  const restoreFromCloud = useCallback(async () => {
    return await syncService.restoreFromCloud();
  }, []);

  return {
    // Data
    receipts,
    items,
    settings,
    itemsByDate,

    // Calculated - spending focused
    totalSpent,
    weeklySpent,
    weeklyBudget,
    weeklyRemaining,
    spendingPercentage,
    alerts,

    // Sync status
    syncStatus,

    // Actions
    addReceipt,
    addItem,
    addReceiptWithItems,
    updateSettings,
    deleteReceipt,
    deleteItem,
    getItemsByDate,

    // Sync actions
    triggerSync,
    restoreFromCloud,
  };
}

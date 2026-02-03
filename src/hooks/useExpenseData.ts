import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import type {
  Receipt,
  Item,
  UserSettings,
  BudgetAlert,
} from "@/types/expenses";
import { useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/format-currency";

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  id: "user_settings",
  budget: 500,
  holding: 1000,
  openaiKey: "",
};

export function useExpenseData() {
  // Live queries for reactive data
  const receipts = useLiveQuery(() => db.receipts.toArray()) ?? [];
  const items =
    useLiveQuery(() => db.items.orderBy("date").reverse().toArray()) ?? [];
  const settings =
    useLiveQuery(() => db.settings.get("user_settings")) ?? DEFAULT_SETTINGS;

  // Calculated values
  const totalSpent = useMemo(() => {
    return receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts]);

  const remaining = useMemo(() => {
    return (settings?.holding ?? 0) - totalSpent;
  }, [settings?.holding, totalSpent]);

  const spendingPercentage = useMemo(() => {
    if (!settings?.budget || settings.budget === 0) return 0;
    return Math.min((totalSpent / settings.budget) * 100, 100);
  }, [totalSpent, settings?.budget]);

  // Budget alerts
  const alerts = useMemo((): BudgetAlert[] => {
    const alertList: BudgetAlert[] = [];
    const budget = settings?.budget ?? 0;
    const holding = settings?.holding ?? 0;

    if (budget > 0) {
      const percentUsed = (totalSpent / budget) * 100;

      if (percentUsed >= 100) {
        alertList.push({
          type: "danger",
          title: "Budget Exceeded!",
          message: `You've spent ${(percentUsed - 100).toFixed(1)}% over your budget. Consider reviewing your expenses.`,
        });
      } else if (percentUsed >= 80) {
        alertList.push({
          type: "warning",
          title: "Budget Alert",
          message: `You've used ${percentUsed.toFixed(1)}% of your budget. Be mindful of remaining expenses.`,
        });
      } else if (percentUsed <= 30 && totalSpent > 0) {
        alertList.push({
          type: "success",
          title: "Great Savings!",
          message: `You've only used ${percentUsed.toFixed(1)}% of your budget. Consider investing the surplus!`,
        });
      }
    }

    if (remaining < 50 && holding > 0) {
      alertList.push({
        type: "danger",
        title: "Low Funds",
        message: `Only ${formatCurrency({ price: remaining })} remaining. Time to watch your spending!`,
      });
    }

    return alertList;
  }, [totalSpent, remaining, settings?.budget, settings?.holding]);

  // CRUD Operations
  const addReceipt = useCallback(async (receipt: Omit<Receipt, "id">) => {
    return await db.receipts.add(receipt as Receipt);
  }, []);

  const addItem = useCallback(async (item: Omit<Item, "id">) => {
    return await db.items.add(item as Item);
  }, []);

  const addReceiptWithItems = useCallback(
    async (
      receipt: Omit<Receipt, "id">,
      itemsToAdd: Omit<Item, "id" | "receiptId">[],
    ) => {
      const receiptId = await db.receipts.add(receipt as Receipt);

      const itemsWithReceiptId = itemsToAdd.map((item) => ({
        ...item,
        receiptId: receiptId as number,
        date: receipt.date,
      }));

      await db.items.bulkAdd(itemsWithReceiptId as Item[]);

      return receiptId;
    },
    [],
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      const current = await db.settings.get("user_settings");
      if (current) {
        await db.settings.update("user_settings", newSettings);
      } else {
        await db.settings.add({
          ...DEFAULT_SETTINGS,
          ...newSettings,
          id: "user_settings",
        });
      }
    },
    [],
  );

  const deleteReceipt = useCallback(async (id: number) => {
    await db.items.where("receiptId").equals(id).delete();
    await db.receipts.delete(id);
  }, []);

  const deleteItem = useCallback(async (id: number) => {
    await db.items.delete(id);
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

  return {
    // Data
    receipts,
    items,
    settings,
    itemsByDate,

    // Calculated
    totalSpent,
    remaining,
    spendingPercentage,
    alerts,

    // Actions
    addReceipt,
    addItem,
    addReceiptWithItems,
    updateSettings,
    deleteReceipt,
    deleteItem,
    getItemsByDate,
  };
}

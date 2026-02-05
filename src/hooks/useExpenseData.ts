import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import type {
  Receipt,
  Item,
  UserSettings,
  BudgetAlert,
  Income,
} from "@/types/expenses";
import { useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  id: "user_settings",
  budget: 500, // Now treated as "Weekly Budget"
  holding: 1000, // Now treated as "Initial Balance"
  openaiKey: "",
};

export function useExpenseData() {
  // Live queries for reactive data
  const receipts = useLiveQuery(() => db.receipts.toArray()) ?? [];
  const items =
    useLiveQuery(() => db.items.orderBy("date").reverse().toArray()) ?? [];
  const settings =
    useLiveQuery(() => db.settings.get("user_settings")) ?? DEFAULT_SETTINGS;
  const incomes =
    useLiveQuery(() => db.incomes.orderBy("date").reverse().toArray()) ?? [];

  // Data helpers
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Calculated values
  const totalSpent = useMemo(() => {
    return receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts]);

  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, i) => sum + i.amount, 0);
  }, [incomes]);

  const currentHoldings = useMemo(() => {
    // Holdings = Initial Balance + Total Income - Total Spent
    const initialBalance = settings?.holding ?? 0;
    return initialBalance + totalIncome - totalSpent;
  }, [settings?.holding, totalIncome, totalSpent]);

  const weeklySpent = useMemo(() => {
    return items
      .filter((item) => {
        const itemDate = new Date(item.date);
        return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items, weekStart, weekEnd]);

  const weeklyRemaining = useMemo(() => {
    const budget = settings?.budget ?? 0;
    return budget - weeklySpent;
  }, [settings?.budget, weeklySpent]);

  const spendingPercentage = useMemo(() => {
    const budget = settings?.budget ?? 0;
    if (!budget || budget === 0) return 0;
    return Math.min((weeklySpent / budget) * 100, 100);
  }, [weeklySpent, settings?.budget]);

  // Budget alerts
  const alerts = useMemo((): BudgetAlert[] => {
    const alertList: BudgetAlert[] = [];
    const budget = settings?.budget ?? 0; // Weekly Budget

    if (budget > 0) {
      const percentUsed = (weeklySpent / budget) * 100;

      if (percentUsed >= 100) {
        alertList.push({
          type: "danger",
          title: "Weekly Budget Exceeded!",
          message: `You've spent ${(percentUsed - 100).toFixed(
            1,
          )}% over your weekly budget.`,
        });
      } else if (percentUsed >= 80) {
        alertList.push({
          type: "warning",
          title: "Weekly Budget Alert",
          message: `You've used ${percentUsed.toFixed(
            1,
          )}% of your weekly budget.`,
        });
      }
    }

    if (currentHoldings < 100) {
      alertList.push({
        type: "danger",
        title: "Low Account Balance",
        message: `Only ${formatCurrency({
          price: currentHoldings,
        })} remaining in your account.`,
      });
    }

    return alertList;
  }, [weeklySpent, currentHoldings, settings?.budget]);

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

  const addIncome = useCallback(async (income: Omit<Income, "id">) => {
    return await db.incomes.add(income as Income);
  }, []);

  const deleteIncome = useCallback(async (id: number) => {
    return await db.incomes.delete(id);
  }, []);

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
    incomes,

    // Calculated
    totalSpent,
    weeklySpent,
    totalIncome,
    remaining: weeklyRemaining, // Export as "remaining" for backward compatibility with UI, but it's weekly remaining budget
    holdings: currentHoldings, // Export as "holdings" (current balance)
    spendingPercentage,
    alerts,

    // Actions
    addReceipt,
    addItem,
    addReceiptWithItems,
    addIncome,
    deleteIncome,
    updateSettings,
    deleteReceipt,
    deleteItem,
    getItemsByDate,
  };
}

import Dexie, { type EntityTable } from "dexie";
import type { Receipt, Item, UserSettings } from "@/types/expenses";

// Extend Dexie with typed tables
const db = new Dexie("ExpenseTrackerDB") as Dexie & {
  receipts: EntityTable<Receipt, "id">;
  items: EntityTable<Item, "id">;
  settings: EntityTable<UserSettings, "id">;
};

// Schema definition
db.version(3)
  .stores({
    receipts: "++id, date, totalAmount, merchant, processed",
    items: "++id, receiptId, name, date, price",
    settings: "id, budget, openaiKey",
    incomes: null, // Delete the incomes table
  })
  .upgrade(() => {
    // This is a version upgrade, existing data will be preserved
    // Dexie handles the removal of the incomes table automatically
  });

export { db };

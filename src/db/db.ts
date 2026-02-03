import Dexie, { type EntityTable } from "dexie";
import type { Receipt, Item, UserSettings } from "@/types/expenses";

// Extend Dexie with typed tables
const db = new Dexie("ExpenseTrackerDB") as Dexie & {
  receipts: EntityTable<Receipt, "id">;
  items: EntityTable<Item, "id">;
  settings: EntityTable<UserSettings, "id">;
};

// Schema definition
db.version(1).stores({
  receipts: "++id, date, totalAmount, merchant, processed",
  items: "++id, receiptId, name, date, price",
  settings: "id, budget, holding, openaiKey",
});

export { db };

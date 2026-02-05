import Dexie, { type EntityTable } from "dexie";
import type { Receipt, Item, UserSettings, Income } from "@/types/expenses";

// Extend Dexie with typed tables
const db = new Dexie("ExpenseTrackerDB") as Dexie & {
  receipts: EntityTable<Receipt, "id">;
  items: EntityTable<Item, "id">;
  settings: EntityTable<UserSettings, "id">;
  incomes: EntityTable<Income, "id">;
};

// Schema definition
db.version(2)
  .stores({
    receipts: "++id, date, totalAmount, merchant, processed",
    items: "++id, receiptId, name, date, price",
    settings: "id, budget, holding, openaiKey",
    incomes: "++id, date, amount, source, description",
  })
  .upgrade(() => {
    // This is a version upgrade, existing data will be preserved
    // Dexie handles the addition of the new table automatically
  });

export { db };

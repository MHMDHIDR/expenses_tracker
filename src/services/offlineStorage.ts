/**
 * Offline Storage Service
 *
 * This service handles local IndexedDB operations for offline-first PWA support.
 * Data is stored locally and synced to MongoDB when online.
 */

import Dexie, { type EntityTable } from "dexie";
import type { Receipt, Item, UserSettings } from "@/types/expenses";

// Sync metadata interface
export interface SyncMetadata {
  id: string;
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  cloudId?: string; // MongoDB ObjectId
}

// Extended interfaces with sync metadata
export interface LocalReceipt extends Receipt {
  syncMeta?: SyncMetadata;
}

export interface LocalItem extends Item {
  syncMeta?: SyncMetadata;
}

export interface LocalUserSettings extends UserSettings {
  syncMeta?: SyncMetadata;
}

// Sync queue for offline changes
export interface SyncQueueItem {
  id?: number;
  entityType: "receipt" | "item" | "settings";
  entityId: string;
  action: "create" | "update" | "delete";
  data: unknown;
  createdAt: Date;
  retryCount: number;
}

// Local database with sync support
class ExpenseTrackerDB extends Dexie {
  receipts!: EntityTable<LocalReceipt, "id">;
  items!: EntityTable<LocalItem, "id">;
  settings!: EntityTable<LocalUserSettings, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("ExpenseTrackerDB");

    // Version 5: Removed openaiKey from settings (now in env vars)
    this.version(5).stores({
      receipts:
        "++id, date, totalAmount, merchant, processed, syncMeta.cloudId",
      items: "++id, receiptId, name, date, price, syncMeta.cloudId",
      settings: "id, budget, syncMeta.cloudId",
      syncQueue: "++id, entityType, entityId, action, createdAt",
      incomes: null, // Remove legacy table
    });
  }
}

export const offlineDB = new ExpenseTrackerDB();

/**
 * Local storage operations
 */
export const offlineStorage = {
  // Receipt operations
  async addReceipt(receipt: Omit<LocalReceipt, "id">): Promise<number> {
    const id = await offlineDB.receipts.add({
      ...receipt,
      syncMeta: {
        id: crypto.randomUUID(),
        lastSyncedAt: null,
        pendingSync: true,
      },
    } as LocalReceipt);

    // Add to sync queue
    await this.queueSync("receipt", String(id), "create", receipt);

    return id as number;
  },

  async getReceipts(): Promise<LocalReceipt[]> {
    return await offlineDB.receipts.toArray();
  },

  async deleteReceipt(id: number): Promise<void> {
    const receipt = await offlineDB.receipts.get(id);
    if (receipt) {
      await offlineDB.items.where("receiptId").equals(id).delete();
      await offlineDB.receipts.delete(id);
      await this.queueSync("receipt", String(id), "delete", {
        id,
        cloudId: receipt.syncMeta?.cloudId,
      });
    }
  },

  // Item operations
  async addItem(item: Omit<LocalItem, "id">): Promise<number> {
    const id = await offlineDB.items.add({
      ...item,
      syncMeta: {
        id: crypto.randomUUID(),
        lastSyncedAt: null,
        pendingSync: true,
      },
    } as LocalItem);

    await this.queueSync("item", String(id), "create", item);
    return id as number;
  },

  async addItems(items: Omit<LocalItem, "id">[]): Promise<void> {
    const itemsWithMeta = items.map((item) => ({
      ...item,
      syncMeta: {
        id: crypto.randomUUID(),
        lastSyncedAt: null,
        pendingSync: true,
      },
    }));

    const ids = await offlineDB.items.bulkAdd(itemsWithMeta as LocalItem[], {
      allKeys: true,
    });

    // Queue sync for each item
    for (let i = 0; i < ids.length; i++) {
      await this.queueSync("item", String(ids[i]), "create", items[i]);
    }
  },

  async getItems(): Promise<LocalItem[]> {
    return await offlineDB.items.orderBy("date").reverse().toArray();
  },

  async deleteItem(id: number): Promise<void> {
    const item = await offlineDB.items.get(id);
    if (item) {
      await offlineDB.items.delete(id);
      await this.queueSync("item", String(id), "delete", {
        id,
        cloudId: item.syncMeta?.cloudId,
      });
    }
  },

  // Settings operations
  async getSettings(): Promise<LocalUserSettings | null> {
    return (await offlineDB.settings.get("user_settings")) ?? null;
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await offlineDB.settings.get("user_settings");

    if (current) {
      await offlineDB.settings.update("user_settings", {
        ...settings,
        syncMeta: {
          id: current.syncMeta?.id ?? crypto.randomUUID(),
          lastSyncedAt: current.syncMeta?.lastSyncedAt ?? null,
          cloudId: current.syncMeta?.cloudId,
          pendingSync: true,
        },
      });
    } else {
      await offlineDB.settings.add({
        id: "user_settings",
        budget: 500,
        ...settings,
        syncMeta: {
          id: crypto.randomUUID(),
          lastSyncedAt: null,
          pendingSync: true,
        },
      } as LocalUserSettings);
    }

    await this.queueSync(
      "settings",
      "user_settings",
      current ? "update" : "create",
      settings,
    );
  },

  // Sync queue operations
  async queueSync(
    entityType: SyncQueueItem["entityType"],
    entityId: string,
    action: SyncQueueItem["action"],
    data: unknown,
  ): Promise<void> {
    await offlineDB.syncQueue.add({
      entityType,
      entityId,
      action,
      data,
      createdAt: new Date(),
      retryCount: 0,
    });

    // Notify sync service
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("expense-tracker:data-changed"));
    }
  },

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return await offlineDB.syncQueue.orderBy("createdAt").toArray();
  },

  async removeSyncItem(id: number): Promise<void> {
    await offlineDB.syncQueue.delete(id);
  },

  async incrementRetryCount(id: number): Promise<void> {
    await offlineDB.syncQueue.update(id, {
      retryCount: (await offlineDB.syncQueue.get(id))?.retryCount ?? 0 + 1,
    });
  },

  // Mark entities as synced
  async markReceiptSynced(localId: number, cloudId: string): Promise<void> {
    await offlineDB.receipts.update(localId, {
      syncMeta: {
        id: crypto.randomUUID(),
        lastSyncedAt: new Date(),
        pendingSync: false,
        cloudId,
      },
    });
  },

  async markItemSynced(localId: number, cloudId: string): Promise<void> {
    await offlineDB.items.update(localId, {
      syncMeta: {
        id: crypto.randomUUID(),
        lastSyncedAt: new Date(),
        pendingSync: false,
        cloudId,
      },
    });
  },

  async markSettingsSynced(cloudId: string): Promise<void> {
    const current = await offlineDB.settings.get("user_settings");
    if (current) {
      await offlineDB.settings.update("user_settings", {
        syncMeta: {
          id: crypto.randomUUID(),
          lastSyncedAt: new Date(),
          pendingSync: false,
          cloudId,
        },
      });
    }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    await offlineDB.receipts.clear();
    await offlineDB.items.clear();
    await offlineDB.syncQueue.clear();
  },

  // NEW: Sync helpers for full synchronization
  async getUnsyncedReceipts(): Promise<LocalReceipt[]> {
    return await offlineDB.receipts
      .filter((r) => !r.syncMeta?.cloudId)
      .toArray();
  },

  async getUnsyncedItems(): Promise<LocalItem[]> {
    return await offlineDB.items.filter((i) => !i.syncMeta?.cloudId).toArray();
  },

  async getSyncedReceipts(): Promise<LocalReceipt[]> {
    return await offlineDB.receipts
      .filter((r) => !!r.syncMeta?.cloudId)
      .toArray();
  },

  async getSyncedItems(): Promise<LocalItem[]> {
    return await offlineDB.items.filter((i) => !!i.syncMeta?.cloudId).toArray();
  },

  async bulkUpsertReceipts(
    receipts: Array<Omit<LocalReceipt, "id"> & { cloudId: string }>,
  ): Promise<void> {
    await offlineDB.transaction("rw", offlineDB.receipts, async () => {
      for (const receipt of receipts) {
        const existing = await offlineDB.receipts
          .where("syncMeta.cloudId")
          .equals(receipt.cloudId)
          .first();

        const syncMeta = {
          id: existing?.syncMeta?.id ?? crypto.randomUUID(),
          lastSyncedAt: new Date(),
          pendingSync: false,
          cloudId: receipt.cloudId,
        };

        if (existing) {
          await offlineDB.receipts.update(existing.id!, {
            ...receipt,
            syncMeta,
          });
        } else {
          // Ensure we don't accidentally save 'id' field if it was passed in the spread
          const { id, ...receiptData } = receipt as any;
          await offlineDB.receipts.add({
            ...receiptData,
            syncMeta,
          } as LocalReceipt);
        }
      }
    });
  },

  async bulkUpsertItems(
    items: Array<Omit<LocalItem, "id"> & { cloudId: string }>,
  ): Promise<void> {
    await offlineDB.transaction("rw", offlineDB.items, async () => {
      for (const item of items) {
        const existing = await offlineDB.items
          .where("syncMeta.cloudId")
          .equals(item.cloudId)
          .first();

        const syncMeta = {
          id: existing?.syncMeta?.id ?? crypto.randomUUID(),
          lastSyncedAt: new Date(),
          pendingSync: false,
          cloudId: item.cloudId,
        };

        if (existing) {
          await offlineDB.items.update(existing.id!, {
            ...item,
            syncMeta,
          });
        } else {
          // Ensure we don't accidentally save 'id' field if it was passed in the spread
          const { id, ...itemData } = item as any;
          await offlineDB.items.add({
            ...itemData,
            syncMeta,
          } as LocalItem);
        }
      }
    });
  },

  async deleteReceiptsByCloudIds(cloudIds: string[]): Promise<void> {
    if (cloudIds.length === 0) return;
    await offlineDB.receipts.where("syncMeta.cloudId").anyOf(cloudIds).delete();
  },

  async deleteItemsByCloudIds(cloudIds: string[]): Promise<void> {
    if (cloudIds.length === 0) return;
    await offlineDB.items.where("syncMeta.cloudId").anyOf(cloudIds).delete();
  },
};

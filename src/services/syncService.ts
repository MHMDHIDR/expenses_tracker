/**
 * Sync Service
 *
 * This service handles synchronization between local IndexedDB storage
 * and the MongoDB backend. It supports:
 * - Online/offline detection
 * - Background sync when connection is restored
 * - Conflict resolution (local-first strategy)
 * - Retry logic for failed syncs
 */

import { offlineStorage, offlineDB } from "./offlineStorage";
import { apiClient } from "./apiClient";
import type { Receipt, Item, UserSettings } from "@/types/expenses";

// Sync status
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
}

// Sync event types
type SyncEventType =
  | "sync-start"
  | "sync-complete"
  | "sync-error"
  | "status-change";

type SyncEventCallback = (status: SyncStatus) => void;

class SyncService {
  private status: SyncStatus = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncAt: null,
    pendingChanges: 0,
    error: null,
  };

  private listeners: Map<SyncEventType, Set<SyncEventCallback>> = new Map();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_RETRY_COUNT = 3;

  constructor() {
    if (typeof window !== "undefined") {
      // Listen for online/offline events
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);

      // Listen for local data changes
      window.addEventListener("expense-tracker:data-changed", () => {
        this.updatePendingCount();
        if (this.status.isOnline) {
          this.sync();
        }
      });

      // Update pending changes count
      this.updatePendingCount();

      // Start sync if already online
      if (this.status.isOnline) {
        this.sync();
        this.startPeriodicSync();
      }
    }
  }

  // Event handling
  on(event: SyncEventType, callback: SyncEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: SyncEventType, callback: SyncEventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: SyncEventType): void {
    this.listeners.get(event)?.forEach((cb) => cb(this.status));
    // Always emit status-change for any event
    if (event !== "status-change") {
      this.listeners.get("status-change")?.forEach((cb) => cb(this.status));
    }
  }

  // Online/offline handlers
  private handleOnline = (): void => {
    this.status.isOnline = true;
    this.emit("status-change");
    // Trigger sync when coming back online
    this.sync();
    // Start periodic sync
    this.startPeriodicSync();
  };

  private handleOffline = (): void => {
    this.status.isOnline = false;
    this.emit("status-change");
    // Stop periodic sync
    this.stopPeriodicSync();
  };

  // Periodic sync
  startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.status.isOnline && !this.status.isSyncing) {
        this.sync();
      }
    }, this.SYNC_INTERVAL_MS);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Update pending changes count
  private async updatePendingCount(): Promise<void> {
    try {
      const pending = await offlineStorage.getPendingSyncItems();
      this.status.pendingChanges = pending.length;
      this.emit("status-change");
    } catch (error) {
      console.error("Failed to update pending count:", error);
    }
  }

  // Get current status
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // Main sync function
  async sync(): Promise<boolean> {
    if (this.status.isSyncing || !this.status.isOnline) {
      return false;
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.emit("sync-start");

    try {
      // Get pending sync items
      const pendingItems = await offlineStorage.getPendingSyncItems();

      // Process each pending item
      for (const item of pendingItems) {
        const success = await this.processSyncItem(item);

        if (success) {
          await offlineStorage.removeSyncItem(item.id!);
        } else if (item.retryCount >= this.MAX_RETRY_COUNT) {
          // Remove failed items after max retries
          console.error(
            `Sync item ${item.id} failed after ${this.MAX_RETRY_COUNT} retries`,
          );
          await offlineStorage.removeSyncItem(item.id!);
        } else {
          await offlineStorage.incrementRetryCount(item.id!);
        }
      }

      this.status.lastSyncAt = new Date();
      this.status.isSyncing = false;
      await this.updatePendingCount();
      this.emit("sync-complete");

      // Check if more items were added while syncing
      const remainingItems = await offlineStorage.getPendingSyncItems();
      if (remainingItems.length > 0) {
        this.sync();
      }

      return true;
    } catch (error) {
      this.status.error =
        error instanceof Error ? error.message : "Sync failed";
      this.status.isSyncing = false;
      this.emit("sync-error");
      return false;
    }
  }

  // Process individual sync item
  private async processSyncItem(item: {
    entityType: "receipt" | "item" | "settings";
    entityId: string;
    action: "create" | "update" | "delete";
    data: unknown;
  }): Promise<boolean> {
    try {
      switch (item.entityType) {
        case "receipt":
          return await this.syncReceipt(
            item.action,
            item.entityId,
            item.data as Partial<Receipt>,
          );
        case "item":
          return await this.syncItem(
            item.action,
            item.entityId,
            item.data as Partial<Item>,
          );
        case "settings":
          // Settings can only be created or updated, not deleted
          if (item.action === "delete") return true; // No-op for settings delete
          return await this.syncSettings(item.data as Partial<UserSettings>);
        default:
          return false;
      }
    } catch (error) {
      console.error(
        `Sync error for ${item.entityType}:${item.entityId}:`,
        error,
      );
      return false;
    }
  }

  // Sync receipt
  private async syncReceipt(
    action: "create" | "update" | "delete",
    entityId: string,
    data: Partial<Receipt>,
  ): Promise<boolean> {
    switch (action) {
      case "create": {
        const result = await apiClient.createReceipt(
          data as Omit<Receipt, "id">,
        );
        if (result.success && result.data) {
          await offlineStorage.markReceiptSynced(
            parseInt(entityId),
            result.data._id,
          );
          return true;
        }
        return false;
      }
      case "update": {
        const localReceipt = await offlineDB.receipts.get(parseInt(entityId));
        if (!localReceipt?.syncMeta?.cloudId) return false;
        const result = await apiClient.updateReceipt(
          localReceipt.syncMeta.cloudId,
          data,
        );
        return result.success;
      }
      case "delete": {
        const deleteData = data as { cloudId?: string };
        if (!deleteData.cloudId) return true; // Nothing to delete in cloud
        const result = await apiClient.deleteReceipt(deleteData.cloudId);
        return result.success;
      }
      default:
        return false;
    }
  }

  // Sync item
  private async syncItem(
    action: "create" | "update" | "delete",
    entityId: string,
    data: Partial<Item>,
  ): Promise<boolean> {
    switch (action) {
      case "create": {
        const result = await apiClient.createItem(data as Omit<Item, "id">);
        if (result.success && result.data) {
          await offlineStorage.markItemSynced(
            parseInt(entityId),
            result.data._id,
          );
          return true;
        }
        return false;
      }
      case "update": {
        const localItem = await offlineDB.items.get(parseInt(entityId));
        if (!localItem?.syncMeta?.cloudId) return false;
        const result = await apiClient.updateItem(
          localItem.syncMeta.cloudId,
          data,
        );
        return result.success;
      }
      case "delete": {
        const deleteData = data as { cloudId?: string };
        if (!deleteData.cloudId) return true; // Nothing to delete in cloud
        const result = await apiClient.deleteItem(deleteData.cloudId);
        return result.success;
      }
      default:
        return false;
    }
  }

  // Sync settings - always uses upsert (PUT)
  private async syncSettings(data: Partial<UserSettings>): Promise<boolean> {
    const result = await apiClient.updateSettings(data);
    if (result.success && result.data) {
      await offlineStorage.markSettingsSynced(result.data._id);
      return true;
    }
    return false;
  }

  // Restore from cloud (initial sync or data recovery)
  async restoreFromCloud(): Promise<boolean> {
    if (!this.status.isOnline) {
      return false;
    }

    try {
      const result = await apiClient.fetchAll();

      if (!result.success || !result.data) {
        return false;
      }

      // Clear local data
      await offlineStorage.clearAll();

      // Import receipts
      for (const receipt of result.data.receipts) {
        const { _id, ...receiptData } = receipt;
        await offlineDB.receipts.add({
          ...receiptData,
          syncMeta: {
            id: crypto.randomUUID(),
            lastSyncedAt: new Date(),
            pendingSync: false,
            cloudId: _id,
          },
        });
      }

      // Import items
      for (const item of result.data.items) {
        const { _id, ...itemData } = item;
        await offlineDB.items.add({
          ...itemData,
          syncMeta: {
            id: crypto.randomUUID(),
            lastSyncedAt: new Date(),
            pendingSync: false,
            cloudId: _id,
          },
        });
      }

      // Import settings
      if (result.data.settings) {
        const { _id, userId, ...settingsData } = result.data.settings;
        await offlineDB.settings.put({
          id: "user_settings",
          ...settingsData,
          syncMeta: {
            id: crypto.randomUUID(),
            lastSyncedAt: new Date(),
            pendingSync: false,
            cloudId: _id,
          },
        });
      }

      this.status.lastSyncAt = new Date();
      this.emit("sync-complete");
      return true;
    } catch (error) {
      console.error("Failed to restore from cloud:", error);
      return false;
    }
  }

  /**
   * Push all local data to cloud
   * This syncs ALL local items, receipts, and settings to MongoDB,
   * not just items in the sync queue. Useful for initial sync or
   * when the user explicitly wants to push all local data.
   */
  async pushAllToCloud(): Promise<boolean> {
    if (!this.status.isOnline) {
      this.status.error = "Cannot sync while offline";
      this.emit("status-change");
      return false;
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.emit("sync-start");

    try {
      // Get all local data
      const localReceipts = await offlineDB.receipts.toArray();
      const localItems = await offlineDB.items.toArray();
      const localSettings = await offlineDB.settings.get("user_settings");

      let successCount = 0;
      let errorCount = 0;

      // Sync receipts that don't have a cloudId (never synced)
      for (const receipt of localReceipts) {
        if (!receipt.syncMeta?.cloudId) {
          try {
            const { id, syncMeta, ...receiptData } = receipt;
            const result = await apiClient.createReceipt(receiptData);
            if (result.success && result.data) {
              await offlineStorage.markReceiptSynced(
                id as number,
                result.data._id,
              );
              successCount++;
            } else {
              errorCount++;
            }
          } catch (e) {
            console.error("Failed to sync receipt:", e);
            errorCount++;
          }
        }
      }

      // Sync items that don't have a cloudId (never synced)
      for (const item of localItems) {
        if (!item.syncMeta?.cloudId) {
          try {
            const { id, syncMeta, ...itemData } = item;
            const result = await apiClient.createItem(itemData);
            if (result.success && result.data) {
              await offlineStorage.markItemSynced(
                id as number,
                result.data._id,
              );
              successCount++;
            } else {
              errorCount++;
            }
          } catch (e) {
            console.error("Failed to sync item:", e);
            errorCount++;
          }
        }
      }

      // Sync settings
      if (localSettings && !localSettings.syncMeta?.cloudId) {
        try {
          const { id, syncMeta, ...settingsData } = localSettings;
          const result = await apiClient.updateSettings(settingsData);
          if (result.success && result.data) {
            await offlineStorage.markSettingsSynced(result.data._id);
            successCount++;
          } else {
            errorCount++;
          }
        } catch (e) {
          console.error("Failed to sync settings:", e);
          errorCount++;
        }
      }

      // Also process any remaining sync queue items
      const pendingItems = await offlineStorage.getPendingSyncItems();
      for (const item of pendingItems) {
        const success = await this.processSyncItem(item);
        if (success) {
          await offlineStorage.removeSyncItem(item.id!);
          successCount++;
        } else {
          errorCount++;
        }
      }

      this.status.lastSyncAt = new Date();
      this.status.isSyncing = false;
      await this.updatePendingCount();

      if (errorCount > 0) {
        this.status.error = `Synced ${successCount} items, ${errorCount} failed`;
      }

      this.emit("sync-complete");
      return errorCount === 0;
    } catch (error) {
      this.status.error =
        error instanceof Error ? error.message : "Push to cloud failed";
      this.status.isSyncing = false;
      this.emit("sync-error");
      return false;
    }
  }

  // Cleanup
  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    this.stopPeriodicSync();
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncService = new SyncService();

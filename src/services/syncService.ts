/**
 * Sync Service
 *
 * This service handles synchronization between local IndexedDB storage
 * and the MongoDB backend. It supports:
 * - Online/offline detection
 * - Background sync when connection is restored
 * - Conflict resolution (local-first strategy)
 * - Retry logic for failed syncs
 * - Debouncing to prevent infinite loops
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
  private readonly SYNC_DEBOUNCE_MS = 2000; // 2 seconds debounce
  private readonly MIN_SYNC_INTERVAL_MS = 5000; // Minimum 5 seconds between syncs

  // Guards to prevent multiple initializations and rapid sync calls
  private initialized = false;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSyncAttempt: number = 0;
  private consecutiveFailures: number = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Prevent multiple initializations
    if (this.initialized || typeof window === "undefined") {
      return;
    }
    this.initialized = true;

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Listen for local data changes - use debounced sync
    window.addEventListener(
      "expense-tracker:data-changed",
      this.handleDataChanged,
    );

    // Update pending changes count (don't trigger sync)
    this.updatePendingCount();

    // Schedule initial sync after a short delay (not immediate)
    if (this.status.isOnline) {
      setTimeout(() => {
        this.performFullSync().then(() => {
          this.startPeriodicSync();
        });
      }, 1000);
    }
  }

  // Debounced handler for data changes
  private handleDataChanged = (): void => {
    this.updatePendingCount();
    if (this.status.isOnline && !this.status.isSyncing) {
      this.debouncedSync();
    }
  };

  // Debounced sync to prevent rapid-fire requests
  private debouncedSync(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(() => {
      this.syncDebounceTimer = null;
      this.sync();
    }, this.SYNC_DEBOUNCE_MS);
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
    this.consecutiveFailures = 0; // Reset failure count when coming back online
    this.emit("status-change");
    // Trigger full sync when coming back online
    this.performFullSync();
    // Start periodic sync
    this.startPeriodicSync();
  };

  private handleOffline = (): void => {
    this.status.isOnline = false;
    this.emit("status-change");
    // Stop periodic sync
    this.stopPeriodicSync();
    // Cancel any pending debounced syncs
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  };

  // Periodic sync - with guard against duplicate intervals
  startPeriodicSync(): void {
    // Don't start if already running
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      // Only sync if online, not already syncing, and not too many failures
      if (
        this.status.isOnline &&
        !this.status.isSyncing &&
        this.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES
      ) {
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

  // Main sync function with throttling and guards
  async sync(): Promise<boolean> {
    // Guard: Don't sync if already syncing
    if (this.status.isSyncing) {
      return false;
    }

    // Guard: Don't sync if offline
    if (!this.status.isOnline) {
      return false;
    }

    // Guard: Throttle sync attempts
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.MIN_SYNC_INTERVAL_MS) {
      return false;
    }

    // Guard: Stop if too many consecutive failures
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.status.error =
        "Sync paused due to repeated failures. Please try again later.";
      this.emit("status-change");
      return false;
    }

    this.lastSyncAttempt = now;
    this.status.isSyncing = true;
    this.status.error = null;
    this.emit("sync-start");

    try {
      // Get pending sync items
      const pendingItems = await offlineStorage.getPendingSyncItems();

      // If no pending items, we're done
      if (pendingItems.length === 0) {
        this.status.lastSyncAt = new Date();
        this.status.isSyncing = false;
        this.consecutiveFailures = 0;
        this.emit("sync-complete");
        return true;
      }

      let successCount = 0;
      let failureCount = 0;

      // Process each pending item
      for (const item of pendingItems) {
        const success = await this.processSyncItem(item);

        if (success) {
          await offlineStorage.removeSyncItem(item.id!);
          successCount++;
        } else if (item.retryCount >= this.MAX_RETRY_COUNT) {
          // Remove failed items after max retries
          console.error(
            `Sync item ${item.id} failed after ${this.MAX_RETRY_COUNT} retries, removing from queue`,
          );
          await offlineStorage.removeSyncItem(item.id!);
          failureCount++;
        } else {
          await offlineStorage.incrementRetryCount(item.id!);
          failureCount++;
        }
      }

      this.status.lastSyncAt = new Date();
      this.status.isSyncing = false;
      await this.updatePendingCount();

      // Track consecutive failures
      if (failureCount > 0 && successCount === 0) {
        this.consecutiveFailures++;
      } else {
        this.consecutiveFailures = 0;
      }

      this.emit("sync-complete");

      // IMPORTANT: Do NOT recursively call sync() here!
      // The periodic sync will handle pending items on the next interval.
      // This prevents infinite loops when sync keeps failing.

      return failureCount === 0;
    } catch (error) {
      this.status.error =
        error instanceof Error ? error.message : "Sync failed";
      this.status.isSyncing = false;
      this.consecutiveFailures++;
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
      this.consecutiveFailures = 0;
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
  /**
   * Perform Full Sync (Bi-directional)
   * 1. Push local unsynced changes to cloud
   * 2. Pull all data from cloud
   * 3. Merge and reconcile (server wins on conflict)
   */
  async performFullSync(): Promise<boolean> {
    if (!this.status.isOnline) {
      this.status.error = "Cannot sync while offline";
      this.emit("status-change");
      return false;
    }

    this.consecutiveFailures = 0;
    this.status.isSyncing = true;
    this.status.error = null;
    this.emit("sync-start");

    try {
      // Step 1: Push Local Changes
      await this.pushLocalChanges();

      // Step 2: Pull Cloud Data
      const cloudResult = await apiClient.fetchAll();
      if (!cloudResult.success || !cloudResult.data) {
        throw new Error(cloudResult.error || "Failed to fetch cloud data");
      }

      // Step 3: Merge & Reconcile
      const {
        receipts: cloudReceipts,
        items: cloudItems,
        settings: cloudSettings,
      } = cloudResult.data;

      // 3.1: Upsert Receipts
      // Map cloud receipts to format suitable for bulkUpsert
      const receiptsToUpsert = cloudReceipts.map((r) => {
        const { _id, ...data } = r;
        return {
          ...data,
          cloudId: _id,
        };
      });
      await offlineStorage.bulkUpsertReceipts(receiptsToUpsert);

      // 3.2: Upsert Items
      const itemsToUpsert = cloudItems.map((i) => {
        const { _id, ...data } = i;
        return {
          ...data,
          cloudId: _id,
        };
      });
      await offlineStorage.bulkUpsertItems(itemsToUpsert);

      // 3.3: Sync Settings
      if (cloudSettings) {
        const { _id, userId, ...settingsData } = cloudSettings;
        await offlineStorage.updateSettings(settingsData);
        await offlineStorage.markSettingsSynced(_id);
      }

      // 3.4: Delete Stale Data (Server Deletion Propagation)
      // Identify local items that have a cloudId but are NOT in the fetched cloud data
      const localSyncedReceipts = await offlineStorage.getSyncedReceipts();
      const cloudReceiptIds = new Set(cloudReceipts.map((r) => r._id));
      const receiptsToDelete = localSyncedReceipts
        .filter(
          (r) =>
            r.syncMeta?.cloudId && !cloudReceiptIds.has(r.syncMeta.cloudId),
        )
        .map((r) => r.syncMeta!.cloudId!); // these are cloudIds to delete

      if (receiptsToDelete.length > 0) {
        // We delete by cloudId to avoid accidentally deleting a new local-only item
        // But offlineStorage.deleteReceiptsByCloudIds does exactly that.
        await offlineStorage.deleteReceiptsByCloudIds(receiptsToDelete);
      }

      const localSyncedItems = await offlineStorage.getSyncedItems();
      const cloudItemIds = new Set(cloudItems.map((i) => i._id));
      const itemsToDelete = localSyncedItems
        .filter(
          (i) => i.syncMeta?.cloudId && !cloudItemIds.has(i.syncMeta.cloudId),
        )
        .map((i) => i.syncMeta!.cloudId!);

      if (itemsToDelete.length > 0) {
        await offlineStorage.deleteItemsByCloudIds(itemsToDelete);
      }

      this.status.lastSyncAt = new Date();
      this.status.isSyncing = false;
      await this.updatePendingCount();
      this.emit("sync-complete");

      return true;
    } catch (error) {
      console.error("Full sync error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Full sync failed";

      // Handle connection refused / network errors specifically
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError")
      ) {
        this.status.error = "Connection failed. Is the backend server running?";
      } else {
        this.status.error = errorMessage;
      }

      this.status.isSyncing = false;
      this.emit("sync-error");
      return false;
    }
  }

  // Helper to push local changes
  private async pushLocalChanges(): Promise<void> {
    // Get unsynced resources
    const unsyncedReceipts = await offlineStorage.getUnsyncedReceipts();
    const unsyncedItems = await offlineStorage.getUnsyncedItems();
    const settings = await offlineStorage.getSettings();

    // Push Receipts
    for (const receipt of unsyncedReceipts) {
      try {
        // If it has no cloudId, create it
        const { id, syncMeta, ...data } = receipt;
        const result = await apiClient.createReceipt(data);
        if (result.success && result.data) {
          await offlineStorage.markReceiptSynced(id as number, result.data._id);
        }
      } catch (e) {
        console.error("Failed to push receipt", e);
      }
    }

    // Push Items
    // We can use bulk create for items if implemented, or loop.
    // Current usage in pushAllToCloud loop. We can try bulk.
    // apiClient.createItems expects Omit<Item, "id">[]
    if (unsyncedItems.length > 0) {
      // Chunk them or send all? Let's trying sending all to createItems endpoint used in apiClient
      // Wait, apiClient.createItems is exposed.

      // However, we need to map back the created IDs to local IDs.
      // The bulk create API returns the created objects (with _ids).
      // Assuming they return in order?
      // The backend implementation:
      /*
            const createdItems = await prisma.$transaction(items.map(...))
            return createdItems
           */
      // Promise.all or $transaction order is generally preserved but lets be safer with loop for now to guarantee mapping 1:1 if we are unsure of API contract details.
      // Or better: use the loop like before to be safe.
      for (const item of unsyncedItems) {
        try {
          const { id, syncMeta, ...data } = item;
          const result = await apiClient.createItem(data);
          if (result.success && result.data) {
            await offlineStorage.markItemSynced(id as number, result.data._id);
          }
        } catch (e) {
          console.error("Failed to push item", e);
        }
      }
    }

    // Push Settings
    if (settings && !settings.syncMeta?.cloudId) {
      try {
        const { id, syncMeta, ...settingsData } = settings;
        const result = await apiClient.updateSettings(settingsData);
        if (result.success && result.data) {
          await offlineStorage.markSettingsSynced(result.data._id);
        }
      } catch (e) {
        console.error("Failed to sync settings:", e);
      }
    }

    // Process Sync Queue (deletes vs updates)
    // This handles things that HAVE a cloudId but need Update/Delete
    const pendingQueue = await offlineStorage.getPendingSyncItems();
    for (const item of pendingQueue) {
      await this.processSyncItem(item);
      await offlineStorage.removeSyncItem(item.id!);
    }
  }

  /**
   * @deprecated Use performFullSync() instead
   */
  async pushAllToCloud(): Promise<boolean> {
    return this.performFullSync();
  }

  // Reset failure counter (useful when user manually triggers sync)
  resetFailures(): void {
    this.consecutiveFailures = 0;
    this.status.error = null;
    this.emit("status-change");
  }

  // Cleanup
  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      window.removeEventListener(
        "expense-tracker:data-changed",
        this.handleDataChanged,
      );
    }
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    this.stopPeriodicSync();
    this.listeners.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const syncService = new SyncService();

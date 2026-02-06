/**
 * API Client for MongoDB Operations
 *
 * This service handles communication with the backend API for MongoDB operations.
 * The API endpoints are served by a Node.js backend (or serverless functions).
 */

import type { Receipt, Item, UserSettings } from "@/types/expenses";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CloudReceipt extends Omit<Receipt, "id"> {
  _id: string;
}

interface CloudItem extends Omit<Item, "id"> {
  _id: string;
}

interface CloudUserSettings extends Omit<UserSettings, "id"> {
  _id: string;
  userId: string;
}

// Helper for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const apiClient = {
  // Receipt operations
  async createReceipt(
    receipt: Omit<Receipt, "id">,
  ): Promise<ApiResponse<CloudReceipt>> {
    return apiCall<CloudReceipt>("/receipts", {
      method: "POST",
      body: JSON.stringify(receipt),
    });
  },

  async getReceipts(): Promise<ApiResponse<CloudReceipt[]>> {
    return apiCall<CloudReceipt[]>("/receipts");
  },

  async getReceipt(id: string): Promise<ApiResponse<CloudReceipt>> {
    return apiCall<CloudReceipt>(`/receipts/${id}`);
  },

  async updateReceipt(
    id: string,
    receipt: Partial<Receipt>,
  ): Promise<ApiResponse<CloudReceipt>> {
    return apiCall<CloudReceipt>(`/receipts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(receipt),
    });
  },

  async deleteReceipt(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiCall<{ deleted: boolean }>(`/receipts/${id}`, {
      method: "DELETE",
    });
  },

  // Item operations
  async createItem(item: Omit<Item, "id">): Promise<ApiResponse<CloudItem>> {
    return apiCall<CloudItem>("/items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  async createItems(
    items: Omit<Item, "id">[],
  ): Promise<ApiResponse<CloudItem[]>> {
    return apiCall<CloudItem[]>("/items/bulk", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  async getItems(): Promise<ApiResponse<CloudItem[]>> {
    return apiCall<CloudItem[]>("/items");
  },

  async getItem(id: string): Promise<ApiResponse<CloudItem>> {
    return apiCall<CloudItem>(`/items/${id}`);
  },

  async updateItem(
    id: string,
    item: Partial<Item>,
  ): Promise<ApiResponse<CloudItem>> {
    return apiCall<CloudItem>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(item),
    });
  },

  async deleteItem(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiCall<{ deleted: boolean }>(`/items/${id}`, {
      method: "DELETE",
    });
  },

  // Settings operations
  async getSettings(): Promise<ApiResponse<CloudUserSettings>> {
    return apiCall<CloudUserSettings>("/settings");
  },

  async updateSettings(
    settings: Partial<UserSettings>,
  ): Promise<ApiResponse<CloudUserSettings>> {
    return apiCall<CloudUserSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },

  // Sync operations
  async syncAll(data: {
    receipts: Array<Omit<Receipt, "id"> & { localId: number }>;
    items: Array<Omit<Item, "id"> & { localId: number }>;
    settings: Partial<UserSettings> | null;
  }): Promise<
    ApiResponse<{
      receipts: Array<{ localId: number; cloudId: string }>;
      items: Array<{ localId: number; cloudId: string }>;
      settings: { cloudId: string } | null;
    }>
  > {
    return apiCall("/sync", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Fetch all data from cloud (for initial sync or restore)
  async fetchAll(): Promise<
    ApiResponse<{
      receipts: CloudReceipt[];
      items: CloudItem[];
      settings: CloudUserSettings | null;
    }>
  > {
    return apiCall("/sync/all");
  },
};

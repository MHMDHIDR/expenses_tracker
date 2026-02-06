# Implementation Plan: Expense Tracker Refactoring

## Overview

This plan refactors the expense tracker to:

1. **Remove "how much money I have"** concept (balance/holdings tracking)
2. **Keep "how much money I have spent"** concept (spending tracking)
3. **Add Item Recurrence Analysis Chart** with dropdown time period filters
4. **Migrate from IndexedDB (Dexie) to MongoDB with Prisma 6** with offline PWA caching

---

## Phase 1: Remove Balance/Holdings Concept

**Goal:** Remove all UI and logic related to tracking "how much money I have" while keeping spending tracking.

### 1.1 Update Types (`src/types/expenses.ts`)

- Remove `holding` from `UserSettings` interface
- Remove `Income` interface (no longer tracking income)

### 1.2 Update useExpenseData Hook (`src/hooks/useExpenseData.ts`)

- Remove `incomes` live query
- Remove `totalIncome` calculation
- Remove `currentHoldings` calculation
- Remove "Low Account Balance" alert
- Remove all income-related CRUD operations (`addIncome`, `deleteIncome`)
- Keep `weeklySpent`, `weeklyRemaining`, `spendingPercentage`, and budget alerts

### 1.3 Update Home Page (`src/pages/Home.tsx`)

- Remove "Current Balance" stat card
- Remove "Weekly Budget Left" stat card (this shows remaining money)
- Keep "Weekly Spend" stat card
- Add "Weekly Budget" stat card (shows the limit, not remaining)
- Keep "Receipts" stat card
- Update the alert logic (only show budget exceeded alerts)

### 1.4 Update Settings Page (`src/pages/SettingsPage.tsx`)

- Remove "Initial Balance" (holding) input section
- Keep "Weekly Budget" input section
- Keep "OpenAI API Key" section
- Keep "Data Management" section

### 1.5 Update Database Schema (`src/db/db.ts`)

- Remove `incomes` table
- Remove `holding` from settings schema

---

## Phase 2: Add Item Recurrence Analysis Chart

**Goal:** Add a new chart showing how many times each item was purchased over selected time periods.

### 2.1 Create Recurrence Analysis Component

- Create new component: `src/components/RecurrenceAnalysis.tsx`
- Time period filters as dropdown: 3 days, 7 days, 2 weeks, 1 month, 3 months, 6 months, 9 months, 1 year
- Show top items by purchase frequency
- Show total spent on each item in the selected period
- Use horizontal bar chart for visualization

### 2.2 Integrate into Home Page

- Add new chart section after the existing Spending Analysis chart
- Style consistently with existing charts

---

## Phase 3: Migrate to MongoDB with Prisma 6

**Goal:** Replace IndexedDB (Dexie) with MongoDB using Prisma, while maintaining offline PWA capability.

### 3.1 Architecture Decision

**Approach:** Since Prisma requires a backend (Node.js runtime), we need to:

1. Create an API layer (Express or serverless functions)
2. Keep local caching for offline support
3. Sync between local cache and MongoDB when online

**Alternative Simpler Approach:**
Since this is a PWA that needs to work offline-first, we'll use a hybrid approach:

- MongoDB Atlas for cloud storage
- Local Storage/Cache API for offline data
- Background sync when online

### 3.2 Set Up Prisma Schema

- Create `prisma/schema.prisma`
- Define models: `Receipt`, `Item`, `UserSettings`
- Configure MongoDB connection

### 3.3 Create Backend API

- Create `src/api/` directory
- Implement API routes for CRUD operations
- Use serverless-friendly approach (Vite can serve API routes)

### 3.4 Create Data Sync Service

- Create `src/services/syncService.ts`
- Handle online/offline detection
- Queue offline changes
- Sync when connection restored
- Maintain local cache for offline access

### 3.5 Update Data Layer

- Create new hook `useMongoDB.ts` as data abstraction
- Replace Dexie calls with API calls + local cache
- Implement optimistic updates

### 3.6 Update PWA Configuration

- Update service worker for API caching
- Configure offline fallback strategies

---

## Implementation Order

### Step 1: Phase 1 - Remove Balance Concept (Files: 5)

1. `src/types/expenses.ts` - Remove interfaces
2. `src/hooks/useExpenseData.ts` - Remove calculations and operations
3. `src/pages/Home.tsx` - Remove balance cards
4. `src/pages/SettingsPage.tsx` - Remove holding input
5. `src/db/db.ts` - Remove incomes table

### Step 2: Phase 2 - Add Recurrence Chart (Files: 2)

1. `src/components/RecurrenceAnalysis.tsx` - New component
2. `src/pages/Home.tsx` - Integrate component

### Step 3: Phase 3 - MongoDB Migration (Files: 8+)

1. `prisma/schema.prisma` - Create schema
2. Create backend API layer
3. `src/services/syncService.ts` - Data sync
4. `src/hooks/useExpenseData.ts` - Update to use new data layer
5. Update PWA configuration
6. Update offline caching strategy

---

## File Changes Summary

### Modified Files:

- `src/types/expenses.ts`
- `src/hooks/useExpenseData.ts`
- `src/pages/Home.tsx`
- `src/pages/SettingsPage.tsx`
- `src/db/db.ts`
- `vite.config.ts`

### New Files:

- `src/components/RecurrenceAnalysis.tsx`
- `prisma/schema.prisma`
- `src/lib/mongoClient.ts`
- `src/services/syncService.ts`
- `src/services/offlineStorage.ts`

---

## Notes

### Critical Considerations:

1. **MongoDB Access in Browser**: Prisma Client cannot run directly in the browser. We need a backend API.
2. **PWA Offline First**: All data must be cached locally for offline access.
3. **Data Migration**: Existing IndexedDB data should be migrated to MongoDB when the user goes online.

### Recommended Approach for PWA + MongoDB:

Since this is a frontend-only PWA, the cleanest solution is:

1. Keep IndexedDB for local storage (via Dexie or native)
2. Add API calls to sync with MongoDB
3. Use service worker for background sync
4. User data exists in both places with automatic sync

This maintains the offline-first PWA nature while adding cloud persistence.

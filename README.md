# Expense Tracker PWA

A Progressive Web App for tracking expenses with receipt scanning, budget alerts, and MongoDB cloud sync with offline support.

## Features

- 📸 **Receipt Scanning** - AI-powered receipt parsing with OpenAI Vision API
- 💰 **Budget Tracking** - Weekly budget limits with alerts
- 📊 **Spending Analysis** - Visual charts for spending patterns
- 🔄 **Purchase Recurrence** - Track how often you buy items
- 📱 **PWA Support** - Install on mobile, works offline
- ☁️ **Cloud Sync** - MongoDB storage with automatic sync when online

## Architecture

### Frontend (Vite + React)

- **React 19** with TypeScript
- **Dexie.js** for local IndexedDB storage (offline-first)
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization

### Backend (Express + Prisma)

- **Express.js** REST API server
- **Prisma 6** ORM for MongoDB
- **MongoDB Atlas** for cloud storage

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     PWA Frontend                            │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ useExpense  │───>│  offlineDB   │<──>│  IndexedDB    │  │
│  │   Data      │    │  (Dexie.js)  │    │  (Local)      │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         │                  │                                │
│         v                  v                                │
│  ┌─────────────┐    ┌──────────────┐                       │
│  │ syncService │<──>│   apiClient  │                       │
│  └─────────────┘    └──────────────┘                       │
└─────────────────────────────│───────────────────────────────┘
                              │ HTTP/REST
                              v
┌─────────────────────────────────────────────────────────────┐
│                     API Server                              │
│  ┌─────────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Express.js     │───>│  Prisma ORM  │───>│  MongoDB  │  │
│  │  REST API       │    │              │    │  Atlas    │  │
│  └─────────────────┘    └──────────────┘    └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
bun install

# Install server dependencies
bun run server:install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# MongoDB connection (for server)
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/expenses_tracker?retryWrites=true&w=majority"

# OpenAI API Key (required for receipt scanning)
VITE_OPENAI_API_KEY="sk-your-openai-api-key"

# API Server URL (for frontend to connect to backend)
VITE_API_URL="http://localhost:3001/api"
```

> **Security Note**: The OpenAI API key is stored in environment variables for security, not in the database. This prevents accidental exposure and makes it easier to rotate keys.

### 3. Setup Database

```bash
# Generate Prisma client
bun run db:generate

# Push schema to MongoDB
bun run db:push
```

### 4. Run Development Servers

```bash
# Run both frontend and backend together
bun run dev:all

# Or run separately:
bun run dev          # Frontend on :5173
bun run server:dev   # Backend on :3001
```

## Project Structure

```
expenses_tracker/
├── prisma/
│   └── schema.prisma      # MongoDB schema definition
├── server/
│   ├── index.ts           # Express API server
│   ├── package.json       # Server dependencies
│   └── tsconfig.json      # Server TypeScript config
├── src/
│   ├── components/
│   │   └── RecurrenceAnalysis.tsx  # Item recurrence chart
│   ├── hooks/
│   │   ├── useExpenseData.ts       # Main data hook
│   │   └── useReceiptScanner.ts    # OpenAI receipt parsing
│   ├── pages/
│   │   ├── Home.tsx                # Dashboard
│   │   ├── ScanPage.tsx            # Receipt scanner
│   │   ├── HistoryPage.tsx         # Purchase history
│   │   └── SettingsPage.tsx        # App settings
│   ├── services/
│   │   ├── apiClient.ts            # REST API client
│   │   ├── offlineStorage.ts       # IndexedDB storage
│   │   └── syncService.ts          # Cloud sync logic
│   └── types/
│       └── expenses.ts             # TypeScript interfaces
├── .env.example                    # Environment template
├── package.json                    # Frontend dependencies
└── README.md                       # This file
```

## Scripts

| Script                   | Description              |
| ------------------------ | ------------------------ |
| `bun run dev`            | Start Vite dev server    |
| `bun run dev:all`        | Start frontend + backend |
| `bun run build`          | Build for production     |
| `bun run server:dev`     | Start API server         |
| `bun run server:install` | Install server deps      |
| `bun run db:generate`    | Generate Prisma client   |
| `bun run db:push`        | Push schema to MongoDB   |
| `bun run db:studio`      | Open Prisma Studio       |

## Offline Support

The app works fully offline using IndexedDB for local storage. When online:

1. **Automatic Sync** - Changes sync to MongoDB every 30 seconds
2. **Real-time Sync** - Immediate sync on data changes (when online)
3. **Reconnection Sync** - Queued changes sync when back online
4. **Conflict Resolution** - Local-first strategy for data conflicts

## API Endpoints

| Method | Endpoint            | Description           |
| ------ | ------------------- | --------------------- |
| GET    | `/api/receipts`     | Get all receipts      |
| POST   | `/api/receipts`     | Create receipt        |
| PATCH  | `/api/receipts/:id` | Update receipt        |
| DELETE | `/api/receipts/:id` | Delete receipt        |
| GET    | `/api/items`        | Get all items         |
| POST   | `/api/items`        | Create item           |
| POST   | `/api/items/bulk`   | Create multiple items |
| PATCH  | `/api/items/:id`    | Update item           |
| DELETE | `/api/items/:id`    | Delete item           |
| GET    | `/api/settings`     | Get user settings     |
| PUT    | `/api/settings`     | Update settings       |
| GET    | `/api/sync/all`     | Fetch all data        |
| POST   | `/api/sync`         | Bulk sync             |
| GET    | `/api/health`       | Health check          |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, Prisma 6, TypeScript
- **Database**: MongoDB Atlas (cloud), IndexedDB (local)
- **AI**: OpenAI Vision API for receipt parsing
- **PWA**: vite-plugin-pwa, Service Workers

## License

MIT

# AI Expense Tracker PWA

A modern, local-first Progressive Web App (PWA) for tracking personal finances. This application leverages AI for receipt scanning and offers powerful visualizations to keep your budget in check, all while respecting your privacy by storing data locally on your device.

## Features

- 📱 **Mobile-First PWA**: Installable on iOS and Android, works offline, and feels like a native app.
- 🧾 **AI Receipt Scanning**: Snap a photo of your receipt to automatically extract items, prices, and totals using OpenAI's GPT-4o-mini.
- 💰 **Budget Management**: Set weekly budgets and hold amounts to track your financial health.
- 📊 **Visual Analytics**: Interactive charts and graphs to visualize your spending habits.
- 🔒 **Local-First Privacy**: All data is stored in your browser using IndexedDB (via Dexie.js). No external servers hold your financial data.
- 🎨 **Premium UI/UX**: Built with Framer Motion for smooth animations and a polished dark-mode aesthetic.

## Tech Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **PWA**: Vite PWA Plugin
- **AI**: OpenAI API

## Getting Started

### Prerequisites

- Node.js installed
- An OpenAI API Key (for receipt scanning features)

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory.

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Configuration

To use the AI receipt scanning feature, you will need to enter your OpenAI API key in the **Settings** page of the application. The key is stored locally in your browser and is never sent to our servers.

## Project Structure

```
src/
├── components/   # Reusable UI components
├── db/          # Dexie database schema and configuration
├── hooks/       # Custom React hooks (Expense logic, Scanner)
├── lib/         # Utilities (OpenAI client, helpers)
├── pages/       # Application routes/pages
└── types/       # TypeScript type definitions
```

## Privacy

This application follows a strict **Local-First** philosophy.

- **No Account Required**: You don't need to sign up or log in.
- **Your Data is Yours**: All receipts, transactions, and settings are stored in your browser's IndexedDB.
- **Clear Data**: You can wipe all your data instantly from the Settings page.

---

_Keep your finances in check with style._

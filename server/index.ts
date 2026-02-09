/**
 * Express API Server for Expense Tracker
 *
 * This server provides REST API endpoints for MongoDB operations
 * using Prisma as the ORM.
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Allow larger payloads for images

// Error handling helper
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============ RECEIPT ROUTES ============

// Get all receipts
app.get(
  "/api/receipts",
  asyncHandler(async (_req: Request, res: Response) => {
    const receipts = await prisma.receipt.findMany({
      orderBy: { date: "desc" },
      include: { items: true },
    });
    res.json(receipts);
  }),
);

// Get single receipt
app.get(
  "/api/receipts/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const receipt = await prisma.receipt.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true },
    });

    if (!receipt) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }

    res.json(receipt);
  }),
);

// Create receipt
app.post(
  "/api/receipts",
  asyncHandler(async (req: Request, res: Response) => {
    const { date, totalAmount, imageUrl, merchant, processed } = req.body;

    const receipt = await prisma.receipt.create({
      data: {
        date: new Date(date),
        totalAmount,
        imageUrl,
        merchant,
        processed: processed ?? false,
      },
    });

    res.status(201).json(receipt);
  }),
);

// Update receipt
app.patch(
  "/api/receipts/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { date, totalAmount, imageUrl, merchant, processed } = req.body;

    const receipt = await prisma.receipt.update({
      where: { id: String(req.params.id) },
      data: {
        ...(date && { date: new Date(date) }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(merchant !== undefined && { merchant }),
        ...(processed !== undefined && { processed }),
      },
    });

    res.json(receipt);
  }),
);

// Delete receipt
app.delete(
  "/api/receipts/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.receipt.delete({
      where: { id: String(req.params.id) },
    });

    res.json({ deleted: true });
  }),
);

// ============ ITEM ROUTES ============

// Get all items
app.get(
  "/api/items",
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await prisma.item.findMany({
      orderBy: { date: "desc" },
    });
    res.json(items);
  }),
);

// Get single item
app.get(
  "/api/items/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const item = await prisma.item.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json(item);
  }),
);

// Create item
app.post(
  "/api/items",
  asyncHandler(async (req: Request, res: Response) => {
    const { receiptId, name, quantity, price, date } = req.body;

    // Only use receiptId if it's a valid MongoDB ObjectId (24 char hex string)
    const validReceiptId =
      typeof receiptId === "string" && /^[a-f\d]{24}$/i.test(receiptId)
        ? receiptId
        : undefined;

    const item = await prisma.item.create({
      data: {
        receiptId: validReceiptId,
        name,
        quantity: quantity ?? 1,
        price,
        date: new Date(date),
      },
    });

    res.status(201).json(item);
  }),
);

// Bulk create items
app.post(
  "/api/items/bulk",
  asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body;

    const createdItems = await prisma.$transaction(
      items.map(
        (item: {
          receiptId?: string | number;
          name: string;
          quantity?: number;
          price: number;
          date: string;
        }) => {
          // Only use receiptId if it's a valid MongoDB ObjectId
          const validReceiptId =
            typeof item.receiptId === "string" &&
            /^[a-f\d]{24}$/i.test(item.receiptId)
              ? item.receiptId
              : undefined;

          return prisma.item.create({
            data: {
              receiptId: validReceiptId,
              name: item.name,
              quantity: item.quantity ?? 1,
              price: item.price,
              date: new Date(item.date),
            },
          });
        },
      ),
    );

    res.status(201).json(createdItems);
  }),
);

// Update item
app.patch(
  "/api/items/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, quantity, price, date } = req.body;

    const item = await prisma.item.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(quantity !== undefined && { quantity }),
        ...(price !== undefined && { price }),
        ...(date && { date: new Date(date) }),
      },
    });

    res.json(item);
  }),
);

// Delete item
app.delete(
  "/api/items/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.item.delete({
      where: { id: String(req.params.id) },
    });

    res.json({ deleted: true });
  }),
);

// ============ SETTINGS ROUTES ============

// Get settings
app.get(
  "/api/settings",
  asyncHandler(async (_req: Request, res: Response) => {
    let settings = await prisma.userSettings.findFirst({
      where: { userId: "default_user" },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: "default_user",
          budget: 500,
        },
      });
    }

    res.json(settings);
  }),
);

// Update settings (upsert)
// Note: OpenAI API key is stored in environment variables, not in DB
app.put(
  "/api/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const { budget } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: "default_user" },
      update: {
        ...(budget !== undefined && { budget }),
      },
      create: {
        userId: "default_user",
        budget: budget ?? 500,
      },
    });

    res.json(settings);
  }),
);

// ============ SYNC ROUTES ============

// Fetch all data for sync/restore
app.get(
  "/api/sync/all",
  asyncHandler(async (_req: Request, res: Response) => {
    const [receipts, items, settings] = await Promise.all([
      prisma.receipt.findMany({ orderBy: { date: "desc" } }),
      prisma.item.findMany({ orderBy: { date: "desc" } }),
      prisma.userSettings.findFirst({ where: { userId: "default_user" } }),
    ]);

    res.json({
      receipts,
      items,
      settings,
    });
  }),
);

// Bulk sync endpoint
app.post(
  "/api/sync",
  asyncHandler(async (req: Request, res: Response) => {
    const { receipts, items, settings } = req.body;

    const results = {
      receipts: [] as Array<{ localId: number; cloudId: string }>,
      items: [] as Array<{ localId: number; cloudId: string }>,
      settings: null as { cloudId: string } | null,
    };

    // Sync receipts
    if (receipts && Array.isArray(receipts)) {
      for (const receipt of receipts) {
        const { localId, ...data } = receipt;
        const created = await prisma.receipt.create({
          data: {
            date: new Date(data.date),
            totalAmount: data.totalAmount,
            imageUrl: data.imageUrl,
            merchant: data.merchant,
            processed: data.processed ?? false,
          },
        });
        results.receipts.push({ localId, cloudId: created.id });
      }
    }

    // Sync items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { localId, ...data } = item;
        const created = await prisma.item.create({
          data: {
            receiptId: data.receiptId,
            name: data.name,
            quantity: data.quantity ?? 1,
            price: data.price,
            date: new Date(data.date),
          },
        });
        results.items.push({ localId, cloudId: created.id });
      }
    }

    // Sync settings (OpenAI API key is stored in env vars, not synced)
    if (settings) {
      const updated = await prisma.userSettings.upsert({
        where: { userId: "default_user" },
        update: {
          budget: settings.budget,
        },
        create: {
          userId: "default_user",
          budget: settings.budget ?? 500,
        },
      });
      results.settings = { cloudId: updated.id };
    }

    res.json(results);
  }),
);

// ============ HEALTH CHECK ============

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ ERROR HANDLING ============

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ============ START SERVER ============

// Export app for Vercel
export default app;

// Start server only if not running in Vercel (local development)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

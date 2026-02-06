import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { useExpenseData } from "@/hooks/useExpenseData";
import { useReceiptScanner } from "@/hooks/useReceiptScanner";
import {
  Camera,
  Upload,
  X,
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  CalendarDays,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";

export default function ScanPage() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addReceiptWithItems } = useExpenseData();
  const { scanReceipt, isProcessing, error, clearError, isConfigured } =
    useReceiptScanner();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [parsedData, setParsedData] = useState<{
    merchant?: string;
    items: { name: string; quantity: number; price: number; date: Date }[];
    total?: number;
  } | null>(null);
  const [receiptDate, setReceiptDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!capturedImage || !isConfigured) return;

    clearError();
    const result = await scanReceipt(capturedImage);

    if (result) {
      setParsedData(result);
    }
  };

  const saveReceipt = async () => {
    if (!parsedData) return;

    const total =
      parsedData.total ??
      parsedData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

    try {
      const selectedDate = new Date(receiptDate);
      // Ensure date is set to start of day in local timezone
      selectedDate.setHours(12, 0, 0, 0);

      await addReceiptWithItems(
        {
          date: selectedDate,
          totalAmount: total,
          merchant: parsedData.merchant,
          imageUrl: capturedImage ?? undefined,
          processed: true,
        },
        parsedData.items,
      );

      toast.success("Receipt saved successfully!");
      navigate("/");
    } catch (err) {
      toast.error("Failed to save receipt");
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setParsedData(null);
    setReceiptDate(new Date().toISOString().split("T")[0]);
    clearError();
  };

  const updateItem = (
    index: number,
    field: "name" | "quantity" | "price",
    value: string,
  ) => {
    if (!parsedData) return;

    const updatedItems = [...parsedData.items];
    if (field === "name") {
      updatedItems[index] = { ...updatedItems[index], name: value };
    } else if (field === "quantity") {
      const numValue = parseInt(value) || 0;
      updatedItems[index] = { ...updatedItems[index], quantity: numValue };
    } else if (field === "price") {
      const numValue = parseFloat(value) || 0;
      updatedItems[index] = { ...updatedItems[index], price: numValue };
    }

    setParsedData({
      ...parsedData,
      items: updatedItems,
      // Recalculate total when items change
      total: updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    });
  };

  const addItem = () => {
    if (!parsedData) return;

    setParsedData({
      ...parsedData,
      items: [
        ...parsedData.items,
        {
          name: "",
          quantity: 1,
          price: 0,
          date: new Date(receiptDate),
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (!parsedData) return;

    const newItems = parsedData.items.filter((_, i) => i !== index);

    setParsedData({
      ...parsedData,
      items: newItems,
      // Recalculate total when items change
      total: newItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    });
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white pb-24 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
          <p className="text-slate-400 mb-4">
            Please add your OpenAI API key to your environment variables to use
            the receipt scanner.
          </p>
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-slate-400 text-sm mb-2">
              Add this to your{" "}
              <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">
                .env
              </code>{" "}
              file:
            </p>
            <code className="text-cyan-300 text-sm">
              VITE_OPENAI_API_KEY=sk-your-api-key
            </code>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="bg-linear-to-r from-emerald-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Go to Settings
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-12 pb-6"
      >
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Scan Receipt
        </h1>
        <p className="text-slate-400 mt-1">Capture or upload your receipt</p>
      </motion.header>

      <div className="px-4">
        <AnimatePresence mode="wait">
          {/* Camera View */}
          {showCamera && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative rounded-2xl overflow-hidden mb-6"
            >
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full rounded-2xl"
                videoConstraints={{
                  facingMode: "environment",
                }}
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={() => setShowCamera(false)}
                  className="p-4 bg-slate-800/80 backdrop-blur rounded-full"
                >
                  <X className="size-6" />
                </button>
                <button
                  onClick={capturePhoto}
                  className="p-4 bg-emerald-500 rounded-full"
                >
                  <Camera className="size-6" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && !parsedData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6"
            >
              <div className="relative rounded-2xl overflow-hidden mb-4">
                <img
                  src={capturedImage}
                  alt="Captured receipt"
                  className="w-full rounded-2xl"
                />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 p-2 bg-slate-800/80 backdrop-blur rounded-full"
                >
                  <X className="size-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="size-5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <button
                onClick={processImage}
                disabled={isProcessing}
                className="w-full bg-linear-to-r from-emerald-500 to-cyan-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    Analyze Receipt
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Parsed Results */}
          {parsedData && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6">
                {parsedData.merchant && (
                  <div className="mb-4 pb-4 border-b border-slate-700">
                    <span className="text-slate-400 text-sm">Merchant</span>
                    <p className="text-lg font-semibold">
                      {parsedData.merchant}
                    </p>
                  </div>
                )}

                {/* Receipt Date Picker */}
                <div className="mb-4 pb-4 border-b border-slate-700">
                  <label className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                    <CalendarDays className="size-4" />
                    Receipt Date
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full bg-slate-600/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 scheme-dark"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Change this if the receipt is from a different day
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-slate-400 text-sm">
                    Items Found (tap to edit)
                  </span>
                  {parsedData.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-700/30 p-3 rounded-xl space-y-2"
                    >
                      {/* Item Name */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateItem(index, "name", e.target.value)
                          }
                          className="flex-1 bg-slate-600/50 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          placeholder="Item name"
                        />
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        {/* Quantity */}
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 mb-1 block">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            className="w-full bg-slate-600/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          />
                        </div>
                        {/* Price */}
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 mb-1 block">
                            Price (£)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) =>
                              updateItem(index, "price", e.target.value)
                            }
                            className="w-full bg-slate-600/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          />
                        </div>
                        {/* Subtotal (readonly) */}
                        <div className="flex-1">
                          <label className="text-xs text-slate-400 mb-1 block">
                            Subtotal
                          </label>
                          <div className="bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-semibold">
                            {formatCurrency({
                              price: item.price * item.quantity,
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <button
                    onClick={addItem}
                    className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 font-medium hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="size-5" />
                    Add Item
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {formatCurrency({
                      price:
                        parsedData.total ??
                        parsedData.items.reduce(
                          (sum, item) => sum + item.price * item.quantity,
                          0,
                        ),
                    })}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 bg-slate-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <RotateCcw className="size-5" />
                  Retry
                </button>
                <button
                  onClick={saveReceipt}
                  className="flex-1 bg-linear-to-r from-emerald-500 to-cyan-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Check className="size-5" />
                  Save
                </button>
              </div>
            </motion.div>
          )}

          {/* Initial State - Capture Options */}
          {!showCamera && !capturedImage && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-3 mb-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCamera(true)}
                className="w-full bg-linear-to-br from-emerald-500 to-cyan-500 rounded-2xl p-8 text-center"
              >
                <Camera className="size-12 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">Take Photo</h3>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center"
              >
                <Upload className="size-12 mx-auto mb-3 text-slate-400" />
                <h3 className="text-xl font-semibold">Upload Image</h3>
              </motion.button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

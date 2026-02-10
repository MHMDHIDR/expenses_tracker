import { useState, useCallback } from "react";
import type { ParsedReceipt } from "@/types/expenses";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are an expert receipt parser. Analyze the receipt image and extract:
1. Merchant/Store name (if visible)
2. All purchased items with their:
   - Name (product name)
   - Quantity (number of items, default to 1 if not specified)
   - Price (unit price or total price for that item)

Return ONLY valid JSON in this exact format, without any markdown formatting or code blocks:
{
  "merchant": "Store Name or null",
  "items": [
    {"name": "Product Name", "quantity": 1, "price": 9.99}
  ],
  "total": 99.99
}

Be accurate with prices. If you cannot read something clearly, make your best guess. Always return valid JSON.`;

// Get API key from environment variable
const getApiKey = (): string => {
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

export function useReceiptScanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if API key is configured
  const isConfigured = Boolean(getApiKey());

  const scanReceipt = useCallback(
    async (imageBase64: string): Promise<ParsedReceipt | null> => {
      const apiKey = getApiKey();

      if (!apiKey) {
        setError(
          "Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.",
        );
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-1.5-flash-latest as it is more stable for version resolution
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash-latest",
        });

        // Prepare image data (strip prefix if present)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const result = await model.generateContent([
          SYSTEM_PROMPT,
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg",
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new Error("No response from AI");
        }

        // Extract JSON from response (handle markdown code blocks if any remain)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        // Clean up any potential leading/trailing whitespace or non-JSON characters
        jsonStr = jsonStr.trim();

        // Basic JSON validation before parsing
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        const parsed: ParsedReceipt = JSON.parse(jsonStr);

        // Validate the response structure
        if (!parsed.items || !Array.isArray(parsed.items)) {
          throw new Error("Invalid response format");
        }

        return parsed;
      } catch (err) {
        let message =
          err instanceof Error ? err.message : "Failed to scan receipt";

        // Improve error message for common 404 model not found error
        if (message.includes("404") && message.includes("not found")) {
          message =
            "Model not found. Please check your API key permissions or try a different region/model.";
        }

        setError(message);
        console.error("Receipt scanning error:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    scanReceipt,
    isProcessing,
    error,
    clearError,
    isConfigured,
  };
}

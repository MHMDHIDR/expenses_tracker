import { useState, useCallback } from "react";
import type { ParsedReceipt } from "@/types/expenses";

const SYSTEM_PROMPT = `You are an expert receipt parser. Analyze the receipt image and extract:
1. Merchant/Store name (if visible)
2. All purchased items with their:
   - Name (product name)
   - Quantity (number of items, default to 1 if not specified)
   - Price (unit price or total price for that item)

Return ONLY valid JSON in this exact format:
{
  "merchant": "Store Name or null",
  "items": [
    {"name": "Product Name", "quantity": 1, "price": 9.99}
  ],
  "total": 99.99
}

Be accurate with prices. If you cannot read something clearly, make your best guess. Always return valid JSON.`;

// Get API key from environment variable (more secure than storing in DB)
const getApiKey = (): string => {
  return import.meta.env.VITE_OPENAI_API_KEY || "";
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
          "OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.",
        );
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: SYSTEM_PROMPT,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Parse this receipt image and extract all items with their prices and quantities.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: imageBase64.startsWith("data:")
                          ? imageBase64
                          : `data:image/jpeg;base64,${imageBase64}`,
                      },
                    },
                  ],
                },
              ],
              max_tokens: 1000,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to process receipt",
          );
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
          throw new Error("No response from AI");
        }

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        const parsed: ParsedReceipt = JSON.parse(jsonStr.trim());

        // Validate the response structure
        if (!parsed.items || !Array.isArray(parsed.items)) {
          throw new Error("Invalid response format");
        }

        return parsed;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to scan receipt";
        setError(message);
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

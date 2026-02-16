import { useState, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Item } from "@/types/expenses";

const SYSTEM_PROMPT = `You are a financial advisor. Analyze the following list of purchases and provide concise, actionable advice.
Focus on:
1. Spending patterns (e.g., too much on coffee, subscriptions, etc.)
2. Whether the user is spending too much or too little overall given the timeframe.
3. Specific tips to save money.

Return the advice in plain text, but structure it with bullet points or short paragraphs. Keep it under 100 words.`;

// Get API key from environment variable
const getApiKey = (): string => {
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

export function useFinancialAdvisor() {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAdvice = useCallback(async (items: Item[]) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("Gemini API key not configured.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
      });

      // Prepare data summary to reduce token count if necessary
      // We sort by date (descending) and take the last 50 items
      const sortedItems = [...items].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const recentItems = sortedItems.slice(0, 50).map((item) => ({
        name: item.name,
        price: item.price,
        date: new Date(item.date).toLocaleDateString(),
        quantity: item.quantity,
      }));

      const totalSpent = recentItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const prompt = `${SYSTEM_PROMPT}

Overview:
Total Items analyzed: ${recentItems.length}
Total Spent (in these items): ${totalSpent.toFixed(2)}

Recent Purchases:
${JSON.stringify(recentItems, null, 2)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setAdvice(text);
    } catch (err) {
      console.error(err);
      setError("Failed to generate advice.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateAdvice, advice, loading, error };
}

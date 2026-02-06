// Expense Tracker Types

export interface Receipt {
  id?: number;
  date: Date;
  totalAmount: number;
  imageUrl?: string;
  merchant?: string;
  processed: boolean;
}

export interface Item {
  id?: number;
  receiptId: number;
  name: string;
  quantity: number;
  price: number;
  date: Date;
}

export interface UserSettings {
  id?: string;
  budget: number;
  // Note: OpenAI API key is now stored in environment variables (VITE_OPENAI_API_KEY)
  // for security - not in database
}

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  price: number;
  date: Date;
}

export interface ParsedReceipt {
  merchant?: string;
  items: ParsedReceiptItem[];
  total?: number;
}

export type AlertType = "warning" | "danger" | "success" | "info";

export interface BudgetAlert {
  type: AlertType;
  title: string;
  message: string;
}

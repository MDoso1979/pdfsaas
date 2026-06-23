export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'pro';
  subscriptionExpires: string | null; // ISO string or 'lifetime'
  createdAt: string;
}

export interface UsageRecord {
  id: string; // uid_date or sessionId_date
  uid: string;
  date: string; // YYYY-MM-DD
  count: number;
  actions: UsageAction[];
}

export interface UsageAction {
  timestamp: string;
  toolId: string;
  fileName: string;
  fileSize: number;
}

export interface ToolHistoryItem {
  id: string;
  uid: string;
  timestamp: string;
  toolId: string;
  toolName: string;
  fileName: string;
  fileSize: string;
  status: 'completed' | 'failed';
}

export interface FeedbackItem {
  id: string;
  uid: string | null;
  email: string;
  message: string;
  rating: number;
  timestamp: string;
}

export interface TransactionItem {
  id: string;
  uid: string;
  email: string;
  amount: number;
  plan: 'Monthly Pro' | 'Annual Pro';
  status: 'completed' | 'refunded';
  timestamp: string;
}

export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'pdf-to-image'
  | 'image-to-pdf'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'image-converter';

export interface PDFImageTool {
  id: ToolId;
  name: string;
  description: string;
  category: 'pdf' | 'image' | 'convert';
  iconName: string;
  badge?: string;
  acceptedFiles: string; // e.g., "application/pdf"
  maxFiles: number;
}

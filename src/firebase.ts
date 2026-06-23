import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  arrayUnion,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import {
  UserProfile,
  UsageRecord,
  ToolHistoryItem,
  FeedbackItem,
  TransactionItem,
  ToolId
} from './types';

// Read config from JSON
const firebaseConfig = {
  projectId: "gen-lang-client-0275945710",
  appId: "1:440647737616:web:2adc185f7e4b23ff4e8595",
  apiKey: "AIzaSyBOyUWHiiL49JpA8Nt5lMgUSb_RFo9AOAc",
  authDomain: "gen-lang-client-0275945710.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-71ed1f9b-e778-4494-88f9-0d25dcfe9315",
  storageBucket: "gen-lang-client-0275945710.firebasestorage.app",
  messagingSenderId: "440647737616"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Get or create anonymous sessionId
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('saas_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('saas_session_id', sessionId);
  }
  return sessionId;
};

// Helper: Get today's date in YYYY-MM-DD
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// DB API: User Profiles
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const createUserProfile = async (uid: string, email: string, isAdmin = false): Promise<UserProfile> => {
  const profile: UserProfile = {
    uid,
    email,
    role: isAdmin ? 'admin' : 'user',
    subscription: 'free',
    subscriptionExpires: null,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'users', uid), profile);
    return profile;
  } catch (error) {
    console.error("Error creating user profile:", error);
    return profile;
  }
};

// DB API: Usage Limits and Tracking
export interface UsageCheckResult {
  allowed: boolean;
  count: number;
  limit: number;
  isPro: boolean;
}

export const checkUsageLimit = async (uid: string | null): Promise<UsageCheckResult> => {
  const dateStr = getTodayDateString();
  const targetId = uid || getSessionId();
  const isAnonymous = !uid;

  let isPro = false;
  if (uid) {
    const profile = await getUserProfile(uid);
    if (profile && profile.subscription === 'pro') {
      // Check expiration if any
      if (profile.subscriptionExpires) {
        if (profile.subscriptionExpires === 'lifetime' || new Date(profile.subscriptionExpires) > new Date()) {
          isPro = true;
        }
      } else {
        isPro = true;
      }
    }
  }

  if (isPro) {
    return { allowed: true, count: 0, limit: Infinity, isPro: true };
  }

  // Check Firestore daily usage
  try {
    const docId = `${targetId}_${dateStr}`;
    const usageRef = doc(db, 'usage', docId);
    const usageSnap = await getDoc(usageRef);

    if (usageSnap.exists()) {
      const data = usageSnap.data();
      const count = data.count || 0;
      return {
        allowed: count < 3,
        count,
        limit: 3,
        isPro: false
      };
    } else {
      return {
        allowed: true,
        count: 0,
        limit: 3,
        isPro: false
      };
    }
  } catch (error) {
    console.error("Error checking usage limit:", error);
    // Fallback to localStorage if firestore fails
    const localUsageKey = `saas_usage_${dateStr}`;
    const localCount = parseInt(localStorage.getItem(localUsageKey) || '0', 10);
    return {
      allowed: localCount < 3,
      count: localCount,
      limit: 3,
      isPro: false
    };
  }
};

export const recordUsage = async (
  uid: string | null,
  toolId: ToolId,
  fileName: string,
  fileSize: number
): Promise<void> => {
  const dateStr = getTodayDateString();
  const targetId = uid || getSessionId();
  const docId = `${targetId}_${dateStr}`;

  const action = {
    timestamp: new Date().toISOString(),
    toolId,
    fileName,
    fileSize
  };

  try {
    // 1. Record Usage Count in Daily Usage Doc
    const usageRef = doc(db, 'usage', docId);
    const usageSnap = await getDoc(usageRef);

    if (usageSnap.exists()) {
      await updateDoc(usageRef, {
        count: increment(1),
        actions: arrayUnion(action)
      });
    } else {
      await setDoc(usageRef, {
        id: docId,
        uid: targetId,
        date: dateStr,
        count: 1,
        actions: [action]
      });
    }

    // 2. Record in History Collection (only for registered users)
    if (uid) {
      const historyRef = doc(collection(db, 'history'));
      const historyItem: ToolHistoryItem = {
        id: historyRef.id,
        uid,
        timestamp: new Date().toISOString(),
        toolId,
        toolName: getToolName(toolId),
        fileName,
        fileSize: formatBytes(fileSize),
        status: 'completed'
      };
      await setDoc(historyRef, historyItem);
    }

    // Save to local storage usage tracker fallback
    const localUsageKey = `saas_usage_${dateStr}`;
    const currentLocal = parseInt(localStorage.getItem(localUsageKey) || '0', 10);
    localStorage.setItem(localUsageKey, String(currentLocal + 1));
  } catch (error) {
    console.error("Error recording usage in Firestore:", error);
    // Fallback to local
    const localUsageKey = `saas_usage_${dateStr}`;
    const currentLocal = parseInt(localStorage.getItem(localUsageKey) || '0', 10);
    localStorage.setItem(localUsageKey, String(currentLocal + 1));
  }
};

// DB API: History List
export const getUserHistory = async (uid: string): Promise<ToolHistoryItem[]> => {
  try {
    const q = query(
      collection(db, 'history'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const items: ToolHistoryItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as ToolHistoryItem);
    });
    return items;
  } catch (error) {
    console.error("Error getting user history:", error);
    return [];
  }
};

// DB API: Feedback
export const submitFeedback = async (
  uid: string | null,
  email: string,
  message: string,
  rating: number
): Promise<boolean> => {
  try {
    const feedbackRef = doc(collection(db, 'feedback'));
    const item: FeedbackItem = {
      id: feedbackRef.id,
      uid,
      email,
      message,
      rating,
      timestamp: new Date().toISOString()
    };
    await setDoc(feedbackRef, item);
    return true;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return false;
  }
};

// DB API: Subscriptions & Payment Mock
export const upgradeUserToPro = async (
  uid: string,
  email: string,
  plan: 'Monthly Pro' | 'Annual Pro',
  amount: number
): Promise<void> => {
  try {
    // 1. Update user profile subscription
    const userRef = doc(db, 'users', uid);
    const expires = plan === 'Monthly Pro'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    await updateDoc(userRef, {
      subscription: 'pro',
      subscriptionExpires: expires
    });

    // 2. Create transaction record
    const transRef = doc(collection(db, 'transactions'));
    const transItem: TransactionItem = {
      id: transRef.id,
      uid,
      email,
      amount,
      plan,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    await setDoc(transRef, transItem);
  } catch (error) {
    console.error("Error upgrading user to Pro:", error);
    throw error;
  }
};

export const cancelSubscription = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      subscription: 'free',
      subscriptionExpires: null
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
};

// DB API: Admin Panel Metrics (For Users with role == 'admin')
export interface AdminStats {
  totalUsers: number;
  totalSubscribers: number;
  totalRevenue: number;
  totalActions: number;
  usageByTool: Record<string, number>;
  feedback: FeedbackItem[];
  users: UserProfile[];
  transactions: TransactionItem[];
}

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    // 1. Get all users
    const usersSnap = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    let totalSubscribers = 0;
    usersSnap.forEach((doc) => {
      const u = doc.data() as UserProfile;
      users.push(u);
      if (u.subscription === 'pro') {
        totalSubscribers++;
      }
    });

    // 2. Get all transactions
    const transSnap = await getDocs(query(collection(db, 'transactions'), orderBy('timestamp', 'desc')));
    const transactions: TransactionItem[] = [];
    let totalRevenue = 0;
    transSnap.forEach((doc) => {
      const t = doc.data() as TransactionItem;
      transactions.push(t);
      if (t.status === 'completed') {
        totalRevenue += t.amount;
      }
    });

    // 3. Get all feedback
    const feedbackSnap = await getDocs(query(collection(db, 'feedback'), orderBy('timestamp', 'desc')));
    const feedback: FeedbackItem[] = [];
    feedbackSnap.forEach((doc) => {
      feedback.push(doc.data() as FeedbackItem);
    });

    // 4. Get all usage metrics
    const usageSnap = await getDocs(collection(db, 'usage'));
    let totalActions = 0;
    const usageByTool: Record<string, number> = {};

    usageSnap.forEach((doc) => {
      const data = doc.data();
      totalActions += data.count || 0;
      if (data.actions && Array.isArray(data.actions)) {
        data.actions.forEach((act: any) => {
          const tool = act.toolId || 'unknown';
          usageByTool[tool] = (usageByTool[tool] || 0) + 1;
        });
      }
    });

    return {
      totalUsers: users.length,
      totalSubscribers,
      totalRevenue,
      totalActions,
      usageByTool,
      feedback,
      users,
      transactions
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    // Return empty stats
    return {
      totalUsers: 0,
      totalSubscribers: 0,
      totalRevenue: 0,
      totalActions: 0,
      usageByTool: {},
      feedback: [],
      users: [],
      transactions: []
    };
  }
};

// Utils
export function getToolName(toolId: ToolId): string {
  const names: Record<ToolId, string> = {
    'merge-pdf': 'Merge PDF',
    'split-pdf': 'Split PDF',
    'compress-pdf': 'Compress PDF',
    'pdf-to-image': 'PDF to Image',
    'image-to-pdf': 'Image to PDF',
    'pdf-to-word': 'PDF to Word',
    'word-to-pdf': 'Word to PDF',
    'image-converter': 'Image Converter'
  };
  return names[toolId] || toolId;
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

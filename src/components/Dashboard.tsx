import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  History,
  TrendingUp,
  Activity,
  CreditCard,
  MessageSquare,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  FolderSync
} from 'lucide-react';
import { UserProfile, ToolHistoryItem } from '../types';
import {
  getUserHistory,
  cancelSubscription,
  submitFeedback,
  checkUsageLimit,
  UsageCheckResult
} from '../firebase';

interface DashboardProps {
  userProfile: UserProfile;
  limitRefreshTrigger: number;
  onOpenSubscription: () => void;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function Dashboard({
  userProfile,
  limitRefreshTrigger,
  onOpenSubscription,
  onProfileUpdate
}: DashboardProps) {
  const [history, setHistory] = useState<ToolHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [limits, setLimits] = useState<UsageCheckResult | null>(null);

  // Feedback form states
  const [rating, setRating] = useState(5);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Cancellation States
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoadingHistory(true);
      const items = await getUserHistory(userProfile.uid);
      setHistory(items);
      setLoadingHistory(false);

      const usage = await checkUsageLimit(userProfile.uid);
      setLimits(usage);
    }
    loadData();
  }, [userProfile, limitRefreshTrigger]);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await cancelSubscription(userProfile.uid);
      const updated: UserProfile = {
        ...userProfile,
        subscription: 'free',
        subscriptionExpires: null
      };
      onProfileUpdate(updated);
      setShowCancelConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;

    setSubmittingFeedback(true);
    setFeedbackError('');
    setFeedbackSuccess(false);

    try {
      const ok = await submitFeedback(userProfile.uid, userProfile.email, feedbackMsg, rating);
      if (ok) {
        setFeedbackSuccess(true);
        setFeedbackMsg('');
        setRating(5);
      } else {
        setFeedbackError('Could not submit feedback. Try again.');
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Error occurred');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const isPro = userProfile.subscription === 'pro';
  const usedCount = limits ? limits.count : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in space-y-10 text-slate-200">
      
      {/* Dashboard Top Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/30 border border-slate-700/50 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-550 rounded-2xl flex items-center justify-center text-white text-lg font-bold">
            {userProfile.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">{userProfile.email}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Account created on {new Date(userProfile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {isPro ? (
            <div className="flex flex-col bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl w-full md:w-48">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Pro Active Subscription
              </span>
              <span className="text-xs font-bold text-slate-300 mt-1">
                {userProfile.subscriptionExpires
                  ? `Renews on: ${new Date(userProfile.subscriptionExpires).toLocaleDateString()}`
                  : 'Lifetime Pro'}
              </span>
            </div>
          ) : (
            <button
              onClick={onOpenSubscription}
              className="w-full md:w-auto px-5 py-2.5 bg-indigo-550 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-550/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Grid statistics rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric Card 1: Limits */}
        <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Daily Usage Limits</span>
              <h4 className="text-2xl font-black text-white mt-1.5">
                {isPro ? 'Unlimited' : `${usedCount} / 3`}
              </h4>
            </div>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          {!isPro && (
            <div className="mt-5">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-750">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(usedCount / 3) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Your quota resets tonight. Upgrade for unlimited high-volume parsing.
              </p>
            </div>
          )}
          {isPro && (
            <p className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg mt-5">
              Pro active: You have premium bypass enabled on all operations.
            </p>
          )}
        </div>

        {/* Metric Card 2: Lifetime Conversions */}
        <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Lifetime Conversions</span>
              <h4 className="text-2xl font-black text-white mt-1.5">{history.length} Files</h4>
            </div>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <History className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-5 leading-relaxed">
            Every successful compiler action is registered permanently in our cloud databases for tracking.
          </p>
        </div>

        {/* Metric Card 3: Subscription Operations */}
        <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Billing &amp; Plan</span>
              <h4 className="text-lg font-extrabold text-white mt-1.5">
                {isPro ? 'Pro Subscription' : 'Free Basic Tier'}
              </h4>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5">
            {isPro ? (
              <div>
                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-xs font-semibold text-slate-400 hover:text-red-400 underline"
                  >
                    Cancel active subscription
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <span className="text-[10px] text-red-400 font-bold">Are you absolutely sure? You will lose Pro status.</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded text-[9px] uppercase tracking-wide"
                      >
                        {cancelling ? 'processing...' : 'Yes, Downgrade'}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded text-[9px] uppercase tracking-wide"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenSubscription}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Explore unlimited plans <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid: Left is History list, Right is Feedback Form */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left column (span 2): Historical records */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <FolderSync className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-extrabold text-white">Conversion Log History</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
              Showing last 50 actions
            </span>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading your secure history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 p-6 border border-dashed border-slate-700 bg-slate-800/10 rounded-xl">
              <History className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No conversions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Select a tool and convert your first document to see logs here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-450 uppercase border-b border-slate-800">
                    <th className="pb-3 pr-4">Tool</th>
                    <th className="pb-3 pr-4">Original Name</th>
                    <th className="pb-3 pr-4">Size</th>
                    <th className="pb-3 pr-4">Timestamp</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((item) => (
                    <tr key={item.id} className="text-slate-300 hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-white">{item.toolName}</td>
                      <td className="py-3.5 pr-4 max-w-[140px] sm:max-w-[200px] truncate font-medium">{item.fileName}</td>
                      <td className="py-3.5 pr-4 font-mono text-xs text-slate-400">{item.fileSize}</td>
                      <td className="py-3.5 pr-4 text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full uppercase tracking-wider">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column (span 1): Customer Support Feedback Portal */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-extrabold text-white">Customer Support Ticket</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Encountered issues with document layout or need custom additions? Send a direct message to developers. We reply within 24 hours.
            </p>

            {feedbackSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400 animate-fade-in">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-semibold">Ticket Registered!</p>
                  <p className="mt-0.5">Your message has been filed securely in our database. We will reply to your registered email shortly.</p>
                </div>
              </div>
            )}

            {feedbackError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">Error filing ticket</p>
                  <p className="mt-0.5">{feedbackError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Rating (Out of 5 Stars)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Your Message or Feature Request
                </label>
                <textarea
                  required
                  rows={4}
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  placeholder="Tell us what tools you would like us to add next..."
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback || !feedbackMsg.trim()}
                className="w-full py-2.5 bg-indigo-550 hover:bg-indigo-600 disabled:opacity-40 text-white font-bold rounded-xl shadow-md shadow-indigo-500/10 hover:shadow-indigo-550/20 transition-all text-xs flex items-center justify-center"
              >
                {submittingFeedback ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'File Support Ticket'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

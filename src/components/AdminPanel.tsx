import { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Activity,
  Award,
  DollarSign,
  ShieldCheck,
  UserCheck,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { getAdminStats, AdminStats, auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface AdminPanelProps {
  isAdmin: boolean;
  onRefreshLimits: () => void;
}

export default function AdminPanel({ isAdmin, onRefreshLimits }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError('Failed to fetch admin statistics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  const toggleSubscription = async (uid: string, currentSub: 'free' | 'pro') => {
    setUpdatingUser(uid);
    try {
      const userRef = doc(db, 'users', uid);
      const nextSub = currentSub === 'free' ? 'pro' : 'free';
      const nextExpires = nextSub === 'pro' ? 'lifetime' : null;

      await updateDoc(userRef, {
        subscription: nextSub,
        subscriptionExpires: nextExpires
      });

      // Update local state instantly
      if (stats) {
        setStats({
          ...stats,
          users: stats.users.map((u) => {
            if (u.uid === uid) {
              return { ...u, subscription: nextSub, subscriptionExpires: nextExpires };
            }
            return u;
          }),
          totalSubscribers: stats.totalSubscribers + (nextSub === 'pro' ? 1 : -1)
        });
      }
      onRefreshLimits(); // Refresh caller's local counters
    } catch (err: any) {
      console.error(err);
      alert('Error updating database: ' + err.message);
    } finally {
      setUpdatingUser(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl mt-12 text-slate-200 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-extrabold text-white">Unauthorized Access</h3>
        <p className="text-sm text-slate-400 mt-2">
          Only registered users with administrator roles are allowed inside this dashboard segment. Use the Sandbox quick buttons to test.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in space-y-10 text-slate-200">
      
      {/* Top bar with refresh */}
      <div className="flex justify-between items-center bg-slate-800/30 border border-slate-700/50 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> Admin Control Board
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time telemetry and management controls for your SaaS platform.</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="px-4 py-2 bg-indigo-550 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
        >
          {loading ? 'Refreshing stats...' : 'Force Refresh Stats'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3.5">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Filing admin datasets securely...</p>
        </div>
      ) : stats ? (
        <>
          {/* System Key Metrics Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Registered Users */}
            <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Users</span>
                  <h4 className="text-2xl font-black text-white mt-1">{stats.totalUsers}</h4>
                </div>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Total Subscribers */}
            <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Pro Subscribers</span>
                  <h4 className="text-2xl font-black text-white mt-1">{stats.totalSubscribers}</h4>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Total Lifetime Earnings */}
            <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Mock Revenue</span>
                  <h4 className="text-2xl font-black text-white mt-1">${stats.totalRevenue.toFixed(2)}</h4>
                </div>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Total Actions Executed */}
            <div className="p-6 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Total Executions</span>
                  <h4 className="text-2xl font-black text-white mt-1">{stats.totalActions}</h4>
                </div>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </div>

          </div>

          {/* User Management and Transactions Directory */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left side (col-span 2) - Users Directory */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registered SaaS Users</h3>
              </div>

              {stats.users.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No users registered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-450 uppercase border-b border-slate-800">
                        <th className="pb-3 pr-4">Email Address</th>
                        <th className="pb-3 pr-4">Role</th>
                        <th className="pb-3 pr-4">Sub Tier</th>
                        <th className="pb-3 pr-4">Registered Date</th>
                        <th className="pb-3 text-right">Interactive Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {stats.users.map((u) => (
                        <tr key={u.uid} className="text-slate-300 hover:bg-slate-800/40">
                          <td className="py-3 pr-4 font-bold text-white">{u.email}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                              u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                              u.subscription === 'pro' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {u.subscription.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-450">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => toggleSubscription(u.uid, u.subscription)}
                              disabled={updatingUser === u.uid}
                              className={`px-2.5 py-1 text-[9px] font-bold rounded border transition-all ${
                                u.subscription === 'pro'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                              }`}
                            >
                              {updatingUser === u.uid
                                ? 'Saving...'
                                : u.subscription === 'pro'
                                ? 'Revoke Pro'
                                : 'Grant Free Pro'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side - Tool Usage distribution breakdown */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tool Usage Trends</h3>
              </div>

              <div className="space-y-4">
                {Object.keys(stats.usageByTool).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No compiler telemetry logged yet.</p>
                ) : (
                  Object.entries(stats.usageByTool)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([toolId, count], idx) => {
                      const percent = Math.round(((count as number) / (stats.totalActions as number)) * 100) || 0;
                      return (
                        <div key={toolId} className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center font-semibold text-slate-300">
                            <span className="capitalize">{toolId.replace('-', ' ')}</span>
                            <span className="text-white font-mono font-bold">{count} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-750">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>

          {/* Bottom Grid: Left Transactions list, Right Customer Feedback Support ticket queues */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Billing Transactions table */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mock Transactions</h3>
              </div>

              {stats.transactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No payment transactions registered.</p>
              ) : (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-450 uppercase border-b border-slate-800">
                        <th className="pb-3 pr-4">User</th>
                        <th className="pb-3 pr-4">Plan Name</th>
                        <th className="pb-3 pr-4">Amt Charged</th>
                        <th className="pb-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {stats.transactions.map((t) => (
                        <tr key={t.id} className="text-slate-350 hover:bg-slate-800/40">
                          <td className="py-2.5 pr-4 font-bold text-white">{t.email}</td>
                          <td className="py-2.5 pr-4 font-medium">{t.plan}</td>
                          <td className="py-2.5 pr-4 font-mono font-bold text-emerald-450">${t.amount.toFixed(2)}</td>
                          <td className="py-2.5 text-right text-slate-450">
                            {new Date(t.timestamp).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Support Tickets Queue */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">User Tickets Queue</h3>
              </div>

              {stats.feedback.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No support tickets filed.</p>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {stats.feedback.map((item) => (
                    <div key={item.id} className="p-3 border border-slate-800 bg-slate-800/30 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white">{item.email}</span>
                        <span className="text-slate-450">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 italic font-medium leading-relaxed bg-slate-850 p-2 border border-slate-800 rounded-lg">
                        "{item.message}"
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-slate-450">
                        <span>Ticket ID: {item.id}</span>
                        <span className="text-amber-500 font-bold uppercase tracking-wider">
                          Rating: {item.rating} / 5 Stars
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400 py-6 text-center">No metrics compiled.</p>
      )}

    </div>
  );
}

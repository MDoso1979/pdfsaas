import { useState, useEffect } from 'react';
import { Sparkles, User, LogOut, Settings, Layout, Lock, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, checkUsageLimit, UsageCheckResult } from '../firebase';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  userProfile: UserProfile | null;
  limitRefreshTrigger: number;
  onOpenAuth: () => void;
  onOpenSubscription: () => void;
  onToggleDashboard: () => void;
  onToggleAdmin: () => void;
  showDashboard: boolean;
  showAdmin: boolean;
}

export default function Navbar({
  userProfile,
  limitRefreshTrigger,
  onOpenAuth,
  onOpenSubscription,
  onToggleDashboard,
  onToggleAdmin,
  showDashboard,
  showAdmin
}: NavbarProps) {
  const [limits, setLimits] = useState<UsageCheckResult | null>(null);

  useEffect(() => {
    async function loadLimits() {
      const res = await checkUsageLimit(userProfile ? userProfile.uid : null);
      setLimits(res);
    }
    loadLimits();
  }, [userProfile, limitRefreshTrigger]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const remaining = limits ? Math.max(0, 3 - limits.count) : 3;
  const countUsed = limits ? limits.count : 0;
  const isPro = limits?.isPro || false;

  return (
    <nav className="sticky top-0 z-40 bg-[#1E293B] border-b border-slate-700/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div
            onClick={() => {
              if (showDashboard) onToggleDashboard();
              if (showAdmin) onToggleAdmin();
            }}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group"
          >
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">
                PDF<span className="text-indigo-400 font-bold">&amp;</span>Image
              </span>
              <span className="text-[10px] font-bold text-slate-400 block -mt-1 tracking-wider uppercase">
                SaaS Engine
              </span>
            </div>
          </div>

          {/* Right Side Info */}
          <div className="flex items-center gap-4 sm:gap-6 ml-4">
            
            {/* Daily Limits Countdown Widget */}
            {!isPro && (
              <div className="hidden md:flex flex-col w-40">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <span>Usage Tracker</span>
                  <span className="text-indigo-400">{countUsed}/3 Free</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-600/50">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(countUsed / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {isPro && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> PRO UNLIMITED
              </span>
            )}

            {/* Dashboard and Login state */}
            {userProfile ? (
              <div className="flex items-center gap-3">
                {userProfile.role === 'admin' && (
                  <>
                    <button
                      onClick={onToggleAdmin}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        showAdmin
                          ? 'bg-red-600 border-red-650 text-white shadow-lg shadow-red-600/20'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Admin Panel</span>
                    </button>
                    <div className="h-4 w-px bg-slate-700" />
                  </>
                )}

                <button
                  onClick={onToggleDashboard}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    showDashboard && !showAdmin
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-705'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My Dashboard</span>
                </button>

                <div className="h-4 w-px bg-slate-700" />

                {/* Profile Icon Menu */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs select-none">
                    {userProfile.email.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onOpenSubscription}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Upgrade
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}

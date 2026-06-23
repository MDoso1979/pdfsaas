import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, getUserProfile, createUserProfile } from '../firebase';
import { Lock, Mail, ShieldAlert, Key, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface AdminLoginSectionProps {
  userProfile: UserProfile | null;
  onSuccess: (profile: UserProfile) => void;
}

export default function AdminLoginSection({ userProfile, onSuccess }: AdminLoginSectionProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const isDefaultAdmin = email.toLowerCase() === 'admin@pdfsaas.com' && password === 'password123';

    try {
      let user;
      try {
        // 1. Sign in via Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } catch (signInErr: any) {
        // If it's the default admin and doesn't exist yet, auto-create it
        if (isDefaultAdmin && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')) {
          const createCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = createCredential.user;
        } else {
          throw signInErr;
        }
      }

      // 2. Fetch Firestore Profile
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        // Fallback: If auth succeeded but profile wasn't in DB, create it if they are using the admin email
        const isAdmin = email.toLowerCase() === 'admin@pdfsaas.com' || email.toLowerCase() === 'mysterymations@gmail.com';
        profile = await createUserProfile(user.uid, user.email || email, isAdmin);
      }

      // 3. Double-check admin privileges before letting them in
      if (profile.role !== 'admin') {
        setError('Access Denied: This account does not have administrator privileges.');
        setLoading(false);
        return;
      }

      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Invalid administrator email or password.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError('');
    setLoading(true);
    try {
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out current user.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    window.location.hash = '';
  };

  // If a standard user is already logged in, show access denied / sign out view
  if (userProfile && userProfile.role !== 'admin') {
    return (
      <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 p-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-400 mb-3">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            Restricted Access
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            The Admin Control Board is restricted to administrators only.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4.5 space-y-3.5 mb-6 text-xs">
          <p className="text-slate-300 leading-relaxed text-center">
            You are currently signed in as <strong className="text-indigo-400">{userProfile.email}</strong>, which does not have authorized admin permissions.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full py-2.5 bg-red-650 hover:bg-red-600 active:bg-red-700 text-white font-medium rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {loading ? 'Signing out...' : 'Sign Out Current Account'}
          </button>

          <button
            onClick={handleGoBack}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 border border-slate-700/50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 p-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
          <Lock className="w-6 h-6 text-indigo-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-extrabold tracking-tight text-white">
          Admin Control Center
        </h3>
        <p className="text-xs text-slate-400 mt-2">
          Secure sign-in for platform administrators only.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 mb-5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Credentials Panel */}
      {showCredentials && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 mb-5 text-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-indigo-400" /> Administrator Credentials
            </span>
            <button
              onClick={() => setShowCredentials(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline"
            >
              Hide
            </button>
          </div>
          <div className="space-y-1 text-slate-400">
            <p>
              Email: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 font-bold font-mono">admin@pdfsaas.com</code>
            </p>
            <p>
              Password: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 font-bold font-mono">password123</code>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleAdminLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Admin Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
              placeholder="admin@pdfsaas.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Secure Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-550 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-550/20 transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Sign In as Administrator
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleGoBack}
          className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mt-2"
        >
          ← Cancel and Return to Homepage
        </button>
      </form>
    </div>
  );
}

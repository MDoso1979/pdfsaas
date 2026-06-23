import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, createUserProfile, getUserProfile } from '../firebase';
import { X, Lock, Mail, User, ShieldAlert, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          // Fallback if profile doesn't exist
          profile = await createUserProfile(user.uid, user.email || email, email.includes('admin'));
        }
        onSuccess(profile);
        onClose();
      } else {
        // Sign Up
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update Firebase User Profile Display Name
        await updateProfile(user, { displayName: name });

        // Set is_admin automatically for specific emails to test admin features!
        const isAdmin = email.toLowerCase() === 'admin@pdfsaas.com' || email.toLowerCase() === 'mysterymations@gmail.com';
        
        const profile = await createUserProfile(user.uid, user.email || email, isAdmin);
        onSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const loginDemoAccount = async (role: 'user' | 'admin') => {
    setError('');
    setLoading(true);
    const demoEmail = role === 'admin' ? 'admin@pdfsaas.com' : 'user@pdfsaas.com';
    const demoPassword = 'password123';
    
    try {
      // Try to login
      try {
        const cred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        let profile = await getUserProfile(cred.user.uid);
        if (!profile) {
          profile = await createUserProfile(cred.user.uid, demoEmail, role === 'admin');
        }
        onSuccess(profile);
        onClose();
      } catch (signInErr: any) {
        // Create if doesn't exist
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await updateProfile(cred.user, { displayName: role === 'admin' ? 'Demo Admin' : 'Demo User' });
          const profile = await createUserProfile(cred.user.uid, demoEmail, role === 'admin');
          onSuccess(profile);
          onClose();
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not boot demo account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-450 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {isLogin
                ? 'Sign in to access your dashboard and history'
                : 'Sign up to start saving your conversion history'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Alex Mercer"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="alex@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-550 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-550/20 transition-all disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-slate-800" />
            <span className="px-3 bg-slate-900 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Or Toggle Mode
            </span>
          </div>

          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="w-full py-2 text-sm font-medium text-slate-300 hover:text-indigo-400 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-slate-800" />
            <span className="px-3 bg-slate-900 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Quick SaaS Sandbox Demo
            </span>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => loginDemoAccount('user')}
              disabled={loading}
              className="w-full px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl transition-all text-center"
            >
              Quick Sign In: Demo User Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

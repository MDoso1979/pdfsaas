import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, getUserProfile, createUserProfile } from './firebase';
import { UserProfile, PDFImageTool } from './types';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ToolGrid from './components/ToolGrid';
import Workspace from './components/Workspace';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import AdminLoginSection from './components/AdminLoginSection';
import AuthModal from './components/AuthModal';
import SubscriptionModal from './components/SubscriptionModal';
import FAQ from './components/FAQ';
import { Sparkles, ShieldCheck, Heart, Mail } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tool Selection State
  const [selectedTool, setSelectedTool] = useState<PDFImageTool | null>(null);

  // Navigation and UI Views
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

  // Counter to force real-time usage indicator updates on Navbar and Dashboard
  const [limitRefreshTrigger, setLimitRefreshTrigger] = useState(0);

  // Monitor URL hash for admin portal access (#admin or #admin-panel)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin' || hash === '#admin-panel') {
        setShowAdmin(true);
        setShowDashboard(false);
      } else {
        setShowAdmin(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check hash on initial load

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          // If signed in but no Firestore profile yet, create one
          const isAdmin = user.email?.toLowerCase() === 'admin@pdfsaas.com' || user.email?.toLowerCase() === 'mysterymations@gmail.com';
          profile = await createUserProfile(user.uid, user.email || '', isAdmin);
        }
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToolSelect = (tool: PDFImageTool) => {
    setSelectedTool(tool);
    setShowDashboard(false);
    setShowAdmin(false);
    // Scroll workspace into view smoothly
    setTimeout(() => {
      document.getElementById('workspace-target')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleOperationSuccess = () => {
    // Increment tracker to trigger recalculation of child stats
    setLimitRefreshTrigger((prev) => prev + 1);
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsAuthOpen(false);
    handleOperationSuccess();
  };

  const handleProfileUpdate = (profile: UserProfile) => {
    setUserProfile(profile);
    handleOperationSuccess();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-between text-slate-200 font-sans">
      
      {/* Top Navigation */}
      <Navbar
        userProfile={userProfile}
        limitRefreshTrigger={limitRefreshTrigger}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSubscription={() => setIsSubscriptionOpen(true)}
        onToggleDashboard={() => {
          setShowDashboard(!showDashboard);
          setShowAdmin(false);
          window.location.hash = ''; // Clear hash when going back to dashboard
        }}
        onToggleAdmin={() => {
          if (showAdmin) {
            window.location.hash = '';
          } else {
            window.location.hash = '#admin';
          }
        }}
        showDashboard={showDashboard}
        showAdmin={showAdmin}
      />

      {/* Primary Layout Segment */}
      <div className="flex-1 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-bold">Booting secure workspaces...</p>
          </div>
                ) : showAdmin ? (
          userProfile?.role === 'admin' ? (
            <AdminPanel isAdmin={true} onRefreshLimits={handleOperationSuccess} />
          ) : (
            <div className="py-12 px-4">
              <AdminLoginSection userProfile={userProfile} onSuccess={handleAuthSuccess} />
            </div>
          )
        ) : showDashboard && userProfile ? (
          <Dashboard
            userProfile={userProfile}
            limitRefreshTrigger={limitRefreshTrigger}
            onOpenSubscription={() => setIsSubscriptionOpen(true)}
            onProfileUpdate={handleProfileUpdate}
          />
        ) : (
          <>
            {/* Visual SaaS Headline and Trust pillars */}
            <Hero />

            {/* Selected Active Workspace targets */}
            {selectedTool && (
              <div id="workspace-target" className="px-4 sm:px-6 lg:px-8 py-4">
                <Workspace
                  tool={selectedTool}
                  userProfile={userProfile}
                  onOperationSuccess={handleOperationSuccess}
                  onOpenSubscription={() => setIsSubscriptionOpen(true)}
                  onClose={() => setSelectedTool(null)}
                />
              </div>
            )}

            {/* Catalog grid of Operations */}
            <ToolGrid
              onSelectTool={handleToolSelect}
              activeToolId={selectedTool?.id}
            />

            {/* Secure processing & limits FAQ section */}
            <FAQ />
          </>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="border-t border-slate-800 bg-[#0F172A] py-10 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex justify-center items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold tracking-tight text-white">
              PDF&amp;Image SaaS Platforms, Inc.
            </span>
          </div>
          <p className="max-w-md mx-auto leading-relaxed text-slate-400">
            All file processing, compilation, and rendering is handled 100% securely inside your local browser runtime container. Your documents are never uploaded to our servers.
          </p>
          <div className="flex justify-center items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
            <span>Development Preview 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1">Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> globally</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Subscription/Billing Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        userProfile={userProfile}
        onSuccess={handleProfileUpdate}
        onOpenAuth={() => {
          setIsSubscriptionOpen(false);
          setIsAuthOpen(true);
        }}
      />

    </div>
  );
}

import React, { useState } from 'react';
import { X, Check, CreditCard, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { upgradeUserToPro } from '../firebase';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onSuccess: (profile: UserProfile) => void;
  onOpenAuth: () => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  userProfile,
  onSuccess,
  onOpenAuth
}: SubscriptionModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutStep, setCheckoutStep] = useState<'plans' | 'payment' | 'success'>('plans');
  
  // Credit Card Form States
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const price = billingPeriod === 'monthly' ? 9.99 : 79.99;
  const planName = billingPeriod === 'monthly' ? 'Monthly Pro' : 'Annual Pro';

  const handleUpgradeClick = () => {
    if (!userProfile) {
      onOpenAuth();
      return;
    }
    setCheckoutStep('payment');
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardExpiry(value.substring(0, 5));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setError('');
    
    // Simple mock validation
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setError('Please enter a valid 16-digit card number');
      return;
    }
    if (!cardName.trim()) {
      setError('Please enter the cardholder name');
      return;
    }
    if (cardExpiry.length < 5) {
      setError('Please enter expiration date (MM/YY)');
      return;
    }
    if (cardCvv.length < 3) {
      setError('Please enter 3 or 4 digit CVV');
      return;
    }

    setLoading(true);

    try {
      // Simulate real transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Update DB
      await upgradeUserToPro(userProfile.uid, userProfile.email, planName, price);
      
      // Re-fetch or simulate profile update
      const updatedProfile: UserProfile = {
        ...userProfile,
        subscription: 'pro',
        subscriptionExpires: billingPeriod === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      onSuccess(updatedProfile);
      setCheckoutStep('success');
    } catch (err: any) {
      console.error(err);
      setError('Payment authorization failed: ' + (err.message || 'Unknown network error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="subscription-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-200">
        
        {/* Header Ribbon */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-450 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 1: PLANS OVERVIEW */}
        {checkoutStep === 'plans' && (
          <div className="p-8 md:p-12">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Special Launch Pricing
              </span>
              <h3 className="text-3xl font-extrabold tracking-tight text-white">
                Unlock Unlimited Access
              </h3>
              <p className="text-slate-400 mt-2 max-w-lg mx-auto text-sm md:text-base">
                Take your productivity to the next level with lightning-fast PDF and image tools without daily caps.
              </p>

              {/* Billing Cycle Selector */}
              <div className="inline-flex p-1 bg-slate-850 rounded-xl mt-6 border border-slate-700">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-slate-700 text-indigo-450 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly billing
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    billingPeriod === 'yearly'
                      ? 'bg-slate-700 text-indigo-450 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Yearly billing
                  <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-indigo-500 rounded-md">
                    -33%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="flex flex-col p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl relative">
                <h4 className="text-lg font-bold text-white">Basic Tier</h4>
                <p className="text-slate-450 text-xs mt-1">Great for occasional quick edits</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-extrabold text-white">$0</span>
                  <span className="text-slate-400 text-sm font-medium"> / forever</span>
                </div>

                <ul className="space-y-3.5 flex-1 mb-8">
                  {['3 free operations per day', 'Secure client-side processing', 'All basic PDF & Image tools', 'Standard resolution conversions'].map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all text-xs"
                >
                  Continue Free
                </button>
              </div>

              {/* Pro Plan */}
              <div className="flex flex-col p-6 bg-indigo-950/10 border-2 border-indigo-500 rounded-2xl relative shadow-xl shadow-indigo-500/5">
                <span className="absolute -top-3 left-6 px-3 py-0.5 bg-indigo-500 text-[10px] font-bold text-white rounded-full uppercase tracking-wider">
                  Popular
                </span>
                <h4 className="text-lg font-bold text-indigo-400">Unlimited Pro</h4>
                <p className="text-indigo-450 text-xs mt-1">Unlimited power for power users</p>
                <div className="mt-4 mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">${price}</span>
                  <span className="text-slate-450 text-sm font-medium">
                    {billingPeriod === 'monthly' ? ' / month' : ' / year'}
                  </span>
                </div>

                <ul className="space-y-3.5 flex-1 mb-8">
                  {[
                    'Unlimited daily conversions',
                    'Support for huge files (up to 100MB)',
                    'Smart AI-powered layout recreation (PDF to Word)',
                    'Bulk file operations (up to 20 files at once)',
                    'High-resolution PDF rendering',
                    'Durable cloud storage logs history',
                    '24/7 Premium developer support'
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-indigo-300 font-medium">
                      <Check className="w-4 h-4 text-indigo-450 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleUpgradeClick}
                  className="w-full py-2.5 bg-indigo-550 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-550/20 transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: INTERACTIVE CREDIT CARD PORTAL */}
        {checkoutStep === 'payment' && (
          <div className="p-8 md:p-12">
            <button
              onClick={() => setCheckoutStep('plans')}
              className="text-xs font-semibold text-slate-400 hover:text-indigo-400 mb-6 flex items-center gap-1.5"
            >
              ← Back to plans
            </button>

            <div className="grid md:grid-cols-2 gap-10 items-center max-w-3xl mx-auto">
              {/* Animated 3D Credit Card */}
              <div className="flex flex-col items-center">
                <div
                  onMouseEnter={() => setIsFlipped(true)}
                  onMouseLeave={() => setIsFlipped(false)}
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`relative w-72 h-44 cursor-pointer transition-transform duration-700 preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Card Front */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 text-white rounded-2xl p-5 shadow-2xl backface-hidden flex flex-col justify-between border border-white/10">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400">Secure Issuer</span>
                        <div className="w-10 h-7 bg-amber-400/20 border border-amber-400/40 rounded-md mt-1 relative overflow-hidden">
                          <span className="absolute inset-x-2 top-2 h-0.5 bg-amber-400/40" />
                          <span className="absolute inset-x-2 top-4 h-0.5 bg-amber-400/40" />
                          <span className="absolute left-3 inset-y-1 w-0.5 bg-amber-400/40" />
                          <span className="absolute left-5 inset-y-1 w-0.5 bg-amber-400/40" />
                        </div>
                      </div>
                      <span className="text-sm font-bold italic tracking-wide text-indigo-400">PRO PLATINUM</span>
                    </div>

                    <div className="text-center">
                      <p className="text-lg font-mono tracking-widest text-slate-100">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </p>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400">Cardholder</span>
                        <span className="text-xs font-medium tracking-wide truncate max-w-[150px]">
                          {cardName || 'ALEX MERCER'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400">Expires</span>
                        <span className="text-xs font-medium font-mono">{cardExpiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Back */}
                  <div className="absolute inset-0 w-full h-full bg-slate-950 text-white rounded-2xl shadow-2xl backface-hidden rotate-y-180 flex flex-col justify-between py-5 border border-white/10">
                    <div className="w-full h-10 bg-slate-800" />
                    <div className="px-5 mt-2">
                      <div className="bg-slate-700/50 h-8 rounded-md flex items-center justify-end px-3">
                        <span className="text-sm font-mono text-slate-300 italic pr-2">CVV:</span>
                        <span className="text-sm font-mono text-black bg-white px-2 py-0.5 rounded font-bold">
                          {cardCvv || '•••'}
                        </span>
                      </div>
                    </div>
                    <div className="px-5 flex justify-between items-center text-[8px] text-slate-400">
                      <span>ELECTRONIC USE ONLY</span>
                      <span>SECURE MOCK PORTAL</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Hover or tap the card to flip
                  </p>
                </div>

                {/* Checkout pricing breakdown */}
                <div className="w-full max-w-xs mt-6 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wide mb-2.5">Checkout Summary</h5>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>{planName} Plan</span>
                    <span>${price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 mb-2.5">
                    <span>Tax (0%)</span>
                    <span>$0.00</span>
                  </div>
                  <div className="h-px bg-slate-700 my-2" />
                  <div className="flex justify-between text-sm font-bold text-white">
                    <span>Total Charged</span>
                    <span>${price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <h4 className="text-lg font-bold text-white flex items-center gap-1.5">
                  <CreditCard className="w-5 h-5 text-indigo-400" /> Card Details
                </h4>

                {error && (
                  <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="ALEX MERCER"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="4000 1234 5678 9010"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      onFocus={() => setIsFlipped(false)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono font-medium text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Security Code (CVV)
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      onFocus={() => setIsFlipped(true)}
                      placeholder="•••"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono font-medium text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-indigo-550 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-550/20 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authorizing Secure Transaction...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize Payment of ${price.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 3: SUCCESS FEEDBACK */}
        {checkoutStep === 'success' && (
          <div className="p-8 md:p-12 text-center max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-white">
              Upgrade Completed!
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              Thank you for subscribing! Your account is now upgraded to <strong className="text-indigo-450">Pro Unlimited</strong>. Enjoy unlimited high-speed conversions, smart layout extraction, and premium features!
            </p>

            <button
              onClick={() => {
                setCheckoutStep('plans');
                onClose();
              }}
              className="w-full mt-8 py-3 bg-indigo-550 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/10"
            >
              Start Converting
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

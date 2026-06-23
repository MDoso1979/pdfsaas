import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  FileText, 
  History,
  Info
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
  category: string;
}

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    {
      id: 'security',
      category: 'Security & Privacy',
      question: 'Are my sensitive files uploaded to your servers?',
      answer: 'Absolutely never. 100% of our file processing, rendering, compilation, and metadata conversion occurs entirely inside your local browser context using optimized client-side sandboxes and WebAssembly modules. Your documents, private data, and images never touch a remote server, ensuring maximum privacy and data governance.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
    },
    {
      id: 'limits',
      category: 'Subscriptions',
      question: 'What are the daily execution limits for Free vs Pro tiers?',
      answer: 'Free tier accounts or anonymous user sessions are granted up to 3 tool executions or conversions per day. Upgrading to a premium Pro subscription removes these limits entirely, enabling unlimited daily operations, access to advanced AI-assisted modules, and priority support channels.',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />
    },
    {
      id: 'persistence',
      category: 'Data Syncing',
      question: 'Is my document conversion and tools history stored?',
      answer: 'We only store tool execution metadata (such as timestamp, tool used, status, and local filename) if you are logged in as a registered user, allowing you to access a seamless cross-device history on your personal Dashboard. Anonymous sessions track daily usage purely via local browser cache to respect your complete anonymity.',
      icon: <History className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'formats',
      category: 'Supported Files',
      question: 'What types of documents and media files are supported?',
      answer: 'Our suite supports standard PDF documents (for editing, merging, splitting, and metadata extraction) as well as common web image file extensions (including JPEG, PNG, WebP, and GIFs). We support file sizes up to 25MB on the Pro tier for complex, multi-page rendering tasks.',
      icon: <FileText className="w-5 h-5 text-sky-400" />
    },
    {
      id: 'sandbox',
      category: 'Sandbox Testing',
      question: 'How do I test administrative roles and subscription states?',
      answer: 'This application includes full-featured testing sandboxes. Inside the user Auth modal, you can click "Quick Sign In: Demo User Account" to instantly try out standard user panels and operations. To audit administrative logs, you can navigate securely using the URL hash by adding "#admin" or "#admin-panel" to the URL address bar.',
      icon: <Lock className="w-5 h-5 text-purple-400" />
    }
  ];

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section 
      id="faq-section" 
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800 bg-slate-950/40 rounded-3xl mt-12 mb-6"
    >
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Knowledge Base</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-base text-slate-400 max-w-2xl mx-auto">
          Clear, descriptive answers to common questions about our zero-server secure file processing model, subscription structures, and workspace controls.
        </p>
      </div>

      <div className="space-y-4">
        {faqItems.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div 
              key={item.id} 
              id={`faq-item-${item.id}`}
              className={`border rounded-2xl transition-all duration-300 ${
                isOpen 
                  ? 'border-indigo-500/40 bg-slate-900/80 shadow-lg shadow-indigo-500/5' 
                  : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80 hover:bg-slate-900/50'
              }`}
            >
              <button
                type="button"
                id={`faq-btn-${item.id}`}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center justify-between text-left p-5 sm:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-2xl"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${item.id}`}
              >
                <div className="flex items-start gap-4 pr-4">
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-all ${
                    isOpen 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-500/10' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {item.question}
                    </h3>
                  </div>
                </div>
                <div className={`p-1.5 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180 border-indigo-500/20 text-indigo-400' : ''
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-answer-${item.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-0 border-t border-slate-800/50 mt-1 pl-[4.5rem]">
                      <div className="flex gap-2 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import { Sparkles, ShieldCheck, Zap, HeartHandshake } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-[#0F172A] pt-12 pb-8 border-b border-slate-800">
      
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(45rem_50rem_at_top,rgba(99,102,241,0.15),#0F172A)] opacity-70 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Badge Indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6 uppercase tracking-wider animate-pulse">
          <Sparkles className="w-3.5 h-3.5" /> High-Performance Conversion Sandbox
        </div>

        {/* Display Typography */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight md:leading-none">
          Professional PDF &amp; Image Tools
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 block mt-2">
            Completely Free &amp; Secure.
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Unlock standard client-side compilers to process, merge, split, compress, and translate document files without uploading anything to external servers!
        </p>

        {/* Dynamic trust pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto mt-10">
          {[
            {
              icon: ShieldCheck,
              title: "100% Secure & Private",
              desc: "Files are parsed directly inside your browser cache. Zero external database storage of your raw documents."
            },
            {
              icon: Zap,
              title: "Instant Execution",
              desc: "Skip long upload and download queues. Client-side compilers process heavy tasks in milliseconds."
            },
            {
              icon: HeartHandshake,
              title: "Worry-Free SaaS Rules",
              desc: "Enjoy up to 3 high-speed actions completely free every day, or subscribe to bypass restrictions."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex gap-3.5 p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-left shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all"
            >
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

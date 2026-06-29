"use client";

import Link from "next/link";
import { Check, ShieldCheck, ArrowLeft, Heart } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0E0E12] text-white font-sans relative overflow-x-hidden flex flex-col justify-between selection:bg-indigo-500/20">
      {/* Background glow graphics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-fuchsia-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between relative z-10">
        <Link href="/" className="logo flex items-center gap-2 text-sm font-semibold text-white no-underline">
          <div className="logo-mark w-6 h-6 bg-[#534AB7] rounded-lg flex items-center justify-center text-white">
            <ShieldCheck size={14} className="text-white" />
          </div>
          DocuSafe<span className="text-[#7F77DD]">PDF</span>
        </Link>
        <Link href="/" className="text-xs text-white/45 hover:text-white transition-colors no-underline">
          Go to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16 w-full relative z-10 flex-1 flex flex-col justify-center gap-12">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors no-underline">
            <ArrowLeft size={13} /> Back to Home
          </Link>
          <div className="text-center space-y-4">
            <span className="inline-block text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              No Subscriptions
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">100% Free Forever</h1>
            <p className="text-xs sm:text-sm text-white/40 max-w-md mx-auto leading-relaxed">
              We believe powerful PDF tools should be accessible to everyone without paywalls or restrictive monthly quotas.
            </p>
          </div>
        </div>

        <div className="bg-[#161622]/60 border border-[#534AB7]/30 rounded-3xl p-8 space-y-6 shadow-xl shadow-[#534AB7]/5">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-extrabold text-white text-lg">Unlimited Access</h3>
            <p className="text-xs text-white/45 leading-relaxed">
              All tools, including AI summaries, flashcards, Q&A, translation, and high-performance client-side utilities are available to use completely free.
            </p>
          </div>

          <div className="w-full h-px bg-white/5" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>No account or sign-in required</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Full privacy: Client-side processing</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Unlimited conversions & edits</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Support via non-intrusive ads</span>
            </div>
          </div>

          <div className="w-full h-px bg-white/5" />

          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-[11px] text-white/40 flex items-center justify-center gap-1">
              Made with <Heart size={10} className="text-rose-500 fill-rose-500" /> to make PDF editing simple.
            </p>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#534AB7] hover:bg-[#4339a0] text-white transition-all no-underline shadow-lg shadow-[#534AB7]/25"
            >
              Start Using Tools
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-[10px] text-white/35 relative z-10">
        © {new Date().getFullYear()} DocuSafe PDF. Keeping tools free through non-intrusive advertising.
      </footer>
    </div>
  );
}


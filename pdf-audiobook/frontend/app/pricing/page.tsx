"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, ArrowLeft } from "lucide-react";
import { useUsageStore } from "../utils/useUsageStore";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { triggerCheckout, isLoadingCheckout } = useUsageStore();

  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

  const handleUpgrade = async (plan: "pro" | "business") => {
    await triggerCheckout(plan, billingCycle);
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      description: "Basic document utilities for quick, simple edits.",
      features: [
        "5 tasks per day limit",
        "25 MB maximum file size limit",
        "50 pages maximum length per PDF",
        "Basic client-side tools only",
        "No batch operations",
        "Local browser processing",
        ...(!paymentsEnabled ? ["2 Pro trials included temporarily"] : []),
      ],
      cta: "Start Free",
      action: null,
      highlight: false,
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: billingCycle === "monthly" ? "$9" : "$7.20",
      description: "For professionals seeking privacy audits and print optimization.",
      features: [
        "300 tasks per month",
        "250 MB maximum file size limit",
        "500 pages maximum length per PDF",
        "Access to Pro Security & Privacy tools",
        "Access to Print Optimization tools",
        "Full detailed leaks/integrity reports",
        "Up to 25 files in batch processing",
        "Priority customer support",
      ],
      cta: paymentsEnabled ? "Upgrade to Pro" : "Notify Me",
      action: paymentsEnabled
        ? () => handleUpgrade("pro")
        : () => { window.location.href = "mailto:ikavinduw@gmail.com?subject=DocuSafe%20PDF%20Pro%20Waitlist"; },
      highlight: true,
    },
    {
      id: "business",
      name: "Business Plan",
      price: billingCycle === "monthly" ? "$29" : "$23.20",
      description: "Enterprise workflows, diff timelines, and templates.",
      features: [
        "2000 tasks per month",
        "1 GB maximum file size limit",
        "2000 pages maximum length per PDF",
        "Version Diff Character Timeline",
        "Client Delivery Packager",
        "Smart PDF Rename automation",
        "Stamp & Signature position templates",
        "Up to 250 files in batch processing",
        "Custom storage deletion policies",
      ],
      cta: paymentsEnabled ? "Upgrade to Business" : "Notify Me",
      action: paymentsEnabled
        ? () => handleUpgrade("business")
        : () => { window.location.href = "mailto:ikavinduw@gmail.com?subject=DocuSafe%20PDF%20Business%20Waitlist"; },
      highlight: false,
    },
  ];

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
        <Link href="/dashboard" className="text-xs text-white/45 hover:text-white transition-colors no-underline">
          Go to Dashboard
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-16 w-full relative z-10 flex-1 flex flex-col justify-center gap-12">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors no-underline">
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, transparent plans</h1>
            <p className="text-xs sm:text-sm text-white/40 max-w-md mx-auto">
              Choose the perfect plan to edit, clean, and secure PDFs. All processing runs completely in your browser.
            </p>
          </div>
        </div>

        {/* Temporary Activation notice */}
        {!paymentsEnabled && (
          <div className="max-w-xl mx-auto bg-gradient-to-r from-indigo-500/10 via-[#534AB7]/10 to-fuchsia-500/10 border border-[#534AB7]/25 rounded-2xl p-4 text-center space-y-1 shadow-lg shadow-indigo-500/5">
            <span className="inline-block text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-[#534AB7]/20 text-indigo-300 border border-[#7F77DD]/35 mb-1">
              Trial Access Available
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
              Payments are being activated. Signed-in users get 2 free Pro trials for now.
            </p>
          </div>
        )}

        {/* Cycle Switcher */}
        <div className="flex bg-[#16161C] border border-white/5 p-1 rounded-xl text-xs font-bold w-48 mx-auto relative z-10">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`flex-1 py-1.5 rounded-lg transition-all border-none cursor-pointer ${
              billingCycle === "monthly" ? "bg-[#534AB7] text-white" : "text-white/40 bg-transparent hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex-1 py-1.5 rounded-lg transition-all border-none cursor-pointer ${
              billingCycle === "yearly" ? "bg-[#534AB7] text-white" : "text-white/40 bg-transparent hover:text-white"
            }`}
          >
            Yearly (-20%)
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch relative z-10">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between gap-6 transition-all relative ${
                p.highlight
                  ? "bg-[#161622]/60 border-[#534AB7]/50 shadow-xl shadow-[#534AB7]/5"
                  : "bg-[#16161C]/50 border-white/5 hover:border-white/10"
              }`}
            >
              {p.highlight && (
                <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-[#534AB7] border border-[#7F77DD]/40 text-white text-[8px] font-black uppercase tracking-wider">
                  Popular
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-base uppercase tracking-wider">{p.name}</h3>
                  <p className="text-[11px] text-white/45 leading-relaxed">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{p.price}</span>
                  <span className="text-white/30 text-[10px]">/{billingCycle === "monthly" ? "mo" : "mo, billed yearly"}</span>
                </div>

                <div className="w-full h-px bg-white/5" />

                <ul className="space-y-2.5">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-white/60 leading-normal">
                      <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {p.action ? (
                <button
                  onClick={p.action}
                  disabled={isLoadingCheckout && paymentsEnabled}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
                    p.highlight
                      ? "bg-[#534AB7] hover:bg-[#4339a0] text-white shadow-lg shadow-[#534AB7]/20"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  {isLoadingCheckout && paymentsEnabled ? "Loading..." : p.cta}
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-white/5 hover:bg-white/10 text-white transition-all no-underline block font-sans"
                >
                  {p.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-[10px] text-white/35 relative z-10">
        © {new Date().getFullYear()} DocuSafe PDF. All calculations occur locally. Payments processed securely by LemonSqueezy.
      </footer>
    </div>
  );
}

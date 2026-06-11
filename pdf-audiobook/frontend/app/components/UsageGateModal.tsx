"use client";

import { useUsageStore } from "../utils/useUsageStore";
import { Lock, X, AlertTriangle, HelpCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";

export default function UsageGateModal() {
  const { activeGate, toolName, limitDetails, closeGate, triggerCheckout, isLoadingCheckout } =
    useUsageStore();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  if (!activeGate) return null;

  const handleUpgradeClick = async (plan: "pro" | "business") => {
    await triggerCheckout(plan, billingCycle);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={closeGate}
          disabled={isLoadingCheckout}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Modal Content Routing */}
        {activeGate === "pro-gate" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Lock size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Pro Tool Locked</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upgrade to unlock <span className="font-semibold text-slate-700">{toolName || "this tool"}</span>, 
                Privacy Reports, Evidence Lockers, Fake Redaction Detection, File Weight Maps, and more.
              </p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold w-36">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  billingCycle === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                Yearly (-20%)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleUpgradeClick("pro")}
                disabled={isLoadingCheckout}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoadingCheckout ? "Initializing..." : `Upgrade to Pro (${billingCycle === "monthly" ? "$9/mo" : "$7.20/mo"})`}
              </button>
              <button
                onClick={closeGate}
                disabled={isLoadingCheckout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                View Free Tools
              </button>
            </div>
          </div>
        )}

        {activeGate === "biz-gate" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-200 flex items-center justify-center text-fuchsia-600">
              <ShieldAlert size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Business Tool Locked</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upgrade to unlock <span className="font-semibold text-slate-700">{toolName || "this tool"}</span>, 
                Version Diff Timelines, Client Delivery Packagers, Smart Renames, and batch automations.
              </p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold w-36">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  billingCycle === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                Yearly (-20%)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleUpgradeClick("business")}
                disabled={isLoadingCheckout}
                className="flex-1 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoadingCheckout ? "Initializing..." : `Upgrade to Business (${billingCycle === "monthly" ? "$29/mo" : "$23.20/mo"})`}
              </button>
              <button
                onClick={closeGate}
                disabled={isLoadingCheckout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                View Pro Tools
              </button>
            </div>
          </div>
        )}

        {activeGate === "limit-reached" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Daily limit reached</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                You used your 5 free tasks today. Upgrade to Pro for 300 monthly tasks, larger files, and batch processing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleUpgradeClick("pro")}
                disabled={isLoadingCheckout}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoadingCheckout ? "Initializing..." : "Upgrade to Pro"}
              </button>
              <button
                onClick={closeGate}
                disabled={isLoadingCheckout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                Come Back Tomorrow
              </button>
            </div>
          </div>
        )}

        {activeGate === "file-too-large" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-200 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">File Too Large</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This file size ({limitDetails.currentVal} MB) exceeds your plan's limits. 
                Free supports up to 25 MB. Pro supports 250 MB. Business supports 1 GB.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleUpgradeClick("pro")}
                disabled={isLoadingCheckout}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoadingCheckout ? "Initializing..." : "Upgrade Plan"}
              </button>
              <button
                onClick={closeGate}
                disabled={isLoadingCheckout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                Choose Smaller File
              </button>
            </div>
          </div>
        )}

        {activeGate === "pages-exceeded" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-200 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Page Limit Exceeded</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                This document contains {limitDetails.currentVal} pages, which exceeds your plan's maximum allowed page length of {limitDetails.maxVal} pages. 
                Free supports up to 50 pages, Pro supports 500 pages, and Business supports 2000 pages.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleUpgradeClick("pro")}
                disabled={isLoadingCheckout}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoadingCheckout ? "Initializing..." : "Upgrade Plan"}
              </button>
              <button
                onClick={closeGate}
                disabled={isLoadingCheckout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeGate === "batch-limit-exceeded" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-200 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Batch File Limit Exceeded</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You attempted to process {limitDetails.currentVal} files, which exceeds your plan's batch limit of {limitDetails.maxVal} files.
                Free supports no batch jobs, Pro supports 25 files, and Business supports 250 files.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => handleUpgradeClick("pro")}
                disabled={isLoadingCheckout}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoadingCheckout ? "Initializing..." : "Upgrade Plan"}
              </button>
              <button
                onClick={closeGate}
                disabled={isLoadingCheckout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

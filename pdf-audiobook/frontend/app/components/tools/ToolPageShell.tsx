"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import RelatedTools from "./RelatedTools";
import AdBanner from "../AdBanner";

interface ToolPageShellProps {
  children: React.ReactNode;
  slug: string;
  category: string;
  howItWorksSteps?: string[];
}

export default function ToolPageShell({
  children,
  slug,
  category,
  howItWorksSteps,
}: ToolPageShellProps) {
  const defaultSteps = [
    "Upload your PDF document to the secure workspace.",
    "Adjust preferences or options on the dashboard panel.",
    "Click the action button and download your output file."
  ];

  const steps = howItWorksSteps || defaultSteps;

  // Derive tool name from slug
  const toolName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen bg-[#008080] p-4 sm:p-6 text-black font-mono selection:bg-[#000080] selection:text-white flex flex-col justify-between">
      {/* Main Retro Explorer Window */}
      <div className="win95-out max-w-5xl mx-auto w-full flex-1 flex flex-col overflow-hidden mb-6">
        {/* Title Bar */}
        <div className="win95-title flex items-center justify-between px-2 py-1 select-none">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <ShieldCheck size={14} className="text-white shrink-0" />
            <span className="truncate">{toolName} - DocuSafe Explorer</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="win95-btn w-4 h-4 text-[9px] font-bold flex items-center justify-center p-0 hover:bg-[#d4d4d4]" title="Help">?</button>
            <Link href="/" className="win95-btn w-4 h-4 text-[9px] font-bold flex items-center justify-center p-0 no-underline text-black hover:bg-[#d4d4d4]" title="Close Window">X</Link>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="bg-[#c0c0c0] px-2 py-0.5 border-b border-[#808080] flex items-center justify-between text-xs select-none font-sans">
          <div className="flex gap-4">
            <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">File</span>
            <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Edit</span>
            <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">View</span>
            <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Help</span>
          </div>
          <div>
            <Link href="/" className="text-black hover:bg-[#000080] hover:text-white px-1.5 py-0.5 flex items-center gap-1 no-underline font-bold">
              <ArrowLeft size={12} /> Up
            </Link>
          </div>
        </div>

        {/* Address Bar */}
        <div className="bg-[#c0c0c0] px-2 py-1.5 border-b border-[#808080] flex items-center gap-2 text-xs font-sans">
          <span className="text-[#808080] font-bold">Address:</span>
          <div className="win95-in flex-1 px-2 py-0.5 text-[11px] select-all truncate bg-white">
            C:\Windows\System32\DocuSafe\{slug}
          </div>
        </div>

        {/* Inner Program Content */}
        <div className="flex-1 bg-[#dfdfdf] p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
          
          {/* Main Workspace Frame */}
          <div className="w-full max-w-3xl win95-out p-6 bg-[#c0c0c0]">
            {children}
          </div>

          {/* Ad Banner inside Win95 panel */}
          <div className="w-full max-w-3xl mt-6 win95-in p-1 bg-[#ffffff] text-center">
            <div className="text-[9px] text-[#808080] text-left px-2 border-b border-[#dfdfdf] font-sans pb-0.5 mb-1 select-none">Advertisement</div>
            <AdBanner adSlot="1234567890" />
          </div>

          {/* How It Works (Readme File look) */}
          <div className="w-full max-w-3xl mt-8 win95-in bg-[#ffffff] p-5 text-left border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white">
            <div className="border-b-2 border-dashed border-[#808080] pb-2 mb-4">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                📝 README.TXT — Instructions
              </h3>
            </div>
            <div className="space-y-4">
              {steps.map((text, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                  <span className="w-5 h-5 bg-[#c0c0c0] border border-[#808080] flex items-center justify-center font-bold text-[10px] shrink-0 select-none">
                    {idx + 1}
                  </span>
                  <p className="font-medium text-black">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Related Tools Panel */}
          <div className="w-full max-w-3xl mt-6">
            <RelatedTools currentToolSlug={slug} category={category} />
          </div>

        </div>

        {/* Status Bar */}
        <div className="bg-[#c0c0c0] border-t border-[#808080] px-2 py-1 text-[11px] font-sans flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5 border-r border-[#808080] pr-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#808080]" />
            <span>Secure connection (Local memory sandbox)</span>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <span>DocuSafe v1.0.0</span>
            <span className="border-l border-[#808080] pl-2">My Computer</span>
          </div>
        </div>
      </div>

      {/* Retro Footer */}
      <footer className="w-full text-center py-2 text-white/50 text-[10px] font-sans">
        <p>© {new Date().getFullYear()} DocuSafe PDF · Retro Document Suite</p>
        <div className="flex justify-center gap-3 mt-1">
          <Link href="/" className="text-white/50 hover:text-white no-underline hover:underline">Home</Link>
          <Link href="/privacy" className="text-white/50 hover:text-white no-underline hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="text-white/50 hover:text-white no-underline hover:underline">Terms of Service</Link>
          <Link href="/contact" className="text-white/50 hover:text-white no-underline hover:underline">Contact Us</Link>
        </div>
      </footer>
    </div>
  );
}

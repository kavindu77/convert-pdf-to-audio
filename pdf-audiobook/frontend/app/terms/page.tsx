"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function TermsOfServicePage() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#008080] text-black font-mono selection:bg-[#000080] selection:text-white flex flex-col justify-between select-none p-3 sm:p-5 overflow-hidden h-screen">
      {/* Workspace */}
      <div className="flex-1 flex justify-center items-center overflow-hidden pb-12">
        
        {/* Help/Document Window */}
        <div className="win95-out w-full max-w-3xl flex flex-col h-full max-h-[85vh] shadow-2xl">
          {/* Title Bar */}
          <div className="flex items-center justify-between px-2 py-1 select-none font-bold text-xs win95-title">
            <div className="flex items-center gap-1">
              <span>📄</span>
              <span>DocuSafe Help - Terms of Service</span>
            </div>
            <div className="flex gap-0.5">
              <button className="win95-btn w-4 h-4 text-[9px] font-extrabold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf]">-</button>
              <button className="win95-btn w-4 h-4 text-[9px] font-extrabold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf]">▢</button>
              <Link 
                href="/" 
                className="win95-btn w-4 h-4 text-[9px] font-bold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf] no-underline"
              >
                X
              </Link>
            </div>
          </div>

          {/* Menus Row */}
          <div className="bg-[#c0c0c0] px-2 py-0.5 border-b border-[#808080] flex items-center justify-between text-xs select-none font-sans">
            <div className="flex gap-4">
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">File</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Edit</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Bookmark</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Options</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Help</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-[#c0c0c0] px-2 py-1 border-b border-[#808080] flex items-center gap-2 text-xs select-none border-t border-white/40">
            <Link 
              href="/"
              className="win95-btn flex items-center gap-1 px-3 py-0.5 text-xs font-sans text-black font-semibold hover:bg-[#dfdfdf] no-underline"
            >
              ⬅️ Back to Desktop
            </Link>
            <div className="w-[1px] h-4 bg-[#808080] border-r border-white/40" />
            <span className="text-[10px] text-gray-500 font-sans pl-2">Document: C:\Windows\System32\DocuSafe\TERMS.TXT</span>
          </div>

          {/* Content Pane */}
          <div className="win95-in p-6 bg-white text-black text-xs font-mono overflow-y-auto flex-1 select-text">
            <h1 className="text-sm font-bold border-b border-black/20 pb-1 mb-3">📜 TERMS OF SERVICE (LAST REVISED: JUNE 29, 2026)</h1>
            
            <p className="mb-4 leading-relaxed">
              Welcome to DocuSafe! By using our website and local PDF tools, you agree to comply with and be bound by the following Terms of Service.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">1. Description of Service</h3>
            <p className="mb-3 leading-relaxed">
              DocuSafe provides browser-based tool utilities for PDF file manipulation, including compression, merging, splitting, watermarking, redacting, and text-to-speech audio conversion. Most processing takes place locally inside your browser sandbox using secure WebAssembly modules.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">2. No Account Registration Required</h3>
            <p className="mb-3 leading-relaxed">
              DocuSafe is built on the philosophy of privacy and ease of use. You do not need to register, create accounts, or verify email addresses to access our suite of 38 PDF tools. No user profiles are created or maintained on our databases.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">3. Free &amp; Unlimited Allocations</h3>
            <p className="mb-3 leading-relaxed">
              All tools are completely free to use without daily usage quotas, payment gates, or premium pricing tiers. You may upload and process documents as frequently as needed, provided that you comply with standard, manual in-browser use. Any automated scraping, API resource exhaustion attacks, or automated bot loops are strictly prohibited.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">4. Ad-Supported Operations</h3>
            <p className="mb-3 leading-relaxed">
              To keep our tools free and maintain server resources for temporary AI content compilation, we display unobtrusive display advertisements. By using the site, you acknowledge that we integrate standard third-party advertising services (such as Google AdSense).
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">5. Disclaimer of Warranties</h3>
            <p className="mb-3 leading-relaxed">
              Our tools are provided on an "as-is" and "as-available" basis. We make no warranties that document outputs will perfectly align with visual styles, fonts, or external compliance. It is your responsibility to review the output documents.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">6. Contact Us</h3>
            <p className="mb-4 leading-relaxed">
              If you have any questions regarding these terms, contact us at support@docusafepdf.com or launch our <Link href="/contact" className="text-[#000080] underline font-bold hover:text-blue-800">Contact Dialog</Link>.
            </p>
          </div>

          {/* Status Bar */}
          <div className="bg-[#c0c0c0] border-t border-[#808080] px-2 py-0.5 text-[11px] font-sans flex justify-between select-none">
            <div>Help File Loaded</div>
            <div className="border-l border-[#808080] pl-4">100% Private Sandbox</div>
          </div>
        </div>

      </div>

      {/* Taskbar */}
      <div className="win95-out h-10 w-full flex items-center justify-between p-1 bg-[#c0c0c0] border-t border-slate-400 select-none z-50 fixed bottom-0 left-0 right-0">
        <div className="flex items-center gap-1.5 h-full">
          <Link 
            href="/"
            className="flex items-center gap-1 px-3 py-1 font-bold text-xs h-full border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] text-black no-underline"
          >
            <ShieldCheck size={12} className="text-[#000080]" />
            <span className="font-sans font-bold">Start</span>
          </Link>
          <div className="h-full flex items-center gap-1 pl-2">
            <button className="win95-btn flex items-center gap-1.5 px-2.5 h-full text-[10px] font-sans font-bold border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-[#dfdfdf] max-w-[130px] truncate">
              <span>📄</span>
              <span className="truncate">Terms of Service</span>
            </button>
          </div>
        </div>

        {/* System Tray */}
        <div className="win95-in px-2.5 py-0.5 bg-[#c0c0c0] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white flex items-center gap-2.5 text-[10.5px] font-sans font-semibold">
          <span>🔐</span>
          <span className="border-l border-[#808080] pl-2 tabular-nums">{time}</span>
        </div>
      </div>
    </div>
  );
}

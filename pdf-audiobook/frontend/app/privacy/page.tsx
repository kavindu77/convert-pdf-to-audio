"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
              <span>DocuSafe Help - Privacy Policy</span>
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
            <span className="text-[10px] text-gray-500 font-sans pl-2">Document: C:\Windows\System32\DocuSafe\PRIVACY.TXT</span>
          </div>

          {/* Content Pane */}
          <div className="win95-in p-6 bg-white text-black text-xs font-mono overflow-y-auto flex-1 select-text">
            <h1 className="text-sm font-bold border-b border-black/20 pb-1 mb-3">🔒 PRIVACY POLICY (LAST REVISED: JUNE 29, 2026)</h1>
            
            <p className="mb-4 leading-relaxed">
              At DocuSafe, we prioritize the confidentiality of your documents. Most PDF tools run directly in your browser. AI and audio tools use secure temporary server-side processing when required.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">1. 100% Client-Side Hygiene</h3>
            <p className="mb-3 leading-relaxed">
              All core document operations (Merging, Splitting, Compressing, Rotating, Watermarking, Password Protection, and Metadata Inspection) are executed entirely in your local browser sandbox. Your PDF files, document text, and images are loaded into local RAM, processed, and saved back to your device without ever being transmitted to our servers.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">2. AI and Audio Processing</h3>
            <p className="mb-3 leading-relaxed">
              For tools that leverage artificial intelligence (such as PDF Chat, Summarizer, and Flashcard generators) or speech compilation (PDF to Audiobook), text is temporarily processed server-side.
              We use secure server gateways to communicate with the Groq API. Your document contents are never saved or stored on our servers once the response generation is complete. We do not collect or log full document text after task execution.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">3. Free Ad-Supported Model</h3>
            <p className="mb-3 leading-relaxed">
              DocuSafe is 100% free to use. We do not require accounts, logins, or billing details. To support server hosting costs, we display advertisements provided by Google AdSense. Google and third-party vendors use cookies to serve ads based on your visits to this website and other sites on the Internet.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">4. Cookies and Web Identifiers</h3>
            <p className="mb-3 leading-relaxed">
              You can choose to opt-out of personalized advertising by visiting Google's Ads Settings, or by using cookie preference settings in your web browser.
            </p>

            <h3 className="font-bold mb-1 uppercase text-[#000080]">5. Contacts</h3>
            <p className="mb-4 leading-relaxed">
              If you have inquiries regarding this privacy framework, contact us at support@docusafepdf.com or launch our <Link href="/contact" className="text-[#000080] underline font-bold hover:text-blue-800">Contact Dialog</Link>.
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
              <span className="truncate">Privacy Policy</span>
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

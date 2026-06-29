"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Simulate sending message
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#008080] text-black font-mono selection:bg-[#000080] selection:text-white flex flex-col justify-between select-none p-3 sm:p-5 overflow-hidden h-screen">
      {/* Workspace */}
      <div className="flex-1 flex justify-center items-center overflow-hidden pb-12">
        
        {/* Contact Program Window */}
        <div className="win95-out w-full max-w-2xl flex flex-col h-full max-h-[85vh] shadow-2xl">
          {/* Title Bar */}
          <div className="flex items-center justify-between px-2 py-1 select-none font-bold text-xs win95-title">
            <div className="flex items-center gap-1">
              <span>✉️</span>
              <span>DocuSafe Mail - Contact Support</span>
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
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Message</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Edit</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">View</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Help</span>
            </div>
          </div>

          {/* Contact Main Split Workspace */}
          <div className="flex-1 flex overflow-hidden bg-[#dfdfdf] p-4 gap-4">
            
            {/* Left Column: Details */}
            <div className="w-1/3 flex flex-col gap-3 font-sans shrink-0">
              <div className="win95-in p-3 bg-white flex flex-col gap-1.5 select-text">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Support Email</span>
                <span className="font-bold text-[11px] text-[#000080] break-words">support@docusafepdf.com</span>
                <span className="text-[9px] text-gray-500 leading-normal">For general tool support and assistance.</span>
              </div>
              <div className="win95-in p-3 bg-white flex flex-col gap-1.5 select-text">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Feedback</span>
                <span className="font-bold text-[11px] text-[#000080] break-words">feedback@docusafepdf.com</span>
                <span className="text-[9px] text-gray-500 leading-normal">Send feature requests and audit reports.</span>
              </div>
            </div>

            {/* Right Column: Form Container */}
            <div className="flex-1 win95-in p-4 bg-white overflow-y-auto flex flex-col justify-between">
              {submitted ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 select-none font-sans">
                  <span className="text-3xl">📧</span>
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-black uppercase">Message Sent</h3>
                    <p className="text-[10px] text-gray-500 max-w-xs leading-normal">
                      Thank you for contacting DocuSafe! We will reply to your request within 24 hours.
                    </p>
                  </div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="win95-btn px-4 py-1 text-xs font-bold font-mono"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
                  <div className="space-y-0.5">
                    <label htmlFor="name" className="text-gray-600 font-bold text-[10px]">Your Name:</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="win95-in px-2 py-1 w-full text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#000080]"
                      placeholder="e.g. Kavindu"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label htmlFor="email" className="text-gray-600 font-bold text-[10px]">Email Address:</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="win95-in px-2 py-1 w-full text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#000080]"
                      placeholder="name@email.com"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label htmlFor="subject" className="text-gray-600 font-bold text-[10px]">Subject:</label>
                    <input
                      type="text"
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="win95-in px-2 py-1 w-full text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#000080]"
                      placeholder="Tool issues, suggestions..."
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label htmlFor="message" className="text-gray-600 font-bold text-[10px]">Message Details:</label>
                    <textarea
                      id="message"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="win95-in px-2 py-1 w-full text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#000080] resize-none"
                      placeholder="Describe your inquiry..."
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-[10px] font-bold font-mono">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="win95-btn w-full py-1 text-xs font-bold font-mono text-black flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={12} className="animate-spin shrink-0" />
                        <span>Sending Mail...</span>
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Status Bar */}
          <div className="bg-[#c0c0c0] border-t border-[#808080] px-2 py-0.5 text-[11px] font-sans flex justify-between select-none">
            <div>Connection status: Secured</div>
            <div className="border-l border-[#808080] pl-4">SMTP Sandbox</div>
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
              <span>✉️</span>
              <span className="truncate">Contact Support</span>
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

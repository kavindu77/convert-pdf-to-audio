"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-20%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-fuchsia-500/5 blur-[130px] bottom-[-20%] right-[-10%]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 relative border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">
            DocuSafe<span className="text-indigo-600 font-medium">PDF</span>
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all shadow-sm"
        >
          <ArrowLeft size={13} /> Back to Dashboard
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-6 py-12 grid md:grid-cols-12 gap-8 items-start animate-in">
        {/* Left Column: Details */}
        <div className="md:col-span-5 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Contact Us</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Have questions about billing, enterprise options, or need technical help? Send us a message and we'll reply within 24 hours.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200/60 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Support Email</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">support@docusafepdf.com</p>
                <p className="text-[11px] text-slate-400 mt-0.5">For general help &amp; tool support</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200/60 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-600 shrink-0">
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Billing Support</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">billing@docusafepdf.com</p>
                <p className="text-[11px] text-slate-400 mt-0.5">For refunds, cancellations, and LemonSqueezy details</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="md:col-span-7 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-sm">
          {submitted ? (
            <div className="text-center py-8 space-y-4 animate-in">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-200 flex items-center justify-center text-green-600 mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-lg">Message Sent Successfully</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out! A member of our support team will contact you at your email address shortly.
                </p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border-none"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="name" className="text-slate-500 uppercase tracking-wider font-bold">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800 text-xs"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-slate-500 uppercase tracking-wider font-bold">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800 text-xs"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="subject" className="text-slate-500 uppercase tracking-wider font-bold">Subject</label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800 text-xs"
                  placeholder="Billing inquiry, feature request..."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="message" className="text-slate-500 uppercase tracking-wider font-bold">Message</label>
                <textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800 text-xs resize-none"
                  placeholder="Write details about your request..."
                />
              </div>

              {error && (
                <p className="text-red-500 text-[11px] font-medium leading-relaxed">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-4 px-6 relative z-10 bg-slate-50 text-slate-500 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
          <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund" className="hover:underline">Refund Policy</Link>
            <Link href="/contact" className="hover:underline font-bold text-indigo-650">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

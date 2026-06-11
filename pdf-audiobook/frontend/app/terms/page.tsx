"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-8 animate-in">
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Terms of Service</h1>
          <p className="text-slate-500 text-sm">Last updated: June 11, 2026</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 text-sm leading-relaxed text-slate-655">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">1. Description of Service</h2>
            <p>
              DocuSafe PDF provides browser-based tool utilities for PDF file manipulation, including compression, merging, splitting, watermarking, redaction, versioning, and structure analysis. All core processing takes place locally within the user's web browser, and files are never stored on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">2. Account Registration and Authentication</h2>
            <p>
              To access the dashboard and run document utility tools, you must register and authenticate using Clerk. You are responsible for protecting your account credentials and security checks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">3. Subscription Tiers &amp; Usage Allocations</h2>
            <p>
              Usage allocations are governed strictly by your selected plan:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Free Plan:</strong> Limited to 5 total tasks per calendar day. Daily quotas reset at 00:00 UTC. Files are limited to 25 MB and 50 pages maximum. Batch processing is disabled.</li>
              <li><strong>Pro Plan:</strong> Limited to 300 tasks per calendar month. Quotas reset on the 1st of the month. Files are limited to 250 MB and 500 pages maximum. Batch processing is limited to 25 files.</li>
              <li><strong>Business Plan:</strong> Limited to 2,000 tasks per calendar month. Quotas reset on the 1st of the month. Files are limited to 1 GB and 2000 pages maximum. Batch processing is limited to 250 files.</li>
            </ul>
            <p>
              Any attempt to bypass backend usage checking, exploit job tokens, or automate API calls to bypass limits constitutes a violation of these terms and will result in immediate account termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">4. Payment &amp; Subscriptions</h2>
            <p>
              Payments are processed securely via our merchant of record, LemonSqueezy. By signing up for a premium subscription, you authorize automatic recurring payments according to your plan (monthly or yearly). You can cancel your subscription at any time via the Customer Portal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">5. Disclaimer of Warranties</h2>
            <p>
              Our local, client-side tools are provided on an "as-is" and "as-available" basis. We make no warranties that the file layouts, structures, fonts, or details will remain intact, or that the files produced will meet all legal encryption or visual formatting specifications. 
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">6. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the dashboard or tools following any modifications constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-4 px-6 relative z-10 bg-slate-50 text-slate-500 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
          <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline font-bold text-indigo-650">Terms of Service</Link>
            <Link href="/refund" className="hover:underline">Refund Policy</Link>
            <Link href="/contact" className="hover:underline">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

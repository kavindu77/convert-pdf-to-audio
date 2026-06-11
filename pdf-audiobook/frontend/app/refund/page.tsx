"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function RefundPolicyPage() {
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Refund Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: June 11, 2026</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 text-sm leading-relaxed text-slate-655">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">1. Refund Eligibility</h2>
            <p>
              We want you to be completely satisfied with DocuSafe PDF. We offer a **14-day refund window** from the date of your initial purchase or subscription renewal, subject to the conditions below.
            </p>
            <p>
              To protect our service from abuse, a refund is only available if you have used **less than 10%** of your subscription's task limits during the current billing cycle:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Pro Plan:</strong> Less than 30 tasks consumed.</li>
              <li><strong>Business Plan:</strong> Less than 200 tasks consumed.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">2. Non-Refundable Items</h2>
            <p>
              We cannot issue refunds in the following scenarios:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Refund requests submitted more than 14 days after the purchase date.</li>
              <li>Subscriptions that exceed the 10% usage threshold.</li>
              <li>Accounts terminated due to a violation of our Terms of Service (e.g. attempting to bypass job tokens or scraping the API).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">3. How to Request a Refund</h2>
            <p>
              To request a refund, please send an email to our billing team at **billing@docusafepdf.com** with:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your account email address.</li>
              <li>Your LemonSqueezy order number or subscription ID.</li>
              <li>A brief description of why you are requesting a refund.</li>
            </ul>
            <p>
              Alternatively, you can contact us through our <Link href="/contact" className="text-indigo-650 hover:underline">Contact Form</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">4. Processing Refunds</h2>
            <p>
              Once approved, our billing team will process the refund immediately. The funds will be returned to your original payment method. Depending on your financial institution, refunds can take **5 to 10 business days** to appear in your account.
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
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund" className="hover:underline font-bold text-indigo-650">Refund Policy</Link>
            <Link href="/contact" className="hover:underline">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

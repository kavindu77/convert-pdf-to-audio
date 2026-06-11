"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: June 11, 2026</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 text-sm leading-relaxed text-slate-655">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">1. Local Processing Guarantee</h2>
            <p>
              At DocuSafe PDF, we prioritize the confidentiality of your documents. Most PDF tools run directly in your browser. AI and audio tools use secure temporary server-side processing when required.
            </p>
            <p>
              All core operations including merging, splitting, compressing, rotating, watermarking, password protection, and metadata inspection are performed entirely inside your web browser. Your PDF files, document pages, text contents, and images for those core tools never touch our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">2. Information We Collect</h2>
            <p>
              To manage your account, enforce limits, and bill for premium subscriptions, we collect the following data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Info:</strong> Usernames, email addresses, and profile details provided by our identity provider, Clerk.</li>
              <li><strong>Billing Info:</strong> Subscription status, tier, and subscription identifiers managed securely via our merchant of record, LemonSqueezy.</li>
              <li><strong>Usage Metrics:</strong> We log the tool type, task cost, file size, page count, and status of tasks to audit usage constraints and ensure fair play. These metrics contain metadata only—never actual file contents.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">3. Third-Party Integrations</h2>
            <p>
              We integrate third-party services only where necessary to run the service:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Clerk:</strong> Provides secure authentication, identity verification, and profile management.</li>
              <li><strong>LemonSqueezy:</strong> Securely processes checkouts, stores customer credentials, manages subscriptions, and handles tax compliance.</li>
              <li><strong>Groq API:</strong> AI tools send extracted document text to our secure server and AI provider to generate responses. We do not use user-provided API keys, and we do not store full document text after processing.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">4. Security Rules</h2>
            <p>
              We implement industry-standard cryptographic practices. All backend communication requires SSL encryption. Sensitive credentials, webhook keys, and API tokens are restricted strictly to secure, server-side environments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1.5">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or your data, you can email us at support@docusafepdf.com or visit our <Link href="/contact" className="text-indigo-650 hover:underline">Contact Page</Link>.
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
            <Link href="/privacy" className="hover:underline font-bold text-indigo-650">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund" className="hover:underline">Refund Policy</Link>
            <Link href="/contact" className="hover:underline">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

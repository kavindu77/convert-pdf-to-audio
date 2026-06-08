"use client";
import { Check, Zap, BookOpen, Briefcase } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: BookOpen,
    color: "border-white/10",
    badge: null,
    features: [
      "10 pages per PDF",
      "3 conversions per day",
      "10 MB file size limit",
      "100+ languages",
      "MP3 download",
    ],
    cta: "Get Started",
    ctaLink: "/convert",
    ctaStyle: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    icon: Zap,
    color: "border-indigo-500",
    badge: "Most Popular",
    features: [
      "500 pages per PDF",
      "50 conversions per day",
      "50 MB file size limit",
      "100+ languages",
      "MP3 download",
      "Priority processing",
      "Full book support",
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/convert",
    ctaStyle: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  {
    name: "Business",
    price: "$29",
    period: "per month",
    icon: Briefcase,
    color: "border-white/10",
    badge: null,
    features: [
      "Unlimited pages",
      "Unlimited conversions",
      "50 MB file size limit",
      "100+ languages",
      "MP3 download",
      "Priority processing",
      "API access",
      "Team accounts",
    ],
    cta: "Contact Us",
    ctaLink: "mailto:contact@example.com",
    ctaStyle: "bg-white/10 hover:bg-white/20 text-white",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <BookOpen size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight">PDF Audiobook</span>
        </Link>
        <nav className="flex gap-6 text-sm text-gray-400">
          <Link href="/convert" className="hover:text-white transition-colors">Convert</Link>
          <Link href="/pricing" className="text-white">Pricing</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-400 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border ${plan.color} p-6 flex flex-col gap-6 ${
                  plan.badge ? "ring-1 ring-indigo-500/50" : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Icon size={16} className="text-indigo-400" />
                    </div>
                    <span className="font-semibold text-lg">{plan.name}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 mb-1">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-indigo-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaLink}
                  className={`w-full py-3 rounded-xl font-semibold text-center transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Comparison note */}
        <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10">
          <h2 className="font-semibold mb-4 text-center">Plan Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="text-left py-2 pr-4">Feature</th>
                  <th className="py-2 px-4">Free</th>
                  <th className="py-2 px-4 text-indigo-400">Pro</th>
                  <th className="py-2 px-4">Business</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["Pages per PDF", "10", "500", "Unlimited"],
                  ["Conversions/day", "3", "50", "Unlimited"],
                  ["File size", "10 MB", "50 MB", "50 MB"],
                  ["Languages", "100+", "100+", "100+"],
                  ["Full books", "✗", "✓", "✓"],
                  ["API access", "✗", "✗", "✓"],
                ].map(([feature, free, pro, biz]) => (
                  <tr key={feature} className="border-b border-white/5">
                    <td className="text-left py-2.5 pr-4 text-gray-400">{feature}</td>
                    <td className="py-2.5 px-4">{free}</td>
                    <td className="py-2.5 px-4 text-indigo-300 font-medium">{pro}</td>
                    <td className="py-2.5 px-4">{biz}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

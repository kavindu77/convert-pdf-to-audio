"use client";

import Link from "next/link";
import {
  Mic,
  Merge,
  Scissors,
  Image,
  FileImage,
  Archive,
  FileText,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Globe,
  RotateCw,
  Droplets,
  Lock,
  EyeOff,
  GitCompare,
  FileEdit,
  Clock,
  Layers,
  MessageSquare,
} from "lucide-react";

const TOOLS = [
  {
    id: "pdf-to-audio",
    name: "PDF to Audio",
    description: "Convert any PDF into a translated audiobook in 100+ languages with natural voices.",
    icon: Mic,
    href: "/tools/pdf-to-audio",
    color: "#6366f1",
    badge: "⭐ Star Tool",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    isServer: true,
  },
  {
    id: "pdf-chat",
    name: "PDF Chat / Q&A",
    description: "Chat with your PDF and ask questions. Uses Groq free AI model.",
    icon: MessageSquare,
    href: "/tools/pdf-chat",
    color: "#6366f1",
    badge: "Free AI",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    isServer: false,
  },
  {
    id: "summarize",
    name: "PDF Summarizer",
    description: "Summarize PDF documents into structured paragraphs or key bullet points.",
    icon: Sparkles,
    href: "/tools/summarize",
    color: "#d946ef",
    badge: "Free AI",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30",
    isServer: false,
  },
  {
    id: "flashcards",
    name: "PDF to Flashcards",
    description: "Generate study Q&A flashcards from textbooks. Uses Groq AI model.",
    icon: Layers,
    href: "/tools/flashcards",
    color: "#10b981",
    badge: "Free AI",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDF files into a single document. Drag to reorder pages.",
    icon: Merge,
    href: "/tools/merge",
    color: "#8b5cf6",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Split a PDF into individual pages or custom page ranges.",
    icon: Scissors,
    href: "/tools/split",
    color: "#ec4899",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "diff",
    name: "Compare / Diff PDFs",
    description: "Compare two PDFs line-by-line and view visual red/green differences.",
    icon: GitCompare,
    href: "/tools/diff",
    color: "#14b8a6",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "redact",
    name: "PDF Redactor",
    description: "Find and sanitize emails, phones, SSNs, credit cards, or custom keywords.",
    icon: EyeOff,
    href: "/tools/redact",
    color: "#f43f5e",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "rotate",
    name: "Rotate PDF Pages",
    description: "Select individual pages or all pages and rotate them 90° or 180°.",
    icon: RotateCw,
    href: "/tools/rotate",
    color: "#a855f7",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Draw text watermarks with custom size, color, opacity, and rotation.",
    icon: Droplets,
    href: "/tools/watermark",
    color: "#0ea5e9",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "password-protect",
    name: "Password Protect",
    description: "Strips metadata, adds protection markers, and watermarks PDF for security.",
    icon: Lock,
    href: "/tools/password-protect",
    color: "#ef4444",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "form-filler",
    name: "PDF Form Filler",
    description: "Parse and fill interactive forms in a browser without leaving your computer.",
    icon: FileEdit,
    href: "/tools/form-filler",
    color: "#8b5cf6",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "reading-time",
    name: "Reading Time Estimator",
    description: "Estimate silent reading time, speaking duration, ARI readability, and word stats.",
    icon: Clock,
    href: "/tools/reading-time",
    color: "#f59e0b",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "pdf-to-images",
    name: "PDF to Images",
    description: "Convert each PDF page into high-quality PNG or JPG images.",
    icon: Image,
    href: "/tools/pdf-to-images",
    color: "#f59e0b",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Combine multiple images (JPG, PNG, WebP) into a single PDF document.",
    icon: FileImage,
    href: "/tools/images-to-pdf",
    color: "#10b981",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "compress",
    name: "Compress PDF",
    description: "Reduce PDF file size by stripping metadata and optimizing structure.",
    icon: Archive,
    href: "/tools/compress",
    color: "#06b6d4",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
  {
    id: "extract-text",
    name: "Extract Text",
    description: "Pull all text from a PDF and download it as a clean .txt file.",
    icon: FileText,
    href: "/tools/extract-text",
    color: "#f97316",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Most tools run entirely in your browser — instant results, no waiting.",
  },
  {
    icon: Shield,
    title: "100% Private",
    description: "Client-side tools never upload your files. Your documents stay on your device.",
  },
  {
    icon: Globe,
    title: "100+ Languages",
    description: "Audio conversion supports translation to over 100 languages worldwide.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Mic size={18} />
        </div>
        <span className="font-semibold text-lg tracking-tight">PDF to Audio</span>
        <span className="ml-2 text-xs text-gray-500 hidden sm:inline">& PDF Tools</span>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-16">
          {/* Background glows */}
          <div className="hero-glow bg-indigo-600" style={{ top: "-200px", left: "10%" }} />
          <div className="hero-glow bg-purple-600" style={{ top: "-100px", right: "15%", animationDelay: "2s" }} />
          <div className="hero-glow bg-pink-600" style={{ top: "0px", left: "40%", animationDelay: "4s", width: 400, height: 400 }} />

          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
              <Sparkles size={14} className="text-indigo-400" />
              17 powerful tools — most run entirely in your browser
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
              Your All-in-One
              <br />
              <span className="gradient-text">PDF Toolkit</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Convert PDFs to audiobooks, chat with documents, merge, split, compress, watermark, protect, and more.
              Fast, private, and free to use.
            </p>
          </div>
        </section>

        {/* Tool Grid */}
        <section className="px-6 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="glass-card shimmer-border p-6 flex flex-col gap-4 cursor-pointer animate-in group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="tool-icon w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tool.color}20`, border: `1px solid ${tool.color}40` }}
                    >
                      <Icon size={22} style={{ color: tool.color }} />
                    </div>
                    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-indigo-300 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>
                  </div>
                  <div className="mt-auto pt-2 flex items-center gap-1 text-xs text-gray-600 group-hover:text-indigo-400 transition-colors">
                    Open tool <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-white/5 px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12 text-gray-200">Why PDF to Audio & Tools?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto mb-4">
                      <Icon size={22} className="text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feat.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
                <Mic size={12} />
              </div>
              <span>PDF to Audio</span>
            </div>
            <p>Free PDF tools — your files never leave your browser.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
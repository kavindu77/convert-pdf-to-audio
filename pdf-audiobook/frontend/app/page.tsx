"use client";

import { useState } from "react";
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
  Search,
  X,
  History,
  FileWarning,
  Tags,
  Bookmark,
  Maximize,
  Type,
  FileSpreadsheet,
  Activity,
  Heading,
  FolderArchive,
  ShieldCheck,
  Palette,
  Sun,
  Paperclip,
  ScanLine,
  Eye,
  Link2,
  QrCode,
  Stamp,
  AlertOctagon,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge: string;
  badgeColor: string;
  isServer: boolean;
  category: "ai" | "organize" | "edit" | "convert" | "security";
}

const TOOLS: Tool[] = [
  // --- AI PDF ---
  {
    id: "pdf-to-audio",
    name: "PDF to Audio",
    description: "Convert any PDF into a translated audiobook in 100+ languages.",
    icon: Mic,
    href: "/tools/pdf-to-audio",
    color: "#6366f1", // Indigo
    badge: "⭐ Star Tool",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    isServer: true,
    category: "ai",
  },
  {
    id: "pdf-chat",
    name: "PDF Chat / Q&A",
    description: "Interactive chat window to ask questions directly about your PDF content.",
    icon: MessageSquare,
    href: "/tools/pdf-chat",
    color: "#818cf8", // Violet Indigo
    badge: "Groq AI",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    isServer: false,
    category: "ai",
  },
  {
    id: "summarize",
    name: "PDF Summarizer",
    description: "Instantly summarize pages into paragraphs or key takeaways.",
    icon: Sparkles,
    href: "/tools/summarize",
    color: "#d946ef", // Fuchsia
    badge: "Groq AI",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30",
    isServer: false,
    category: "ai",
  },
  {
    id: "flashcards",
    name: "PDF to Flashcards",
    description: "Convert textbook pages into study Q&A flip card decks.",
    icon: Layers,
    href: "/tools/flashcards",
    color: "#10b981", // Emerald
    badge: "Groq AI",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
    category: "ai",
  },

  // --- ORGANIZE ---
  {
    id: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDF files into a single document.",
    icon: Merge,
    href: "/tools/merge",
    color: "#8b5cf6", // Purple
    badge: "Client-side",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    isServer: false,
    category: "organize",
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Split a PDF into individual pages or custom ranges.",
    icon: Scissors,
    href: "/tools/split",
    color: "#ec4899", // Pink
    badge: "Client-side",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-400/30",
    isServer: false,
    category: "organize",
  },
  {
    id: "rotate",
    name: "Rotate PDF Pages",
    description: "Rotate individual or all pages inside the document layout.",
    icon: RotateCw,
    href: "/tools/rotate",
    color: "#a855f7", // Violet
    badge: "Client-side",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    isServer: false,
    category: "organize",
  },
  {
    id: "timeline",
    name: "Version Diff Timeline",
    description: "Upload multiple versions of a PDF and see exactly what changed over time.",
    icon: History,
    href: "/tools/timeline",
    color: "#8b5cf6",
    badge: "Client-side",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    isServer: false,
    category: "organize",
  },
  {
    id: "missing-pages",
    name: "Missing Page Detector",
    description: "Detect sequence gaps, repeated pages, or skipped sections using internal numbering.",
    icon: FileWarning,
    href: "/tools/missing-pages",
    color: "#ec4899",
    badge: "Client-side",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-400/30",
    isServer: false,
    category: "organize",
  },
  {
    id: "page-labels",
    name: "Smart Page Labels",
    description: "Label pages/sections (e.g. Cover, Appendix) so PDF viewers display logical names.",
    icon: Tags,
    href: "/tools/page-labels",
    color: "#a855f7",
    badge: "Client-side",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    isServer: false,
    category: "organize",
  },

  // --- VIEW & EDIT ---
  {
    id: "form-filler",
    name: "PDF Form Filler",
    description: "Detect interactive input form fields in your PDF and fill them out.",
    icon: FileEdit,
    href: "/tools/form-filler",
    color: "#a855f7",
    badge: "Client-side",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Overlay custom text watermarks with size and opacity controls.",
    icon: Droplets,
    href: "/tools/watermark",
    color: "#0ea5e9", // Sky
    badge: "Client-side",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "password-protect",
    name: "Password Protect",
    description: "Strip metadata and add security stamp watermarks for protection.",
    icon: Lock,
    href: "/tools/password-protect",
    color: "#ef4444", // Red
    badge: "Client-side",
    badgeColor: "bg-red-500/20 text-red-300 border-red-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "redact",
    name: "PDF Redactor",
    description: "Scan and sanitize phone numbers, SSNs, credit cards, or names.",
    icon: EyeOff,
    href: "/tools/redact",
    color: "#f43f5e", // Rose
    badge: "Hybrid AI",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "diff",
    name: "Compare / Diff PDFs",
    description: "Compare two PDFs side-by-side and highlight additions and edits.",
    icon: GitCompare,
    href: "/tools/diff",
    color: "#14b8a6", // Teal
    badge: "Client-side",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "hidden-layers",
    name: "Hidden Layer Viewer",
    description: "Detect and display optional content groups, white text, covered text, and off-page objects.",
    icon: Layers,
    href: "/tools/hidden-layers",
    color: "#14b8a6",
    badge: "Client-side",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "signature-positions",
    name: "Signature Position Saver",
    description: "Save signature coordinates as templates and apply them automatically to invoices/contracts.",
    icon: Bookmark,
    href: "/tools/signature-positions",
    color: "#0ea5e9",
    badge: "Client-side",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "margin-normalizer",
    name: "Margin Normalizer",
    description: "Automatically trim scan margins and align page borders for professional printing.",
    icon: Maximize,
    href: "/tools/margin-normalizer",
    color: "#ef4444",
    badge: "Client-side",
    badgeColor: "bg-red-500/20 text-red-300 border-red-400/30",
    isServer: false,
    category: "edit",
  },
  {
    id: "font-fixer",
    name: "Font Problem Fixer",
    description: "Detect missing, non-embedded fonts, corrupted characters, or text copying risks.",
    icon: Type,
    href: "/tools/font-fixer",
    color: "#f43f5e",
    badge: "Client-side",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    isServer: false,
    category: "edit",
  },

  // --- CONVERT & COMPRESS ---
  {
    id: "reading-time",
    name: "Reading Time Estimator",
    description: "Estimates page word count speed, narration time, and ARI readability index.",
    icon: Clock,
    href: "/tools/reading-time",
    color: "#f59e0b", // Amber
    badge: "Client-side",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "pdf-to-images",
    name: "PDF to Images",
    description: "Convert each PDF page into high-quality PNG or JPG images.",
    icon: Image,
    href: "/tools/pdf-to-images",
    color: "#f59e0b",
    badge: "Client-side",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Combine multiple images into a single PDF document.",
    icon: FileImage,
    href: "/tools/images-to-pdf",
    color: "#10b981",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "compress",
    name: "Compress PDF",
    description: "Reduce PDF file size by stripping metadata and structure.",
    icon: Archive,
    href: "/tools/compress",
    color: "#06b6d4", // Cyan
    badge: "Client-side",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "extract-text",
    name: "Extract Text",
    description: "Pull all text from a PDF and download it as a .txt file.",
    icon: FileText,
    href: "/tools/extract-text",
    color: "#f97316", // Orange
    badge: "Client-side",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "form-extractor",
    name: "Form Data Extractor",
    description: "Extract all filled fields from interactive PDF forms into a structured CSV file.",
    icon: FileSpreadsheet,
    href: "/tools/form-extractor",
    color: "#f59e0b",
    badge: "Client-side",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "weight-map",
    name: "File Weight Map",
    description: "Visualize what makes your PDF heavy: images, fonts, embedded items, or vector shapes.",
    icon: Activity,
    href: "/tools/weight-map",
    color: "#10b981",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "smart-rename",
    name: "Smart Rename",
    description: "Parse page text to auto-rename files based on invoice ID, date, customer, or title.",
    icon: Heading,
    href: "/tools/smart-rename",
    color: "#06b6d4",
    badge: "Client-side",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
    isServer: false,
    category: "convert",
  },
  {
    id: "delivery-packager",
    name: "Client Delivery Packager",
    description: "Compile standard PDF, compressed web PDF, text extracts, and metadata report to ZIP.",
    icon: FolderArchive,
    href: "/tools/delivery-packager",
    color: "#f97316",
    badge: "Client-side",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-400/30",
    isServer: false,
    category: "convert",
  },

  // --- SECURITY & LEGAL ---
  {
    id: "evidence-locker",
    name: "Evidence Locker",
    description: "Generate hash, timestamp, screenshots, and verification ticket for legal records.",
    icon: ShieldCheck,
    href: "/tools/evidence-locker",
    color: "#3b82f6",
    badge: "Client-side",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "color-detector",
    name: "Color Page Detector",
    description: "Scan pages to detect black-and-white vs color to save printing costs.",
    icon: Palette,
    href: "/tools/color-detector",
    color: "#10b981",
    badge: "Client-side",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "ink-saver",
    name: "Ink Saver Optimizer",
    description: "Reduce heavy backgrounds, large dark fills, and dark images to optimize printer ink.",
    icon: Sun,
    href: "/tools/ink-saver",
    color: "#eab308",
    badge: "Client-side",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "attachments",
    name: "Attachment Inspector",
    description: "Scan, list, extract, or remove hidden files embedded inside the PDF container.",
    icon: Paperclip,
    href: "/tools/attachments",
    color: "#6366f1",
    badge: "Client-side",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "bad-scan-detector",
    name: "Bad Scan Detector",
    description: "Check scanned PDFs for blurriness, contrast, rotation, blank pages, and cut-off text.",
    icon: ScanLine,
    href: "/tools/bad-scan-detector",
    color: "#ec4899",
    badge: "Client-side",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "privacy-report",
    name: "Privacy Report",
    description: "Scan and generate audit reports for metadata, creation tool, hidden texts, and forms.",
    icon: Eye,
    href: "/tools/privacy-report",
    color: "#14b8a6",
    badge: "Client-side",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "link-safety",
    name: "Link Safety Scanner",
    description: "Scan annotations to identify tracking params, shortened URLs, or suspicious domains.",
    icon: Link2,
    href: "/tools/link-safety",
    color: "#f43f5e",
    badge: "Client-side",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "barcode-scanner",
    name: "QR / Barcode Scanner",
    description: "Detect, decode, list values, and replace QR/barcodes embedded across pages.",
    icon: QrCode,
    href: "/tools/barcode-scanner",
    color: "#06b6d4",
    badge: "Client-side",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "stamp-consistency",
    name: "Stamp Checker",
    description: "Ensure required stamps like 'Approved' or 'Confidential' are present on all pages.",
    icon: Stamp,
    href: "/tools/stamp-consistency",
    color: "#a855f7",
    badge: "Client-side",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    isServer: false,
    category: "security",
  },
  {
    id: "fake-redaction",
    name: "Fake Redaction Detector",
    description: "Identify if black redaction blocks are fake overlay graphics hiding selectable text.",
    icon: AlertOctagon,
    href: "/tools/fake-redaction",
    color: "#ef4444",
    badge: "Security Alert",
    badgeColor: "bg-red-500/20 text-red-300 border-red-400/30",
    isServer: false,
    category: "security",
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

const CATEGORIES = [
  { id: "ai", name: "AI PDF Tools", color: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30" },
  { id: "organize", name: "Organize PDF", color: "from-violet-500/10 to-pink-500/10 border-pink-500/20" },
  { id: "edit", name: "View & Edit", color: "from-sky-500/10 to-teal-500/10 border-teal-500/20" },
  { id: "convert", name: "Convert & Compress", color: "from-amber-500/10 to-emerald-500/10 border-emerald-500/20" },
  { id: "security", name: "Security & Legal", color: "from-blue-500/10 to-rose-500/10 border-red-500/20" },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = TOOLS.filter((tool) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.badge.toLowerCase().includes(query)
    );
  });

  const getToolsByCategory = (category: string) => {
    return filteredTools.filter((t) => t.category === category);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 overflow-x-hidden relative">
      
      {/* Dynamic Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[130px] -top-96 -left-48 animate-pulse duration-[10000ms]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-fuchsia-500/5 blur-[120px] top-[20%] right-[-200px] animate-pulse duration-[8000ms] delay-2000" />
        <div className="absolute w-[700px] h-[700px] rounded-full bg-teal-500/3 blur-[140px] bottom-10 left-[10%] animate-pulse duration-[12000ms] delay-5000" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-md bg-gray-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Mic size={18} />
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            PDF to Audio
          </span>
          <span className="ml-2 text-xs text-gray-500 hidden sm:inline">&amp; PDF Toolkit</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            100% Client Secure
          </span>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Area */}
        <section className="px-6 pt-16 pb-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 animate-fade-in shadow-inner">
            <Sparkles size={12} className="text-indigo-400 animate-spin-slow" />
            17 Premium PDF Tools · Completely Free
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Your Ultimate
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
              PDF Dashboard
            </span>
          </h1>
          
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Convert, edit, organize, compress, and chat with documents securely in your browser. No files are uploaded to any server.
          </p>

          {/* Premium Search Bar */}
          <div className="max-w-md mx-auto pt-4 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl opacity-10 blur group-hover:opacity-25 transition-opacity duration-300" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-gray-400 group-hover:text-indigo-300 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search PDF tools (e.g. compress, summarize)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 placeholder-gray-500 transition-all text-white backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Categorized Tools Sections */}
        <section className="px-6 pb-24 max-w-7xl mx-auto space-y-12">
          {filteredTools.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md max-w-lg mx-auto space-y-4">
              <Layers size={40} className="mx-auto text-gray-600 animate-bounce" />
              <h3 className="font-semibold text-white text-lg">No tools matched your search</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Try searching for other terms like &ldquo;audiobook&rdquo;, &ldquo;merge&rdquo;, &ldquo;watermark&rdquo;, or &ldquo;diff&rdquo;.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Reset Search
              </button>
            </div>
          ) : (
            CATEGORIES.map((category) => {
              const tools = getToolsByCategory(category.id);
              if (tools.length === 0) return null;

              return (
                <div key={category.id} className="space-y-4 animate-fade-in-up">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-gray-500 select-none">
                      {category.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                      {tools.length}
                    </span>
                  </div>

                  {/* Tools Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tools.map((tool, idx) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className="glass-card shimmer-border p-5 flex flex-col gap-3.5 cursor-pointer group relative overflow-hidden active:scale-[0.98] active:bg-white/[0.06] transition-all duration-300 select-none"
                        >
                          {/* Radial Glow Highlight on Hover */}
                          <div 
                            className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{
                              background: `radial-gradient(120px circle at 50% 0px, ${tool.color}15, transparent)`,
                            }}
                          />
                          
                          <div className="flex items-start justify-between">
                            <div
                              className="tool-icon w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300"
                              style={{
                                backgroundColor: `${tool.color}15`,
                                border: `1px solid ${tool.color}25`,
                              }}
                            >
                              <Icon size={18} style={{ color: tool.color }} />
                            </div>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${tool.badgeColor}`}>
                              {tool.badge}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-indigo-300 transition-colors">
                              {tool.name}
                            </h3>
                            <p className="text-[11px] text-gray-500 leading-relaxed min-h-[32px]">
                              {tool.description}
                            </p>
                          </div>

                          <div className="mt-auto pt-1 flex items-center gap-1 text-[10px] text-gray-600 group-hover:text-indigo-400 transition-colors">
                            Open tool <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Features Showcase */}
        <section className="border-t border-white/5 px-6 py-16 bg-white/[0.01]">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-xl font-bold text-center text-gray-300">Why Use Our PDF Toolkit?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto shadow-inner">
                      <Icon size={18} className="text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-sm text-white">{feat.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{feat.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-gray-600">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
                <Mic size={12} />
              </div>
              <span className="font-semibold text-white">PDF to Audio</span>
            </div>
            <p>© {new Date().getFullYear()} Toolkit · Client-side security first · Made with ⚡</p>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
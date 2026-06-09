"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdBanner from "./components/AdBanner";
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
  AlertTriangle,
  User,
  CreditCard,
  Award,
  Check,
  RefreshCw,
  LogOut,
} from "lucide-react";
import {
  PlanType,
  PLANS,
  TOOL_COSTS,
  isToolAllowed,
  getRequiredPlanForTool,
  getLocalPlan,
  setLocalPlan,
  getLocalTasksUsed,
  incrementLocalTasksUsed,
  getLocalTasksLimit,
  checkHasRemainingTasks,
} from "./utils/userState";

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
  planRequired: PlanType;
  processing: "Client-side" | "Secure server";
  outputType: "Report" | "CSV" | "ZIP" | "Batch" | "PDF" | "TXT" | "Images";
  benefit: string;
}

const TOOLS: Tool[] = [
  // --- POPULAR / ORGANIZE ---
  {
    id: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDF files into a single document.",
    icon: Merge,
    href: "/tools/merge",
    color: "#8b5cf6",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "organize",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Combine contracts, statements, or scanned reports into a single file instantly.",
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Split a PDF into individual pages or custom ranges.",
    icon: Scissors,
    href: "/tools/split",
    color: "#ec4899",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "organize",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Extract specific sections or break up huge documents page by page.",
  },
  {
    id: "compress",
    name: "Compress PDF",
    description: "Reduce PDF file size by stripping metadata and structure.",
    icon: Archive,
    href: "/tools/compress",
    color: "#06b6d4",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "convert",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Reduce file weight for email attachments or portal uploads.",
  },
  {
    id: "rotate",
    name: "Rotate PDF Pages",
    description: "Rotate individual or all pages inside the document layout.",
    icon: RotateCw,
    href: "/tools/rotate",
    color: "#a855f7",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "organize",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Fix sideways layout scans or landscape pages in seconds.",
  },
  {
    id: "pdf-to-images",
    name: "PDF to Images",
    description: "Convert each PDF page into high-quality PNG or JPG images.",
    icon: Image,
    href: "/tools/pdf-to-images",
    color: "#f59e0b",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "convert",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Images",
    benefit: "Convert document pages into images for slides, web pages, or media.",
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Combine multiple images into a single PDF document.",
    icon: FileImage,
    href: "/tools/images-to-pdf",
    color: "#10b981",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "convert",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Convert photos, receipts, or snapshot JPGs into a unified PDF.",
  },
  {
    id: "extract-text",
    name: "Extract Text",
    description: "Pull all text from a PDF and download it as a .txt file.",
    icon: FileText,
    href: "/tools/extract-text",
    color: "#f97316",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "convert",
    planRequired: "free",
    processing: "Client-side",
    outputType: "TXT",
    benefit: "Extract text from reports or copy layouts without formatting issues.",
  },
  {
    id: "form-filler",
    name: "PDF Form Filler",
    description: "Detect interactive input form fields in your PDF and fill them out.",
    icon: FileEdit,
    href: "/tools/form-filler",
    color: "#8b5cf6",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    isServer: false,
    category: "organize",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Type directly into active fields, toggle checkboxes, and download filled PDFs.",
  },

  // --- SECURITY & PRIVACY ---
  {
    id: "privacy-report",
    name: "Privacy Report",
    description: "Scan and generate audit reports for metadata, creation tool, hidden texts, and forms.",
    icon: Eye,
    href: "/tools/privacy-report",
    color: "#14b8a6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Find metadata, links, forms, attachments, hidden text, and risky content before sharing.",
  },
  {
    id: "evidence-locker",
    name: "Evidence Locker",
    description: "Generate hash, timestamp, screenshots, and verification ticket for legal records.",
    icon: ShieldCheck,
    href: "/tools/evidence-locker",
    color: "#3b82f6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: true,
    category: "security",
    planRequired: "pro",
    processing: "Secure server",
    outputType: "ZIP",
    benefit: "Generate tamper-proof hash, page snapshots, metadata report, and verification record.",
  },
  {
    id: "fake-redaction",
    name: "Fake Redaction Checker",
    description: "Identify if black redaction blocks are fake overlay graphics hiding selectable text.",
    icon: AlertOctagon,
    href: "/tools/fake-redaction",
    color: "#ef4444",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Ensure black boxes are actually redacting selectable text layered behind graphics.",
  },
  {
    id: "attachments",
    name: "Attachment Inspector",
    description: "Scan, list, extract, or remove hidden files embedded inside the PDF container.",
    icon: Paperclip,
    href: "/tools/attachments",
    color: "#6366f1",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Extract or safely strip hidden embedded attachment payloads inside the catalog.",
  },
  {
    id: "hidden-layers",
    name: "Hidden Layer Viewer",
    description: "Detect and display optional content groups, white text, covered text, and off-page objects.",
    icon: Layers,
    href: "/tools/hidden-layers",
    color: "#14b8a6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Reveal hidden layouts, white text, covered text, and coordinates off the canvas boundary.",
  },
  {
    id: "link-safety",
    name: "Link Safety Scanner",
    description: "Scan annotations to identify tracking params, shortened URLs, or suspicious domains.",
    icon: Link2,
    href: "/tools/link-safety",
    color: "#f43f5e",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Strip marketing tracking UTM parameters and scan hyperlinks inside annotations.",
  },
  {
    id: "barcode-scanner",
    name: "QR / Barcode Scanner",
    description: "Detect, decode, list values, and replace QR/barcodes embedded across pages.",
    icon: QrCode,
    href: "/tools/barcode-scanner",
    color: "#06b6d4",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "CSV",
    benefit: "Locate and decode machine-readable barcodes or QR values on all pages.",
  },
  {
    id: "password-protect",
    name: "Password Protect",
    description: "Strip metadata and add security stamp watermarks for protection.",
    icon: Lock,
    href: "/tools/password-protect",
    color: "#ef4444",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Secure documents with custom metadata markers and Visual protection watermarks.",
  },

  // --- PRINT & SCAN ---
  {
    id: "color-detector",
    name: "Color Page Detector",
    description: "Scan pages to detect black-and-white vs color to save printing costs.",
    icon: Palette,
    href: "/tools/color-detector",
    color: "#10b981",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Identify exact pages containing color vs monochrome layout to save printing costs.",
  },
  {
    id: "ink-saver",
    name: "Ink Saver Optimizer",
    description: "Reduce heavy backgrounds, large dark fills, and dark images to optimize printer ink.",
    icon: Sun,
    href: "/tools/ink-saver",
    color: "#eab308",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: true,
    category: "security",
    planRequired: "pro",
    processing: "Secure server",
    outputType: "PDF",
    benefit: "Auto-invert dark backgrounds, strip color fills, and optimize document ink utilization.",
  },
  {
    id: "bad-scan-detector",
    name: "Bad Scan Detector",
    description: "Check scanned PDFs for blurriness, contrast, rotation, blank pages, and cut-off text.",
    icon: ScanLine,
    href: "/tools/bad-scan-detector",
    color: "#ec4899",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Analyze edge contrast and luminance to detect blur, rotation issues, or blank pages.",
  },
  {
    id: "weight-map",
    name: "File Weight Map",
    description: "Visualize what makes your PDF heavy: images, fonts, embedded items, or vector shapes.",
    icon: Activity,
    href: "/tools/weight-map",
    color: "#10b981",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    isServer: false,
    category: "convert",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Map exact byte consumption of fonts, embedded streams, vector path structures, and images.",
  },
];

export default function HomePage() {
  const router = useRouter();
  
  // App States
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanType>("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [userName, setUserName] = useState("Kavindu");
  const [userEmail, setUserEmail] = useState("kavindu@example.com");

  // Mouse tracking for transparent background glow
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseActive, setIsMouseActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleMouseEnter = () => setIsMouseActive(true);
    const handleMouseLeave = () => setIsMouseActive(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    setIsMouseActive(true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  // Modals
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [gateToolName, setGateToolName] = useState("");
  const [gateToolRequired, setGateToolRequired] = useState<PlanType>("pro");

  // Form Inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    // Sync login status
    const logged = localStorage.getItem("user_logged_in") === "true";
    setIsLoggedIn(logged);
    
    // Sync plan and limits
    const plan = getLocalPlan();
    setUserPlan(plan);

    const used = getLocalTasksUsed();
    setTasksUsed(used);

    // Sync profile
    const savedName = localStorage.getItem("user_profile_name");
    const savedEmail = localStorage.getItem("user_profile_email");
    if (savedName) setUserName(savedName);
    if (savedEmail) setUserEmail(savedEmail);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("user_profile_email", emailInput);
    
    // Set mock display name from email prefix
    const namePrefix = emailInput.split("@")[0];
    const formattedName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
    localStorage.setItem("user_profile_name", formattedName);
    
    setUserName(formattedName);
    setUserEmail(emailInput);
    setIsLoggedIn(true);
    setIsSignInOpen(false);
    setEmailInput("");
    setPasswordInput("");
  };

  const handleSignOut = () => {
    localStorage.setItem("user_logged_in", "false");
    setIsLoggedIn(false);
    // Reset back to free if signed out
    setLocalPlan("free");
    setUserPlan("free");
  };

  const handleUpgradeNow = () => {
    setIsUpgrading(true);
    setTimeout(() => {
      setIsUpgrading(false);
      setUpgradeSuccess(true);
      setLocalPlan("pro");
      setUserPlan("pro");
      setTimeout(() => {
        setIsUpgradeOpen(false);
        setUpgradeSuccess(false);
      }, 1500);
    }, 1500);
  };

  // Intercept tool routing checks
  const handleToolClick = (e: React.MouseEvent<HTMLAnchorElement>, tool: Tool) => {
    e.preventDefault();
    
    // 1. Check Plan Authorization
    const allowed = isToolAllowed(tool.id, userPlan);
    if (!allowed) {
      setGateToolName(tool.name);
      setGateToolRequired(tool.planRequired);
      setIsGateModalOpen(true);
      return;
    }

    // 2. Check Tasks limit remaining
    const cost = TOOL_COSTS[tool.id] || 1;
    const hasLimit = checkHasRemainingTasks(cost);
    if (!hasLimit) {
      setIsLimitModalOpen(true);
      return;
    }

    // Deduct mock task & route
    incrementLocalTasksUsed(cost);
    setTasksUsed(getLocalTasksUsed());
    router.push(tool.href);
  };

  const filteredTools = TOOLS.filter((tool) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.benefit.toLowerCase().includes(query)
    );
  });

  const getToolsByCategory = (category: string) => {
    return filteredTools.filter((t) => t.category === category);
  };

  const getToolsByProcessing = (proc: "Client-side" | "Secure server") => {
    return filteredTools.filter((t) => t.processing === proc);
  };

  // Split selected homepage display tools
  const popularTools = filteredTools.filter(t => ["merge", "split", "compress", "rotate"].includes(t.id));
  const securityTools = filteredTools.filter(t => ["privacy-report", "evidence-locker", "fake-redaction", "attachments"].includes(t.id));
  const printTools = filteredTools.filter(t => ["color-detector", "ink-saver", "bad-scan-detector", "weight-map"].includes(t.id));

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 overflow-x-hidden relative font-sans">
      
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[850px] h-[850px] rounded-full bg-indigo-500/10 blur-[140px] -top-96 -left-48 animate-float-slow duration-[12000ms]" />
        <div className="absolute w-[700px] h-[700px] rounded-full bg-teal-500/5 blur-[120px] top-[30%] right-[-200px] animate-float-fast" />
      </div>

      {/* Dynamic Cursor Glow (Parallax depth layer) */}
      {isMouseActive && (
        <div
          className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-500 opacity-70"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.04), rgba(20, 184, 166, 0.01) 40%, transparent 85%)`,
          }}
        />
      )}

      {/* Header */}
      <header className="relative border-b border-white/5 px-6 py-4 flex items-center justify-between z-10 backdrop-blur-md bg-gray-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            DocuSafe PDF
          </span>
        </div>

        {/* Top Navbar */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
          <Link href="/all-tools" prefetch={false} className="hover:text-white transition-colors">Tools</Link>
          <button onClick={() => {
            const el = document.getElementById("security-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }} className="hover:text-white transition-colors">Security</button>
          <button onClick={() => {
            const el = document.getElementById("print-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }} className="hover:text-white transition-colors">Print &amp; Scan</button>
          <button onClick={() => {
            const el = document.getElementById("pricing-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }} className="hover:text-white transition-colors">Pricing</button>
          
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" prefetch={false} className="text-indigo-400 hover:text-indigo-300 transition-colors">Dashboard</Link>
              <span className="text-gray-700">|</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-300 truncate max-w-[100px]">{userName}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSignInOpen(true)} className="hover:text-white transition-colors">
                Sign In
              </button>
              <button onClick={() => setIsSignInOpen(true)} className="px-4 py-1.5 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs">
                Start Free
              </button>
            </div>
          )}
        </nav>

        {/* Mobile profile link */}
        <div className="flex md:hidden items-center gap-2">
          {isLoggedIn ? (
            <Link href="/dashboard" prefetch={false} className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User size={14} />
            </Link>
          ) : (
            <button onClick={() => setIsSignInOpen(true)} className="text-xs text-indigo-400 font-bold">Sign In</button>
          )}
        </div>
      </header>

      <main className="relative z-10">
        
        {/* Hero */}
        <section className="px-6 py-20 text-center max-w-7xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/15 text-xs text-indigo-300 animate-fade-in shadow-inner">
            <Sparkles size={12} className="text-indigo-400 animate-pulse" />
            Free PDF tools + Pro security reports
          </div>
          
          <h1 className="font-[800] tracking-[-0.04em] leading-[0.95] bg-gradient-to-b from-white to-gray-200 bg-clip-text text-transparent" style={{ fontSize: "clamp(42px, 6vw, 72px)" }}>
            Private PDF Tools for Work,
            <br />
            Print &amp; Security
          </h1>
          
          <p className="text-[16px] text-[#94a3b8] font-[400] leading-[1.6] max-w-2xl mx-auto">
            Check, clean, print, and safely share PDFs with free tools and Pro reports.
          </p>

          <p className="text-[11px] text-gray-500 max-w-lg mx-auto italic">
            🛡️ Secure Temporary Processing: Advanced tools use secure temporary processing when browser-only execution is not possible.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto pt-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-2xl opacity-10 blur group-hover:opacity-20 transition-opacity duration-300" />
            <div className="relative flex items-center z-10">
              <Search className="absolute left-4 text-gray-500 group-hover:text-indigo-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search tools: compress, privacy report, color pages..."
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
            
            {/* Quick Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 relative z-10">
              {["compress", "privacy report", "color page detector", "fake redaction"].map(chip => (
                <button 
                  key={chip} 
                  onClick={() => setSearchQuery(chip)} 
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors capitalize cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Tools Grid */}
        <section className="px-6 py-12 max-w-7xl mx-auto space-y-6">
          <div className="flex items-end justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-[22px] font-[700] text-white tracking-[-0.02em]">Popular Free Tools</h2>
              <p className="text-xs text-gray-500">Everyday utility operations running 100% locally in your browser.</p>
            </div>
            <Link href="/all-tools" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.id}
                  href={tool.href}
                  onClick={(e) => handleToolClick(e, tool)}
                  onMouseMove={handleCardMouseMove}
                  className="glass-card shimmer-border p-5 flex flex-col gap-4 cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300 animate-in bg-white/[0.04]"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    // @ts-ignore
                    "--hover-color": tool.color
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 tool-icon">
                      <Icon size={18} style={{ color: tool.color }} />
                    </div>
                    <span className="text-[11px] font-[600] px-2 py-0.5 rounded bg-green-500/15 border border-green-500/20 text-green-400">
                      Free Tool
                    </span>
                  </div>

                  <div>
                    <h3 className="font-[700] text-white text-[16px] group-hover:text-indigo-300 transition-colors mb-1">{tool.name}</h3>
                    <p className="text-[13.5px] text-[#94a3b8] leading-[1.5] min-h-[32px]">{tool.description}</p>
                  </div>

                  <div className="text-[11px] font-[600] text-gray-500 mt-auto pt-2 border-t border-white/5">
                    {tool.planRequired === 'free' ? 'Free' : tool.planRequired === 'pro' ? 'Pro' : 'Business'} · {tool.processing} · {tool.outputType}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Security & Privacy Tools */}
        <section id="security-section" className="px-6 py-12 max-w-7xl mx-auto space-y-6">
          <div className="flex items-end justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-[22px] font-[700] text-white tracking-[-0.02em]">Security &amp; Privacy Reports</h2>
              <p className="text-xs text-gray-500">Scan metadata, verify integrity hashes, and audit document leaks before sharing.</p>
            </div>
            <Link href="/all-tools" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {securityTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.id}
                  href={tool.href}
                  onClick={(e) => handleToolClick(e, tool)}
                  onMouseMove={handleCardMouseMove}
                  className="glass-card shimmer-border p-5 flex flex-col gap-4 cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300 animate-in bg-white/[0.04]"
                  style={{
                    animationDelay: `${(index + 4) * 50}ms`,
                    // @ts-ignore
                    "--hover-color": tool.color
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 tool-icon">
                      <Icon size={18} style={{ color: tool.color }} />
                    </div>
                    <span className="text-[11px] font-[600] px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-400">
                      Pro Report
                    </span>
                  </div>

                  <div>
                    <h3 className="font-[700] text-white text-[16px] group-hover:text-indigo-300 transition-colors mb-1">{tool.name}</h3>
                    <p className="text-[13.5px] text-[#94a3b8] leading-[1.5] min-h-[32px]">{tool.description}</p>
                  </div>

                  <div className="text-[11px] font-[600] text-gray-500 mt-auto pt-2 border-t border-white/5">
                    {tool.planRequired === 'free' ? 'Free' : tool.planRequired === 'pro' ? 'Pro' : 'Business'} · {tool.processing} · {tool.outputType}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Print & Scan Engine */}
        <section id="print-section" className="px-6 py-12 max-w-7xl mx-auto space-y-6">
          <div className="flex items-end justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-[22px] font-[700] text-white tracking-[-0.02em]">Print &amp; Scan Optimization</h2>
              <p className="text-xs text-gray-500">Detect black-and-white page distribution, optimize vector ink paths, and spot bad scan crops.</p>
            </div>
            <Link href="/all-tools" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {printTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.id}
                  href={tool.href}
                  onClick={(e) => handleToolClick(e, tool)}
                  onMouseMove={handleCardMouseMove}
                  className="glass-card shimmer-border p-5 flex flex-col gap-4 cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300 animate-in bg-white/[0.04]"
                  style={{
                    animationDelay: `${(index + 8) * 50}ms`,
                    // @ts-ignore
                    "--hover-color": tool.color
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 tool-icon">
                      <Icon size={18} style={{ color: tool.color }} />
                    </div>
                    <span className="text-[11px] font-[600] px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-400">
                      Pro Report
                    </span>
                  </div>

                  <div>
                    <h3 className="font-[700] text-white text-[16px] group-hover:text-indigo-300 transition-colors mb-1">{tool.name}</h3>
                    <p className="text-[13.5px] text-[#94a3b8] leading-[1.5] min-h-[32px]">{tool.description}</p>
                  </div>

                  <div className="text-[11px] font-[600] text-gray-500 mt-auto pt-2 border-t border-white/5">
                    {tool.planRequired === 'free' ? 'Free' : tool.planRequired === 'pro' ? 'Pro' : 'Business'} · {tool.processing} · {tool.outputType}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Directory Link */}
        <div className="pt-6 max-w-xs mx-auto">
          <Link
            href="/all-tools"
            prefetch={false}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/10 active:scale-95 text-sm"
          >
            View All 38 Tools <ArrowRight size={16} />
          </Link>
        </div>

        {/* Pricing Preview */}
        <section id="pricing-section" className="px-6 py-16 max-w-7xl mx-auto space-y-12 border-t border-white/5">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Flexible Pricing Plans</h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Choose a plan that fits your document workflow and privacy audits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Free */}
            <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Free Plan</h3>
                  <p className="text-[10px] text-gray-500">Everyday conversion utilities</p>
                </div>
                <p className="text-3xl font-extrabold text-white">$0</p>
                <div className="space-y-2.5 text-xs text-gray-400">
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> 5 tasks per day</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Max file size: 25 MB</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Max pages: 50</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Basic tools only (No batch)</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Files deleted after 1 hour</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPlan("free");
                  setUserPlan("free");
                  router.push("/all-tools");
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-white transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-indigo-600/[0.02] border-2 border-indigo-500/30 p-6 rounded-2xl space-y-6 flex flex-col justify-between relative backdrop-blur-md h-full">
                <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded bg-indigo-500 text-[8px] font-extrabold tracking-wider uppercase text-white shadow-lg shadow-indigo-500/20">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-indigo-300">Pro Plan</h3>
                    <p className="text-[10px] text-indigo-400/50">Detailed privacy &amp; security reports</p>
                  </div>
                  <p className="text-3xl font-extrabold text-white">$9<span className="text-xs text-gray-500 font-normal">/month</span></p>
                  <div className="space-y-2.5 text-xs text-gray-300">
                    <p className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> 300 tasks per month</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Max file size: 250 MB</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Max pages: 500</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Access to Security &amp; Print tools</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Batch process up to 25 files</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isLoggedIn) {
                      setIsUpgradeOpen(true);
                    } else {
                      setIsSignInOpen(true);
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold text-white transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>

            {/* Business */}
            <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Business Plan</h3>
                  <p className="text-[10px] text-gray-500">Corporate-grade automation</p>
                </div>
                <p className="text-3xl font-extrabold text-white">$29<span className="text-xs text-gray-500 font-normal">/month</span></p>
                <div className="space-y-2.5 text-xs text-gray-400">
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> 2000 tasks per month</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Max file size: 1 GB</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Batch process up to 250 files</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Business timeline &amp; signature template</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Team workspaces &amp; branding</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPlan("business");
                  setUserPlan("business");
                  router.push("/all-tools");
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-white transition-colors"
              >
                Start Business
              </button>
            </div>

          </div>
        </section>

        {/* Why Use Us */}
        <section className="border-t border-white/5 px-6 py-20 bg-white/[0.01]">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-xl font-bold text-center text-gray-300">Security &amp; Performance Built In</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto shadow-inner">
                  <Zap size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-semibold text-sm text-white">Browser Execution</h3>
                <p className="text-xs text-gray-500 leading-relaxed">Most tools run fully client-side on your own browser engine. Zero upload latency.</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto shadow-inner">
                  <Shield size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-semibold text-sm text-white">Secure Temporary Processing</h3>
                <p className="text-xs text-gray-500 leading-relaxed">Advanced tools use temporary secure processing when browser-only execution is not possible.</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto shadow-inner">
                  <Globe size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-semibold text-sm text-white">Private &amp; Auditable</h3>
                <p className="text-xs text-gray-500 leading-relaxed">We focus on document hygiene. Strip trackers, remove fake redactions, and log certificates.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-8 mt-12 bg-gray-950">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <ShieldCheck size={16} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-white tracking-tight">DocuSafe PDF</span>
                <span className="text-[10px] text-gray-500">Private PDF tools for secure document workflows.</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-gray-400">
              <Link href="/all-tools" className="hover:text-white transition-colors">Tools</Link>
              <button onClick={() => document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white transition-colors">Pricing</button>
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
            
            <div className="text-[11px] text-gray-600">
              © {new Date().getFullYear()} DocuSafe PDF
            </div>
          </div>
        </footer>
      </main>

      {/* Login Modal */}
      {isSignInOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-6 relative">
            <button onClick={() => setIsSignInOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <User size={20} className="text-indigo-400" />
              </div>
              <h3 className="font-bold text-white text-lg">Sign in to DocuSafe</h3>
              <p className="text-xs text-gray-400">Access your dashboard, check limits, and save keys</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors">
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {isUpgradeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6 relative animate-scale-up">
            <button onClick={() => setIsUpgradeOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" disabled={isUpgrading}>
              <X size={18} />
            </button>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 text-black">
                <Award size={24} />
              </div>
              <h3 className="font-extrabold text-white text-xl">Upgrade to Premium Pro</h3>
              <p className="text-xs text-gray-400">Unlock security scanners, print saving engines, and batch jobs.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex max-w-[200px] mx-auto text-[10px]">
              <button onClick={() => setBillingInterval("monthly")} className={`flex-1 py-1 rounded-lg font-bold transition-all ${billingInterval === "monthly" ? "bg-white/10 text-white" : "text-gray-400"}`}>Monthly</button>
              <button onClick={() => setBillingInterval("yearly")} className={`flex-1 py-1 rounded-lg font-bold transition-all ${billingInterval === "yearly" ? "bg-white/10 text-white" : "text-gray-400"}`}>Yearly (-33%)</button>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">Pro Plan Subscription</p>
                <p className="text-[10px] text-gray-500">Unlocks 300 monthly tasks</p>
              </div>
              <p className="font-extrabold text-white text-lg">{billingInterval === "monthly" ? "$9" : "$6"}<span className="text-[10px] text-gray-500 font-normal">/mo</span></p>
            </div>

            <div className="space-y-3">
              {upgradeSuccess ? (
                <div className="py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 font-bold text-xs text-center flex items-center justify-center gap-1.5 animate-bounce">
                  <Check size={16} /> Subscription Active! Welcome to Pro!
                </div>
              ) : (
                <button
                  onClick={handleUpgradeNow}
                  disabled={isUpgrading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {isUpgrading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Processing purchase...
                    </>
                  ) : (
                    <>
                      <CreditCard size={12} /> Activate Premium Pro
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Limit Modal */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-6 relative text-center">
            <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-white text-lg">Limit Reached</h3>
              <p className="text-xs text-gray-400">
                You used your {userPlan === "free" ? "5 free" : userPlan === "pro" ? "300 Pro" : "2000 Business"} tasks today.
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Upgrade to Pro for 300 monthly tasks, full security reports, larger files, and batch processing.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsLimitModalOpen(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white font-bold transition-colors">
                Come back tomorrow
              </button>
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  setIsUpgradeOpen(true);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/15"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Tool Gate Modal */}
      {isGateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-6 relative text-center animate-scale-up">
            <button onClick={() => setIsGateModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <Lock size={22} />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-white text-lg">This is a {gateToolRequired === "business" ? "Business" : "Pro"} tool</h3>
              <p className="text-xs text-gray-400">
                Upgrade to unlock {gateToolName}, Privacy Report, Evidence Locker, Fake Redaction Detector, and more.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => {
                setIsGateModalOpen(false);
                router.push("/all-tools");
              }} className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white font-bold transition-colors">
                View free tools
              </button>
              <button
                onClick={() => {
                  setIsGateModalOpen(false);
                  setIsUpgradeOpen(true);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
        }
        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }
        .shimmer-border {
          position: relative;
        }
      `}</style>
    </div>
  );
}
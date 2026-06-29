"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ChevronDown,
} from "lucide-react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useClerk, useUser } from "@clerk/nextjs";
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
import { useUsageStore } from "./utils/useUsageStore";
import UsageGateModal from "./components/UsageGateModal";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge: string;
  badgeColor: string;
  category: "popular" | "security" | "print" | "business" | "ai";
  planRequired: PlanType;
  processing: "Client-side" | "Secure server";
  outputType: "Report" | "CSV" | "ZIP" | "Batch" | "PDF" | "TXT" | "Images" | "Audio";
  benefit: string;
}

const ALL_TOOLS: Tool[] = [
  // --- POPULAR ---
  {
    id: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one.",
    icon: Merge,
    href: "/tools/merge",
    color: "#8b5cf6",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Combine contracts, statements, or scanned reports into a single file instantly.",
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Extract ranges or separate pages.",
    icon: Scissors,
    href: "/tools/split",
    color: "#ec4899",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Extract specific sections or break up huge documents page by page.",
  },
  {
    id: "compress",
    name: "Compress PDF",
    description: "Reduce file size in seconds.",
    icon: Archive,
    href: "/tools/compress",
    color: "#06b6d4",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Reduce file weight for email attachments or portal uploads.",
  },
  {
    id: "rotate",
    name: "Rotate PDF Pages",
    description: "Rotate scan layouts easily.",
    icon: RotateCw,
    href: "/tools/rotate",
    color: "#a855f7",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Fix sideways layout scans or landscape pages in seconds.",
  },
  {
    id: "pdf-to-images",
    name: "PDF to Images",
    description: "Convert page sheets to images.",
    icon: Image,
    href: "/tools/pdf-to-images",
    color: "#f59e0b",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Images",
    benefit: "Convert document pages into images for slides, web pages, or media.",
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Merge your photos into PDFs.",
    icon: FileImage,
    href: "/tools/images-to-pdf",
    color: "#10b981",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Convert photos, receipts, or snapshot JPGs into a unified PDF.",
  },
  {
    id: "extract-text",
    name: "Extract Text",
    description: "Extract all text contents.",
    icon: FileText,
    href: "/tools/extract-text",
    color: "#f97316",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "TXT",
    benefit: "Extract text from reports or copy layouts without formatting issues.",
  },
  {
    id: "form-filler",
    name: "PDF Form Filler",
    description: "Fill PDF form fields locally.",
    icon: FileEdit,
    href: "/tools/form-filler",
    color: "#8b5cf6",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Fill out interactive layout structures client-side and download.",
  },

  // --- SECURITY & PRIVACY ---
  {
    id: "privacy-report",
    name: "Privacy Report",
    description: "Audit author details and metadata.",
    icon: Eye,
    href: "/tools/privacy-report",
    color: "#14b8a6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Inspect PDF details to strip author metadata, creation timestamps, and hidden tags.",
  },
  {
    id: "evidence-locker",
    name: "Evidence Locker",
    description: "Sign and verify SHA-256 hashes.",
    icon: ShieldCheck,
    href: "/tools/evidence-locker",
    color: "#3b82f6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Generate SHA-256 signatures to lock and audit document states locally.",
  },
  {
    id: "fake-redaction",
    name: "Fake Redaction Scanner",
    description: "Find masked unredacted text.",
    icon: AlertOctagon,
    href: "/tools/fake-redaction",
    color: "#ef4444",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Detect visual overlays that only mask text layout rather than deleting original characters.",
  },
  {
    id: "attachments",
    name: "Attachment Inspector",
    description: "Extract or delete embedded attachments.",
    icon: Paperclip,
    href: "/tools/attachments",
    color: "#6366f1",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "security",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Extract hidden PDF catalog assets or delete envelope files safely.",
  },
  {
    id: "password-protect",
    name: "Protect PDF",
    description: "Password protect your files.",
    icon: Lock,
    href: "/tools/password-protect",
    color: "#ef4444",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "security",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Restrict print options, text copies, or document access keys.",
  },
  {
    id: "hidden-layers",
    name: "Hidden Layer Finder",
    description: "Detect invisible background vectors.",
    icon: Layers,
    href: "/tools/hidden-layers",
    color: "#ec4899",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Audit layout files for hidden vector components or overlay templates.",
  },
  {
    id: "link-safety",
    name: "Link Safety Auditor",
    description: "Verify safety of links.",
    icon: Link2,
    href: "/tools/link-safety",
    color: "#14b8a6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Detect hidden redirects, URL targets, and external assets.",
  },
  {
    id: "redact",
    name: "PDF Redactor",
    description: "Redact emails, phone numbers, SSNs.",
    icon: EyeOff,
    href: "/tools/redact",
    color: "#f43f5e",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "TXT",
    benefit: "Safely filter out personal data using pattern recognition.",
  },

  // --- PRINT & SCAN ---
  {
    id: "color-detector",
    name: "Color Detector",
    description: "Optimize printing costs easily.",
    icon: Palette,
    href: "/tools/color-detector",
    color: "#10b981",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "print",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Split color pages from black & white pages to save printing expenses.",
  },
  {
    id: "ink-saver",
    name: "Ink Saver",
    description: "Convert backgrounds to white.",
    icon: Sun,
    href: "/tools/ink-saver",
    color: "#eab308",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "print",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Strip heavy color backgrounds to preserve ink cartridges.",
  },
  {
    id: "bad-scan-detector",
    name: "Bad Scan Check",
    description: "Check scans for blurriness.",
    icon: ScanLine,
    href: "/tools/bad-scan-detector",
    color: "#ec4899",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "print",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Auto-detect crooked scan pages, blank separation papers, or soft text lines.",
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Overlay text watermark stamps.",
    icon: Droplets,
    href: "/tools/watermark",
    color: "#0ea5e9",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "print",
    planRequired: "free",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Apply confidential labels or author stamps with opacity sliders.",
  },
  {
    id: "weight-map",
    name: "Ink Density Map",
    description: "Map high ink usage sheets.",
    icon: Activity,
    href: "/tools/weight-map",
    color: "#10b981",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "print",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Visualize vector ink payloads to avoid excessive toner layouts.",
  },
  {
    id: "margin-normalizer",
    name: "Margin Normalizer",
    description: "Standardize printing margins.",
    icon: Maximize,
    href: "/tools/margin-normalizer",
    color: "#6366f1",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Pad or crop asymmetric templates to fit A4 layout specifications.",
  },
  {
    id: "font-fixer",
    name: "Font Fixer",
    description: "Fix broken embedded lettering.",
    icon: Type,
    href: "/tools/font-fixer",
    color: "#8b5cf6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Fix broken lettering layout errors by replacing corrupted embedding tables.",
  },
  {
    id: "barcode-scanner",
    name: "Barcode Extractor",
    description: "Decode QR codes instantly.",
    icon: QrCode,
    href: "/tools/barcode-scanner",
    color: "#f59e0b",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "print",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Detect and scan visual code arrays to extract invoice numbers.",
  },

  // --- BUSINESS AUTOMATION ---
  {
    id: "diff",
    name: "PDF Compare (Diff)",
    description: "Diff text changes side-by-side.",
    icon: GitCompare,
    href: "/tools/diff",
    color: "#14b8a6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "business",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Compare line edits in contracts or financial spreadsheets side by side.",
  },
  {
    id: "delivery-packager",
    name: "Delivery Packager",
    description: "ZIP package files with index.",
    icon: FolderArchive,
    href: "/tools/delivery-packager",
    color: "#f97316",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Client-side",
    outputType: "ZIP",
    benefit: "Bundle files, audit lists, and dynamic index TXTs in a single delivery ZIP.",
  },
  {
    id: "reading-time",
    name: "Reading Speed Auditor",
    description: "Audit document word counts.",
    icon: Clock,
    href: "/tools/reading-time",
    color: "#f59e0b",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "business",
    planRequired: "free",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Estimate reading times and speech lengths at custom words-per-minute speeds.",
  },
  {
    id: "timeline",
    name: "Document Timeline",
    description: "Plot chronological date graphs.",
    icon: History,
    href: "/tools/timeline",
    color: "#06b6d4",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "business",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Identify dates, years, and historical records to draw a visual timeline.",
  },
  {
    id: "page-labels",
    name: "Page Label Adjuster",
    description: "Set Roman or digit numbering.",
    icon: Tags,
    href: "/tools/page-labels",
    color: "#8b5cf6",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "business",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Standardize index pagination in PDF reader bars.",
  },
  {
    id: "missing-pages",
    name: "Missing Page Auditor",
    description: "Audit missing page sheets.",
    icon: FileWarning,
    href: "/tools/missing-pages",
    color: "#ef4444",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "business",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Audit batch scans to find missing pages or duplicate layout sequences.",
  },
  {
    id: "smart-rename",
    name: "Smart Rename",
    description: "Auto-rename files from text.",
    icon: Heading,
    href: "/tools/smart-rename",
    color: "#06b6d4",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Detect fields like Date, Invoice ID, and Client tags to auto-rename files.",
  },
  {
    id: "signature-positions",
    name: "Signature Position Saver",
    description: "Save templates for stamping.",
    icon: Bookmark,
    href: "/tools/signature-positions",
    color: "#0ea5e9",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Map exact layout positions onto localStorage templates for stamp positioning.",
  },
  {
    id: "stamp-consistency",
    name: "Stamp Checker",
    description: "Verify approval stamp layouts.",
    icon: Stamp,
    href: "/tools/stamp-consistency",
    color: "#a855f7",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Audit pages for status keywords and automatically stamp missing ones.",
  },
  {
    id: "form-extractor",
    name: "Form Data Extractor",
    description: "Convert form data to CSV.",
    icon: FileSpreadsheet,
    href: "/tools/form-extractor",
    color: "#f59e0b",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Client-side",
    outputType: "CSV",
    benefit: "Flatten PDF form components and parse values directly to structured spreadsheet datasets.",
  },

  // --- AI TOOLS ---
  {
    id: "pdf-chat",
    name: "PDF Chat / Q&A",
    description: "Chat with document text.",
    icon: MessageSquare,
    href: "/tools/pdf-chat",
    color: "#818cf8",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-650 border-indigo-500/20",
    category: "ai",
    planRequired: "pro",
    processing: "Secure server",
    outputType: "Report",
    benefit: "Run conversational prompts directly against document context using secure server-side AI.",
  },
  {
    id: "summarize",
    name: "PDF Summarizer",
    description: "Summarize pages into bullets.",
    icon: Sparkles,
    href: "/tools/summarize",
    color: "#d946ef",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-650 border-indigo-500/20",
    category: "ai",
    planRequired: "pro",
    processing: "Secure server",
    outputType: "TXT",
    benefit: "Condense long files into bullet points or summaries using secure server-side AI.",
  },
  {
    id: "flashcards",
    name: "PDF to Flashcards",
    description: "Generate study card decks.",
    icon: Layers,
    href: "/tools/flashcards",
    color: "#10b981",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-650 border-indigo-500/20",
    category: "ai",
    planRequired: "pro",
    processing: "Secure server",
    outputType: "Report",
    benefit: "Parse chapters or lecture notes into educational flashcards using secure server-side AI.",
  },
  {
    id: "pdf-to-audio",
    name: "PDF to Audio",
    description: "Generate text-to-speech audiobooks.",
    icon: Mic,
    href: "/tools/pdf-to-audio",
    color: "#6366f1",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "ai",
    planRequired: "business",
    processing: "Secure server",
    outputType: "Audio",
    benefit: "Render clean text-to-speech audiobooks in multiple global accents.",
  },
];

const CATEGORY_TABS = [
  { id: "all", name: "Popular Tools", icon: "⭐" },
  { id: "popular", name: "Organize PDF", icon: "🗂" },
  { id: "security", name: "Security & Privacy", icon: "🔐" },
  { id: "print", name: "Print & Scan", icon: "🖨" },
  { id: "ai", name: "AI Tools", icon: "🧰" },
  { id: "business", name: "Business", icon: "💼" },
];

const POPULAR_10_IDS = [
  "pdf-to-audio",
  "merge",
  "split",
  "compress",
  "rotate",
  "pdf-to-images",
  "images-to-pdf",
  "extract-text",
  "form-filler",
  "pdf-chat",
  "summarize",
];

export default function HomePage() {
  const router = useRouter();
  const clerk = useClerk();
  const { isSignedIn, user, isLoaded } = useUser();
  const { openGate } = useUsageStore();

  // App States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanType>("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [userName, setUserName] = useState("Kavindu");
  const [userEmail, setUserEmail] = useState("kavindu@example.com");

  // Search autocomplete state
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // Modals
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  // Retro Windows 95 UI states
  const [time, setTime] = useState("");
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState<"explorer" | "readme" | null>("explorer");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const closeStart = () => setIsStartOpen(false);
    window.addEventListener("click", closeStart);
    return () => window.removeEventListener("click", closeStart);
  }, []);

  // Form Inputs
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Sequential animation triggers
  const [activeAnims, setActiveAnims] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const trigger = (id: string, delay: number) => {
      setTimeout(() => {
        setActiveAnims((prev) => ({ ...prev, [id]: true }));
      }, delay);
    };
    trigger("a0", 80);
    trigger("a1", 220);
    trigger("a2", 360);
    trigger("a3", 480);
    trigger("a4", 580);
    trigger("c1", 820);
    trigger("c2", 960);
    trigger("c3", 1080);
    trigger("f1", 1100);
    trigger("f2", 1220);
    trigger("f3", 1340);
  }, []);

  useEffect(() => {
    const updateLocalState = () => {
      setUserPlan(getLocalPlan());
      setTasksUsed(getLocalTasksUsed());
    };
    updateLocalState();
    window.addEventListener("storage", updateLocalState);
    return () => window.removeEventListener("storage", updateLocalState);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setIsLoggedIn(!!isSignedIn);
      if (isSignedIn && user) {
        const name = user.fullName || user.firstName || user.username || "User";
        setUserName(name);
        setUserEmail(user.primaryEmailAddress?.emailAddress || "");
        localStorage.setItem("user_logged_in", "true");
        localStorage.setItem("user_profile_name", name);
        localStorage.setItem("user_profile_email", user.primaryEmailAddress?.emailAddress || "");
      } else {
        localStorage.setItem("user_logged_in", "false");
        localStorage.removeItem("user_profile_name");
        localStorage.removeItem("user_profile_email");
      }
    } else {
      const logged = localStorage.getItem("user_logged_in") === "true";
      setIsLoggedIn(logged);
      const savedName = localStorage.getItem("user_profile_name");
      const savedEmail = localStorage.getItem("user_profile_email");
      if (savedName) setUserName(savedName);
      if (savedEmail) setUserEmail(savedEmail);
    }
  }, [isLoaded, isSignedIn, user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;

    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("user_profile_email", emailInput);

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

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !nameInput) return;

    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("user_profile_email", emailInput);
    localStorage.setItem("user_profile_name", nameInput);

    setUserName(nameInput);
    setUserEmail(emailInput);
    setIsLoggedIn(true);
    setIsSignInOpen(false);
    setNameInput("");
    setEmailInput("");
    setPasswordInput("");
  };

  const handleSocialLogin = (provider: string) => {
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("user_profile_email", `${provider.toLowerCase()}@docusafepdf.com`);
    localStorage.setItem("user_profile_name", `${provider} User`);

    setUserName(`${provider} User`);
    setUserEmail(`${provider.toLowerCase()}@docusafepdf.com`);
    setIsLoggedIn(true);
    setIsSignInOpen(false);
  };

  const handleSignOut = () => {
    localStorage.setItem("user_logged_in", "false");
    setIsLoggedIn(false);
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

  const handleToolClick = (e: React.MouseEvent<HTMLAnchorElement>, tool: Tool) => {
    e.preventDefault();
    router.push(tool.href);
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  // Filter tools based on search query AND active category
  const filteredTools = ALL_TOOLS.filter((tool) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.benefit.toLowerCase().includes(query);

    // If searching, search ALL 38 tools
    if (searchQuery) return matchesSearch;

    // If category is "all" (Popular Tools), restrict homepage to 10 tools
    if (activeCategory === "all") {
      return matchesSearch && POPULAR_10_IDS.includes(tool.id);
    }
    
    // Otherwise filter all 38 tools by category
    return matchesSearch && tool.category === activeCategory;
  });

  const searchResults = searchQuery.trim() !== ""
    ? ALL_TOOLS.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ALL_TOOLS.filter(t => ["merge", "split", "compress", "password-protect", "pdf-chat"].includes(t.id));
  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[activeSearchIndex]) {
        router.push(searchResults[activeSearchIndex].href);
        setShowSearchDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowSearchDropdown(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#008080] text-black font-mono selection:bg-[#000080] selection:text-white flex flex-col justify-between select-none relative p-3 sm:p-5 overflow-hidden h-screen">
      {/* Desktop Workspace */}
      <div className="flex-1 flex gap-6 overflow-hidden relative pb-12">
        {/* Left Side: Desktop Icons / Shortcuts */}
        <div className="flex flex-col gap-5 shrink-0 select-none z-10 pt-2 pl-2">
          <div 
            onDoubleClick={() => setActiveWindow("explorer")}
            onClick={() => setActiveWindow("explorer")}
            className="flex flex-col items-center justify-center text-center w-20 p-1 cursor-pointer group border border-transparent hover:border-white/20 hover:bg-white/10"
          >
            <div className="w-10 h-10 flex items-center justify-center text-[#ffea79] text-3xl group-hover:scale-105 transition-transform">
              🖥️
            </div>
            <span className="text-[10px] font-bold text-white mt-1 text-shadow-sm select-none truncate w-full">My Computer</span>
          </div>

          <div 
            onDoubleClick={() => {
              setIsReadmeOpen(true);
              setActiveWindow("readme");
            }}
            onClick={() => {
              setIsReadmeOpen(true);
              setActiveWindow("readme");
            }}
            className="flex flex-col items-center justify-center text-center w-20 p-1 cursor-pointer group border border-transparent hover:border-white/20 hover:bg-white/10"
          >
            <div className="w-10 h-10 flex items-center justify-center text-white text-3xl group-hover:scale-105 transition-transform">
              📄
            </div>
            <span className="text-[10px] font-bold text-white mt-1 text-shadow-sm select-none truncate w-full">README.txt</span>
          </div>

          <div 
            onDoubleClick={() => setActiveCategory("ai")}
            onClick={() => setActiveCategory("ai")}
            className="flex flex-col items-center justify-center text-center w-20 p-1 cursor-pointer group border border-transparent hover:border-white/20 hover:bg-white/10"
          >
            <div className="w-10 h-10 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">
              🤖
            </div>
            <span className="text-[10px] font-bold text-white mt-1 text-shadow-sm select-none truncate w-full">AI Utilities</span>
          </div>

          <div 
            onDoubleClick={() => setActiveCategory("security")}
            onClick={() => setActiveCategory("security")}
            className="flex flex-col items-center justify-center text-center w-20 p-1 cursor-pointer group border border-transparent hover:border-white/20 hover:bg-white/10"
          >
            <div className="w-10 h-10 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">
              🔐
            </div>
            <span className="text-[10px] font-bold text-white mt-1 text-shadow-sm select-none truncate w-full">Security</span>
          </div>
        </div>

        {/* Floating Notepad Program (README.txt) */}
        {isReadmeOpen && (
          <div 
            onClick={() => setActiveWindow("readme")}
            className={`win95-out absolute top-12 left-16 sm:left-32 w-full max-w-lg z-40 flex flex-col shadow-2xl ${
              activeWindow === "readme" ? "z-50" : "z-30"
            }`}
          >
            {/* Title Bar */}
            <div className={`flex items-center justify-between px-2 py-1 select-none font-bold text-xs ${
              activeWindow === "readme" ? "win95-title" : "win95-title-inactive"
            }`}>
              <span>README.txt - Notepad</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReadmeOpen(false);
                }} 
                className="win95-btn w-4 h-4 text-[9px] font-extrabold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf]"
              >
                X
              </button>
            </div>
            
            {/* Menu bar */}
            <div className="bg-[#c0c0c0] px-2 py-0.5 border-b border-[#808080] flex gap-4 text-xs select-none font-sans">
              <span>File</span>
              <span>Edit</span>
              <span>Search</span>
              <span>Help</span>
            </div>

            {/* Readme content */}
            <div className="win95-in p-4 bg-white text-black text-xs font-mono overflow-y-auto h-72">
              <p className="font-bold text-sm mb-2 border-b border-black/25 pb-1">ℹ️ DOCUSAFE PDF TOOLKIT v1.0.0</p>
              <p className="mb-4 leading-relaxed">Welcome to DocuSafe! This application provides 38 professional-grade PDF utilities running entirely client-side inside your browser sandbox.</p>
              
              <p className="font-bold mb-1">🔐 SECURITY HIGHLIGHTS:</p>
              <p className="mb-3 leading-relaxed">Your files never leave your computer. Processing runs locally in browser memory so your corporate documents, invoices, and templates remain 100% private.</p>

              <p className="font-bold mb-1">🛠️ UTILITY SUITE CONTENTS:</p>
              <ul className="list-disc pl-4 mb-4 space-y-1">
                <li>Merge &amp; Split PDF files locally</li>
                <li>Compress PDF bytes for fast sharing</li>
                <li>Watermark drafting and protected stamps</li>
                <li>AI Chat &amp; Flashcard converters (uses your Groq key)</li>
              </ul>
              
              <p className="font-bold mb-1">🔗 IMPORTANT LINKS:</p>
              <div className="flex gap-4 mb-4 select-text">
                <Link href="/privacy" className="text-[#000080] underline font-bold hover:text-blue-800">Privacy Policy</Link>
                <Link href="/terms" className="text-[#000080] underline font-bold hover:text-blue-800">Terms of Service</Link>
                <Link href="/contact" className="text-[#000080] underline font-bold hover:text-blue-800">Contact Us</Link>
              </div>

              <p className="text-[10px] text-gray-500 border-t border-dashed border-gray-300 pt-2">© ${new Date().getFullYear()} DocuSafe PDF Retro. All rights reserved.</p>
            </div>
            {/* Status bar */}
            <div className="bg-[#c0c0c0] border-t border-[#808080] px-2 py-0.5 text-[11px] font-sans text-right select-none">
              Ln 1, Col 1
            </div>
          </div>
        )}

        {/* Main Explorer Application Window */}
        <div 
          onClick={() => setActiveWindow("explorer")}
          className={`win95-out flex-1 flex flex-col overflow-hidden shadow-2xl relative ${
            activeWindow === "explorer" ? "z-40" : "z-30"
          }`}
        >
          {/* Title Bar */}
          <div className={`flex items-center justify-between px-2 py-1 select-none font-bold text-xs ${
            activeWindow === "explorer" ? "win95-title" : "win95-title-inactive"
            }`}>
            <div className="flex items-center gap-1">
              <span>🖥️</span>
              <span>DocuSafe PDF Explorer</span>
            </div>
            <div className="flex gap-0.5">
              <button className="win95-btn w-4 h-4 text-[9px] font-extrabold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf]">-</button>
              <button className="win95-btn w-4 h-4 text-[9px] font-extrabold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf]">▢</button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveWindow(null);
                }}
                className="win95-btn w-4 h-4 text-[9px] font-extrabold flex items-center justify-center p-0 text-black hover:bg-[#dfdfdf]"
              >
                X
              </button>
            </div>
          </div>

          {/* Menus Row */}
          <div className="bg-[#c0c0c0] px-2 py-0.5 border-b border-[#808080] flex items-center justify-between text-xs select-none font-sans">
            <div className="flex gap-4">
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">File</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Edit</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">View</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Go</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Favorites</span>
              <span className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 cursor-default">Help</span>
            </div>
          </div>

          {/* Explorer Toolbar */}
          <div className="bg-[#c0c0c0] px-2 py-1 border-b border-[#808080] flex items-center gap-3 text-xs select-none border-t border-white/40">
            <button 
              onClick={() => setActiveCategory("all")}
              disabled={activeCategory === "all"}
              className="win95-btn flex items-center gap-1 px-2 py-0.5 text-xs font-sans disabled:text-[#808080] disabled:cursor-not-allowed text-black font-semibold hover:bg-[#dfdfdf]"
            >
              ⬅️ Back
            </button>
            <button 
              className="win95-btn flex items-center gap-1 px-2 py-0.5 text-xs font-sans text-black font-semibold disabled:text-[#808080] hover:bg-[#dfdfdf]" 
              disabled
            >
              Forward ➡️
            </button>
            <button 
              onClick={() => setActiveCategory("all")}
              className="win95-btn flex items-center gap-1 px-2 py-0.5 text-xs font-sans text-black font-semibold hover:bg-[#dfdfdf]"
            >
              ⬆️ Up
            </button>
            <div className="w-[1px] h-4 bg-[#808080] border-r border-white/40" />
            
            {/* Search Tool Input */}
            <div className="flex items-center gap-1 flex-1 font-sans">
              <span className="font-bold text-[#606060]">Search:</span>
              <input 
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="win95-in px-2 py-0.5 text-[11px] w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-[#000080]"
              />
            </div>
          </div>

          {/* Address Bar */}
          <div className="bg-[#c0c0c0] px-2 py-1.5 border-b border-[#808080] flex items-center gap-2 text-xs font-sans">
            <span className="text-[#808080] font-bold">Address:</span>
            <div className="win95-in flex-1 px-2 py-0.5 text-[11px] select-all truncate bg-white select-text">
              C:\Windows\System32\DocuSafe\{activeCategory}
            </div>
          </div>

          {/* Explorer Main Split Workspace */}
          <div className="flex-1 flex overflow-hidden bg-[#dfdfdf]">
            
            {/* Left: Folders Navigation Tree */}
            <div className="w-56 bg-white border-r-2 border-[#808080] overflow-y-auto p-2.5 flex flex-col gap-1.5 text-xs select-none">
              <div className="font-bold text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-2">Folders</div>
              
              <button 
                onClick={() => setActiveCategory("all")}
                className={`w-full text-left py-1 px-2 flex items-center gap-1.5 border border-transparent font-bold ${
                  activeCategory === "all" ? "bg-[#000080] text-white border-[#808080]" : "text-black hover:bg-[#dfdfdf]"
                }`}
              >
                📁 DocuSafe PDF Explorer
              </button>

              <div className="pl-4 flex flex-col gap-1">
                {CATEGORY_TABS.map((tab) => {
                  if (tab.id === "all") return null;
                  const isActive = activeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`w-full text-left py-1 px-2 flex items-center gap-1.5 border border-transparent font-medium text-[11px] ${
                        isActive ? "bg-[#000080] text-white border-[#808080]" : "text-black hover:bg-[#dfdfdf]"
                      }`}
                    >
                      📁 {tab.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Grid of Folder Contents */}
            <div className="flex-1 p-4 overflow-y-auto bg-white win95-in">
              <div className="border-b border-gray-300 pb-2 mb-4 flex justify-between items-center select-none font-sans">
                <div>
                  <h2 className="text-xs font-bold text-black uppercase tracking-wider">
                    {searchQuery ? "Search Results" : CATEGORY_TABS.find(t => t.id === activeCategory)?.name}
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {searchQuery 
                      ? `Found ${filteredTools.length} object(s) matching your request`
                      : `Select an item to launch the tool sandbox.`}
                  </p>
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="win95-btn px-2 py-0.5 text-[9px] font-bold">
                    Clear
                  </button>
                )}
              </div>

              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredTools.map((tool) => {
                    const CardIcon = tool.icon;
                    return (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        className="win95-btn p-3 flex flex-col items-center justify-between text-center min-h-[120px] select-none hover:bg-[#dfdfdf] border border-transparent text-black no-underline"
                      >
                        <div className="flex flex-col items-center justify-center flex-1">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-inner mb-2 shrink-0"
                            style={{ 
                              backgroundColor: `${tool.color}15`, 
                              borderColor: `${tool.color}25` 
                            }}
                          >
                            <CardIcon size={20} style={{ color: tool.color }} />
                          </div>
                          <h3 className="font-bold text-[11px] leading-tight select-none truncate w-full text-center">
                            {tool.name}
                          </h3>
                        </div>
                        <span className="text-[9px] text-gray-500 leading-snug line-clamp-1 border-t border-dashed border-gray-300 pt-1 w-full mt-1.5 truncate">
                          {tool.processing}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-[#808080] rounded bg-[#dfdfdf]/35 select-none font-sans">
                  <span className="text-3xl block mb-2">⚠️</span>
                  <p className="text-black text-xs font-bold">No items found matching search parameters.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Check search text spelling or browse categories.</p>
                </div>
              )}
            </div>

          </div>

          {/* Status Bar */}
          <div className="bg-[#c0c0c0] border-t border-[#808080] px-2 py-0.5 text-[11px] font-sans flex justify-between select-none">
            <div>{filteredTools.length} object(s)</div>
            <div className="border-l border-[#808080] pl-4">My Computer</div>
          </div>
        </div>

      </div>

      {/* Taskbar / Start Bar */}
      <div className="win95-out h-10 w-full flex items-center justify-between p-1 bg-[#c0c0c0] border-t border-slate-400 select-none z-50 fixed bottom-0 left-0 right-0">
        <div className="flex items-center gap-1.5 h-full relative">
          
          {/* Start Menu Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsStartOpen(!isStartOpen);
            }}
            className={`flex items-center gap-1 px-3 py-1 font-bold text-xs select-none h-full border-2 ${
              isStartOpen 
                ? "border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-[#d4d4d4]" 
                : "border-t-white border-l-white border-r-[#808080] border-b-[#808080] bg-[#c0c0c0]"
            }`}
          >
            <ShieldCheck size={12} className="text-[#000080] shrink-0" />
            <span className="font-sans font-bold text-black uppercase">Start</span>
          </button>

          {/* Start Menu Popup */}
          {isStartOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="win95-out w-72 absolute bottom-9 left-0 bg-[#c0c0c0] border-2 border-white/80 p-1 flex shadow-2xl z-50"
            >
              {/* Left Bar (Vertical Windows branding) */}
              <div className="w-8 win95-title flex items-end justify-center select-none py-2 font-sans shrink-0">
                <span className="rotate-270 origin-center text-white/50 text-xs font-black tracking-widest uppercase pb-1 flex gap-1">
                  <span>DocuSafe</span>
                  <span className="text-[#AFA9EC]">95</span>
                </span>
              </div>
              
              {/* Menu Options */}
              <div className="flex-1 flex flex-col gap-0.5 text-xs pl-1 font-sans">
                <div className="text-[9px] text-[#808080] font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-1 px-2">Program Catalog</div>
                
                {CATEGORY_TABS.map((tab) => {
                  if (tab.id === "all") return null;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveCategory(tab.id);
                        setIsStartOpen(false);
                      }}
                      className="w-full text-left py-1.5 px-3 flex items-center gap-2 hover:bg-[#000080] hover:text-white border border-transparent hover:border-[#808080] text-black"
                    >
                      <span>{tab.icon}</span>
                      <span className="font-medium text-[11px]">{tab.name}</span>
                    </button>
                  );
                })}

                <div className="h-[1px] bg-[#808080] border-b border-white my-1" />
                <button 
                  onClick={() => {
                    setIsReadmeOpen(true);
                    setIsStartOpen(false);
                  }}
                  className="w-full text-left py-1.5 px-3 flex items-center gap-2 hover:bg-[#000080] hover:text-white border border-transparent text-black"
                >
                  📄 <span>View README.txt</span>
                </button>
                <Link 
                  href="/privacy"
                  className="w-full text-left py-1.5 px-3 flex items-center gap-2 hover:bg-[#000080] hover:text-white border border-transparent text-black no-underline"
                >
                  🔒 <span>Privacy Policy</span>
                </Link>
                <Link 
                  href="/terms"
                  className="w-full text-left py-1.5 px-3 flex items-center gap-2 hover:bg-[#000080] hover:text-white border border-transparent text-black no-underline"
                >
                  📜 <span>Terms of Service</span>
                </Link>
                <Link 
                  href="/contact"
                  className="w-full text-left py-1.5 px-3 flex items-center gap-2 hover:bg-[#000080] hover:text-white border border-transparent text-black no-underline"
                >
                  ✉️ <span>Contact Support</span>
                </Link>
              </div>
            </div>
          )}

          {/* Active programs buttons on the Taskbar */}
          <div className="h-full flex items-center gap-1 pl-2 select-none">
            {activeWindow === "explorer" && (
              <button 
                onClick={() => setActiveWindow(null)}
                className="win95-btn flex items-center gap-1.5 px-2.5 h-full text-[10px] font-sans font-bold border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-[#dfdfdf] max-w-[130px] truncate"
              >
                <span>🖥️</span>
                <span className="truncate">DocuSafe Explorer</span>
              </button>
            )}
            {isReadmeOpen && activeWindow === "readme" && (
              <button 
                onClick={() => setActiveWindow(null)}
                className="win95-btn flex items-center gap-1.5 px-2.5 h-full text-[10px] font-sans font-bold border-t-[#808080] border-l-[#808080] border-r-white border-b-white bg-[#dfdfdf] max-w-[130px] truncate"
              >
                <span>📄</span>
                <span className="truncate">README.txt - Notepad</span>
              </button>
            )}
          </div>

        </div>

        {/* System Tray (Clock, System indicators) */}
        <div className="win95-in px-2.5 py-0.5 bg-[#c0c0c0] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white flex items-center gap-2.5 text-[10.5px] font-sans font-semibold">
          <span className="cursor-help" title="Local System Secured">🔐</span>
          <span className="cursor-help" title="Audio sandbox active">🔊</span>
          <span className="border-l border-[#808080] pl-2 tabular-nums select-none" title="Local System Time">{time}</span>
        </div>
      </div>
    </div>
  );
}

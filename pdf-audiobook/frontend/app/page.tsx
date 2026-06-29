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
    <div className="min-h-screen bg-[#F6F8FF] text-[#071B3A] selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      <div className="wrap bg-[#0E0E12] w-full text-white shrink-0">
        <div className="nav flex items-center justify-between px-8 py-4 border-b border-white/5 relative z-25">
          <Link href="/" className="logo flex items-center gap-2 text-sm font-semibold text-white no-underline">
            <div className="logo-mark w-6 h-6 bg-[#534AB7] rounded-lg flex items-center justify-center text-white">
              <ShieldCheck size={14} className="text-white" />
            </div>
            DocuSafe<span className="text-[#7F77DD]">PDF</span>
          </Link>

          {/* Search bar inside navigation menu with instant results autocomplete */}
          <div className="relative hidden md:block w-48 lg:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" size={13} />
            <input 
              type="text" 
              placeholder="Search 38 tools..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => {
                setShowSearchDropdown(true);
                setIsSearchFocused(true);
              }}
              onBlur={() => {
                setIsSearchFocused(false);
                setTimeout(() => setShowSearchDropdown(false), 250);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-8 pr-3 py-1.5 bg-[#16161C] border border-[#7F77DD]/20 rounded-lg text-[11px] focus:outline-none focus:border-[#7F77DD] placeholder-white/25 text-white transition-all focus:ring-2 focus:ring-[#7F77DD]/20"
            />
            {showSearchDropdown && (searchQuery.trim() !== "" || isSearchFocused) && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#16161C] border border-white/10 rounded-xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto flex flex-col gap-1 animate-fade-in">
                <div className="text-[9px] text-white/30 font-bold uppercase tracking-wider px-2 py-1 border-b border-white/5 mb-1 flex justify-between items-center">
                  <span>{searchQuery.trim() !== "" ? "Search Results" : "Popular Tools"}</span>
                  <span className="text-[8px] opacity-65 lowercase text-[#7F77DD]">↑↓ to navigate, enter to open</span>
                </div>
                {searchResults.map((t, idx) => {
                  const CardIcon = t.icon;
                  const isHighlighted = idx === activeSearchIndex;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        router.push(t.href);
                        setShowSearchDropdown(false);
                      }}
                      onMouseEnter={() => setActiveSearchIndex(idx)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left border-none bg-transparent cursor-pointer text-white transition-colors ${
                        isHighlighted ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.color}20` }}>
                        <CardIcon size={12} style={{ color: t.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate">{t.name}</div>
                        <div className="text-[9px] text-white/40 truncate">{t.description}</div>
                      </div>
                    </button>
                  );
                })}
                {searchResults.length === 0 && (
                  <div className="text-[10px] text-white/40 text-center py-2">No matching tools</div>
                )}
              </div>
            )}
          </div>

          <div className="nav-r flex items-center gap-5 text-xs">
            <Link href="/tools/merge" className="text-white/45 hover:text-white transition-colors no-underline">Merge</Link>
            <Link href="/tools/split" className="text-white/45 hover:text-white transition-colors no-underline">Split</Link>
            <Link href="/tools/compress" className="text-white/45 hover:text-white transition-colors no-underline">Compress</Link>
            <button 
              onClick={() => {
                setActiveCategory("all");
                document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-white/45 hover:text-white transition-colors no-underline bg-transparent border-none cursor-pointer font-bold text-xs"
            >
              All Tools
            </button>
          </div>
        </div>

        {/* Hero Area */}
        <div className="hero max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center min-h-[400px] px-8 py-14 gap-8">
          <div className="hl text-left">
            <div className={`badge anim-up ${activeAnims["a0"] ? "go" : ""}`} id="a0">
              <Lock size={12} className="text-[#7F77DD]" /> 100% client-side
            </div>
            
            <h1 className={`anim-up font-[500] tracking-[-0.8px] leading-[1.15] text-[38px] mb-4 ${activeAnims["a1"] ? "go" : ""}`} id="a1">
              Edit PDFs.<br />
              <em className="text-[#7F77DD] not-italic">Stay private.</em>
            </h1>
            
            <p className={`sub text-xs leading-relaxed max-w-[280px] mb-7 text-white/40 ${activeAnims["a2"] ? "go" : ""}`} id="a2">
              Your files never leave your device. Everything runs in your browser.
            </p>

            <div className={`btns flex items-center gap-3 ${activeAnims["a3"] ? "go" : ""}`} id="a3">
              <button 
                onClick={() => document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-p text-xs font-semibold px-5 py-2.5 bg-[#534AB7] hover:bg-[#4339a0] text-white border-none rounded-lg cursor-pointer transition-colors shadow-lg shadow-[#534AB7]/10"
              >
                Start with PDF tools
              </button>
              <button 
                onClick={() => {
                  setActiveCategory("all");
                  document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-g text-xs bg-transparent border-none text-white/40 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                See all tools <ArrowRight size={13} />
              </button>
            </div>

            {/* Social Proof trust indicator with avatar faces */}
            <div className="pt-6 border-t border-white/5 mt-6 max-w-sm flex items-center gap-3">
              <div className="flex -space-x-2 shrink-0">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-[#0E0E12] flex items-center justify-center text-[8px] font-bold text-[#7F77DD]">K</div>
                <div className="w-6 h-6 rounded-full bg-[#534AB7] border border-[#0E0E12] flex items-center justify-center text-[8px] font-bold text-white">S</div>
                <div className="w-6 h-6 rounded-full bg-[#7F77DD] border border-[#0E0E12] flex items-center justify-center text-[8px] font-bold text-slate-900">A</div>
              </div>
              <p className="text-[10px] text-white/35 font-medium leading-relaxed">
                Trusted by 10,000+ privacy-focused students, freelancers, and offices.
              </p>
            </div>
          </div>

          <div className="hr flex justify-center items-center">
            <div className={`card bg-[#16161C] border border-white/5 p-5 rounded-2xl w-[230px] shadow-2xl relative group anim-right ${activeAnims["a4"] ? "go" : ""}`} id="a4">
              <div className="absolute top-0 right-5 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-extrabold uppercase">
                Secure Mode
              </div>

              <div className="cf flex items-center gap-2.5 mb-4">
                <div className="fi w-8.5 h-8.5 bg-[#534AB7]/20 rounded-lg flex items-center justify-center text-[#7F77DD]">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="fn text-[12px] font-semibold text-white">annual_report.pdf</div>
                  <div className="fm text-[11px] text-white/30">4.2 MB · 12 pages</div>
                </div>
              </div>

              <div className="rows flex flex-col gap-2">
                <div className="row flex justify-between items-center text-xs">
                  <span className="rl text-[11px] text-white/35 flex items-center gap-1"><Shield size={12} className="text-[#7F77DD]" /> Security</span>
                  <span className="tg tg-g text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Secure</span>
                </div>
                <div className="row flex justify-between items-center text-xs">
                  <span className="rl text-[11px] text-white/35 flex items-center gap-1"><Lock size={12} className="text-[#7F77DD]" /> AES-256</span>
                  <span className="tg tg-p text-[10px] font-medium px-2 py-0.5 rounded bg-[#534AB7]/20 text-[#AFA9EC]">Ready</span>
                </div>
                <div className="row flex justify-between items-center text-xs">
                  <span className="rl text-[11px] text-white/35 flex items-center gap-1"><Zap size={12} className="text-[#7F77DD]" /> Speed</span>
                  <span className="tg tg-n text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-white/40">0.4s</span>
                </div>
              </div>

              <div className="divider h-[1px] bg-white/5 my-3.5"></div>
              
              <div className="checks flex flex-col gap-1.5" id="chks">
                <div className={`ck text-[11px] text-white/30 flex items-center gap-1.5 anim-in ${activeAnims["c1"] ? "go" : ""}`} id="c1">
                  <Check size={12} className="text-emerald-500 font-extrabold" /> No uploads
                </div>
                <div className={`ck text-[11px] text-white/30 flex items-center gap-1.5 anim-in ${activeAnims["c2"] ? "go" : ""}`} id="c2">
                  <Check size={12} className="text-emerald-500 font-extrabold" /> No tracking
                </div>
                <div className={`ck text-[11px] text-white/30 flex items-center gap-1.5 anim-in ${activeAnims["c3"] ? "go" : ""}`} id="c3">
                  <Check size={12} className="text-emerald-500 font-extrabold" /> No account needed
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits bottom segment */}
        <div className="bottom border-t border-white/5 px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`ft p-4 bg-[#16161C] border border-white/5 rounded-xl space-y-2 anim-up ${activeAnims["f1"] ? "go" : ""}`} id="f1">
            <Globe size={20} className="text-[#534AB7]" />
            <div className="ft-t text-xs font-semibold text-white">On your machine</div>
            <div className="ft-s text-[11px] text-white/30 leading-relaxed">Files load into browser memory only.</div>
          </div>
          <div className={`ft p-4 bg-[#16161C] border border-white/5 rounded-xl space-y-2 anim-up ${activeAnims["f2"] ? "go" : ""}`} id="f2">
            <Zap size={20} className="text-[#534AB7]" />
            <div className="ft-t text-xs font-semibold text-white">Instant results</div>
            <div className="ft-s text-[11px] text-white/30 leading-relaxed">Local compilation. No upload lag.</div>
          </div>
          <div className={`ft p-4 bg-[#16161C] border border-white/5 rounded-xl space-y-2 anim-up ${activeAnims["f3"] ? "go" : ""}`} id="f3">
            <Activity size={20} className="text-[#534AB7]" />
            <div className="ft-t text-xs font-semibold text-white">38 tools</div>
            <div className="ft-s text-[11px] text-white/30 leading-relaxed">Compress, protect, split, merge.</div>
          </div>
        </div>

      </div>

      <main className="relative z-10 flex-1">

        {/* Category Tab Selector */}
        <section className="border-y border-slate-200 bg-white/85 backdrop-blur-md py-2 px-6 sticky top-[58px] z-30 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id);
                    document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 shadow-sm cursor-pointer
                    ${isActive 
                      ? "bg-[#5B4DFF] border-transparent text-white shadow-[#5B4DFF]/15" 
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Tools Grid Section */}
        <section id="tools-grid-section" className="px-6 py-10 max-w-7xl mx-auto scroll-mt-24">
          <div className="space-y-6">
            <div className="border-b border-slate-200/60 pb-2.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                  {searchQuery 
                    ? "Search Results" 
                    : activeCategory === "all" 
                      ? "Popular Utilities" 
                      : CATEGORY_TABS.find(t => t.id === activeCategory)?.name}
                </h2>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  {searchQuery 
                    ? `Found ${filteredTools.length} matches across all 38 tools` 
                    : activeCategory === "all" 
                      ? "Quick access to the most commonly used PDF utilities" 
                      : `Displaying tools for ${CATEGORY_TABS.find(t => t.id === activeCategory)?.name}`}
                </p>
              </div>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[10px] text-[#5B4DFF] hover:text-[#4a3ce6] font-extrabold uppercase border-none bg-transparent cursor-pointer">
                  Clear Search
                </button>
              )}
            </div>

            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTools.map((tool, idx) => (
                  <ToolCard key={tool.id} tool={tool} index={idx} onClick={handleToolClick} onCardMouseMove={handleCardMouseMove} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white/50">
                <FileWarning size={28} className="mx-auto text-slate-400 mb-2.5" />
                <p className="text-slate-600 text-xs font-semibold">No tools match your search query.</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">Try keywords like merge, split, compress, lock, or diff.</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. Popular Workflows Section (Clickable Multi-step Sequences) */}
        <section className="max-w-7xl mx-auto px-6 py-10 border-t border-slate-200/50">
          <div className="border-b border-slate-200/60 pb-3 mb-6">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Popular Workflows</h2>
            <p className="text-[10.5px] text-slate-400 mt-0.5">Click any workflow to execute pre-configured multi-step processes sequentially</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Prepare PDF for Email",
                desc: "Shrink PDF filesize and restrict unauthorized opening permissions.",
                steps: ["Compress PDF", "Remove metadata", "Protect PDF"],
                href: "/tools/compress"
              },
              {
                title: "Clean Scanned Document",
                desc: "Analyze alignment issues, compress scanned pages, and smart-rename.",
                steps: ["Bad Scan Check", "Compress PDF", "Smart Rename"],
                href: "/tools/bad-scan-detector"
              },
              {
                title: "Print-Ready PDF",
                desc: "Fix orientation scans, assign pagination labels, and watermark drafts.",
                steps: ["Rotate PDF", "Page Labels", "Add Watermark"],
                href: "/tools/rotate"
              },
              {
                title: "Secure Document",
                desc: "Strip PII text blocks, lock access permissions, and sign cryptographically.",
                steps: ["PDF Redactor", "Protect PDF", "Evidence Locker"],
                href: "/tools/redact"
              }
            ].map((flow) => (
              <Link
                key={flow.title}
                href={flow.href}
                className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-lg hover:border-[#5B4DFF]/30 hover:-translate-y-0.5 transition-all text-left no-underline"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{flow.title}</h3>
                    <span className="text-[8px] bg-indigo-50 text-indigo-600 font-extrabold uppercase px-1.5 py-0.5 rounded border border-indigo-100">Workflow</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{flow.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-col gap-1.5">
                    {flow.steps.map((st, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                        <span className="w-4 h-4 bg-slate-100 text-slate-500 text-[8px] flex items-center justify-center rounded-full font-mono">{i + 1}</span>
                        <span>{st}</span>
                        {i < flow.steps.length - 1 && <span className="text-slate-300">→</span>}
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-[#5B4DFF] font-extrabold flex items-center gap-0.5 pt-1">
                    Start Sequence →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Why Private PDF Tools (Trust Grid) */}
        <section className="max-w-4xl mx-auto px-6 py-12 space-y-8 border-t border-slate-200/50">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-extrabold text-slate-455 uppercase tracking-widest">Why DocuSafePDF?</h2>
            <p className="text-base font-extrabold text-slate-800">Visual PDF Hygiene without Server Storage Risk</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Shield,
                title: "No File Uploads",
                desc: "Your documents are processed inside your browser sandbox. They never leave your device or touch external clouds."
              },
              {
                icon: User,
                title: "No Account Required",
                desc: "Get started instantly. Access all essential utilities without completing registrations or inputting emails."
              },
              {
                icon: Lock,
                title: "Private by Design",
                desc: "We do not store, read, or track your PDF content. Clean document hygiene is achieved with zero logs."
              },
              {
                icon: Zap,
                title: "Fast Local Processing",
                desc: "Since files don't need to be uploaded and downloaded from remote servers, processing is virtually instant."
              }
            ].map((val) => {
              const ValIcon = val.icon;
              return (
                <div key={val.title} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-[#5B4DFF] shrink-0">
                    <ValIcon size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{val.title}</h3>
                    <p className="text-[11.5px] text-slate-500 leading-normal">{val.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. FAQ Section */}
        <section className="bg-slate-100/50 border-t border-slate-200/50 px-6 py-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h2>
              <p className="text-[11px] text-slate-400">Common questions about browser-based private PDF editing.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Do my files get uploaded to a server?",
                  a: "Most PDF tools run directly in your browser. AI and audio tools use secure temporary server-side processing when required."
                },
                {
                  q: "Is DocuSafePDF free to use?",
                  a: "Yes, all tools are completely free to use, supported by unobtrusive advertisements."
                },
                {
                  q: "How does the AI Q&A Chat work?",
                  a: "AI tools send extracted document text to our secure server and AI provider to generate responses. We do not use user-provided API keys, and we do not store full document text after processing."
                }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl space-y-2">
                  <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">{faq.q}</h3>
                  <p className="text-[11px] text-slate-500 leading-normal">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Multi-column Premium Footer */}
        <footer className="border-t border-slate-200/60 py-10 px-6 bg-slate-50 text-slate-500">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-[11px] pb-8 border-b border-slate-200/60">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="logo-mark w-7 h-7 bg-[#534AB7] rounded-lg flex items-center justify-center">
                  <ShieldCheck size={14} className="text-white" />
                </div>
                <span className="font-bold text-sm text-slate-800 tracking-tight">DocuSafe PDF</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Your private document workspace. Edit, clean, and secure PDF documents locally with zero server storage logs.
              </p>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">Tools</h4>
              <div className="flex flex-col gap-1.5 text-slate-400">
                <Link href="/tools/merge" className="hover:text-[#5B4DFF] no-underline">Merge PDF</Link>
                <Link href="/tools/split" className="hover:text-[#5B4DFF] no-underline">Split PDF</Link>
                <Link href="/tools/compress" className="hover:text-[#5B4DFF] no-underline">Compress PDF</Link>
                <Link href="/tools/password-protect" className="hover:text-[#5B4DFF] no-underline">Protect PDF</Link>
                <Link href="/tools/pdf-to-images" className="hover:text-[#5B4DFF] no-underline">PDF to Images</Link>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">Company</h4>
              <div className="flex flex-col gap-1.5 text-slate-400 text-left">
                <Link href="/contact" className="hover:text-[#5B4DFF] no-underline">Contact Support</Link>
                <Link href="#" className="hover:text-[#5B4DFF] no-underline">Product Roadmap</Link>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">Legal &amp; Security</h4>
              <div className="flex flex-col gap-1.5 text-slate-400">
                <Link href="/privacy" className="hover:text-[#5B4DFF] no-underline">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-[#5B4DFF] no-underline">Terms of Service</Link>
                <Link href="#" className="hover:text-[#5B4DFF] no-underline">Security Audits</Link>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-400">
            <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
            <p>Most PDF tools run directly in your browser. AI and audio tools use secure temporary server-side processing when required.</p>
          </div>
        </footer>

      </main>



      {/* Exact style block matching user's custom CSS and sequential animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Hero Animation CSS */
        .wrap {
          border-radius: 0;
          overflow: hidden;
        }
        .logo span {
          color: #7F77DD;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #7F77DD;
          background: rgba(83, 74, 183, 0.15);
          border: 0.5px solid rgba(127, 119, 221, 0.3);
          padding: 4px 11px;
          border-radius: 20px;
          margin-bottom: 20px;
        }
        .btn-g i {
          font-size: 14px;
        }
        .anim-up {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .anim-right {
          opacity: 0;
          transform: translateX(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .anim-in {
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .go {
          opacity: 1 !important;
          transform: none !important;
        }
        
        /* Floating Card Animation */
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1.5deg); }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/* Reusable Tool Card Component for Dense Grid */
interface ToolCardProps {
  tool: Tool;
  index: number;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>, tool: Tool) => void;
  onCardMouseMove: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

function ToolCard({ tool, index, onClick, onCardMouseMove }: ToolCardProps) {
  const Icon = tool.icon;
  
  const planColor = 
    tool.planRequired === "free" 
      ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
      : tool.planRequired === "pro" 
        ? "text-indigo-650 bg-indigo-50 border-indigo-100" 
        : "text-amber-600 bg-amber-50 border-amber-100";

  return (
    <a
      href={tool.href}
      onClick={(e) => onClick(e, tool)}
      onMouseMove={onCardMouseMove}
      className="glass-card shimmer-border p-5 flex flex-col justify-between h-[180px] cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300 animate-in bg-white border border-slate-200 hover:border-transparent hover:shadow-2xl rounded-2xl no-underline text-slate-800"
      style={{
        animationDelay: `${index * 20}ms`,
        // @ts-ignore
        "--hover-color": tool.color,
      }}
    >
      <div>
        <div className="flex items-start justify-between relative z-10 mb-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-inner group-hover:scale-105"
            style={{ 
              backgroundColor: `${tool.color}12`, 
              borderColor: `${tool.color}20` 
            }}
          >
            <Icon size={22} style={{ color: tool.color }} />
          </div>
          
          <div className="flex items-center gap-1.5">
            {POPULAR_10_IDS.includes(tool.id) && (
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#5B4DFF] text-white shadow-sm shadow-[#5B4DFF]/10">
                Most Used
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10">
          <h3 className="font-extrabold text-slate-800 text-[14px] leading-tight group-hover:text-[#5B4DFF] transition-colors duration-150 mb-1">
            {tool.name}
          </h3>
          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1 text-[9px] text-slate-450 font-semibold lowercase first-letter:uppercase">
          <Globe size={11} className="text-slate-400 shrink-0" />
          in-browser
        </span>
        <span className="text-[#5B4DFF] font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          Open Tool <ArrowRight size={10} className="mt-0.5" />
        </span>
      </div>
    </a>
  );
}
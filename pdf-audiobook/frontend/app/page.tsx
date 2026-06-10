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
    description: "Combine multiple PDF files into a single document.",
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
    description: "Split a PDF into individual pages or custom ranges.",
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
    description: "Reduce PDF file size by stripping metadata and structure.",
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
    description: "Rotate individual or all pages inside the document layout.",
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
    description: "Convert each PDF page into high-quality PNG or JPG images.",
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
    description: "Combine multiple images into a single PDF document.",
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
    description: "Pull all text from a PDF and download it as a .txt file.",
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
    description: "Detect interactive input form fields in your PDF and fill them out.",
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
    description: "Check metadata, structural details, and verify tracking endpoints.",
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
    description: "Add a cryptographic signature to a PDF and check modification status.",
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
    description: "Detect overlay boxes hiding text without stripping background layers.",
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
    description: "Inspect or strip embedded file payloads hiding in the catalog.",
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
    description: "Add permissions and password protect the PDF file.",
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
    description: "Locate invisible layers, print templates, and hidden metadata groups.",
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
    description: "Extract and audit all external hyperlinks found inside the layout.",
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
    description: "Scan for patterns (emails, phone numbers, SSNs) and redact them.",
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
    description: "Audit pages to count color vs monochrome pages and optimize print jobs.",
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
    description: "Convert colored text / backgrounds to clean monochrome styles.",
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
    description: "Locate skewed pages, blurry layout segments, and blank pages.",
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
    description: "Apply text or vector overlay stamps across all pages.",
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
    description: "Generate a heat map highlighting the heaviest ink pages.",
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
    description: "Resize page layout dimensions to standardize grid print boundaries.",
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
    description: "Audit missing font weights and substitute fallback systems.",
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
    description: "Scan pages for QR codes or barcodes and decode values.",
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
    description: "Compare text layouts of two PDFs and highlight line differences.",
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
    description: "Compile multiple documents into organized folders with indexes.",
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
    description: "Analyze word logs to estimate study times and speaking rates.",
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
    description: "Detect chronological dates in text to plot history charts.",
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
    description: "Set logical layout numbering (I, II, III, 1, 2) in PDF catalogues.",
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
    description: "Scan pages for sequence numbers (1, 2, 4...) and highlight gaps.",
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
    description: "Parse page text to auto-rename files based on invoice ID, date, customer, or title.",
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
    description: "Save signature coordinates as templates and apply them automatically to invoices/contracts.",
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
    description: "Ensure required stamps like 'Approved' or 'Confidential' are present on all pages.",
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
    description: "Extract all filled fields from interactive PDF forms into a structured CSV file.",
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
    description: "Interactive chat window to ask questions directly about your PDF content.",
    icon: MessageSquare,
    href: "/tools/pdf-chat",
    color: "#818cf8",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "ai",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Run conversational prompts directly against document context using Groq AI.",
  },
  {
    id: "summarize",
    name: "PDF Summarizer",
    description: "Instantly summarize pages into paragraphs or key takeaways.",
    icon: Sparkles,
    href: "/tools/summarize",
    color: "#d946ef",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "ai",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "TXT",
    benefit: "Condense long files into bullet points or summaries.",
  },
  {
    id: "flashcards",
    name: "PDF to Flashcards",
    description: "Convert textbook pages into study Q&A flip card decks.",
    icon: Layers,
    href: "/tools/flashcards",
    color: "#10b981",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "ai",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Parse chapters or lecture notes into educational flashcards.",
  },
  {
    id: "pdf-to-audio",
    name: "PDF to Audio",
    description: "Convert any PDF into a translated audiobook in 100+ languages.",
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

  // App States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanType>("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [userName, setUserName] = useState("Kavindu");
  const [userEmail, setUserEmail] = useState("kavindu@example.com");

  // Global Dropzone states
  const [globalFile, setGlobalFile] = useState<File | null>(null);
  const [isGlobalDragActive, setIsGlobalDragActive] = useState(false);

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
    const logged = localStorage.getItem("user_logged_in") === "true";
    setIsLoggedIn(logged);

    const plan = getLocalPlan();
    setUserPlan(plan);

    const used = getLocalTasksUsed();
    setTasksUsed(used);

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

    const allowed = isToolAllowed(tool.id, userPlan);
    if (!allowed) {
      setGateToolName(tool.name);
      setGateToolRequired(tool.planRequired);
      setIsGateModalOpen(true);
      return;
    }

    const cost = TOOL_COSTS[tool.id] || 1;
    const hasLimit = checkHasRemainingTasks(cost);
    if (!hasLimit) {
      setIsLimitModalOpen(true);
      return;
    }

    incrementLocalTasksUsed(cost);
    setTasksUsed(getLocalTasksUsed());
    router.push(tool.href);
  };

  const handleGlobalFile = (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are accepted.");
      return;
    }
    setGlobalFile(f);
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

  return (
    <div className="min-h-screen bg-[#F6F8FF] text-[#071B3A] selection:bg-indigo-500/20 overflow-x-hidden relative font-sans flex flex-col justify-between">
      
      {/* Background Glows (Pastel Light Mode blobs) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-15%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-fuchsia-400/5 blur-[130px] top-[15%] right-[-5%]" />
        <div className="absolute w-[650px] h-[650px] rounded-full bg-cyan-400/5 blur-[140px] bottom-[-10%] left-[10%]" />
      </div>

      {/* Header (iLovePDF Style - Light Mode dropdown mega menu) */}
      <header className="sticky top-0 border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm text-slate-705 shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              DocuSafe<span className="text-indigo-600 font-medium">PDF</span>
            </span>
          </Link>

          {/* Navigation Category Header with Hover Mega Menus */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-605">
            <Link href="/tools/merge" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Merge PDF</Link>
            <Link href="/tools/split" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Split PDF</Link>
            <Link href="/tools/compress" className="hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px]">Compress PDF</Link>
            
            {/* Dropdown: Convert PDF */}
            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                Convert PDF <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 flex flex-col gap-1 text-left">
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mb-1">Convert to PDF</div>
                <Link href="/tools/images-to-pdf" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileImage size={13} className="text-green-500 shrink-0" /> Images to PDF</Link>
                <div className="text-[8.5px] text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 border-b border-slate-100 mt-2 mb-1">Convert from PDF</div>
                <Link href="/tools/pdf-to-images" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Image size={13} className="text-amber-500 shrink-0" /> PDF to Images</Link>
                <Link href="/tools/extract-text" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><FileText size={13} className="text-orange-500 shrink-0" /> Extract Text</Link>
                <Link href="/tools/pdf-to-audio" className="text-[11.5px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1.5 px-2 rounded-lg font-semibold flex items-center gap-1.5"><Mic size={13} className="text-indigo-500 shrink-0" /> PDF to Audio</Link>
              </div>
            </div>

            {/* Dropdown: All PDF Tools Mega Menu */}
            <div className="relative group py-1">
              <button className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors uppercase tracking-wider text-[10.5px] font-bold">
                All PDF Tools <ChevronDown size={11} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              
              <div className="absolute top-full left-1/2 -translate-x-[240px] mt-1 w-[720px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 grid grid-cols-4 gap-4 text-left">
                
                {/* Mega Column 1: Organize */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Organize PDF</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/merge" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Merge size={12} className="text-[#8b5cf6]" /> Merge PDF</Link>
                    <Link href="/tools/split" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Scissors size={12} className="text-[#ec4899]" /> Split PDF</Link>
                    <Link href="/tools/compress" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Archive size={12} className="text-[#06b6d4]" /> Compress PDF</Link>
                    <Link href="/tools/rotate" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><RotateCw size={12} className="text-[#a855f7]" /> Rotate PDF</Link>
                    <Link href="/tools/form-filler" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><FileEdit size={12} className="text-[#8b5cf6]" /> Form Filler</Link>
                  </div>
                </div>

                {/* Mega Column 2: Security & Privacy */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Security &amp; Privacy</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/privacy-report" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Eye size={12} className="text-[#14b8a6]" /> Privacy Report</Link>
                    <Link href="/tools/evidence-locker" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#3b82f6]" /> Evidence Locker</Link>
                    <Link href="/tools/fake-redaction" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><AlertOctagon size={12} className="text-[#ef4444]" /> Fake Redaction</Link>
                    <Link href="/tools/attachments" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Paperclip size={12} className="text-[#6366f1]" /> Attachment Inspector</Link>
                    <Link href="/tools/password-protect" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Lock size={12} className="text-[#ef4444]" /> Protect PDF</Link>
                  </div>
                </div>

                {/* Mega Column 3: Print & Scan */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">Print &amp; Scan</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/color-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Palette size={12} className="text-[#10b981]" /> Color Detector</Link>
                    <Link href="/tools/ink-saver" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sun size={12} className="text-[#eab308]" /> Ink Saver</Link>
                    <Link href="/tools/bad-scan-detector" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><ScanLine size={12} className="text-[#ec4899]" /> Bad Scan Check</Link>
                    <Link href="/tools/watermark" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Droplets size={12} className="text-[#0ea5e9]" /> Add Watermark</Link>
                    <Link href="/tools/weight-map" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Activity size={12} className="text-[#10b981]" /> Weight Map</Link>
                  </div>
                </div>

                {/* Mega Column 4: AI & Business */}
                <div className="space-y-2">
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-100 pb-1 mb-1">AI &amp; Business</div>
                  <div className="flex flex-col gap-1">
                    <Link href="/tools/pdf-chat" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><MessageSquare size={12} className="text-[#818cf8]" /> PDF Q&amp;A Chat</Link>
                    <Link href="/tools/summarize" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Sparkles size={12} className="text-[#d946ef]" /> Summarizer</Link>
                    <Link href="/tools/flashcards" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Layers size={12} className="text-[#10b981]" /> PDF to Flashcards</Link>
                    <Link href="/tools/pdf-to-audio" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Mic size={12} className="text-[#6366f1]" /> PDF to Audio</Link>
                    <Link href="/tools/smart-rename" className="text-[11px] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"><Heading size={12} className="text-[#06b6d4]" /> Smart Rename</Link>
                  </div>
                </div>

              </div>
            </div>
          </nav>
        </div>

        {/* User Account State */}
        <div className="flex items-center gap-4 text-slate-600">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold">
            <button
              onClick={() => document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-indigo-600 transition-colors"
            >
              Pricing
            </button>

            {isLoggedIn ? (
              <>
                <Link href="/dashboard" prefetch={false} className="text-indigo-600 hover:text-indigo-500 font-bold transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="hover:text-red-500 flex items-center gap-1 transition-colors text-[11px]"
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSignInOpen(true)} className="hover:text-indigo-600 transition-colors text-[11px] font-bold uppercase tracking-wider">
                  Log In
                </button>
                <button
                  onClick={() => setIsSignInOpen(true)}
                  className="px-3.5 py-1.5 bg-[#5B4DFF] hover:bg-[#4a3ce6] text-white font-bold rounded-xl active:scale-[0.98] transition-all text-[11px] uppercase tracking-wider shadow shadow-indigo-500/10"
                >
                  Sign Up
                </button>
              </div>
            )}
          </nav>

          {isLoggedIn && (
            <Link
              href="/dashboard"
              prefetch={false}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200/60 hover:border-indigo-500/30 transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-slate-700 font-bold max-w-[80px] truncate">{userName}</span>
            </Link>
          )}

          {!isLoggedIn && (
            <button
              onClick={() => setIsSignInOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500"
            >
              <User size={14} />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1">
        
        {/* 1. Sleek, Dual-Column Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-600 shadow-sm font-bold uppercase tracking-wider">
              <Sparkles size={11} className="text-indigo-500" />
              100% Client-Side Private Document Toolkit
            </div>
            
            <h1 className="font-[900] tracking-[-0.04em] leading-[1.05] text-[#071B3A]" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
              Edit, clean, and secure PDFs directly in your browser
            </h1>
            
            <p className="text-sm sm:text-base text-slate-500 font-normal leading-relaxed max-w-xl">
              No uploads. No tracking. No server storage. Your documents are processed locally on your machine for maximum privacy.
            </p>

            <p className="text-xs text-slate-400 font-medium">
              🛡️ Private PDF editing with zero upload required. Built for students, freelancers, offices, and privacy-focused teams.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                onClick={() => document.getElementById("dropzone-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3 bg-[#5B4DFF] hover:bg-[#4a3ce6] text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 active:scale-95"
              >
                Start with PDF Tools
              </button>
              <button 
                onClick={() => {
                  setActiveCategory("all");
                  document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 font-extrabold text-sm text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
              >
                See All Tools
              </button>
            </div>
          </div>

          {/* Right Column: Visual Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm bg-white border border-slate-200 p-6 rounded-3xl shadow-xl space-y-4 animate-float-slow">
              {/* Absolute badge */}
              <div className="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500 text-white text-[9px] font-extrabold uppercase rounded-full shadow-md flex items-center gap-1">
                <Check size={10} strokeWidth={3} /> 100% Client-Side
              </div>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-105 rounded-xl flex items-center justify-center text-[#5B4DFF]">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">annual_financial_report.pdf</p>
                  <p className="text-[10px] text-slate-400">4.2 MB · 12 pages</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-505 flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Document Security</span>
                  <span className="font-bold text-emerald-600">Secure</span>
                </div>
                <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-505 flex items-center gap-1.5"><Lock size={14} className="text-indigo-500" /> AES-256 Encryption</span>
                  <span className="font-bold text-indigo-600">Ready</span>
                </div>
                <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-505 flex items-center gap-1.5"><Zap size={14} className="text-amber-500 animate-pulse" /> Processing Speed</span>
                  <span className="font-bold text-slate-700">0.4s (Instant)</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-slate-400 pt-1">
                No files are uploaded to our servers. All processing runs in your browser sandbox.
              </p>
            </div>
          </div>

        </section>

        {/* 2. Global Dropzone Section */}
        <section id="dropzone-section" className="max-w-4xl mx-auto px-6 py-8 scroll-mt-20">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-md text-center space-y-6 relative overflow-hidden">
            
            {!globalFile ? (
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsGlobalDragActive(true); }}
                onDragLeave={() => setIsGlobalDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsGlobalDragActive(false);
                  if (e.dataTransfer.files?.[0]) handleGlobalFile(e.dataTransfer.files[0]);
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".pdf,application/pdf";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleGlobalFile(file);
                  };
                  input.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 group
                  ${isGlobalDragActive 
                    ? "border-[#5B4DFF] bg-indigo-50/50" 
                    : "border-slate-200 hover:border-[#5B4DFF]/50 hover:bg-slate-50/50"
                  }`}
              >
                <div className="w-14 h-14 bg-indigo-55 border border-indigo-100 rounded-2xl flex items-center justify-center text-[#5B4DFF] group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Archive size={26} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-base font-extrabold text-[#071B3A]">Drop your PDF here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to choose a file from your device</p>
                </div>
                <p className="text-[10px] text-slate-450 uppercase tracking-widest font-extrabold bg-slate-100 px-3 py-1 rounded-full mt-2">
                  Files stay in your browser. Nothing is uploaded.
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm truncate max-w-md">{globalFile.name}</h3>
                      <p className="text-[10px] text-slate-400">{(globalFile.size / 1024 / 1024).toFixed(2)} MB · PDF Document</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setGlobalFile(null)}
                    className="text-xs text-slate-400 hover:text-slate-750 font-bold bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Clear File
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Choose a tool to apply to this file:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                      { name: "Merge PDF", href: "/tools/merge", color: "#8b5cf6" },
                      { name: "Split PDF", href: "/tools/split", color: "#ec4899" },
                      { name: "Compress PDF", href: "/tools/compress", color: "#06b6d4" },
                      { name: "Add Watermark", href: "/tools/watermark", color: "#0ea5e9" },
                      { name: "Q&A Chat", href: "/tools/pdf-chat", color: "#818cf8" }
                    ].map((act) => (
                      <button
                        key={act.name}
                        onClick={() => {
                          sessionStorage.setItem("pending_file_name", globalFile.name);
                          sessionStorage.setItem("pending_file_size", globalFile.size.toString());
                          router.push(act.href);
                        }}
                        className="p-3 border border-slate-200 hover:border-transparent hover:shadow-lg bg-slate-50/50 hover:bg-white rounded-xl text-xs font-bold text-slate-750 text-center transition-all hover:-translate-y-0.5 active:translate-y-0 flex flex-col items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: act.color }} />
                        {act.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Search bar segment (quick access below dropzone) */}
        <section className="max-w-md mx-auto pt-3 pb-8 px-6 relative group">
          <div className="relative flex items-center z-10">
            <Search className="absolute left-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" size={15} />
            <input
              type="text"
              placeholder="Search tools: merge, split, compress, protect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/5 placeholder-slate-400 transition-all text-slate-800 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          
          {/* Quick chips keywords */}
          <div className="flex flex-wrap items-center justify-center gap-1 mt-2.5 relative z-10">
            {["compress", "diff", "watermark", "flashcards"].map((chip) => (
              <button 
                key={chip} 
                onClick={() => setSearchQuery(chip)} 
                className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[9.5px] text-slate-500 hover:bg-slate-105 hover:text-slate-850 transition-all font-medium shadow-sm"
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Popular Workflows Section */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="border-b border-slate-200/60 pb-3 mb-6">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Popular Workflows</h2>
            <p className="text-[10.5px] text-slate-400 mt-0.5">Streamline multi-step document tasks directly in your browser</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Prepare PDF for Email",
                desc: "Shrink layout size and block layout access.",
                steps: ["Compress", "Remove metadata", "Protect"],
              },
              {
                title: "Clean Scanned Document",
                desc: "Audit quality logs and fix naming tags.",
                steps: ["Bad Scan", "Compress", "Rename"],
              },
              {
                title: "Print-Ready PDF",
                desc: "Adjust layout alignments and branding.",
                steps: ["Rotate", "Page numbers", "Watermark"],
              },
              {
                title: "Secure Document",
                desc: "Strip sensitive contents and lock file.",
                steps: ["Redact", "Protect", "Verify"],
              }
            ].map((flow) => (
              <div key={flow.title} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">{flow.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-snug">{flow.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex flex-col gap-1.5">
                    {flow.steps.map((st, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                        <span className="w-4 h-4 bg-slate-100 text-slate-500 text-[8px] flex items-center justify-center rounded-full font-mono">{i + 1}</span>
                        <span>{st}</span>
                        {i < flow.steps.length - 1 && <span className="text-slate-300">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. How It Works Section */}
        <section className="bg-slate-100/50 border-y border-slate-200/50 px-6 py-12">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center space-y-1">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">How It Works</h2>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">Get your documents processed locally in 4 simple steps.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { num: "01", name: "Choose a PDF tool", desc: "Select from our large suite of 38 privacy-first utilities." },
                { num: "02", name: "Drop your file", desc: "Select or drag any PDF document. Files load in memory instantly." },
                { num: "03", name: "Process safely", desc: "Execution runs 100% locally in your browser sandbox." },
                { num: "04", name: "Download result", desc: "Grab your sanitized PDF file instantly with zero upload lag." }
              ].map((step) => (
                <div key={step.num} className="relative p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2 overflow-hidden group">
                  <span className="absolute right-3 top-[-15px] text-5xl font-[900] text-slate-100 group-hover:text-[#5B4DFF]/5 transition-colors font-mono pointer-events-none">{step.num}</span>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider relative z-10">{step.name}</h3>
                  <p className="text-[11px] text-slate-500 leading-snug relative z-10">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Trust Section (Why private PDF tools?) */}
        <section className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xs font-extrabold text-slate-405 uppercase tracking-widest">Why DocuSafePDF?</h2>
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

        {/* 6. Tabs & Category Grid */}
        <section className="border-t border-slate-200/60 bg-white/50 py-1.5 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id);
                    document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 shadow-sm
                    ${isActive 
                      ? "bg-[#5B4DFF] border-transparent text-white shadow-[#5B4DFF]/15" 
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-55"
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 7. Tools Grid Section */}
        <section id="tools-grid-section" className="px-6 py-10 max-w-7xl mx-auto scroll-mt-24">
          <div className="space-y-6">
            <div className="border-b border-slate-200/60 pb-2 flex items-center justify-between">
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
                <button onClick={() => setSearchQuery("")} className="text-[10px] text-[#5B4DFF] hover:text-[#4a3ce6] font-extrabold uppercase">
                  Clear
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

        {/* 8. Pricing Section Redesign */}
        <section id="pricing-section" className="px-6 py-14 max-w-5xl mx-auto space-y-10 border-t border-slate-200/60 scroll-mt-20">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-[#071B3A] uppercase tracking-wider">Flexible Pricing Plans</h2>
            <p className="text-[11.5px] text-slate-400 max-w-sm mx-auto">Choose a plan that fits your document workflow and privacy audits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Free */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-[280px] shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Free Plan</h3>
                  <p className="text-[9.5px] text-slate-400">For quick everyday PDF tasks</p>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">$0</p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p className="flex items-center gap-2">✔ Basic PDF tools</p>
                  <p className="flex items-center gap-2">✔ 5 tasks per day</p>
                  <p className="flex items-center gap-2">✔ 25MB max file size</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPlan("free");
                  setUserPlan("free");
                  document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-white border-2 border-[#5B4DFF] p-6 rounded-2xl flex flex-col justify-between h-[280px] relative backdrop-blur-md shadow-md">
                <div className="absolute top-0 right-5 -translate-y-1/2 px-2.5 py-0.5 rounded bg-[#5B4DFF] text-[8px] font-extrabold tracking-wider uppercase text-white shadow-md">
                  Popular
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#5B4DFF]">Pro Plan</h3>
                    <p className="text-[9.5px] text-indigo-400">For heavy PDF users &amp; privacy reports</p>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">$9<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                  <div className="space-y-1.5 text-xs text-slate-650">
                    <p className="flex items-center gap-2">✔ All 38 PDF tools</p>
                    <p className="flex items-center gap-2">✔ 300 tasks per month</p>
                    <p className="flex items-center gap-2">✔ 250MB max file size</p>
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
                  className="w-full py-2.5 bg-[#5B4DFF] hover:bg-[#4a3ce6] rounded-xl text-xs font-bold text-white transition-colors shadow-sm"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>

            {/* Business */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-[280px] shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Business Plan</h3>
                  <p className="text-[9.5px] text-slate-400">For teams and batch automation</p>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">$29<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p className="flex items-center gap-2">✔ Team workspace</p>
                  <p className="flex items-center gap-2">✔ 2000 tasks per month</p>
                  <p className="flex items-center gap-2">✔ 1GB max file size</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPlan("business");
                  setUserPlan("business");
                  document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Start Business
              </button>
            </div>

          </div>

          {/* Feature Differences Matrix */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm mt-8">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 font-bold text-slate-800">
                  <th className="p-3">Feature</th>
                  <th className="p-3">Free</th>
                  <th className="p-3 text-indigo-600">Pro</th>
                  <th className="p-3">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-655">
                <tr>
                  <td className="p-3 font-semibold text-slate-700">PDF Tools Available</td>
                  <td className="p-3">Basic PDF tools</td>
                  <td className="p-3 font-medium text-indigo-650">All PDF tools</td>
                  <td className="p-3">Team workspace</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-700">Daily Task Limits</td>
                  <td className="p-3">5 tasks/day</td>
                  <td className="p-3 font-medium text-indigo-650">300 tasks/month</td>
                  <td className="p-3">2000 tasks/month</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-700">Max File Size</td>
                  <td className="p-3">25 MB</td>
                  <td className="p-3 font-medium text-indigo-650">250 MB</td>
                  <td className="p-3">1 GB</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-750">Batch Processing</td>
                  <td className="p-3">No batch tools</td>
                  <td className="p-3 font-medium text-indigo-650">Batch tools</td>
                  <td className="p-3">Branding &amp; audit logs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. FAQ Section */}
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
                  a: "No. DocuSafePDF runs entirely inside your browser sandbox. Your files are processed locally using Web Crypto and WebAssembly, meaning they never leave your device."
                },
                {
                  q: "Is DocuSafePDF free to use?",
                  a: "Yes. The free tier allows 5 tasks per day for standard utilities. Upgrade to Pro for high-limit processing and security reports."
                },
                {
                  q: "How does the AI Q&A Chat work?",
                  a: "The AI Q&A Chat reads your PDF text locally and communicates with Groq API using your own API key, keeping your data secure and under your control."
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

        {/* 10. Multi-column Premium Footer */}
        <footer className="border-t border-slate-200/60 py-10 px-6 bg-slate-50 text-slate-500">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-[11px] pb-8 border-b border-slate-200/60">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
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
                <Link href="/tools/merge" className="hover:text-[#5B4DFF]">Merge PDF</Link>
                <Link href="/tools/split" className="hover:text-[#5B4DFF]">Split PDF</Link>
                <Link href="/tools/compress" className="hover:text-[#5B4DFF]">Compress PDF</Link>
                <Link href="/tools/password-protect" className="hover:text-[#5B4DFF]">Protect PDF</Link>
                <Link href="/tools/pdf-to-images" className="hover:text-[#5B4DFF]">PDF to Images</Link>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">Company</h4>
              <div className="flex flex-col gap-1.5 text-slate-400">
                <button onClick={() => document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-[#5B4DFF]">Pricing Plans</button>
                <Link href="/dashboard" className="hover:text-[#5B4DFF]">Dashboard</Link>
                <Link href="#" className="hover:text-[#5B4DFF]">Contact Support</Link>
                <Link href="#" className="hover:text-[#5B4DFF]">Product Roadmap</Link>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider">Legal &amp; Security</h4>
              <div className="flex flex-col gap-1.5 text-slate-400">
                <Link href="#" className="hover:text-[#5B4DFF]">Privacy Policy</Link>
                <Link href="#" className="hover:text-[#5B4DFF]">Terms of Service</Link>
                <Link href="#" className="hover:text-[#5B4DFF]">Security Audits</Link>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-400">
            <p>© {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor</p>
            <p>Processing runs 100% locally in your browser sandbox.</p>
          </div>
        </footer>

      </main>

      {/* Login Modal */}
      {isSignInOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-6 relative text-slate-800">
            <button onClick={() => setIsSignInOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
            <div className="text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-200/50 flex items-center justify-center mx-auto">
                <User size={18} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Sign in to DocuSafe</h3>
              <p className="text-xs text-slate-400">Access your dashboard, check limits, and save keys</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors">
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {isUpgradeOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-5 relative text-slate-800">
            <button onClick={() => setIsUpgradeOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors" disabled={isUpgrading}>
              <X size={16} />
            </button>
            <div className="text-center space-y-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-sm text-black">
                <Award size={18} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Upgrade to Premium Pro</h3>
              <p className="text-xs text-slate-400">Unlock security scanners, print saving engines, and batch jobs.</p>
            </div>
            
            <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-lg flex max-w-[150px] mx-auto text-[9px]">
              <button onClick={() => setBillingInterval("monthly")} className={`flex-1 py-0.5 rounded font-bold transition-all ${billingInterval === "monthly" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}>Monthly</button>
              <button onClick={() => setBillingInterval("yearly")} className={`flex-1 py-0.5 rounded font-bold transition-all ${billingInterval === "yearly" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}>Yearly (-33%)</button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">Pro Plan Subscription</p>
                <p className="text-[9px] text-slate-400">Unlocks 300 monthly tasks</p>
              </div>
              <p className="font-extrabold text-slate-900 text-base">{billingInterval === "monthly" ? "$9" : "$6"}<span className="text-[9px] text-slate-400 font-normal">/mo</span></p>
            </div>

            <div className="space-y-2">
              {upgradeSuccess ? (
                <div className="py-2.5 bg-green-100 border border-green-200 rounded-xl text-green-655 font-bold text-xs text-center flex items-center justify-center gap-1.5 animate-bounce">
                  <Check size={14} /> Subscription Active! Welcome to Pro!
                </div>
              ) : (
                <button
                  onClick={handleUpgradeNow}
                  disabled={isUpgrading}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {isUpgrading ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" /> Processing purchase...
                    </>
                  ) : (
                    <>
                      <CreditCard size={11} /> Activate Premium Pro
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-5 relative text-center text-slate-800">
            <button onClick={() => setIsLimitModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto text-red-500 animate-pulse">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">Limit Reached</h3>
              <p className="text-xs text-slate-400">
                You used your {userPlan === "free" ? "5 free" : userPlan === "pro" ? "300 Pro" : "2000 Business"} tasks today.
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Upgrade to Pro for 300 monthly tasks, full security reports, larger files, and batch processing.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsLimitModalOpen(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs text-slate-505 hover:text-slate-800 font-bold transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  setIsUpgradeOpen(true);
                }}
                className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Tool Gate Modal */}
      {isGateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-5 relative text-center text-slate-800">
            <button onClick={() => setIsGateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <Lock size={18} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">This is a {gateToolRequired === "business" ? "Business" : "Pro"} tool</h3>
              <p className="text-xs text-slate-400">
                Upgrade to unlock {gateToolName}, Privacy Report, Evidence Locker, and more specialized tools.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => {
                setIsGateModalOpen(false);
                document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
              }} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs text-slate-505 hover:text-slate-800 font-bold transition-colors">
                View Free Tools
              </button>
              <button
                onClick={() => {
                  setIsGateModalOpen(false);
                  setIsUpgradeOpen(true);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
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
          animation: fadeIn 0.15s ease-out forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
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
        ? "text-indigo-600 bg-indigo-50 border-indigo-100" 
        : "text-amber-600 bg-amber-50 border-amber-100";

  return (
    <a
      href={tool.href}
      onClick={(e) => onClick(e, tool)}
      onMouseMove={onCardMouseMove}
      className="glass-card shimmer-border p-5 flex flex-col justify-between h-[180px] cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300 animate-in"
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
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500 text-white shadow-sm">
                Most Used
              </span>
            )}
            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border capitalize ${planColor}`}>
              {tool.planRequired}
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <h3 className="font-extrabold text-slate-800 text-[14px] leading-tight group-hover:text-indigo-600 transition-colors duration-150 mb-1">
            {tool.name}
          </h3>
          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-3 border-t border-slate-100">
        <span>{tool.processing.split("-")[0]}</span>
        <span className="text-[#5B4DFF] font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          Open Tool <ArrowRight size={10} className="mt-0.5" />
        </span>
      </div>
    </a>
  );
}
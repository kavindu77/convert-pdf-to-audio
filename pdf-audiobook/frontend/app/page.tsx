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
    benefit: "Type directly into active fields, toggle checkboxes, and download filled PDFs.",
  },
  {
    id: "reading-time",
    name: "Reading Time Estimator",
    description: "Estimates page word count speed, narration time, and ARI readability index.",
    icon: Clock,
    href: "/tools/reading-time",
    color: "#eab308",
    badge: "Free",
    badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    category: "popular",
    planRequired: "free",
    processing: "Client-side",
    outputType: "TXT",
    benefit: "Inspect text density, average syllable grids, and speak rates.",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Secure documents with custom metadata markers and Visual protection watermarks.",
  },
  {
    id: "diff",
    name: "Compare / Diff PDFs",
    description: "Compare two PDFs side-by-side and highlight additions and edits.",
    icon: GitCompare,
    href: "/tools/diff",
    color: "#06b6d4",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Extract text coordinates to generate character differences side-by-side.",
  },
  {
    id: "redact",
    name: "PDF Redactor",
    description: "Scan and sanitize phone numbers, SSNs, credit cards, or names.",
    icon: EyeOff,
    href: "/tools/redact",
    color: "#f43f5e",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "security",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "TXT",
    benefit: "Automatically search regex keywords and redact sensitive strings.",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
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
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Analyze edge contrast and luminance to detect blur, rotation issues, or blank pages.",
  },
  {
    id: "missing-pages",
    name: "Missing Page Detector",
    description: "Detect sequence gaps, repeated pages, or skipped sections using internal numbering.",
    icon: FileWarning,
    href: "/tools/missing-pages",
    color: "#ef4444",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Scan text coordinates for page number labels to find missing sequence blocks.",
  },
  {
    id: "margin-normalizer",
    name: "Margin Normalizer",
    description: "Automatically trim scan margins and align page borders for professional printing.",
    icon: Maximize,
    href: "/tools/margin-normalizer",
    color: "#f43f5e",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Crops and recalculates margins to optimize physical printable areas.",
  },
  {
    id: "font-fixer",
    name: "Font Problem Fixer",
    description: "Detect missing, non-embedded fonts, corrupted characters, or text copying risks.",
    icon: Type,
    href: "/tools/font-fixer",
    color: "#06b6d4",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Standardizes resource dictionary grids to system Helvetica.",
  },
  {
    id: "weight-map",
    name: "File Weight Map",
    description: "Visualize what makes your PDF heavy: images, fonts, embedded items, or vector shapes.",
    icon: Activity,
    href: "/tools/weight-map",
    color: "#10b981",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Map exact byte consumption of fonts, embedded streams, vector path structures, and images.",
  },
  {
    id: "page-labels",
    name: "Smart Page Labels",
    description: "Label pages/sections (e.g. Cover, Appendix) so PDF viewers display logical names.",
    icon: Tags,
    href: "/tools/page-labels",
    color: "#a855f7",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Assign custom numbering labels (e.g. Cover, I, II, Appendix A) to document ranges.",
  },
  {
    id: "watermark",
    name: "Add Watermark",
    description: "Overlay custom text watermarks with size and opacity controls.",
    icon: Droplets,
    href: "/tools/watermark",
    color: "#0ea5e9",
    badge: "Pro",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    category: "print",
    planRequired: "pro",
    processing: "Client-side",
    outputType: "PDF",
    benefit: "Draw custom text stamps at various rotational dimensions.",
  },

  // --- BUSINESS / BATCH ---
  {
    id: "timeline",
    name: "Version Diff Timeline",
    description: "Upload multiple versions of a PDF and see exactly what changed over time.",
    icon: History,
    href: "/tools/timeline",
    color: "#8b5cf6",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Client-side",
    outputType: "Report",
    benefit: "Compare incremental document drafts side-by-side on an audit timeline.",
  },
  {
    id: "delivery-packager",
    name: "Client Delivery Packager",
    description: "Compile standard PDF, compressed web PDF, text extracts, and metadata report to ZIP.",
    icon: FolderArchive,
    href: "/tools/delivery-packager",
    color: "#f97316",
    badge: "Business",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    category: "business",
    planRequired: "business",
    processing: "Secure server",
    outputType: "ZIP",
    benefit: "Generates manifest files, stripped PDF variants, and logs inside an archive.",
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
  { id: "all", name: "Popular Tools", color: "from-indigo-400 to-indigo-500" },
  { id: "popular", name: "Organize PDF", color: "from-[#8b5cf6] to-[#ec4899]" },
  { id: "security", name: "Security & Privacy", color: "from-[#14b8a6] to-[#10b981]" },
  { id: "print", name: "Print & Scan", color: "from-[#f59e0b] to-[#f97316]" },
  { id: "ai", name: "AI Tools", color: "from-[#d946ef] to-[#818cf8]" },
  { id: "business", name: "Business", color: "from-[#0ea5e9] to-[#6366f1]" },
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

  // Define 10 popular tools that will display on the home page by default
  const POPULAR_10_IDS = ["merge", "split", "compress", "rotate", "pdf-to-images", "images-to-pdf", "extract-text", "form-filler", "pdf-chat", "summarize"];

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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-500/20 overflow-x-hidden relative font-sans">
      
      {/* Background Glows (Pastel Light Mode blobs) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[120px] top-[-15%] left-[-10%]" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-fuchsia-400/5 blur-[130px] top-[15%] right-[-5%]" />
        <div className="absolute w-[650px] h-[650px] rounded-full bg-cyan-400/5 blur-[140px] bottom-[-10%] left-[10%]" />
      </div>

      {/* Header (iLovePDF Style - Light Mode dropdown mega menu) */}
      <header className="sticky top-0 border-b border-slate-200/60 px-6 py-3 flex items-center justify-between z-40 backdrop-blur-md bg-white/90 shadow-sm text-slate-700">
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
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
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
                  className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-[11px] uppercase tracking-wider shadow shadow-indigo-500/10"
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

      <main className="relative z-10">
        
        {/* Sleek, Center Hero */}
        <section className="px-6 pt-14 pb-10 text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-600 shadow-sm font-bold uppercase tracking-wider">
            <Sparkles size={11} className="text-indigo-500" />
            100% Client-Side Private Document Toolkit
          </div>
          
          <h1 className="font-[800] tracking-[-0.04em] leading-[1.05] text-slate-900" style={{ fontSize: "clamp(30px, 4.5vw, 48px)" }}>
            Private PDF Tools for Work, Print &amp; Security
          </h1>
          
          <p className="text-[13.5px] text-slate-500 font-normal leading-relaxed max-w-xl mx-auto">
            Check, clean, print, and safely share PDFs. All files remain completely private and process locally inside your browser.
          </p>

          {/* Search bar & filter chips */}
          <div className="max-w-md mx-auto pt-3 relative group">
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
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[9.5px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all font-medium shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab navigation below hero */}
        <section className="border-y border-slate-200/60 bg-white/70 backdrop-blur-md py-1.5 px-6">
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border
                    ${isActive 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm" 
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Clean Light mode Tool Grid */}
        <section id="tools-grid-section" className="px-6 py-8 max-w-7xl mx-auto scroll-mt-24">
          
          <div className="space-y-4">
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
                <button onClick={() => setSearchQuery("")} className="text-[10px] text-indigo-600 hover:text-indigo-500 font-extrabold uppercase">
                  Reset
                </button>
              )}
            </div>

            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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

        {/* Pricing Preview */}
        <section id="pricing-section" className="px-6 py-12 max-w-5xl mx-auto space-y-8 border-t border-slate-200/60 scroll-mt-20">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-wider">Flexible Pricing Plans</h2>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">Choose a plan that fits your document workflow and privacy audits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Free */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Free Plan</h3>
                  <p className="text-[9px] text-slate-400">Everyday conversion utilities</p>
                </div>
                <p className="text-2xl font-extrabold text-slate-900">$0</p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> 5 tasks per day</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> Max file size: 25 MB</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> Max pages: 50</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> Basic tools only (No batch)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPlan("free");
                  setUserPlan("free");
                  document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-white border-2 border-indigo-500 p-5 rounded-2xl flex flex-col justify-between relative backdrop-blur-md h-full space-y-4 shadow-md">
                <div className="absolute top-0 right-5 -translate-y-1/2 px-2 py-0.5 rounded bg-indigo-500 text-[8px] font-extrabold tracking-wider uppercase text-white shadow-md shadow-indigo-500/20">
                  Most Popular
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-indigo-600">Pro Plan</h3>
                    <p className="text-[9px] text-indigo-400/50">Detailed privacy &amp; security reports</p>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">$9<span className="text-xs text-slate-400 font-normal">/month</span></p>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2"><Check size={13} className="text-indigo-500 shrink-0" /> 300 tasks per month</p>
                    <p className="flex items-center gap-2"><Check size={13} className="text-indigo-500 shrink-0" /> Max file size: 250 MB</p>
                    <p className="flex items-center gap-2"><Check size={13} className="text-indigo-500 shrink-0" /> Max pages: 500</p>
                    <p className="flex items-center gap-2"><Check size={13} className="text-indigo-500 shrink-0" /> Access to Security &amp; Print tools</p>
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
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-colors shadow-sm"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>

            {/* Business */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Business Plan</h3>
                  <p className="text-[9px] text-slate-400">Corporate-grade automation</p>
                </div>
                <p className="text-2xl font-extrabold text-slate-900">$29<span className="text-xs text-slate-400 font-normal">/month</span></p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> 2000 tasks per month</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> Max file size: 1 GB</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> Batch process up to 250 files</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-green-500 shrink-0" /> Team workspaces &amp; branding</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLocalPlan("business");
                  setUserPlan("business");
                  document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Start Business
              </button>
            </div>

          </div>
        </section>

        {/* Security & Performance */}
        <section className="border-t border-slate-200/60 px-6 py-12 bg-white">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-xs font-extrabold text-center text-slate-400 uppercase tracking-widest">Security &amp; Performance Built In</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-200/50 flex items-center justify-center mx-auto shadow-inner">
                  <Zap size={16} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-xs text-slate-800">Browser Execution</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">Most tools run fully client-side inside your browser engine. Zero upload latency, 100% private.</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-200/50 flex items-center justify-center mx-auto shadow-inner">
                  <Shield size={16} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-xs text-slate-800">Secure Temporary Processing</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">Advanced tools use temporary secure processing when browser-only execution is not possible.</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-200/50 flex items-center justify-center mx-auto shadow-inner">
                  <Globe size={16} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-xs text-slate-800">Private &amp; Auditable</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">Focus on document hygiene. Strip trackers, verify fake redactions, and log hashes locally.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 py-6 px-6 bg-slate-50 text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShieldCheck size={12} className="text-white" />
              </div>
              <span className="font-bold text-xs text-slate-800 tracking-tight">DocuSafe PDF</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
              <button onClick={() => {
                setActiveCategory("all");
                document.getElementById("tools-grid-section")?.scrollIntoView({ behavior: "smooth" });
              }} className="hover:text-slate-700 transition-colors">Tools</button>
              <button onClick={() => document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-slate-700 transition-colors">Pricing</button>
              <Link href="#" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-slate-700 transition-colors">Terms</Link>
            </div>
            
            <div className="text-[10px] text-slate-400">
              © {new Date().getFullYear()} DocuSafe PDF · Your Private PDF Editor
            </div>
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
                <div className="py-2.5 bg-green-100 border border-green-200 rounded-xl text-green-600 font-bold text-xs text-center flex items-center justify-center gap-1.5 animate-bounce">
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
              <button onClick={() => setIsLimitModalOpen(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsLimitModalOpen(false);
                  setIsUpgradeOpen(true);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
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
              }} className="flex-1 py-2 border border-slate-200 rounded-xl text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors">
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
      ? "text-green-600 bg-green-50 border-green-100" 
      : tool.planRequired === "pro" 
        ? "text-indigo-600 bg-indigo-50 border-indigo-100" 
        : "text-amber-600 bg-amber-50 border-amber-100";

  return (
    <a
      href={tool.href}
      onClick={(e) => onClick(e, tool)}
      onMouseMove={onCardMouseMove}
      className="glass-card shimmer-border p-3 flex flex-col gap-2.5 cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300 animate-in"
      style={{
        animationDelay: `${index * 20}ms`,
        // @ts-ignore
        "--hover-color": tool.color,
      }}
    >
      <div className="flex items-start justify-between relative z-10">
        <div 
          className="w-8.5 h-8.5 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-inner group-hover:scale-105"
          style={{ 
            backgroundColor: `${tool.color}10`, 
            borderColor: `${tool.color}20` 
          }}
        >
          <Icon size={15} style={{ color: tool.color }} />
        </div>
        
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border capitalize ${planColor}`}>
          {tool.planRequired}
        </span>
      </div>

      <div className="relative z-10 flex-1">
        <h3 className="font-extrabold text-slate-800 text-[12.5px] leading-tight group-hover:text-indigo-600 transition-colors duration-150 mb-0.5">
          {tool.name}
        </h3>
        <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-2 min-h-[30px] group-hover:text-slate-600 transition-colors">
          {tool.description}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between text-[8.5px] font-bold text-slate-400 uppercase tracking-wider pt-1.5 border-t border-slate-100">
        <span>{tool.processing.split("-")[0]}</span>
        <span>{tool.outputType}</span>
      </div>
    </a>
  );
}
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
} from "lucide-react";
import {
  PlanType,
  PLANS,
  TOOL_COSTS,
  isToolAllowed,
  getLocalPlan,
  setLocalPlan,
  getLocalTasksUsed,
  incrementLocalTasksUsed,
  getLocalTasksLimit,
  checkHasRemainingTasks,
} from "../utils/userState";

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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    category: "ai",
    planRequired: "business",
    processing: "Secure server",
    outputType: "Audio",
    benefit: "Render clean text-to-speech audiobooks in multiple global accents.",
  },
];

export default function AllToolsDirectory() {
  const router = useRouter();

  // App States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanType>("free");
  const [tasksUsed, setTasksUsed] = useState(0);

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

  // Form inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("user_logged_in") === "true");
    setUserPlan(getLocalPlan());
    setTasksUsed(getLocalTasksUsed());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("user_profile_email", emailInput);
    
    const prefix = emailInput.split("@")[0];
    const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    localStorage.setItem("user_profile_name", name);

    setIsLoggedIn(true);
    setIsSignInOpen(false);
    setEmailInput("");
    setPasswordInput("");
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

  const filteredTools = ALL_TOOLS.filter((tool) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.benefit.toLowerCase().includes(query);
      
    if (activeCategory === "all") return matchesSearch;
    return matchesSearch && tool.category === activeCategory;
  });

  const getCategoryCount = (cat: string) => {
    return ALL_TOOLS.filter(t => t.category === cat).length;
  };

  const CATEGORY_TABS = [
    { id: "all", name: "All Tools", count: ALL_TOOLS.length },
    { id: "popular", name: "Popular Tools", count: getCategoryCount("popular") },
    { id: "security", name: "Security & Privacy", count: getCategoryCount("security") },
    { id: "print", name: "Print & Scan", count: getCategoryCount("print") },
    { id: "business", name: "Business / Batch", count: getCategoryCount("business") },
    { id: "ai", name: "AI Tools", count: getCategoryCount("ai") },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 overflow-x-hidden relative font-sans">
      
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[850px] h-[850px] rounded-full bg-indigo-500/5 blur-[140px] -top-96 -left-48 animate-pulse duration-[12000ms]" />
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
          <Link href="/" prefetch={false} className="flex items-center gap-3 hover:opacity-85">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              DocuSafe PDF
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-gray-400">
          <Link href="/" prefetch={false} className="hover:text-white transition-colors">Home</Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" prefetch={false} className="text-indigo-400 hover:text-indigo-300 transition-colors">Dashboard</Link>
            </>
          ) : (
            <button onClick={() => setIsSignInOpen(true)} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all text-xs">
              Sign In
            </button>
          )}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-10 relative z-10">
        
        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-white">Full PDF Toolkit Directory</h1>
          <p className="text-xs text-gray-400 max-w-xl">
            Explore our complete suite of 38 hybrid client-side tools. Select a category tab or search below to filter the catalog.
          </p>
        </div>

        {/* Filter controls wrapper */}
        <div className="space-y-6">
          
          {/* Search bar */}
          <div className="max-w-md relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-xl opacity-10 blur group-hover:opacity-20 transition-opacity duration-300" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-gray-500 group-hover:text-indigo-400 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search all 38 tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 placeholder-gray-500 text-white backdrop-blur-md"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border backdrop-blur-md active:scale-95 ${
                  activeCategory === tab.id
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10"
                    : "bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white"
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl max-w-lg mx-auto space-y-4">
            <Layers size={40} className="mx-auto text-gray-600 animate-bounce" />
            <h3 className="font-semibold text-white text-lg">No tools matched your search</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">Try typing alternative terms or switching the category tab filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.id}
                  href={tool.href}
                  onClick={(e) => handleToolClick(e, tool)}
                  onMouseMove={handleCardMouseMove}
                  className="glass-card shimmer-border p-6 flex flex-col gap-4 cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-105 duration-300">
                      <Icon size={18} style={{ color: tool.color }} />
                    </div>
                    <span className={`text-[8px] font-extrabold px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                      tool.planRequired === "free"
                        ? "bg-green-500/15 border-green-500/20 text-green-400"
                        : tool.planRequired === "pro"
                        ? "bg-indigo-500/15 border-indigo-500/20 text-indigo-400"
                        : "bg-amber-500/15 border-amber-500/20 text-amber-400"
                    }`}>
                      {tool.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{tool.name}</h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed min-h-[32px]">{tool.description}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed pt-1.5 border-t border-white/5">{tool.benefit}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[8px] text-gray-600 font-bold uppercase tracking-wider mt-auto pt-2">
                    <span>{tool.processing}</span>
                    <span>·</span>
                    <span>{tool.outputType}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

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
              <button onClick={() => setIsGateModalOpen(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white font-bold transition-colors">
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

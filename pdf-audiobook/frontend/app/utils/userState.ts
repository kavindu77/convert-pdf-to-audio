"use client";

export type PlanType = "free" | "pro" | "business";

export interface PlanConfig {
  name: string;
  price: string;
  maxFileSize: string;
  maxFileSizeMB: number;
  maxPages: number;
  batchLimit: number;
  taskLimit: number;
  retention: string;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: "Free Plan",
    price: "$0",
    maxFileSize: "25 MB",
    maxFileSizeMB: 25,
    maxPages: 50,
    batchLimit: 0,
    taskLimit: 5,
    retention: "1 hour",
  },
  pro: {
    name: "Pro Plan",
    price: "$9/month",
    maxFileSize: "250 MB",
    maxFileSizeMB: 250,
    maxPages: 500,
    batchLimit: 25,
    taskLimit: 300,
    retention: "24 hours",
  },
  business: {
    name: "Business Plan",
    price: "$29/month",
    maxFileSize: "1 GB",
    maxFileSizeMB: 1024,
    maxPages: 2000,
    batchLimit: 250,
    taskLimit: 2000,
    retention: "Custom",
  },
};

export const TOOL_COSTS: Record<string, number> = {
  // Basic / popular tools
  merge: 1,
  split: 1,
  compress: 1,
  rotate: 1,
  "pdf-to-images": 1,
  "images-to-pdf": 1,
  "extract-text": 1,
  "form-filler": 1,
  "reading-time": 1,
  
  // Security / Pro tools
  "privacy-report": 2,
  "evidence-locker": 3,
  "fake-redaction": 2,
  attachments: 1,
  "hidden-layers": 1,
  "link-safety": 1,
  "barcode-scanner": 1,
  "password-protect": 1,
  "color-detector": 1,
  "ink-saver": 3,
  "bad-scan-detector": 2,
  "missing-pages": 1,
  "margin-normalizer": 1,
  "font-fixer": 1,
  "weight-map": 1,
  
  // Business / Batch tools
  timeline: 5,
  "delivery-packager": 5,
  "smart-rename": 1,
  "signature-positions": 1,
  "stamp-consistency": 1,
  "form-extractor": 1,
  
  // AI Tools
  "pdf-chat": 2,
  summarize: 2,
  flashcards: 3,
  "pdf-to-audio": 5,
};

// Returns which tier is required for a tool
export function getRequiredPlanForTool(toolId: string): PlanType {
  const proTools = [
    "privacy-report",
    "evidence-locker",
    "fake-redaction",
    "attachments",
    "hidden-layers",
    "link-safety",
    "barcode-scanner",
    "password-protect",
    "ink-saver",
    "bad-scan-detector",
    "missing-pages",
    "margin-normalizer",
    "font-fixer",
    "weight-map",
    "pdf-chat",
    "summarize",
    "flashcards",
  ];
  
  const bizTools = [
    "timeline",
    "delivery-packager",
    "smart-rename",
    "signature-positions",
    "stamp-consistency",
    "form-extractor",
    "pdf-to-audio",
  ];

  if (bizTools.includes(toolId)) return "business";
  if (proTools.includes(toolId)) return "pro";
  return "free";
}

export function isToolAllowed(toolId: string, currentPlan: PlanType): boolean {
  return true;
}

// Local storage management helpers
const IS_SERVER = typeof window === "undefined";

export function getLocalPlan(): PlanType {
  if (IS_SERVER) return "free";
  const plan = localStorage.getItem("user_plan") as PlanType;
  return plan || "free";
}

export function setLocalPlan(plan: PlanType) {
  if (IS_SERVER) return;
  localStorage.setItem("user_plan", plan);
  localStorage.setItem("user_is_premium", plan !== "free" ? "true" : "false");
}

export function getLocalTasksUsed(): number {
  if (IS_SERVER) return 0;
  
  // Track reset by date
  const todayStr = new Date().toDateString();
  const savedDate = localStorage.getItem("user_tasks_date");
  if (savedDate !== todayStr) {
    localStorage.setItem("user_tasks_date", todayStr);
    localStorage.setItem("user_tasks_used_today", "0");
    return 0;
  }
  
  const used = localStorage.getItem("user_tasks_used_today");
  return used ? parseInt(used, 10) : 0;
}

export function incrementLocalTasksUsed(cost: number): number {
  if (IS_SERVER) return 0;
  const used = getLocalTasksUsed();
  const total = used + cost;
  localStorage.setItem("user_tasks_used_today", total.toString());
  
  // Increment overall files processed statistics
  const overall = localStorage.getItem("user_files_processed");
  const overallNum = overall ? parseInt(overall, 10) : 14;
  localStorage.setItem("user_files_processed", (overallNum + 1).toString());

  return total;
}

export function getLocalTasksLimit(plan: PlanType): number {
  return PLANS[plan].taskLimit;
}

export function checkHasRemainingTasks(cost: number): boolean {
  return true;
}

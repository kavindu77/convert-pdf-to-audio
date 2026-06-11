"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import {
  ShieldCheck,
  User,
  Activity,
  Award,
  CreditCard,
  FileText,
  Bookmark,
  Layers,
  Settings,
  ArrowLeft,
  X,
  Check,
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  FolderArchive,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  PlanType,
  PLANS,
  getLocalPlan,
  setLocalPlan,
  getLocalTasksUsed,
  getLocalTasksLimit,
  incrementLocalTasksUsed,
} from "../utils/userState";
import { useUsageStore } from "../utils/useUsageStore";

interface MockFile {
  id: string;
  name: string;
  size: string;
  date: string;
  status: string;
}

interface MockReport {
  id: string;
  name: string;
  score: number;
  date: string;
  issues: number;
}

interface MockEvidence {
  id: string;
  name: string;
  hash: string;
  date: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const clerk = useClerk();
  const { isSignedIn, user, isLoaded } = useUser();
  const { triggerCheckout, isLoadingCheckout } = useUsageStore();

  // Navigation states
  const [activeTab, setActiveTab] = useState<
    "overview" | "reports" | "evidence" | "templates" | "batch" | "billing" | "settings"
  >("overview");

  // Auth & Plan states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanType>("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [userName, setUserName] = useState("Kavindu");
  const [userEmail, setUserEmail] = useState("kavindu@example.com");

  // Simulated billing & upgrade states
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Form notifications
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setUserPlan(data.plan || "free");
        setLocalPlan(data.plan || "free");
        
        const used = data.plan === "free"
          ? data.usage.dailyTasksUsed
          : data.usage.monthlyTasksUsed;
        setTasksUsed(used);
        
        // Cache in local storage for other views
        localStorage.setItem("user_plan", data.plan || "free");
        localStorage.setItem("user_tasks_used_today", String(used));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      console.error("Failed to fetch user data from API:", err);
    }
  };

  // Mock Data lists (users can delete items!)
  const [files, setFiles] = useState<MockFile[]>([
    { id: "1", name: "Q1_Financial_Report.pdf", size: "4.2 MB", date: "June 08, 2026", status: "Cleaned" },
    { id: "2", name: "ND_Agreement_Final.pdf", size: "1.8 MB", date: "June 05, 2026", status: "Certified" },
    { id: "3", name: "Product_Roadmap_Draft.pdf", size: "12.4 MB", date: "May 29, 2026", status: "Compressed" },
  ]);

  const [reports, setReports] = useState<MockReport[]>([
    { id: "1", name: "Q1_Financial_Report_privacy_cleaned.pdf", score: 100, date: "June 08, 2026", issues: 0 },
    { id: "2", name: "Original_Marketing_Pitch_leak_report.pdf", score: 45, date: "June 02, 2026", issues: 5 },
  ]);

  const [evidence, setEvidence] = useState<MockEvidence[]>([
    { id: "1", name: "ND_Agreement_Final_signed.pdf", hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", date: "June 05, 2026" },
  ]);

  const [templates, setTemplates] = useState([
    { id: "1", name: "NDA Standard Seal Box", signers: 2, page: 1, date: "June 04, 2026" },
    { id: "2", name: "Client Invoice Stamping", signers: 1, page: 3, date: "May 20, 2026" },
  ]);

  const [batchJobs, setBatchJobs] = useState([
    { id: "1", name: "Standard Client Packager - 12 Files", date: "June 07, 2026", status: "Completed" },
  ]);

  useEffect(() => {
    setUserPlan(getLocalPlan());
    setTasksUsed(getLocalTasksUsed());
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/");
        return;
      }
      setIsLoggedIn(true);
      if (user) {
        const name = user.fullName || user.firstName || user.username || "User";
        setUserName(name);
        setUserEmail(user.primaryEmailAddress?.emailAddress || "");
        localStorage.setItem("user_logged_in", "true");
        localStorage.setItem("user_profile_name", name);
        localStorage.setItem("user_profile_email", user.primaryEmailAddress?.emailAddress || "");
        fetchUserData();
      }
    } else {
      const logged = localStorage.getItem("user_logged_in") === "true";
      setIsLoggedIn(logged);
      const savedName = localStorage.getItem("user_profile_name");
      const savedEmail = localStorage.getItem("user_profile_email");
      if (savedName) setUserName(savedName);
      if (savedEmail) setUserEmail(savedEmail);
      const plan = localStorage.getItem("user_plan") as PlanType;
      if (plan) setUserPlan(plan);
      const used = localStorage.getItem("user_tasks_used_today");
      if (used) setTasksUsed(parseInt(used, 10));
    }
  }, [isLoaded, isSignedIn, user, router]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("user_profile_name", userName);
    localStorage.setItem("user_profile_email", userEmail);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleUpgradePlan = async (plan: PlanType) => {
    if (plan === userPlan) return;
    
    if (userPlan === "free") {
      if (plan !== "free") {
        await triggerCheckout(plan, billingInterval);
      }
    } else {
      setIsUpgrading(true);
      try {
        const res = await fetch("/api/billing-portal");
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
          } else {
            alert("Billing portal URL not found. Please try again.");
          }
        } else {
          alert("Failed to load billing portal. Please manage your subscription via email or try again later.");
        }
      } catch (err) {
        console.error("Billing portal redirect error:", err);
      } finally {
        setIsUpgrading(false);
      }
    }
  };

  const handleSignOut = async () => {
    localStorage.setItem("user_logged_in", "false");
    setLocalPlan("free");
    await clerk.signOut();
    router.push("/");
  };

  const deleteFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const deleteReport = (id: string) => setReports(prev => prev.filter(r => r.id !== id));
  const deleteEvidence = (id: string) => setEvidence(prev => prev.filter(e => e.id !== id));
  const deleteTemplate = (id: string) => setTemplates(prev => prev.filter(t => t.id !== id));
  const deleteBatchJob = (id: string) => setBatchJobs(prev => prev.filter(b => b.id !== id));

  if (!isLoggedIn) return null;

  const currentPlanConfig = PLANS[userPlan];
  const limit = getLocalTasksLimit(userPlan);
  const percentUsed = Math.min(100, (tasksUsed / limit) * 100);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
      
      {/* Header navbar */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-gray-950/40 relative z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-85">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              DocuSafe PDF
            </span>
          </Link>
          <span className="text-gray-700 hidden sm:inline">|</span>
          <span className="text-xs text-gray-500 hidden sm:inline">User Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/all-tools"
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1"
          >
            All Tools
          </Link>
          <UserButton afterSignOutUrl="/" />
          <button
            onClick={handleSignOut}
            className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-all hover:scale-105 active:scale-95"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Layout Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User size={14} />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{userName}</p>
                <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-gray-500 font-bold uppercase tracking-wider">Plan</span>
              <span className={`px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                userPlan === "free"
                  ? "bg-green-500/15 text-green-400 border border-green-500/10"
                  : userPlan === "pro"
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/10"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/10"
              }`}>
                {userPlan}
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1 text-xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "overview" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Activity size={14} /> Overview
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "reports" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FileText size={14} /> Privacy Reports ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab("evidence")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "evidence" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ShieldCheck size={14} /> Evidence Records ({evidence.length})
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "templates" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Bookmark size={14} /> Stamp Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab("batch")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "batch" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FolderArchive size={14} /> Batch Jobs ({batchJobs.length})
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "billing" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <CreditCard size={14} /> Billing &amp; Subscription
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === "settings" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Settings size={14} /> Settings
            </button>
          </nav>
        </aside>

        {/* Tab Workspace Panel */}
        <main className="flex-1 bg-white/[0.01] border border-white/5 p-6 rounded-3xl backdrop-blur-md min-h-[480px]">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Overview Statistics</h2>
                <p className="text-[11px] text-gray-500">Real-time status of your task allocations and limits.</p>
              </div>

              {/* Tasks Limit Utilization Card */}
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">Task Limit Consumption</p>
                    <p className="text-[10px] text-gray-500">
                      {userPlan === "free" ? "Daily allocation reset" : "Monthly billing cycle limit"}
                    </p>
                  </div>
                  <p className="font-extrabold text-indigo-400">
                    {userPlan === "free" 
                      ? `${tasksUsed} of 5 free tasks used today` 
                      : `${limit - tasksUsed} of ${limit} monthly tasks remaining`}
                  </p>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${percentUsed}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-[10px] text-gray-500">
                  <p>Max file upload size: <strong className="text-gray-300">{currentPlanConfig.maxFileSize}</strong></p>
                  <p>Max page length per file: <strong className="text-gray-300">{currentPlanConfig.maxPages} pages</strong></p>
                </div>
              </div>

              {/* Recent Files List */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-gray-300">Recent Processed Files</h3>
                {files.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No files processed recently.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-indigo-400 shrink-0" />
                          <div className="truncate max-w-[200px] sm:max-w-xs">
                            <p className="font-semibold text-white truncate">{file.name}</p>
                            <p className="text-[9px] text-gray-500">{file.size} · {file.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[9px] font-bold">
                            {file.status}
                          </span>
                          <button onClick={() => deleteFile(file.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upgrade Promo Card */}
              {userPlan !== "business" && (
                <div className="p-5 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-400" /> Unlock Advanced Tools &amp; Batch Jobs
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed max-w-sm">
                      Upgrade your plan to unlock Evidence Lockers, Ink Savers, character Diff timelines, and process up to 250 files simultaneously.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("billing")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0"
                  >
                    View Billing Options
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRIVACY REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white font-medium">Privacy Audit Reports</h2>
                <p className="text-[11px] text-gray-500">History of metadata leaks, tracking links, and form fields sanitized.</p>
              </div>

              {reports.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No reports found.</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div key={rep.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-white truncate max-w-xs">{rep.name}</p>
                        <p className="text-[10px] text-gray-500">Audited on {rep.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-bold ${rep.score === 100 ? "text-green-400" : "text-yellow-400"}`}>
                            Score: {rep.score}/100
                          </p>
                          <p className="text-[9px] text-gray-500">{rep.issues} issues flagged</p>
                        </div>
                        <button onClick={() => deleteReport(rep.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVIDENCE RECORDS */}
          {activeTab === "evidence" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Evidence Locker Logs</h2>
                <p className="text-[11px] text-gray-500">SHA-256 integrity receipts and verification records generated.</p>
              </div>

              {evidence.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No evidence records saved.</p>
              ) : (
                <div className="space-y-3">
                  {evidence.map((ev) => (
                    <div key={ev.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 text-xs relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white truncate max-w-xs">{ev.name}</p>
                          <p className="text-[9px] text-gray-500">Locked on {ev.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Download Record">
                            <Download size={12} />
                          </button>
                          <button onClick={() => deleteEvidence(ev.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] text-green-400 break-all select-all">
                        SHA-256: {ev.hash}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Signature Placement Templates</h2>
                <p className="text-[11px] text-gray-500">Page coordinate coordinates mapped to template documents.</p>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No templates created.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map((temp) => (
                    <div key={temp.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-white">{temp.name}</p>
                        <p className="text-[9px] text-gray-500">Created: {temp.date}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5">
                        <span>{temp.signers} Boxes · Page {temp.page}</span>
                        <button onClick={() => deleteTemplate(temp.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BATCH JOBS */}
          {activeTab === "batch" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Batch Job Reports</h2>
                <p className="text-[11px] text-gray-500">Logs of multi-file package zip compressions.</p>
              </div>

              {batchJobs.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No batch jobs logged.</p>
              ) : (
                <div className="space-y-3">
                  {batchJobs.map((job) => (
                    <div key={job.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{job.name}</p>
                        <p className="text-[10px] text-gray-500">{job.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[9px] font-bold">
                          {job.status}
                        </span>
                        <button onClick={() => deleteBatchJob(job.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: BILLING */}
          {activeTab === "billing" && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Subscription Management</h2>
                <p className="text-[11px] text-gray-500">Re-evaluate pricing tiers or switch plans instantly.</p>
              </div>

              {userPlan !== "free" && (
                <div className="p-5 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Manage Billing &amp; Subscriptions</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Update your payment method, view invoices, download billing history, or cancel your active subscription in our customer portal.
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpgradePlan("free")}
                    disabled={isUpgrading || isLoadingCheckout}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer border-none"
                  >
                    {isUpgrading ? "Loading Portal..." : "Open Billing Portal"}
                  </button>
                </div>
              )}

              {/* Billing Toggle */}
              <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex max-w-[200px] text-[10px]">
                <button onClick={() => setBillingInterval("monthly")} className={`flex-1 py-1 rounded-lg font-bold transition-all border-none cursor-pointer ${billingInterval === "monthly" ? "bg-white/10 text-white" : "text-gray-400 bg-transparent"}`}>Monthly</button>
                <button onClick={() => setBillingInterval("yearly")} className={`flex-1 py-1 rounded-lg font-bold transition-all border-none cursor-pointer ${billingInterval === "yearly" ? "bg-white/10 text-white" : "text-gray-400 bg-transparent"}`}>Yearly</button>
              </div>

              {/* Switch Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["free", "pro", "business"] as PlanType[]).map((plan) => {
                  const cfg = PLANS[plan];
                  const isCurrent = plan === userPlan;
                  return (
                    <div key={plan} className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 text-xs ${
                      isCurrent ? "bg-indigo-600/[0.02] border-indigo-500/30 shadow-lg" : "bg-white/[0.01] border-white/5"
                    }`}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white uppercase tracking-wider text-[10px]">{cfg.name}</p>
                          {isCurrent && <span className="bg-indigo-500 text-white text-[7px] font-black uppercase px-1 rounded">Active</span>}
                        </div>
                        <p className="text-xl font-extrabold text-white">
                          {plan === "free" ? "$0" : billingInterval === "monthly" ? cfg.price : `$${plan === "pro" ? "6" : "20"}/mo`}
                        </p>
                        <p className="text-[10px] text-gray-500">{cfg.taskLimit} tasks / month</p>
                      </div>
                      
                      <button
                        onClick={() => handleUpgradePlan(plan)}
                        disabled={isCurrent || isUpgrading || isLoadingCheckout}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-colors border-none cursor-pointer ${
                          isCurrent
                            ? "bg-white/5 border border-white/10 text-gray-500 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        {isCurrent ? "Current Plan" : isUpgrading || isLoadingCheckout ? "Loading..." : "Switch Plan"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {(isUpgrading || isLoadingCheckout) && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs flex items-center justify-center gap-2 animate-pulse">
                  <RefreshCw size={14} className="animate-spin text-indigo-400" />
                  <span>Connecting to secure checkout/portal...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === "settings" && (
            <form onSubmit={handleSaveSettings} className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">User Profile &amp; Preferences</h2>
                <p className="text-[11px] text-gray-500">Configure global preferences and local storage states.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                {saveSuccess ? (
                  <p className="text-xs text-green-400 font-semibold flex items-center gap-1">
                    <Check size={14} /> Preferences updated successfully!
                  </p>
                ) : (
                  <div />
                )}
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/15">
                  Save Changes
                </button>
              </div>
            </form>
          )}

        </main>

      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

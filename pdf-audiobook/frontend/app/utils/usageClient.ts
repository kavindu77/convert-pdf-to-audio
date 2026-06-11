import { useUsageStore } from "./useUsageStore";

export interface UsageCheckResult {
  allowed: boolean;
  jobToken?: string;
  jobId?: string;
  taskCost?: number;
  isProTrial?: boolean;
  error?: string;
}

export async function verifyUsageAndGetToken({
  toolSlug,
  toolName,
  fileSizeMb,
  pageCount,
  fileCount = 1,
}: {
  toolSlug: string;
  toolName: string;
  fileSizeMb: number;
  pageCount: number;
  fileCount?: number;
}): Promise<UsageCheckResult> {
  try {
    const jobId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const res = await fetch("/api/usage/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolSlug,
        fileSizeMb,
        pageCount,
        fileCount,
        jobId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errCode = errData.error || "ACCESS_DENIED";
      const { openGate } = useUsageStore.getState();

      if (errCode === "UPGRADE_REQUIRED") {
        const bizTools = [
          "timeline",
          "delivery-packager",
          "smart-rename",
          "signature-positions",
          "stamp-consistency",
          "form-extractor",
          "pdf-to-audio"
        ];
        const isBiz = bizTools.includes(toolSlug);
        openGate(isBiz ? "biz-gate" : "pro-gate", toolName);
      } else if (errCode === "TRIAL_LIMIT_REACHED") {
        openGate("pro-trial-limit", toolName);
      } else if (errCode === "FILE_TOO_LARGE") {
        openGate("file-too-large", toolName, { currentVal: fileSizeMb.toFixed(1) });
      } else if (errCode === "PAGE_LIMIT_EXCEEDED") {
        openGate("pages-exceeded", toolName, { currentVal: pageCount });
      } else if (errCode === "BATCH_LIMIT_EXCEEDED") {
        openGate("batch-limit-exceeded", toolName, { currentVal: fileCount });
      } else if (errCode === "DAILY_LIMIT_REACHED" || errCode === "MONTHLY_LIMIT_REACHED") {
        openGate("limit-reached", toolName);
      }
      
      return { allowed: false, error: errCode };
    }

    const data = await res.json();
    return {
      allowed: true,
      jobToken: data.jobToken,
      jobId: data.jobId,
      taskCost: data.taskCost,
      isProTrial: data.isProTrial,
    };
  } catch (err: any) {
    console.error("verifyUsageAndGetToken failed:", err);
    return { allowed: false, error: "NETWORK_ERROR" };
  }
}

export async function recordUsageSuccess({
  jobToken,
  jobId,
  toolSlug,
  fileSizeMb,
  pageCount,
  fileCount = 1,
}: {
  jobToken: string;
  jobId: string;
  toolSlug: string;
  fileSizeMb: number;
  pageCount: number;
  fileCount?: number;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/usage/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobToken,
        jobId,
        toolSlug,
        fileSizeMb,
        pageCount,
        fileCount,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("recordUsageSuccess failed:", err);
    return false;
  }
}

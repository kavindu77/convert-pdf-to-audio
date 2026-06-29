// usageClient.ts — Ad-supported model: all tools are free, no plan gating.

export interface UsageCheckResult {
  allowed: boolean;
  jobToken?: string;
  jobId?: string;
  taskCost?: number;
  isProTrial?: boolean;
  error?: string;
}

/**
 * All tools are now free. Always returns allowed: true.
 * Parameters are accepted for API compatibility but ignored.
 */
export async function verifyUsageAndGetToken(_params: {
  toolSlug: string;
  toolName: string;
  fileSizeMb: number;
  pageCount: number;
  fileCount?: number;
}): Promise<UsageCheckResult> {
  return { allowed: true };
}

/**
 * No-op — usage recording is no longer required.
 */
export async function recordUsageSuccess(_params: {
  jobToken: string;
  jobId: string;
  toolSlug: string;
  fileSizeMb: number;
  pageCount: number;
  fileCount?: number;
}): Promise<boolean> {
  return true;
}

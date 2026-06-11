import crypto from "crypto";
import { db } from "./db";
import { TOOLS, PLANS_CONFIG } from "./tools";

/**
 * Calculates user's consumed tasks in the current active period.
 * - Free: sum task costs incurred today (since 00:00 UTC).
 * - Paid: sum task costs incurred in the current calendar month (in UTC).
 */
export async function getUsageForCurrentPeriod(userId: string, plan: string) {
  const now = new Date();
  let fromDate: Date;

  if (plan === "free") {
    // Start of today in UTC
    fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else {
    // Start of the month in UTC
    fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const result = await db.usageEvent.aggregate({
    where: {
      userId,
      status: "success",
      createdAt: {
        gte: fromDate,
      },
    },
    _sum: {
      taskCost: true,
    },
  });

  const used = result._sum.taskCost ?? 0;

  return {
    dailyTasksUsed: plan === "free" ? used : 0,
    monthlyTasksUsed: plan !== "free" ? used : 0,
    totalTasksUsed: used,
  };
}

/**
 * Validates plan level, file sizes, page counts, and task allocations.
 * On success, yields a single-use token valid for 10 minutes.
 */
export async function checkToolAccess({
  userId,
  toolSlug,
  fileSizeMb,
  pageCount,
  fileCount = 1,
  jobId,
}: {
  userId: string;
  toolSlug: string;
  fileSizeMb: number;
  pageCount: number;
  fileCount?: number;
  jobId?: string;
}) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("UNAUTHORIZED");

  const tool = TOOLS.find((t) => t.slug === toolSlug);
  if (!tool) throw new Error("TOOL_NOT_FOUND");

  const planRank = {
    free: 0,
    pro: 1,
    business: 2,
  };

  const userPlan = (user.plan || "free") as "free" | "pro" | "business";

  if (planRank[userPlan] < planRank[tool.minPlan]) {
    throw new Error("UPGRADE_REQUIRED");
  }

  const limits = PLANS_CONFIG[userPlan];

  if (fileSizeMb > limits.maxFileSizeMb) {
    throw new Error("FILE_TOO_LARGE");
  }

  if (pageCount > limits.maxPages) {
    throw new Error("PAGE_LIMIT_EXCEEDED");
  }

  if (fileCount > limits.batchLimit) {
    throw new Error("BATCH_LIMIT_EXCEEDED");
  }

  const taskCost = tool.taskCost * fileCount;
  const usage = await getUsageForCurrentPeriod(user.id, userPlan);

  if (userPlan === "free") {
    if (usage.dailyTasksUsed + taskCost > limits.dailyTasks!) {
      throw new Error("DAILY_LIMIT_REACHED");
    }
  } else {
    if (usage.monthlyTasksUsed + taskCost > limits.monthlyTasks!) {
      throw new Error("MONTHLY_LIMIT_REACHED");
    }
  }

  // Generate a short-lived cryptographically secure random token and a unique jobId
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const finalJobId = jobId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes expiration

  await db.jobToken.create({
    data: {
      tokenHash,
      userId: user.id,
      toolSlug,
      jobId: finalJobId,
      taskCost,
      expiresAt,
    },
  });

  return {
    allowed: true,
    jobToken: rawToken, // Return the raw token to the client
    jobId: finalJobId,
    taskCost,
    plan: user.plan,
  };
}

/**
 * Consumes the pre-allocated JobToken and registers a successful usage event.
 * Prevents client-side manipulation of task logging by checking token validity.
 */
export async function recordUsage({
  rawToken,
  jobId,
  toolSlug,
  userId,
  fileSizeMb,
  pageCount,
  fileCount = 1,
}: {
  rawToken: string;
  jobId: string;
  toolSlug: string;
  userId: string;
  fileSizeMb: number;
  pageCount: number;
  fileCount?: number;
}) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const token = await db.jobToken.findUnique({
    where: { tokenHash },
  });

  if (!token) {
    throw new Error("INVALID_TOKEN");
  }

  if (token.isUsed) {
    throw new Error("TOKEN_ALREADY_USED");
  }

  if (token.expiresAt < new Date()) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (token.userId !== userId) {
    throw new Error("UNAUTHORIZED_TOKEN_USER");
  }

  if (token.jobId !== jobId) {
    throw new Error("INVALID_JOB_ID");
  }

  if (token.toolSlug !== toolSlug) {
    throw new Error("INVALID_TOOL_SLUG");
  }

  return await db.$transaction(async (tx) => {
    // 1. Mark token as consumed
    await tx.jobToken.update({
      where: { id: token.id },
      data: { isUsed: true },
    });

    // 2. Register usage record
    return await tx.usageEvent.create({
      data: {
        userId: token.userId,
        toolSlug: token.toolSlug,
        taskCost: token.taskCost,
        fileSizeMb,
        pageCount,
        fileCount,
        status: "success",
      },
    });
  });
}

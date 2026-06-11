import { getCurrentUser } from "@/lib/auth";
import { getUsageForCurrentPeriod } from "@/lib/usage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUsageForCurrentPeriod(user.id, user.plan);

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      planExpiresAt: user.planExpiresAt,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      usage: {
        dailyTasksUsed: usage.dailyTasksUsed,
        monthlyTasksUsed: usage.monthlyTasksUsed,
      },
    });
  } catch (err: any) {
    console.error("User route error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

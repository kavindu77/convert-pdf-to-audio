import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.lsSubscriptionId) {
      return Response.json({ error: "No active subscription found" }, { status: 400 });
    }

    // Retrieve the subscription details to get a fresh customer portal URL
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${user.lsSubscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LS_API_KEY}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Failed to fetch LemonSqueezy subscription:", err);
      return Response.json(
        { error: "Could not retrieve billing portal link" },
        { status: 500 }
      );
    }

    const subscription = await res.json();
    const portalUrl = subscription.data?.attributes?.urls?.customer_portal;

    if (!portalUrl) {
      return Response.json(
        { error: "Customer portal URL not provided by billing provider" },
        { status: 500 }
      );
    }

    return Response.json({ url: portalUrl });
  } catch (err: any) {
    console.error("Billing portal error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

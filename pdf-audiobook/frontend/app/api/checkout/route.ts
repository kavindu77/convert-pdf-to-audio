import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan, billingCycle } = body;

    if (!["pro", "business"].includes(plan)) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!["monthly", "yearly"].includes(billingCycle)) {
      return Response.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    // Variant mapping securely performed server-side
    const variants = {
      pro_monthly: process.env.LS_PRO_MONTHLY_VARIANT_ID,
      pro_yearly: process.env.LS_PRO_YEARLY_VARIANT_ID,
      business_monthly: process.env.LS_BUSINESS_MONTHLY_VARIANT_ID,
      business_yearly: process.env.LS_BUSINESS_YEARLY_VARIANT_ID,
    };

    const key = `${plan}_${billingCycle}` as keyof typeof variants;
    const variantId = variants[key];

    if (!variantId) {
      console.error(`Missing variant ID configuration for key: ${key}`);
      return Response.json(
        { error: "Billing configuration is missing on the server" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LS_API_KEY}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email,
              name: user.name || "",
              custom: {
                user_id: user.id,
                selected_plan: plan,
                billing_cycle: billingCycle,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: process.env.LS_STORE_ID,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errPayload = await res.json().catch(() => ({}));
      console.error("LemonSqueezy checkout creation failed:", errPayload);
      return Response.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    const checkout = await res.json();
    return Response.json({
      url: checkout.data.attributes.url,
    });
  } catch (err: any) {
    console.error("Checkout route error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

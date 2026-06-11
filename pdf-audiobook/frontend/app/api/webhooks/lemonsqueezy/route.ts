import crypto from "crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Derives the tier level from the LemonSqueezy variant ID.
 */
function derivePlan(variantId: string | number): "pro" | "business" {
  const id = String(variantId);
  const proIds = [
    process.env.LS_PRO_MONTHLY_VARIANT_ID,
    process.env.LS_PRO_YEARLY_VARIANT_ID,
  ];
  const businessIds = [
    process.env.LS_BUSINESS_MONTHLY_VARIANT_ID,
    process.env.LS_BUSINESS_YEARLY_VARIANT_ID,
  ];

  if (proIds.includes(id)) return "pro";
  if (businessIds.includes(id)) return "business";

  throw new Error(`Unknown LemonSqueezy variant ID: ${id}`);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  const secret = process.env.LS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing LS_WEBHOOK_SECRET environment variable");
    return new Response("Webhook Secret Missing", { status: 500 });
  }

  // Verify HMAC signature
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const sigBuffer = Buffer.from(signature, "utf8");

  if (
    digest.length !== sigBuffer.length ||
    !crypto.timingSafeEqual(digest, sigBuffer)
  ) {
    return new Response("Unauthorized Signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  const userId = customData?.user_id;

  const resourceType = payload.data.type;
  const resourceId = String(payload.data.id);
  const attributes = payload.data.attributes;

  const eventKey = `${eventName}:${resourceType}:${resourceId}:${attributes.updated_at ?? attributes.created_at ?? ""}`;

  // 1. Idempotency Check
  const exists = await db.webhookEvent.findUnique({
    where: { eventKey },
  });

  if (exists && exists.status === "processed") {
    return new Response("OK (already processed)");
  }

  // Create or update webhook event to "processing"
  const webhookEvent = await db.webhookEvent.upsert({
    where: { eventKey },
    update: { status: "processing" },
    create: {
      provider: "lemonsqueezy",
      eventKey,
      eventName,
      resourceType,
      resourceId,
      rawPayload: payload,
      status: "processing",
    },
  });

  if (!userId) {
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "failed" },
    });
    return new Response("Missing user ID", { status: 400 });
  }

  try {
    // 2. Perform user plan updates inside a transaction
    await db.$transaction(async (tx) => {
      switch (eventName) {
        case "subscription_created": {
          const plan = derivePlan(attributes.variant_id);

          await tx.user.update({
            where: { id: userId },
            data: {
              plan,
              subscriptionStatus: attributes.status,
              lsCustomerId: String(attributes.customer_id),
              lsSubscriptionId: String(resourceId),
              lsSubscriptionItemId: String(attributes.first_subscription_item?.id ?? ""),
              planExpiresAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
              cancelAtPeriodEnd: false,
            },
          });

          await tx.subscription.upsert({
            where: { providerSubscriptionId: String(resourceId) },
            update: {
              plan,
              status: attributes.status,
              variantId: String(attributes.variant_id),
              renewsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
              endsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
            },
            create: {
              userId,
              provider: "lemonsqueezy",
              providerCustomerId: String(attributes.customer_id),
              providerSubscriptionId: String(resourceId),
              providerSubscriptionItemId: String(attributes.first_subscription_item?.id ?? ""),
              plan,
              status: attributes.status,
              variantId: String(attributes.variant_id),
              renewsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
              endsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
            },
          });
          break;
        }

        case "subscription_updated": {
          const plan = derivePlan(attributes.variant_id);

          await tx.user.update({
            where: { id: userId },
            data: {
              plan,
              subscriptionStatus: attributes.status,
              planExpiresAt: attributes.renews_at
                ? new Date(attributes.renews_at)
                : attributes.ends_at
                ? new Date(attributes.ends_at)
                : null,
              cancelAtPeriodEnd: Boolean(attributes.ends_at),
            },
          });

          await tx.subscription.update({
            where: { providerSubscriptionId: String(resourceId) },
            data: {
              plan,
              status: attributes.status,
              variantId: String(attributes.variant_id),
              renewsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
              endsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
            },
          });
          break;
        }

        case "subscription_payment_success": {
          await tx.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "active",
              planExpiresAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
            },
          });
          break;
        }

        case "subscription_payment_failed": {
          await tx.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "past_due",
            },
          });
          break;
        }

        case "subscription_cancelled": {
          await tx.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: attributes.status,
              cancelAtPeriodEnd: true,
              planExpiresAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
            },
          });
          break;
        }

        case "subscription_expired": {
          await tx.user.update({
            where: { id: userId },
            data: {
              plan: "free",
              subscriptionStatus: "expired",
              planExpiresAt: null,
              cancelAtPeriodEnd: false,
            },
          });
          break;
        }

        case "subscription_resumed": {
          const plan = derivePlan(attributes.variant_id);

          await tx.user.update({
            where: { id: userId },
            data: {
              plan,
              subscriptionStatus: attributes.status,
              cancelAtPeriodEnd: false,
              planExpiresAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
            },
          });
          break;
        }
      }
    });

    // 3. Mark event as processed successfully
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
    });

    return new Response("OK");
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    await db.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "failed" },
    });
    return new Response("Failed to process event", { status: 500 });
  }
}

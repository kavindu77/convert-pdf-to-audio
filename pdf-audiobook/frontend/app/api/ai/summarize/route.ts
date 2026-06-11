import { getCurrentUser } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";
import { db } from "@/lib/db";
import crypto from "crypto";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Require logged-in Clerk user and sync to Prisma
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate request body
    const body = await req.json();
    const {
      jobToken,
      jobId,
      fileSizeMb,
      pageCount,
      documentText,
      summaryLength,
      summaryStyle,
    } = body;

    if (!jobToken || !jobId || fileSizeMb === undefined || pageCount === undefined) {
      return Response.json({ error: "Missing required billing parameters" }, { status: 400 });
    }

    if (!documentText) {
      return Response.json({ error: "Document text cannot be empty" }, { status: 400 });
    }

    const validLengths = ["brief", "standard", "detailed"];
    const validStyles = ["bullets", "paragraph", "takeaways", "keyTakeaways"];

    const length = validLengths.includes(summaryLength) ? summaryLength : "standard";
    const style = validStyles.includes(summaryStyle) ? summaryStyle : "bullets";

    // 3. Enforce Pro or Business plan (or temporary Pro trials for Free users)
    const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
    if (user.plan !== "pro" && user.plan !== "business") {
      if (!paymentsEnabled) {
        const proToolSlugs = TOOLS.filter((t) => t.minPlan === "pro").map((t) => t.slug);
        const proTrialsUsed = await db.usageEvent.count({
          where: {
            userId: user.id,
            toolSlug: { in: proToolSlugs },
            status: "success",
          },
        });
        if (proTrialsUsed >= 2) {
          return Response.json({ error: "Trial limit reached. Please upgrade to Pro." }, { status: 403 });
        }
      } else {
        return Response.json({ error: "Upgrade required. Summarizer requires a Pro or Business plan." }, { status: 403 });
      }
    }

    // 4. Verify the JobToken matches and is valid before calling AI backend
    const tokenHash = crypto.createHash("sha256").update(jobToken).digest("hex");
    const tokenRecord = await db.jobToken.findUnique({
      where: { tokenHash },
    });

    if (
      !tokenRecord ||
      tokenRecord.isUsed ||
      tokenRecord.expiresAt < new Date() ||
      tokenRecord.userId !== user.id ||
      tokenRecord.jobId !== jobId ||
      tokenRecord.toolSlug !== "summarize"
    ) {
      return Response.json({ error: "Invalid or expired task token" }, { status: 403 });
    }

    // 5. Ensure Groq API Key is configured on the server
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not defined in environment variables.");
      return Response.json(
        { error: "AI tools are temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // 6. Limit text length to prevent abuse (max 20,000 characters)
    const sanitizedText = documentText.slice(0, 20000);

    // 7. Call Groq securely from the server
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a professional research assistant that summarizes documents. Generate a clear, concise, and structured summary of the document text provided.
Guidelines:
- Length requested: ${length} (brief: 3-5 key sentences, standard: 2-3 well-structured paragraphs, detailed: a comprehensive breakdown)
- Style requested: ${style === "takeaways" || style === "keyTakeaways" ? "key takeaways" : style} (bullets: clean list of bullets with bold key phrases, paragraph: natural flowing narrative prose, key takeaways: a structured list of key strategic insights and conclusions)
- Focus on accuracy and key findings. Avoid introduction fluff. Do not refer to the text as "the provided text", write direct insights.`,
          },
          {
            role: "user",
            content: `Here is the document content:\n\n${sanitizedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!groqResponse.ok) {
      const errJson = await groqResponse.json().catch(() => ({}));
      console.error("Groq API error response:", errJson);
      return Response.json(
        { error: "AI tools are temporarily unavailable. Please try again later." },
        { status: 502 }
      );
    }

    const data = await groqResponse.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      return Response.json(
        { error: "AI backend yielded an empty summary. Please try again." },
        { status: 502 }
      );
    }

    // 8. Record usage inside Prisma ONLY after successful AI completion
    await recordUsage({
      rawToken: jobToken,
      jobId,
      toolSlug: "summarize",
      userId: user.id,
      fileSizeMb: parseFloat(fileSizeMb),
      pageCount: parseInt(pageCount, 10),
      fileCount: 1,
    });

    // 9. Return clean JSON to client
    return Response.json({ summary });
  } catch (err: any) {
    console.error("AI Summarize route error:", err);
    return Response.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}

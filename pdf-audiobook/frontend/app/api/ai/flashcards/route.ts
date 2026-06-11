import { getCurrentUser } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";
import { db } from "@/lib/db";
import crypto from "crypto";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

interface Flashcard {
  front: string;
  back: string;
}

function tryParseFlashcards(text: string): Flashcard[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => item && typeof item.front === "string" && typeof item.back === "string");
    }
    if (parsed && Array.isArray(parsed.flashcards)) {
      return parsed.flashcards.filter((item: any) => item && typeof item.front === "string" && typeof item.back === "string");
    }
    return null;
  } catch (e) {
    // Attempt parsing by regex extraction of array bracket [ ... ]
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => item && typeof item.front === "string" && typeof item.back === "string");
        }
      } catch (_) {}
    }
    // Attempt parsing by regex extraction of flashcards object key { "flashcards": ... }
    const objectMatch = text.match(/\{\s*"flashcards"[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed && Array.isArray(parsed.flashcards)) {
          return parsed.flashcards.filter((item: any) => item && typeof item.front === "string" && typeof item.back === "string");
        }
      } catch (_) {}
    }
    return null;
  }
}

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
      count,
      difficulty,
    } = body;

    if (!jobToken || !jobId || fileSizeMb === undefined || pageCount === undefined) {
      return Response.json({ error: "Missing required billing parameters" }, { status: 400 });
    }

    if (!documentText) {
      return Response.json({ error: "Document text cannot be empty" }, { status: 400 });
    }

    // Enforce count limits (between 5 and 50)
    let parsedCount = parseInt(count, 10);
    if (isNaN(parsedCount) || parsedCount < 5 || parsedCount > 50) {
      parsedCount = 10;
    }

    const validDiffs = ["easy", "medium", "hard", "basic", "intermediate", "advanced"];
    const diff = validDiffs.includes(difficulty) ? difficulty : "medium";

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
        return Response.json({ error: "Upgrade required. Flashcards requires a Pro or Business plan." }, { status: 403 });
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
      tokenRecord.toolSlug !== "flashcards"
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
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an expert educator. You generate study flashcards from the provided document text.
Return a JSON object containing a "flashcards" array. Each item in the array must be an object with:
- "front": A concise, clear question or term.
- "back": A summary, definition, or explanation (under 3 sentences).

Generate exactly ${parsedCount} cards of ${diff} difficulty.
Return ONLY valid JSON in this structure: { "flashcards": [ { "front": "...", "back": "..." } ] }`,
          },
          {
            role: "user",
            content: `Create flashcards for this text:\n\n${sanitizedText}`,
          },
        ],
        temperature: 0.5,
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: "AI backend yielded an empty response. Please try again." },
        { status: 502 }
      );
    }

    // Parse and validate/repair JSON
    const cards = tryParseFlashcards(content);
    if (!cards || cards.length === 0) {
      console.error("Failed to parse flashcards from response content:", content);
      return Response.json(
        { error: "AI backend returned invalid data format. Please try again." },
        { status: 502 }
      );
    }

    // 8. Record usage inside Prisma ONLY after successful AI completion
    await recordUsage({
      rawToken: jobToken,
      jobId,
      toolSlug: "flashcards",
      userId: user.id,
      fileSizeMb: parseFloat(fileSizeMb),
      pageCount: parseInt(pageCount, 10),
      fileCount: 1,
    });

    // 9. Return clean JSON array to client
    return Response.json(cards);
  } catch (err: any) {
    console.error("AI Flashcards route error:", err);
    return Response.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

function parseFlashcards(text: string): { front: string; back: string }[] | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((item: unknown) => item && typeof (item as any).front === "string" && typeof (item as any).back === "string");
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentText, count = 10, difficulty = "intermediate" } = body;

    if (!documentText) {
      return Response.json({ error: "Document text cannot be empty" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not defined in environment variables.");
      return Response.json({ error: "AI tools are temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const sanitizedText = documentText.slice(0, 20000);
    const cardCount = Math.min(Math.max(parseInt(String(count), 10) || 10, 5), 30);

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
            content: `You are an expert educator creating study flashcards. Generate exactly ${cardCount} flashcards at ${difficulty} difficulty level from the document content. Return ONLY a valid JSON array with this exact format:\n[{"front": "question or concept", "back": "answer or definition"}, ...]\nDo not include any explanation or text outside the JSON array.`,
          },
          {
            role: "user",
            content: `Create ${cardCount} ${difficulty} flashcards from this document:\n\n${sanitizedText}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });

    if (!groqResponse.ok) {
      const errJson = await groqResponse.json().catch(() => ({}));
      console.error("Groq API error:", errJson);
      return Response.json({ error: "AI tools are temporarily unavailable. Please try again later." }, { status: 502 });
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json({ error: "AI backend yielded an empty response. Please try again." }, { status: 502 });
    }

    const cards = parseFlashcards(content);
    if (!cards || cards.length === 0) {
      return Response.json({ error: "Could not parse flashcards from AI response. Please try again." }, { status: 502 });
    }

    return Response.json(cards);
  } catch (err: any) {
    console.error("AI Flashcards route error:", err);
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

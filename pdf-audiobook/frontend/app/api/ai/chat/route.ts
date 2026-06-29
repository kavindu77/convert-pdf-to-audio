export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentText, question, chatHistory } = body;

    if (!documentText || !question) {
      return Response.json({ error: "Question and document text cannot be empty" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not defined in environment variables.");
      return Response.json(
        { error: "AI tools are temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const sanitizedText = documentText.slice(0, 20000);

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
            content: `You are an AI assistant for answering questions about a PDF document. Answer accurately based only on the document content below. If the information is not in the document, say so clearly.\n\nDocument content:\n${sanitizedText}`,
          },
          ...(chatHistory || []),
          { role: "user", content: question },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errJson = await groqResponse.json().catch(() => ({}));
      console.error("Groq API error:", errJson);
      return Response.json({ error: "AI tools are temporarily unavailable. Please try again later." }, { status: 502 });
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return Response.json({ error: "AI backend yielded an empty response. Please try again." }, { status: 502 });
    }

    return Response.json({ content: reply });
  } catch (err: any) {
    console.error("AI Chat route error:", err);
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentText, summaryLength, summaryStyle } = body;

    if (!documentText) {
      return Response.json({ error: "Document text cannot be empty" }, { status: 400 });
    }

    const validLengths = ["brief", "standard", "detailed"];
    const validStyles = ["bullets", "paragraph", "takeaways", "keyTakeaways"];
    const length = validLengths.includes(summaryLength) ? summaryLength : "standard";
    const style = validStyles.includes(summaryStyle) ? summaryStyle : "bullets";

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not defined in environment variables.");
      return Response.json({ error: "AI tools are temporarily unavailable. Please try again later." }, { status: 503 });
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
            content: `You are a professional research assistant that summarizes documents. Generate a clear, concise, and structured summary.\nLength: ${length} (brief: 3-5 key sentences, standard: 2-3 paragraphs, detailed: comprehensive breakdown)\nStyle: ${style === "takeaways" || style === "keyTakeaways" ? "key takeaways" : style} (bullets: clean bullet list with bold key phrases, paragraph: flowing narrative, key takeaways: strategic insights)\nFocus on accuracy. Do not add introduction fluff.`,
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
      console.error("Groq API error:", errJson);
      return Response.json({ error: "AI tools are temporarily unavailable. Please try again later." }, { status: 502 });
    }

    const data = await groqResponse.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      return Response.json({ error: "AI backend yielded an empty summary. Please try again." }, { status: 502 });
    }

    return Response.json({ summary });
  } catch (err: any) {
    console.error("AI Summarize route error:", err);
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

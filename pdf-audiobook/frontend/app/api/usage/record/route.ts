import { getCurrentUser } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobToken, fileSizeMb, pageCount } = body;

    if (!jobToken || fileSizeMb === undefined || pageCount === undefined) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const result = await recordUsage({
      jobTokenId: jobToken,
      fileSizeMb: parseFloat(fileSizeMb),
      pageCount: parseInt(pageCount, 10),
    });

    return Response.json({ success: true, eventId: result.id });
  } catch (err: any) {
    console.error("Usage record error:", err);
    return Response.json(
      { error: err.message || "Failed to record usage" },
      { status: 400 }
    );
  }
}

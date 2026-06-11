import { getCurrentUser } from "@/lib/auth";
import { recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobToken, jobId, toolSlug, fileSizeMb, pageCount, fileCount } = body;

    if (!jobToken || !jobId || !toolSlug || fileSizeMb === undefined || pageCount === undefined) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const result = await recordUsage({
      rawToken: jobToken,
      jobId,
      toolSlug,
      userId: user.id,
      fileSizeMb: parseFloat(fileSizeMb),
      pageCount: parseInt(pageCount, 10),
      fileCount: fileCount ? parseInt(fileCount, 10) : 1,
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

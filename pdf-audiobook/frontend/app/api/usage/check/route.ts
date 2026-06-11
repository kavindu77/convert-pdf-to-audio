import { getCurrentUser } from "@/lib/auth";
import { checkToolAccess } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { toolSlug, fileSizeMb, pageCount, fileCount, jobId } = body;

    if (!toolSlug || fileSizeMb === undefined || pageCount === undefined) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const access = await checkToolAccess({
      userId: user.id,
      toolSlug,
      fileSizeMb: parseFloat(fileSizeMb),
      pageCount: parseInt(pageCount, 10),
      fileCount: fileCount ? parseInt(fileCount, 10) : 1,
      jobId,
    });

    return Response.json(access);
  } catch (err: any) {
    console.error("Usage check error:", err);
    return Response.json(
      { error: err.message || "Access denied" },
      { status: 403 }
    );
  }
}

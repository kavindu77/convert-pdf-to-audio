import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export async function getCurrentUser() {
  const { userId } = auth();
  if (!userId) return null;

  // Attempt to find the user in the database first
  let dbUser = await db.user.findUnique({
    where: { id: userId },
  });

  // If not found in the DB, sync from Clerk's profile details
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name = clerkUser.fullName || clerkUser.firstName || clerkUser.username || "User";

    dbUser = await db.user.create({
      data: {
        id: userId,
        email,
        name,
        plan: "free",
        subscriptionStatus: "none",
      },
    });
  }

  return dbUser;
}

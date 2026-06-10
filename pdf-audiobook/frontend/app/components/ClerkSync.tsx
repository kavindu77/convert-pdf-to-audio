"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      localStorage.setItem("user_logged_in", "true");
      const name = user.fullName || user.firstName || user.username || "User";
      localStorage.setItem("user_profile_name", name);
      localStorage.setItem("user_profile_email", user.primaryEmailAddress?.emailAddress || "");
    } else {
      localStorage.setItem("user_logged_in", "false");
      localStorage.removeItem("user_profile_name");
      localStorage.removeItem("user_profile_email");
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}

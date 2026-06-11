"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function ClerkSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const syncUser = async () => {
      if (isSignedIn && user) {
        localStorage.setItem("user_logged_in", "true");
        const name = user.fullName || user.firstName || user.username || "User";
        localStorage.setItem("user_profile_name", name);
        localStorage.setItem("user_profile_email", user.primaryEmailAddress?.emailAddress || "");

        try {
          const res = await fetch("/api/user");
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("user_plan", data.plan || "free");
            
            const tasksUsed = data.plan === "free" 
              ? data.usage.dailyTasksUsed 
              : data.usage.monthlyTasksUsed;
            localStorage.setItem("user_tasks_used_today", String(tasksUsed));
            
            // Dispatch event to force other client listeners to re-render
            window.dispatchEvent(new Event("storage"));
          }
        } catch (err) {
          console.error("Failed to sync user plan details from database:", err);
        }
      } else {
        localStorage.setItem("user_logged_in", "false");
        localStorage.setItem("user_plan", "free");
        localStorage.setItem("user_tasks_used_today", "0");
        localStorage.removeItem("user_profile_name");
        localStorage.removeItem("user_profile_email");
        window.dispatchEvent(new Event("storage"));
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return null;
}

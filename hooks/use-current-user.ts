"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // convexUser is undefined both when loading and when not found.
  // If Clerk is loaded but there's no clerkUser, we're not signed in — don't wait for Convex.
  // If Clerk user exists, treat convexUser === undefined as still loading.
  const isLoading = !clerkLoaded || (!!clerkUser && convexUser === undefined);

  return {
    user: convexUser ?? null,
    clerkUser: clerkUser ?? null,
    isLoading,
    isSignedIn: !!clerkUser,
  };
}

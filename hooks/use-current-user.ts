"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

export const useCurrentUser = authDisabled
  ? useCurrentUserDevBypass
  : useCurrentUserWithClerk;

function useCurrentUserDevBypass() {
  const anyUser = useQuery(api.users.getAnyUser, {});
  return {
    user: anyUser ?? null,
    clerkUser: null,
    isLoading: anyUser === undefined,
    isSignedIn: !!anyUser,
  };
}

function useCurrentUserWithClerk() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  const isLoading = !clerkLoaded || (!!clerkUser && convexUser === undefined);

  return {
    user: convexUser ?? null,
    clerkUser: clerkUser ?? null,
    isLoading,
    isSignedIn: !!clerkUser,
  };
}

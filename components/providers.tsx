"use client";

import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

function UserSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const createOrGetUser = useMutation(api.users.createOrGetUser);

  useEffect(() => {
    if (isLoaded && user) {
      createOrGetUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      });
    }
  }, [isLoaded, user, createOrGetUser]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (authDisabled) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ConvexProvider client={convex}>{children}</ConvexProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ClerkProvider>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <UserSync>{children}</UserSync>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  );
}

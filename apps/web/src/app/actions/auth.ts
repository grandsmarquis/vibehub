"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/settings" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

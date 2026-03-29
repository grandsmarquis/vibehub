import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signInWithGitHub } from "@/app/actions/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/settings");
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-base-content/70 text-sm">
        Use GitHub to manage extension tokens and project visibility.
      </p>
      <form action={signInWithGitHub}>
        <button type="submit" className="btn btn-primary w-full">
          Continue with GitHub
        </button>
      </form>
    </div>
  );
}

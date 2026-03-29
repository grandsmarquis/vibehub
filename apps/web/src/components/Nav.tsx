import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

export async function Nav() {
  const session = await auth();

  return (
    <div className="navbar bg-base-200 border-b border-base-300">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl font-semibold tracking-tight">
          Vibehub
        </Link>
      </div>
      <div className="flex-none gap-2">
        {session?.user ? (
          <>
            <Link href="/settings" className="btn btn-ghost btn-sm">
              Settings
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

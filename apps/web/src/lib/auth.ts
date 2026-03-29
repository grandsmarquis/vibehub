import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getPool } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== "github") {
        return false;
      }
      const id = `github:${account.providerAccountId}`;
      const email =
        (profile?.email as string | undefined) ?? user.email ?? null;
      const name = (profile?.name as string | undefined) ?? user.name ?? null;
      const image =
        (profile?.picture as string | undefined) ?? user.image ?? null;
      const pool = getPool();
      await pool.query(
        `INSERT INTO users (id, email, name, image, email_verified)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           email = COALESCE(EXCLUDED.email, users.email),
           name = COALESCE(EXCLUDED.name, users.name),
           image = COALESCE(EXCLUDED.image, users.image)`,
        [id, email, name, image, null],
      );
      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "github" && account.providerAccountId) {
        token.sub = `github:${account.providerAccountId}`;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

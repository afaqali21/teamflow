import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyLogin } from "@/lib/login";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        return verifyLogin(
          credentials,
          (email) => db.user.findUnique({ where: { email } }),
          (password, passwordHash) => bcrypt.compare(password, passwordHash),
        );
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = Boolean(session?.user);
      const pathname = request.nextUrl.pathname;
      const isPublic =
        pathname === "/login" ||
        pathname === "/forgot-password" ||
        pathname === "/set-password";

      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      if (isPublic) {
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.sub === "string") {
        session.user.id = token.sub;
      }
      if (token.role === "ADMIN" || token.role === "MANAGER" || token.role === "EMPLOYEE") {
        session.user.role = token.role;
      }
      return session;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
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
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const parent = await prisma.parent.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!parent) return null;

        const valid = await bcrypt.compare(password, parent.passwordHash);
        if (!valid) return null;

        return { id: parent.id, email: parent.email, name: parent.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.parentId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.parentId as string;
      }
      return session;
    },
  },
});

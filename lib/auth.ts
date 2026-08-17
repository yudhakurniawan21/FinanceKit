import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: appUrl,
  trustedOrigins: [appUrl, "http://localhost:3000"],
  advanced: {
    useSecureCookies: isProd,
    cookiePrefix: "finansialkit",
  },
  // Google diganti via env GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
  // Authorized redirect URI:
  //   http://localhost:3000/api/auth/callback/google
  //   https://<app>.vercel.app/api/auth/callback/google
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
});

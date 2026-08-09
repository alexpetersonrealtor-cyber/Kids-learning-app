import { prisma } from "@/lib/prisma";

/**
 * Signup is closed to the public by default: once any parent account
 * exists, no further signups are allowed. Setting ALLOWED_SIGNUP_EMAILS
 * (comma-separated) overrides this with an explicit allow-list instead,
 * e.g. to let a second parent join without fully reopening signup.
 */
export async function isSignupAllowed(email: string): Promise<boolean> {
  const allowList = (process.env.ALLOWED_SIGNUP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowList.length > 0) {
    return allowList.includes(email.toLowerCase());
  }

  const existingParents = await prisma.parent.count();
  return existingParents === 0;
}

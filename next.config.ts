import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output is what the Dockerfile needs for self-hosting (it
  // copies .next/standalone). On Vercel it conflicts with Vercel's own
  // build/tracing pipeline, so skip it there — Vercel sets VERCEL=1 during
  // its builds.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;

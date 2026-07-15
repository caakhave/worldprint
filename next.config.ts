import type { NextConfig } from "next";
import { validateSupabasePublicUrlForBuild } from "./src/lib/supabase/env";

validateSupabasePublicUrlForBuild();

const cgyNativeAppBuild = process.env.NEXT_PUBLIC_CGY_NATIVE_APP === "1";
const cgyNativeHostedOrigin = process.env.NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN ?? "";

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_CGY_NATIVE_APP: cgyNativeAppBuild ? "1" : "0",
    NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN: cgyNativeHostedOrigin
  },
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;

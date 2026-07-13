import type { NextConfig } from "next";
import { validateSupabasePublicUrlForBuild } from "./src/lib/supabase/env";

validateSupabasePublicUrlForBuild();

const cgyNativeAppBuild = process.env.NEXT_PUBLIC_CGY_NATIVE_APP === "1";

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_CGY_NATIVE_APP: cgyNativeAppBuild ? "1" : "0"
  },
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;

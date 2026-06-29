import type { NextConfig } from "next";
import { validateSupabasePublicUrlForBuild } from "./src/lib/supabase/env";

validateSupabasePublicUrlForBuild();

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;

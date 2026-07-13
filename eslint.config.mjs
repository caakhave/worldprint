import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const ignores = [
  ".next/**",
  "out/**",
  "ios/DerivedData/**",
  "ios/App/App/public/**",
  "node_modules/**",
  "coverage/**",
  "playwright-report/**",
  "test-results/**",
  "output/**",
  "canyougeo-blackbox/.venv/**",
  "canyougeo-blackbox/.pytest_cache/**",
  "canyougeo-blackbox/**/__pycache__/**",
  "canyougeo-blackbox/reports/**",
  "canyougeo-blackbox/exports/*.zip",
  "canyougeo-blackbox/.env",
  "generated/raw/**",
  "supabase/functions/**",
  "public/data/v1/**",
  "public/maps/**"
];

const config = [
  {
    ignores
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;

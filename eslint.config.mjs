import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "output/**",
      "generated/raw/**",
      "public/data/v1/**",
      "public/maps/**"
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default config;

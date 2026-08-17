import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Built Electron app output — not source, shouldn't be linted (or committed).
    "dist/**",
    // Electron main/preload run under plain Node/CommonJS — require() is expected there.
    "electron/**",
    // Release/build tooling — same plain Node/CommonJS story as electron/**.
    "scripts/**",
    // Generated design-tool reference bundles, not app source.
    "docs/**",
  ]),
]);

export default eslintConfig;

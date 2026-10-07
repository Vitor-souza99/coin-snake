import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: ["dist/**", "android/**", "node_modules/**", "browser-results/**"],
  },
  {
    files: ["browser-tests/**/*.mjs"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...ts.configs.recommended,
);

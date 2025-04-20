import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  // Base JavaScript config
  {
    ...js.configs.recommended,
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // TypeScript config (array, needs mapping)
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "src/**/*.tsx"],
  })),

  // React config (single object)
  {
    ...pluginReact.configs.flat.recommended,
    files: ["src/**/*.jsx", "src/**/*.tsx"],
  },
];

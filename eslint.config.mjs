import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs", "manifest.json"],
        },
        tsconfigRootDir: __dirname,
        extraFileExtensions: [".json"],
      },
    },
  },
  ...obsidianmd.configs.recommended,
  globalIgnores([
    "node_modules/**",
    "dist/**",
    "main.js",
    "main.js.map",
    "esbuild.config.mjs",
    "src-archive-modular/**",
    "examples/**",
    "versions.json",
  ]),
  {
    files: ["main.ts", "src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off"
    }
  },
  {
    files: ["src/embed-hydrate-text-nodes.ts"],
    rules: {
      "obsidianmd/no-static-styles-assignment": "off",
      "no-useless-escape": "off"
    }
  },
  {
    files: ["main.ts"],
    rules: {
      "obsidianmd/no-static-styles-assignment": "off",
      "no-useless-escape": "off"
    }
  },
  {
    files: ["src/register-commands.ts", "src/yori-prompt-modals.ts"],
    rules: {
      "obsidianmd/ui/sentence-case": "off"
    }
  }
);

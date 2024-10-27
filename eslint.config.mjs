import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "import": importPlugin
    },
    files: ["**/*.{js,ts}"],
    ignores: ["dist/**", "**/*.js"],
    rules: {
      ...tsPlugin.configs["recommended"].rules,
      "import/order": [
        "error",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index"
          ],
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          }
        }
      ]
    },
    settings: {
      "import/resolver": {
        "typescript": {
          "alwaysTryTypes": true
        }
      }
    }
  }
];
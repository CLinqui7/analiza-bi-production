import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const configFilePath = fileURLToPath(import.meta.url);
const configDirectory = dirname(configFilePath);

const compat = new FlatCompat({
  baseDirectory: configDirectory,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".netlify/**",
      ".vercel/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;

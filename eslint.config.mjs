import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "Sec 1/**", "Sec 2/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  {
    rules: {
      // `any` is allowed only with an explanatory comment (CLAUDE.md); flag every use.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Logical properties only (RTL): ban physical left/right Tailwind utilities.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/(^|\\s)(ml|mr|pl|pr|left|right)-[^\\s]+/]",
          message: "Use logical utilities (ms-, me-, ps-, pe-, start-, end-) for RTL.",
        },
      ],
    },
  },
];

export default config;

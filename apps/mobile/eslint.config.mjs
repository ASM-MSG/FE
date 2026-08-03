import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import oxlint from "eslint-plugin-oxlint";
import { defineConfig, globalIgnores } from "eslint/config";

/** 디자인 시스템 1조(docs/DESIGN_SYSTEM.md) 기계 강제 — ui-web/apps-web과 동일 패턴 유지 */
const tokenRules = {
  "better-tailwindcss/no-restricted-classes": [
    "error",
    {
      restrict: [
        {
          pattern:
            "^(?:.*:)?-?(?:p[xytblrse]?|m[xytblrse]?|w|h|size|gap(?:-[xy])?|min-w|max-w|min-h|max-h|space-[xy]|translate(?:-[xy])?|top|bottom|left|right|inset(?:-[xy])?|indent)-\\[\\d+px\\]$",
          message:
            "px 임의값 금지 — 정수 px는 스케일 클래스로 전부 표현됩니다 (예: w-[40px]→w-10, 6px→1.5, 1px→px). docs/DESIGN_SYSTEM.md 1조",
        },
        {
          pattern: "\\[(?:#|rgba?\\(|hsla?\\(|oklch\\()",
          message:
            "색상 임의값 금지 — design-tokens의 시맨틱/원시 토큰 클래스를 사용하세요. docs/DESIGN_SYSTEM.md 1조",
        },
      ],
    },
  ],
};

export default defineConfig([
  globalIgnores([
    ".expo",
    "dist",
    "expo-env.d.ts",
    ".rnstorybook/storybook.requires.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    plugins: {
      "better-tailwindcss": betterTailwindcss,
    },
    rules: tokenRules,
  },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  // oxlint가 이미 커버하는 룰은 ESLint에서 끈다(중복 리포트 방지) — 반드시 마지막에 위치
  ...oxlint.configs["flat/recommended"],
]);

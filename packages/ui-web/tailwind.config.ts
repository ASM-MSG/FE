import { preset } from "@fillmap/tailwind-preset";
import type { Config } from "tailwindcss";

// .storybook/preview.css의 `@config`로 로드된다 (Tailwind v4).
// 앱 빌드에는 관여하지 않는다 — 앱은 apps/web/tailwind.config.ts를 사용.
export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}"],
} satisfies Config;

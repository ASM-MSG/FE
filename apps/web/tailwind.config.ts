import { preset } from "@fillmap/tailwind-preset";
import type { Config } from "tailwindcss";

// src/styles/globals.css의 `@config`로 로드된다 (Tailwind v4).
// content에 ui 패키지 경로를 반드시 포함해야 패키지 안에서 쓴 클래스가 빌드에 포함된다.
export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui-web/src/**/*.{ts,tsx}",
  ],
} satisfies Config;

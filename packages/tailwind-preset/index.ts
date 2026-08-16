/**
 * design-tokens → Tailwind theme 변환 preset.
 * 웹(apps/web, Tailwind v4 `@config`)과 추후 앱(NativeWind)이 같은 preset을 공유한다.
 *
 * 색상 클래스 매핑 (Figma 시맨틱 → Tailwind):
 * - color/canvas        → bg-background, bg-canvas
 * - color/text-primary  → text-foreground
 * - color/body          → text-foreground-body
 * - color/muted         → text-foreground-muted, text-muted-foreground
 * - color/text-inverse  → text-foreground-inverse
 * - color/surface(-*)   → bg-surface, bg-surface-soft, bg-surface-elevated, bg-muted
 * - color/on-primary    → text-primary-foreground
 * - color/icon-default  → text-icon
 * - color/error         → *-error, *-destructive (shadcn 호환)
 */
import {
  palette,
  semantic,
  typography,
  spacing,
  radius,
  shadow,
} from "@fillmap/design-tokens";
import type { Config } from "tailwindcss";

const px = (n: number) => `${n}px`;

export const preset: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        // 원시 토큰 — bg-blue-500, text-navy-900 ... (시맨틱으로 표현 안 될 때만 사용)
        ...palette,
        // 시맨틱 토큰 (shadcn CSS 변수와 1:1 대응)
        background: semantic.canvas,
        foreground: {
          DEFAULT: semantic.textPrimary,
          body: semantic.body,
          muted: semantic.muted,
          inverse: semantic.textInverse,
        },
        primary: {
          DEFAULT: semantic.primary,
          foreground: semantic.onPrimary,
        },
        secondary: {
          DEFAULT: semantic.secondary,
          foreground: semantic.textInverse,
        },
        accent: {
          DEFAULT: semantic.accent,
          foreground: semantic.textInverse,
        },
        muted: {
          DEFAULT: semantic.surface,
          foreground: semantic.muted,
        },
        canvas: semantic.canvas,
        surface: {
          DEFAULT: semantic.surface,
          soft: semantic.surfaceSoft,
          elevated: semantic.surfaceElevated,
        },
        icon: { DEFAULT: semantic.iconDefault },
        border: semantic.border,
        "hairline-strong": semantic.hairlineStrong,
        success: semantic.success,
        highlight: semantic.highlight,
        warning: semantic.warning,
        error: semantic.error,
        destructive: semantic.error,
      },
      // 타이포 토큰을 클래스 하나로 — text-fm-display, text-fm-body-strong ...
      // fm- prefix: Tailwind 기본(text-base)·색상 클래스(text-body)와의 충돌 방지
      fontSize: Object.fromEntries(
        Object.entries(typography).map(([name, t]) => [
          `fm-${name}`,
          [
            px(t.fontSize),
            {
              lineHeight: px(t.lineHeight),
              letterSpacing: px(t.letterSpacing),
              fontWeight: String(t.fontWeight),
            },
          ],
        ]),
      ),
      // p-md, gap-lg ... (기본 숫자 스케일은 유지, 이름 스케일 추가)
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([k, v]) => [k, px(v)]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([k, v]) => [k, px(v)]),
      ),
      boxShadow: { ...shadow },
      // 도트 로더 (ui-web DotsLoader — Figma FeelMap DotsLoader 14750:3119):
      // 각 도트 scale 0.6↔1.0, 1.2s ease-in-out 무한 반복. 도트별 지연은 컴포넌트가 준다
      keyframes: {
        "dot-pulse": {
          "0%, 100%": { transform: "scale(0.6)" },
          "50%": { transform: "scale(1)" },
        },
      },
      animation: {
        "dot-pulse": "dot-pulse 1.2s ease-in-out infinite",
      },
    },
  },
};

export default preset;

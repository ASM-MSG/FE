import { cva } from "class-variance-authority";
import type { SkeletonBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/**
 * SOURCE: Figma "FeelMap Skeleton" (node 14798:5267) — 로딩 자리표시 블록.
 * 모션은 Figma 컴포넌트 설명 그대로 opacity 100%↔50% · 2s ease-in-out 무한 =
 * Tailwind `animate-pulse` 기본값이다.
 * variant는 기본 치수만 준다 — 실제 폭·높이는 호출부가 className으로 덮는다.
 * 순수 장식이라 스크린리더에서 감춘다(로딩 낭독은 상태줄의 role="status"가 맡는다).
 */
const skeletonVariants = cva("animate-pulse bg-surface", {
  variants: {
    variant: {
      "text-line": "h-4 w-50 rounded-xs",
      pill: "h-5 w-14 rounded-full",
    },
  },
  defaultVariants: { variant: "text-line" },
});

interface SkeletonProps extends SkeletonBaseProps {
  className?: string;
}

/**
 * 공용 Skeleton. variant는 Figma Skeleton 컴포넌트의 Type 속성과 1:1.
 *
 * @example
 * <Skeleton variant="pill" className="size-7" />
 * <Skeleton className="h-3.5 w-2/5" />
 */
export const Skeleton = ({ variant, className }: SkeletonProps) => (
  <div aria-hidden className={cn(skeletonVariants({ variant }), className)} />
);

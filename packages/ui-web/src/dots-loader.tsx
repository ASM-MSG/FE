import { cn } from "./lib/utils";

interface DotsLoaderProps {
  /** 스크린리더 낭독 문구. 기본 "불러오는 중" */
  label?: string;
  className?: string;
}

/** 도트별 시작 지연(s) — Figma 스태거 사양 0/0.15/0.3 */
const DOT_DELAYS = [0, 0.15, 0.3] as const;

/**
 * SOURCE: Figma "FeelMap DotsLoader" (node 14750:3119) — 패널 로딩 도트 로더.
 * 도트 3개가 scale 0.6↔1.0으로 1.2s ease-in-out 무한 반복하며 0.15s씩 엇갈린다
 * (스켈레톤의 대안 B안 — Phase 1~3 프레임은 스태거 단계 문서화용이라 코드는 delay로 구현).
 * 배치(중앙 정렬 등)는 호출부 몫이다.
 *
 * @example
 * <div className="flex flex-1 items-center justify-center">
 *   <DotsLoader label="도감 불러오는 중" />
 * </div>
 */
export const DotsLoader = ({
  label = "불러오는 중",
  className,
}: DotsLoaderProps) => (
  <div
    role="status"
    aria-label={label}
    className={cn("flex items-center gap-2", className)}
  >
    {DOT_DELAYS.map((delay) => (
      <span
        key={delay}
        className="size-3 animate-dot-pulse rounded-full bg-primary"
        style={{ animationDelay: `${delay}s` }}
      />
    ))}
  </div>
);

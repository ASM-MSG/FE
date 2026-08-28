import { Sparkles } from "lucide-react";

/**
 * 입력 대기 빈 상태 (Figma 15666:12402) — theme-route 10% 원 안 sparkles + 2줄 안내.
 * 패널 세로 중앙 정렬은 부모(AiRoutePage 본문)가 flex-1로 맡는다.
 */
export const RouteEmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-xs px-md text-center">
    <span className="mb-xxs flex size-14 items-center justify-center rounded-full bg-theme-route/10">
      <Sparkles className="size-7 text-theme-route" />
    </span>
    <p className="text-fm-title text-foreground">
      지금 보이는 지도 범위에서 동선을 짜 드려요
    </p>
    <p className="text-fm-label text-foreground-muted">
      적은 문장과 지도 범위만 사용해요
    </p>
  </div>
);

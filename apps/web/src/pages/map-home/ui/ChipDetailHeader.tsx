import { ChevronLeft } from "lucide-react";
import type { MissionStatus } from "@/features/map-home/model/mission-status";
import type { ThemeId } from "@/features/map-home/model/theme";
import { MissionStatusBadge } from "./MissionStatusBadge";

interface ChipDetailHeaderProps {
  title: string;
  status: MissionStatus;
  theme: ThemeId;
  /** 뒤로 — 칩은 유지한 채 목록으로 (AC 6) */
  onBack: () => void;
}

/**
 * 미션·코스 상세 헤더 (MSG-395 AC 17·22) — `< 제목 [상태 배지]`.
 * 축제·팝업 상세와 코스 상세가 같은 헤더를 쓴다 (중복 검출 — 두 번째 사용처 규칙).
 */
export const ChipDetailHeader = ({
  title,
  status,
  theme,
  onBack,
}: ChipDetailHeaderProps) => (
  <header className="flex items-center gap-xs">
    <button
      type="button"
      onClick={onBack}
      aria-label="목록으로"
      className="shrink-0 text-foreground-muted"
    >
      <ChevronLeft aria-hidden className="size-5" />
    </button>
    <h2 className="min-w-0 flex-1 truncate text-fm-title text-foreground">
      {title}
    </h2>
    <MissionStatusBadge status={status} theme={theme} />
  </header>
);

import { cn } from "@fillmap/ui-web";
import type { MissionStatus } from "@/features/map-home/model/mission-status";
import type { ThemeId } from "@/features/map-home/model/theme";
import { THEME_BADGE_CLASS, THEME_FILL_CLASS } from "./theme-classes";

interface MissionStatusBadgeProps {
  status: MissionStatus;
  /** 소속 칩 — 마감이 다가온 배지·완료 배지가 그 칩의 색을 따른다 */
  theme: ThemeId;
}

/**
 * 미션·코스 상태 배지 (MSG-395 AC 4) — `D-3` `진행 중` `오늘까지` `상시` `완료` `종료`.
 *
 * 색 규칙은 Figma 정본(14599-8035 · 14622-4292)을 따른다 — 세 단계로 읽힌다:
 * - **완료**: 칩 색 채움 + 흰 글씨. 화면에서 가장 강한 상태
 * - **마감 임박(D-N·오늘까지)**: 칩 색 연한 배경 — "곧 못 한다"는 신호
 * - **진행 중·상시·종료**: 무채색. 지금 특별할 게 없는 상태라 물러난다
 *
 * 공용 `ui-web` `Chip`을 쓰지 않는다: Chip은 선택 토글용이라 active 시 Check 아이콘을
 * 강제하고 primary 단색이라 테마 4색·상태별 색 분기를 표현할 수 없다 (ThemeChip이 로컬로
 * 남은 것과 같은 판정). 두 번째 사용처가 생기면 ui-web 승격 후보다.
 */
export const MissionStatusBadge = ({
  status,
  theme,
}: MissionStatusBadgeProps) => (
  <span
    className={cn(
      "shrink-0 rounded-full px-xs py-0.5 text-fm-caption",
      status.kind === "completed"
        ? cn(THEME_FILL_CLASS[theme], "text-primary-foreground")
        : status.kind === "upcoming" || status.kind === "today"
          ? THEME_BADGE_CLASS[theme]
          : "bg-surface text-foreground-muted",
    )}
  >
    {status.label}
  </span>
);

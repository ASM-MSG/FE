import type { MissionView } from "@/features/map-home/model/mission-view";
import { THEME_META, type ThemeId } from "@/features/map-home/model/theme";
import { ChipListPanel } from "./ChipListPanel";
import { RetryNotice } from "./RetryNotice";
import { MissionCard } from "./MissionCard";

interface MissionListPanelProps {
  views: MissionView[];
  theme: Extract<ThemeId, "festival" | "popup">;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  /** 진행도(내 수집 격자) 조회 실패 — 목록은 그대로 두고 위에 안내만 얹는다 */
  progressFailed: boolean;
  onSelect: (missionId: number) => void;
  onHover: (missionId: number | null) => void;
  onClose: () => void;
}

/**
 * 지역축제·팝업스토어 목록 패널 (MSG-395 AC 13·25·26, Figma 14599-8035 · 14599-8310).
 * 헤더·상태 분기는 공용 껍데기(ChipListPanel)가, 카드 모양만 여기가 갖는다.
 */
export const MissionListPanel = ({
  views,
  theme,
  isPending,
  isError,
  onRetry,
  progressFailed,
  onSelect,
  onHover,
  onClose,
}: MissionListPanelProps) => (
  <ChipListPanel
    theme={theme}
    count={views.length}
    isPending={isPending}
    isError={isError}
    errorMessage={`${THEME_META[theme].label} 목록을 불러오지 못했어요`}
    emptyMessage={`지금 진행 중인 ${THEME_META[theme].label}가 없어요`}
    onRetry={onRetry}
    notice={
      progressFailed ? (
        <RetryNotice message="진행도를 불러오지 못했어요" onRetry={onRetry} />
      ) : undefined
    }
    onClose={onClose}
  >
    <ul className="flex flex-col gap-sm">
      {views.map((view) => (
        <MissionCard
          key={view.missionId}
          view={view}
          theme={theme}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </ul>
  </ChipListPanel>
);

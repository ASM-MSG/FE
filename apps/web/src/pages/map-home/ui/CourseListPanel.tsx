import { RetryNotice } from "@fillmap/ui-web";
import type { CourseView } from "@/features/map-home/model/mission-view";
import { ChipListPanel } from "./ChipListPanel";
import { CourseCard } from "./CourseCard";

interface CourseListPanelProps {
  views: CourseView[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  /** 진행도(내 수집 격자) 조회 실패 — 목록은 그대로 두고 위에 안내만 얹는다 */
  progressFailed: boolean;
  /** 비로그인 진행도 잠금 (MSG-463 확정 2) — 카드의 진행 바·방문 수를 숨긴다 */
  progressLocked: boolean;
  onSelect: (missionId: number) => void;
  onHover: (missionId: number | null) => void;
  onClose: () => void;
}

/**
 * 경로추천 목록 패널 (MSG-395 AC 19·20·25·26, Figma 14622-4292).
 * 칩 클릭 시의 줌 이동(축척 500m)은 페이지가 담당한다 — 패널은 목록만 그린다.
 */
export const CourseListPanel = ({
  views,
  isPending,
  isError,
  onRetry,
  progressFailed,
  progressLocked,
  onSelect,
  onHover,
  onClose,
}: CourseListPanelProps) => (
  <ChipListPanel
    theme="route"
    count={views.length}
    isPending={isPending}
    isError={isError}
    errorMessage="추천 코스를 불러오지 못했어요"
    emptyMessage="지금 추천할 코스가 없어요"
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
        <CourseCard
          key={view.missionId}
          view={view}
          progressFailed={progressFailed}
          progressLocked={progressLocked}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </ul>
  </ChipListPanel>
);

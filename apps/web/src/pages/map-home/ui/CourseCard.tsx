import { cn } from "@fillmap/ui-web";
import { progressRatio } from "@/features/map-home/model/mission-progress";
import { mockMissionVideoCount } from "@/features/map-home/model/mission-video-count";
import type { CourseView } from "@/features/map-home/model/mission-view";
import { MissionStatusBadge } from "./MissionStatusBadge";
import { THEME_FILL_CLASS, THEME_HOVER_BORDER_CLASS } from "./theme-classes";

interface CourseCardProps {
  view: CourseView;
  /**
   * 진행도(내 수집 격자) 조회 실패 — 방문 수치·진행 바를 그리지 않는다 (리뷰 반영).
   * 실패 시 분자가 0으로 폴백해 `0/N곳 방문` + 빈 바가 확정된 사실처럼 보인다.
   * 목록 위 안내 배너를 놓친 사용자는 "아직 하나도 안 갔다"로 읽는다
   */
  progressFailed: boolean;
  onSelect: (missionId: number) => void;
  onHover: (missionId: number | null) => void;
}

/**
 * 경로추천 목록 카드 (MSG-395 AC 20, Figma 14622-4292).
 * 제목/상태 배지 + 지역·포토스팟 수 + 진행 바 + `n/N곳 방문` + 영상 수.
 * 축제·팝업 카드와 달리 썸네일이 없고 **진행 바**가 자리를 대신한다 — 코스는 여러 지점을
 * 순서대로 채우는 미션이라 "얼마나 왔는지"가 카드의 핵심 정보다.
 */
export const CourseCard = ({
  view,
  progressFailed,
  onSelect,
  onHover,
}: CourseCardProps) => {
  const { progress, spots } = view;
  const ratio = progressRatio(progress);
  const videoCount = mockMissionVideoCount(view.missionId);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(view.missionId)}
        onMouseEnter={() => onHover(view.missionId)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(view.missionId)}
        onBlur={() => onHover(null)}
        className={cn(
          // 축제·팝업 카드와 같은 치수 규칙 (Figma 14599-9034) — 패딩 12 · 내부 간격 7.
          // 코스 카드만 진행 바 한 줄(4px + 간격)이 더 붙어 그만큼 높다
          "flex w-full flex-col gap-1.75 rounded-md border border-transparent bg-background p-3 text-left shadow-raised transition-colors",
          THEME_HOVER_BORDER_CLASS.route,
        )}
      >
        <span className="flex items-start gap-xs">
          <span className="min-w-0 flex-1 truncate text-fm-body-strong text-foreground">
            {view.title}
          </span>
          <MissionStatusBadge status={view.status} theme="route" />
        </span>

        <span className="truncate text-fm-label font-normal text-foreground-muted">
          {view.placeName
            ? `${view.placeName} · 포토스팟 ${spots.length}곳`
            : `포토스팟 ${spots.length}곳`}
        </span>

        {/* 진행 바 — 폭은 n/N 비율(progressRatio). % 는 스케일로 표현 불가라 인라인 스타일.
            진행도를 모르면 바 자체를 그리지 않는다 — 빈 바는 "0% 진행"이라는 주장이다 */}
        {!progressFailed && (
          <span
            aria-hidden
            className="h-1 w-full overflow-hidden rounded-full bg-surface"
          >
            <span
              className={cn(
                "block h-full rounded-full",
                THEME_FILL_CLASS.route,
              )}
              style={{ width: `${ratio * 100}%` }}
            />
          </span>
        )}

        <span className="flex items-center gap-xs">
          <span
            className={cn(
              "flex-1 text-fm-label font-normal",
              progress.completed && !progressFailed
                ? "text-theme-route"
                : "text-foreground-muted",
            )}
          >
            {progressFailed
              ? "방문 확인 불가"
              : `${progress.done}/${progress.total}곳 방문`}
          </span>
          {videoCount > 0 && (
            <span className="shrink-0 text-fm-label font-normal text-foreground-muted">
              영상 {videoCount}
            </span>
          )}
        </span>
      </button>
    </li>
  );
};

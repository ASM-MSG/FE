import { cn } from "@fillmap/ui-web";
import type { CourseSpot } from "@/features/map-home/model/course";
import { mockGridVideoCount } from "@/features/map-home/model/mission-video-count";
import { THEME_FILL_CLASS } from "./theme-classes";

interface CourseSpotRowProps {
  spot: CourseSpot;
  /** 격자 표시명 — 미도착·무귀속이면 undefined라 "이름 없는 경유 지점"으로 적는다 */
  name: string | undefined;
  onSelect: (gridId: string) => void;
}

/**
 * 코스 포토스팟 행 (MSG-395 AC 23·24, Figma 14599-10258).
 * 순번 배지(방문 시 채움) + 이름 + 영상 수 + 방문 여부. 클릭하면 그 격자의 상세로 간다.
 *
 * 이름이 없는 경우가 실제로 있다 — 코스 라인이 지나는 중간 격자는 이름 붙은 장소가
 * 아니어서 서버가 구역명·행정동명을 못 준다. 그때는 격자 코드 대신 무엇인지 설명한다.
 */
export const CourseSpotRow = ({ spot, name, onSelect }: CourseSpotRowProps) => {
  const videoCount = mockGridVideoCount(spot.gridId);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(spot.gridId)}
        className="flex w-full items-center gap-sm rounded-sm px-xs py-xs text-left transition-colors hover:bg-surface"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-fm-caption",
            spot.visited
              ? cn(THEME_FILL_CLASS.route, "text-primary-foreground")
              : "border border-border text-foreground-muted",
          )}
        >
          {spot.order}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate text-fm-body-strong",
              name ? "text-foreground" : "text-foreground-muted",
            )}
          >
            {name ?? "이름 없는 경유 지점"}
          </span>
          <span className="text-fm-caption text-foreground-muted">
            {spot.order}번째 스팟
          </span>
        </span>

        <span className="shrink-0 text-fm-caption text-foreground-muted">
          {videoCount > 0 ? `영상 ${videoCount}` : "영상 없음"}
        </span>
        <span
          className={cn(
            "shrink-0 text-fm-caption",
            spot.visited ? "text-theme-route" : "text-foreground-muted",
          )}
        >
          {spot.visited ? "방문함" : "미방문"}
        </span>
      </button>
    </li>
  );
};

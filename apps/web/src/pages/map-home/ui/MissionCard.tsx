import { cn } from "@fillmap/ui-web";
import {
  formatMissionPeriod,
  formatOperationTime,
} from "@/features/map-home/model/mission-format";
import { mockMissionVideoCount } from "@/features/map-home/model/mission-video-count";
import type { MissionView } from "@/features/map-home/model/mission-view";
import type { ThemeId } from "@/features/map-home/model/theme";
import { MissionStatusBadge } from "./MissionStatusBadge";
import {
  THEME_HOVER_BORDER_CLASS,
  THEME_PLACEHOLDER_CLASS,
  THEME_TEXT_CLASS,
} from "./theme-classes";

interface MissionCardProps {
  view: MissionView;
  /** 소속 칩 — 지역축제와 팝업스토어가 같은 카드를 색·보조 문구만 달리 쓴다 */
  theme: Extract<ThemeId, "festival" | "popup">;
  onSelect: (missionId: number) => void;
  /** 마우스 진입/이탈 — 지도 타일 강조·이름표 마커 배선 (AC 16) */
  onHover: (missionId: number | null) => void;
}

/**
 * 지역축제·팝업스토어 목록 카드 (MSG-395 AC 13·14·16, Figma 14599-8035 · 14599-8310).
 * 대표 이미지 + 제목/상태 배지 + 장소·기간(팝업은 운영시간) + 완료 조건 + 영상 수.
 *
 * 보조 문구가 칩마다 다른 것 외에는 두 칩의 카드가 같아 한 컴포넌트로 둔다 —
 * 축제는 기간(`8.7~8.14`), 팝업은 운영시간(`매일 11:00~22:00`)이 정체성이다.
 */
export const MissionCard = ({
  view,
  theme,
  onSelect,
  onHover,
}: MissionCardProps) => {
  const { dto, progress, status } = view;
  const subtitle =
    theme === "popup"
      ? formatOperationTime(dto.operationTime)
      : formatMissionPeriod(dto.startAt, dto.endAt);
  // 서버 videoCount 도착 전까지의 임시 목 (mission-video-count) — 0이면 배지를 감춘다
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
          // Figma 정본 14599-9034: 카드 348×87 · 패딩 12 · 썸네일 74×56 · 내부 간격 7.
          // 테두리 없이 그림자만 지고, 호버 테두리는 투명 테두리를 물들여 레이아웃이
          // 밀리지 않게 한다 (14599-8863 호버 프레임)
          "flex w-full items-start gap-3 rounded-md border border-transparent bg-background p-3 text-left shadow-raised transition-colors",
          THEME_HOVER_BORDER_CLASS[theme],
        )}
      >
        {dto.imageUrl ? (
          <img
            src={dto.imageUrl}
            alt=""
            className="h-14 w-18.5 shrink-0 rounded-xs object-cover"
          />
        ) : (
          // 대표 이미지가 없으면 테마 색 블록 (AC 27) — 빈 회색 박스보다 카드 정체성을 지킨다
          <span
            aria-hidden
            className={cn(
              "h-14 w-18.5 shrink-0 rounded-xs",
              THEME_PLACEHOLDER_CLASS[theme],
            )}
          />
        )}

        <span className="flex min-w-0 flex-1 flex-col gap-1.75">
          <span className="flex items-start gap-xs">
            <span className="min-w-0 flex-1 truncate text-fm-body-strong text-foreground">
              {view.title}
            </span>
            <MissionStatusBadge status={status} theme={theme} />
          </span>

          <span className="truncate text-fm-label font-normal text-foreground-muted">
            {view.placeName ? `${view.placeName} · ${subtitle}` : subtitle}
          </span>

          <span className="flex items-center gap-xs">
            {/* 진행도 조회 실패 시 `progressFailed`를 받지 않는다 (리뷰 판단):
                실패하면 completed가 false로 폴백해 **"방문 완료"는 절대 잘못 뜨지 않고**,
                남는 `N칸 채우면 완료`는 진행도와 무관한 미션 규칙(targetCount) 문장이라
                거짓이 아니다. 61장 카드에 "확인 불가"를 반복하면 목록 위 안내만 묻힌다.
                코스 카드는 다르다 — 거기는 `0/N곳`이라는 **수치**를 주장한다 */}
            <span
              className={cn(
                "flex-1 truncate text-fm-label font-normal",
                progress.completed
                  ? THEME_TEXT_CLASS[theme]
                  : "text-foreground-muted",
              )}
            >
              {progress.completed
                ? "방문 완료"
                : `${progress.total}칸 채우면 완료`}
            </span>
            {videoCount > 0 && (
              <span className="shrink-0 text-fm-label font-normal text-foreground-muted">
                영상 {videoCount}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
};

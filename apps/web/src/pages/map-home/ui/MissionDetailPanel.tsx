import { cn } from "@fillmap/ui-web";
import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import {
  formatMissionPeriod,
  formatOperationTime,
} from "@/features/map-home/model/mission-format";
import type { MissionView } from "@/features/map-home/model/mission-view";
import type { MissionVideosResult } from "@/features/map-home/model/use-mission-videos-query";
import type { ThemeId } from "@/features/map-home/model/theme";
import { ChipDetailHeader } from "./ChipDetailHeader";
import { FeedVideoList } from "./FeedVideoList";
import { RetryNotice } from "./RetryNotice";
import { StatTrio } from "./StatTrio";
import { THEME_BADGE_CLASS, THEME_PLACEHOLDER_CLASS } from "./theme-classes";
import { useEscapeClose } from "./use-escape-close";

interface MissionDetailPanelProps {
  view: MissionView;
  theme: Extract<ThemeId, "festival" | "popup">;
  /** 이 미션 영역의 영상 피드 (표본 격자 합본) */
  videos: MissionVideosResult;
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
  /**
   * 진행도(내 수집 격자) 조회 실패 — `내 진행`을 수치로 주장하지 않는다 (리뷰 반영).
   * 실패 시 분자가 0으로 폴백해 "아직 안 채웠다"로 잘못 읽힌다
   */
  progressFailed: boolean;
  /** 뒤로 — 칩은 유지한 채 목록으로 (AC 6) */
  onBack: () => void;
  /** 닫기 — Escape 배선 */
  onClose: () => void;
}

/**
 * 지역축제·팝업스토어 상세 패널 (MSG-395 AC 17, Figma 14599-9998 · 14599-14734).
 * 대표 이미지 → 장소·기간 → 완료 조건 배너 → 3분할 스탯 → 이 미션의 영상 피드.
 *
 * `올라온 영상 N개`는 목이 아니라 **실제로 받아온 피드 길이**다 — 상세는 이미 영상을
 * 조회하므로 실수치가 공짜다 (목록 카드만 서버 videoCount 도착 전까지 목을 쓴다).
 */
export const MissionDetailPanel = ({
  view,
  theme,
  videos,
  progressFailed,
  onVideoSelect,
  onBack,
  onClose,
}: MissionDetailPanelProps) => {
  useEscapeClose(onClose);

  const { dto, progress } = view;
  const period =
    theme === "popup"
      ? formatOperationTime(dto.operationTime)
      : formatMissionPeriod(dto.startAt, dto.endAt);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <ChipDetailHeader
        title={view.title}
        status={view.status}
        theme={theme}
        onBack={onBack}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-md">
          {dto.imageUrl ? (
            <img
              src={dto.imageUrl}
              alt=""
              className="h-45 w-full rounded-sm object-cover"
            />
          ) : (
            <span
              aria-hidden
              className={cn(
                "h-45 w-full rounded-sm",
                THEME_PLACEHOLDER_CLASS[theme],
              )}
            />
          )}

          <p className="text-fm-caption text-foreground-muted">
            {view.placeName ? `${view.placeName} · ${period}` : period}
          </p>

          {/* 완료 조건 배너 — 이 미션을 어떻게 끝내는지 한 줄로 (Figma 정본 문구) */}
          <p
            className={cn(
              "rounded-sm px-sm py-xs text-fm-body",
              THEME_BADGE_CLASS[theme],
            )}
          >
            영역 안 아무 칸이나 {progress.total}칸 채우면 완료
          </p>

          <StatTrio
            items={[
              {
                label: "내 진행",
                value: progressFailed
                  ? "확인 불가"
                  : `${progress.done}/${progress.total}칸`,
              },
              {
                label: theme === "popup" ? "운영시간" : "축제 기간",
                value: period,
              },
              { label: "올라온 영상", value: `${videos.items.length}개` },
            ]}
          />

          <section className="flex flex-col gap-xs">
            <h3 className="text-fm-title text-foreground">
              이 미션의 영상
              <span className="ml-xs text-fm-caption font-normal text-foreground-muted">
                {videos.items.length}개 · 최신순
              </span>
            </h3>

            {videos.isError ? (
              <RetryNotice
                message="영상 목록을 불러오지 못했어요"
                onRetry={videos.retry}
              />
            ) : videos.isPending ? (
              <p aria-busy className="text-fm-body text-foreground-muted">
                영상을 불러오는 중이에요…
              </p>
            ) : videos.items.length === 0 ? (
              <p className="text-fm-body text-foreground-muted">
                아직 이 미션에 올라온 영상이 없어요
              </p>
            ) : (
              <FeedVideoList
                items={videos.items}
                onVideoSelect={onVideoSelect}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

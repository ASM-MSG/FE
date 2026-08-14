import { X } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import type { HotRegionSummaryResult } from "@/features/map-home/model/use-hot-region-summary";
import { THEME_META } from "@/features/map-home/model/theme";
import { formatViewCountKo } from "@/shared/format";
import { CellActionRow } from "./CellActionRow";
import { FeedVideoList } from "./FeedVideoList";
import { RegionLocationLine } from "./RegionLocationLine";
import { RetryNotice } from "./RetryNotice";
import { THEME_BADGE_CLASS } from "./theme-classes";
import { useEscapeClose } from "./use-escape-close";

interface HotRegionPanelProps {
  summary: HotRegionSummaryResult;
  /** 헤더 표시명 — 현재 행정동. 미판별이면 null이라 안내로 대체한다 */
  regionName: string | null;
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
  /** "전체 보기" — 칩을 풀고 패널 안 전체 지역 리스트로 (기존 홈 관례) */
  onViewAll: () => void;
  /** 닫기 — X·Escape (AC 5) */
  onClose: () => void;
  /** [영상 추가] — 이 동 중심을 지목한 업로드 진입 */
  onUpload: () => void;
}

/**
 * 핫구역 행정동 요약 패널 (MSG-395 AC 8·9, Figma 14629-3839).
 *
 * 이전에는 핫구역 칩이 격자별 영상 섹션(ThemeFeedPanel)을 보여줬는데, 사이드레일 홈의
 * 행정동 패널과 같은 **동 단위 요약**으로 바뀌었다. 개별 격자는 지도에서 탭해 상세로 간다.
 *
 * 조회수·업로더 핸들이 없는 영상이 섞일 수 있다 — 동 단위 전체 영상 API가 없어 격자
 * 표본을 합치기 때문이다(스펙 추정 1). 없는 값은 카드가 알아서 생략한다.
 */
export const HotRegionPanel = ({
  summary,
  regionName,
  onVideoSelect,
  onViewAll,
  onClose,
  onUpload,
}: HotRegionPanelProps) => {
  useEscapeClose(onClose);

  const { stats } = summary;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <header className="flex flex-col gap-xs">
        <div className="flex items-center gap-xs">
          <h2 className="min-w-0 truncate text-fm-title text-foreground">
            {regionName ?? "이 지역"}
          </h2>
          <span
            className={cn(
              "shrink-0 rounded-full px-xs py-0.5 text-fm-caption",
              THEME_BADGE_CLASS.hot,
            )}
          >
            {THEME_META.hot.label}
          </span>
          <button
            type="button"
            onClick={onViewAll}
            className="ml-auto shrink-0 text-fm-label text-primary"
          >
            전체 보기
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="핫구역 닫기"
            className="shrink-0 text-foreground-muted"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="text-fm-caption text-foreground-muted">
          내 영상 {stats.myVideoCount}개 · 최근 24시간 영상 +{stats.recentCount}
          개
        </p>
        <p className="text-fm-caption text-foreground-muted">
          영상 {stats.videoCount}개 · 조회 {formatViewCountKo(stats.viewCount)}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-md">
          <CellActionRow onUpload={onUpload} />

          {summary.isError ? (
            <RetryNotice
              message="핫구역 영상을 불러오지 못했어요"
              onRetry={summary.retry}
            />
          ) : summary.isPending ? (
            <p aria-busy className="text-fm-body text-foreground-muted">
              영상을 불러오는 중이에요…
            </p>
          ) : summary.videos.length === 0 ? (
            <p className="text-fm-body text-foreground-muted">
              아직 이 지역에 핫구역 영상이 없어요
            </p>
          ) : (
            <FeedVideoList
              items={summary.videos}
              onVideoSelect={onVideoSelect}
            />
          )}

          {regionName && <RegionLocationLine regionName={regionName} />}
        </div>
      </div>
    </div>
  );
};

import { useEffect } from "react";
import { Play } from "lucide-react";
import { Button, cn } from "@fillmap/ui-web";
import type { CellVideo } from "@/entities/cell";
import { formatViewCount } from "@/features/explore/model/cell-detail";
import { formatDuration } from "@/features/explore/model/explore-cells";
import type {
  HomeCellBadge,
  HomeCellDetail,
} from "@/features/map-home/model/home-cell-detail";

interface HomeCellDetailPanelProps {
  detail: HomeCellDetail;
  /** 닫기 — Escape 키 배선 (AC 9-1). 칩 해제·전환 닫힘은 스토어 연동이 담당 */
  onClose: () => void;
}

/** 배지 스타일 매핑 — 연한 배경 pill (Figma 셀 선택 프레임). 토큰 클래스 리터럴만 사용 */
const BADGE_CLASS: Record<HomeCellBadge["id"], string> = {
  occupied: "bg-primary/10 text-primary",
  hot: "bg-theme-hot/10 text-theme-hot",
  festival: "bg-theme-festival/10 text-theme-festival",
  popup: "bg-theme-popup/10 text-theme-popup",
};

/**
 * 영상 카드 — CellSummaryPanel CellCard 시각 관례 차용(썸네일 자리 + 재생 아이콘 + 길이 배지).
 * 회색 썸네일 박스는 placeholder가 정상 (Figma 오탐 방지 6). 재생은 제외 범위라 클릭 없음.
 */
const VideoCard = ({ video }: { video: CellVideo }) => {
  const duration = formatDuration(video.durationSec);
  return (
    <div className="flex flex-col gap-xxs">
      <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-surface">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3 fill-current" />
        </span>
        {duration && (
          <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
            {duration}
          </span>
        )}
      </span>
      <span title={video.title} className="truncate text-fm-body-strong text-foreground">
        {video.title}
      </span>
      <span className="text-fm-caption text-foreground-muted">
        조회 {formatViewCount(video.viewCount)}
      </span>
    </div>
  );
};

const VideoSection = ({
  title,
  videos,
}: {
  title: string;
  videos: CellVideo[];
}) => (
  <section className="flex flex-col gap-xs">
    <h3 className="text-fm-body-strong text-foreground">
      {title} {videos.length}
    </h3>
    <div className="grid grid-cols-2 gap-sm">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  </section>
);

/**
 * 홈 셀 상세 패널 (MSG-252 AC 9·9-1·10) — 좌측 패널에서 요약(CellSummaryPanel) 자리에 전환
 * 렌더된다(SearchBox 유지). 별도 닫기 버튼 없음(A3) — 칩 해제·전환(스토어 연동)·다른 셀
 * 탭(교체)·Escape로 닫힌다. "전체 보기" 링크는 상세 모드 미표시 (Figma 오탐 방지 5).
 * 버튼 실동작(재생·업로드)은 제외 범위 — 클릭은 no-op이어야 한다 (AC 12).
 */
export const HomeCellDetailPanel = ({
  detail,
  onClose,
}: HomeCellDetailPanelProps) => {
  // Escape 닫기 (AC 9-1) — 뷰 레이어라 window 이벤트 직접 배선 (RN 경계는 model에만 적용)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <header className="flex flex-col gap-xs">
        <div className="flex items-center gap-xs">
          <h2 className="text-fm-title text-foreground">{detail.label}</h2>
          {detail.badges.map((badge) => (
            <span
              key={badge.id}
              className={cn(
                "rounded-full px-xs py-0.5 text-fm-caption",
                BADGE_CLASS[badge.id],
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <p className="text-fm-caption text-foreground-muted">
          {detail.location} · 영상 {detail.videoCount}개
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto">
        {detail.myVideos.length > 0 && (
          <VideoSection title="내 영상" videos={detail.myVideos} />
        )}
        {detail.otherVideos.length > 0 && (
          <VideoSection title="다른 사용자 영상" videos={detail.otherVideos} />
        )}
      </div>

      <div className="flex gap-xs">
        {detail.showMashup && (
          <Button
            text="영상 몰아보기"
            variant="secondary"
            size="sm"
            className="flex-1 border border-border"
          />
        )}
        <Button text="영상 추가하기" variant="primary" size="sm" className="flex-1" />
      </div>
    </div>
  );
};

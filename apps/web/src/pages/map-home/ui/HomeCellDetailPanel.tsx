import { useEffect } from "react";
import { Play } from "lucide-react";
import { Button, cn } from "@fillmap/ui-web";
import type { CellVideo } from "@/entities/cell";
import { formatDuration } from "@/features/explore/model/explore-cells";
import type {
  HomeCellBadge,
  HomeCellDetail,
} from "@/features/map-home/model/home-cell-detail";
import { formatMonthDay, formatRelativeTime } from "@/shared/format";

interface HomeCellDetailPanelProps {
  detail: HomeCellDetail;
  /** 닫기 — Escape 키 배선 (AC 9-1). 칩 해제·전환 닫힘은 스토어 연동이 담당 */
  onClose: () => void;
  /** "전체 보기" 클릭 — 요약 패널과 동일하게 탐색으로 이동 (MSG-253 AC 11) */
  onViewAll: () => void;
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
 * 회색 썸네일 박스는 placeholder가 정상 (Figma 오탐 방지 1). 재생은 제외 범위라 클릭 없음.
 * 메타는 소유 구분 (MSG-253 AC 10) — 내 영상: 업로드 날짜(혼합 그리드에선 "내 영상" 라벨 동반),
 * 다른 사용자: "@업로더" + 상대시간 두 줄 (추정 2).
 */
const VideoCard = ({
  video,
  mine,
  showMineLabel,
}: {
  video: CellVideo;
  mine: boolean;
  /** "내 영상" 라벨 표시 — 혼합 그리드(다른 사용자 영상 동반)에서만 (추정 3) */
  showMineLabel: boolean;
}) => {
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
      {mine ? (
        <>
          {showMineLabel && (
            <span className="text-fm-body-strong text-primary">내 영상</span>
          )}
          <span className="text-fm-caption text-foreground-muted">
            {formatMonthDay(video.uploadedAt)}
          </span>
        </>
      ) : (
        <>
          {video.uploaderHandle && (
            <span className="truncate text-fm-body-strong text-foreground">
              {video.uploaderHandle}
            </span>
          )}
          <span className="text-fm-caption text-foreground-muted">
            {formatRelativeTime(video.uploadedAt)}
          </span>
        </>
      )}
    </div>
  );
};

/**
 * 홈 셀 상세 패널 (MSG-252 AC 9·9-1·10 → MSG-253 시각 정리) — 좌측 패널에서 요약
 * (CellSummaryPanel) 자리에 전환 렌더된다(SearchBox 유지). 별도 닫기 버튼 없음(A3) —
 * 칩 해제·전환(스토어 연동)·다른 셀 탭(교체)·Escape로 닫힌다.
 * 영상은 섹션 헤더 없는 단일 2열 그리드 — 내 영상이 앞 (MSG-253 AC 9).
 * "전체 보기" 링크는 타이틀 행 오른쪽에 표시 (MSG-253 AC 11 — MSG-252의 미표시를 대체).
 * 버튼 실동작(재생·업로드)은 제외 범위 — 클릭은 no-op이어야 한다 (AC 12).
 */
export const HomeCellDetailPanel = ({
  detail,
  onClose,
  onViewAll,
}: HomeCellDetailPanelProps) => {
  // Escape 닫기 (AC 9-1) — 뷰 레이어라 window 이벤트 직접 배선 (RN 경계는 model에만 적용)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 요소 타깃은 무시 — SearchBox 자체 Escape(드롭다운 닫기)와 동시 닫힘 방지 (리뷰 반영)
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 혼합 그리드 여부 — "내 영상" 라벨은 다른 사용자 영상과 섞일 때만 필요 (추정 3)
  const mixed = detail.otherVideos.length > 0;

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
          {/* "전체 보기" — 요약 패널(BottomSheet actionLabel)과 동일 시각·동작 (AC 11) */}
          <button
            type="button"
            onClick={onViewAll}
            className="ml-auto shrink-0 text-fm-label text-primary"
          >
            전체 보기
          </button>
        </div>
        <p className="text-fm-caption text-foreground-muted">{detail.subtitle}</p>
      </header>

      {/* 단일 2열 그리드 — 섹션 헤더 없이 내 영상이 앞 (AC 9) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-sm">
          {detail.myVideos.map((video) => (
            <VideoCard key={video.id} video={video} mine showMineLabel={mixed} />
          ))}
          {detail.otherVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              mine={false}
              showMineLabel={false}
            />
          ))}
        </div>
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

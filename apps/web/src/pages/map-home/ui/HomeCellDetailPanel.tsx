import { MapPin } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type {
  HomeCellBadge,
  HomeCellDetail,
} from "@/features/map-home/model/home-cell-detail";
import { formatDuration } from "@/features/explore/model/explore-cells";
import { formatRelativeTime, formatViewCountKo } from "@/shared/format";
import { CellActionRow } from "./CellActionRow";
import { useEscapeClose } from "./use-escape-close";

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
  route: "bg-theme-route/10 text-theme-route",
};

/**
 * 홈 격자 상세 패널 (MSG-252 AC 9·9-1·10 → MSG-277 정보 구조 → MSG-325 실 API 전환) —
 * 좌측 패널에서 요약(CellSummaryPanel)·테마 피드 자리에 전환 렌더된다(SearchBox 유지).
 * 별도 닫기 버튼 없음(A3) — 칩 해제·전환(스토어 연동)·다른 격자 탭(교체)·Escape로 닫힌다.
 *
 * MSG-325 결정 B①: 목 격자 파생을 걷어내 API가 주는 것만 남겼다 — 헤더(제목·배지·내 영상 수),
 * 액션 행, 전역 대표 영상 1건, 행정동 줄. 영상 목록·활발한 시간대·전역 지표(조회·담수율)·
 * 마지막 업로드 시각은 명세 대응이 없거나 제외 범위(격자 상세 연동 티켓)라 표시하지 않는다.
 * 액션 행 실동작은 계속 제외 범위 — 클릭 no-op 유지.
 */
export const HomeCellDetailPanel = ({
  detail,
  onClose,
  onViewAll,
}: HomeCellDetailPanelProps) => {
  // Escape 닫기 (AC 9-1) — 입력 요소 타깃 무시 계약 포함 (use-escape-close, MSG-277 공용 추출)
  useEscapeClose(onClose);

  const cover = detail.coverVideo;
  const coverDuration = cover ? formatDuration(cover.durationSec) : null;

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
        <p className="text-fm-caption text-foreground-muted">
          {detail.subtitle}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-md">
          <CellActionRow />

          {/* 전역 대표 영상 1건 — 후보가 없으면(`/cover` data null) 영역 자체를 그리지 않는다.
              재생 배선은 제외 범위(격자 상세 연동 티켓)라 표시 전용이다 */}
          {cover && (
            <div className="flex flex-col gap-xxs">
              <span className="relative block aspect-video w-full overflow-hidden rounded-sm bg-surface">
                <img
                  src={cover.thumbnailUrl}
                  alt=""
                  className="size-full object-cover"
                />
                {coverDuration && (
                  <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
                    {coverDuration}
                  </span>
                )}
              </span>
              <span className="flex items-center justify-between gap-sm text-fm-caption text-foreground-muted">
                <span>대표 영상 · {formatRelativeTime(cover.recordedAt)}</span>
                <span className="shrink-0">
                  조회 {formatViewCountKo(cover.viewCount)}
                </span>
              </span>
            </div>
          )}

          {/* 위치 줄 — 행정동. by-grid가 무귀속·미판정이면 null이라 줄을 그리지 않는다 */}
          {detail.regionLabel && (
            <section className="border-t border-border pt-md">
              <p className="flex items-center gap-xs text-fm-caption text-foreground">
                <MapPin
                  aria-hidden
                  className="size-4 shrink-0 text-foreground-muted"
                />
                {detail.regionLabel}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

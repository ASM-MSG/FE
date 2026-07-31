import { Button, cn } from "@fillmap/ui-web";
import type {
  HomeCellBadge,
  HomeCellDetail,
} from "@/features/map-home/model/home-cell-detail";
import { FeedVideoCard } from "./FeedVideoCard";
import { useEscapeClose } from "./use-escape-close";

interface HomeCellDetailPanelProps {
  detail: HomeCellDetail;
  /** 닫기 — Escape 키 배선 (AC 9-1). 칩 해제·전환 닫힘은 스토어 연동이 담당 */
  onClose: () => void;
  /** "전체 보기" 클릭 — 요약 패널과 동일하게 탐색으로 이동 (MSG-253 AC 11) */
  onViewAll: () => void;
}

/** 배지 스타일 매핑 — 연한 배경 pill (Figma 셀 선택 프레임). 토큰 클래스 리터럴만 사용. MSG-277: route 추가 */
const BADGE_CLASS: Record<HomeCellBadge["id"], string> = {
  occupied: "bg-primary/10 text-primary",
  hot: "bg-theme-hot/10 text-theme-hot",
  festival: "bg-theme-festival/10 text-theme-festival",
  popup: "bg-theme-popup/10 text-theme-popup",
  route: "bg-theme-route/10 text-theme-route",
};

/**
 * 홈 셀 상세 패널 (MSG-252 AC 9·9-1·10 → MSG-253 시각 정리 → MSG-277 피드 디자인 통일) —
 * 좌측 패널에서 요약(CellSummaryPanel)·테마 피드 자리에 전환 렌더된다(SearchBox 유지).
 * 별도 닫기 버튼 없음(A3) — 칩 해제·전환(스토어 연동)·다른 셀 탭(교체)·Escape로 닫힌다.
 * 영상은 테마 피드와 같은 1열 피드 카드(FeedVideoCard) — 내 영상이 앞 (MSG-253 AC 9 유지,
 * MSG-277 AC 11: 2열 그리드 대체, 점령 상세 액센트는 primary).
 * 버튼 실동작(재생·업로드)은 제외 범위 — 클릭은 no-op이어야 한다 (AC 12).
 */
export const HomeCellDetailPanel = ({
  detail,
  onClose,
  onViewAll,
}: HomeCellDetailPanelProps) => {
  // Escape 닫기 (AC 9-1) — 입력 요소 타깃 무시 계약 포함 (use-escape-close, MSG-277 공용 추출)
  useEscapeClose(onClose);

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

      {/* 1열 피드 — 섹션 헤더 없이 내 영상이 앞 (MSG-253 AC 9 정렬 유지, MSG-277 AC 11 디자인 통일) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-sm">
          {detail.myVideos.map((video) => (
            <FeedVideoCard key={video.id} video={video} mine />
          ))}
          {detail.otherVideos.map((video) => (
            <FeedVideoCard key={video.id} video={video} mine={false} />
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

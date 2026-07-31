import { Clock, MapPin } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type {
  HomeCellBadge,
  HomeCellDetail,
} from "@/features/map-home/model/home-cell-detail";
import { deriveUploadHourBuckets } from "@/features/map-home/model/upload-hours";
import { CellActionRow } from "./CellActionRow";
import { CellHourChart } from "./CellHourChart";
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
 * 홈 셀 상세 패널 (MSG-252 AC 9·9-1·10 → MSG-253 시각 정리 → MSG-277 피드 디자인 통일 →
 * MSG-277 2차 정보 구조 확장 — 네이버 지도 PC 장소 패널 층위 참고) —
 * 좌측 패널에서 요약(CellSummaryPanel)·테마 피드 자리에 전환 렌더된다(SearchBox 유지).
 * 별도 닫기 버튼 없음(A3) — 칩 해제·전환(스토어 연동)·다른 셀 탭(교체)·Escape로 닫힌다.
 * 구조: 헤더(셀명+배지+전체 보기 · 서브타이틀 · 지표 한 줄) 고정, 본문 단일 스크롤 컬럼 =
 * 액션 행 → 1열 피드(내 영상 앞) → 위치 정보 블록 → 활발한 시간대 그래프 (2차 AC 3·12).
 * 그래프·표본 문구는 실제 피드 표본(myVideos+otherVideos) 기준 — videoCount 집계 필드와
 * 다른 숫자가 병존하는 것은 의도된 정직성 장치 (AC 10, 추정 5).
 * 버튼 실동작(재생·업로드·액션 행)은 제외 범위 — 클릭은 no-op이어야 한다 (2차 AC 5).
 */
export const HomeCellDetailPanel = ({
  detail,
  onClose,
  onViewAll,
}: HomeCellDetailPanelProps) => {
  // Escape 닫기 (AC 9-1) — 입력 요소 타깃 무시 계약 포함 (use-escape-close, MSG-277 공용 추출)
  useEscapeClose(onClose);

  // 피드 표본 = 화면에 나열되는 영상 — 그래프 집계·"영상 N개 기준" 문구의 공통 기준 (AC 10)
  const feedVideos = [...detail.myVideos, ...detail.otherVideos];
  const hourBuckets = deriveUploadHourBuckets(feedVideos);

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
        {/* 지표 한 줄 — 셀 전체 지표(집계 필드), 서브타이틀(내 활동)과 별도 줄 유지 (2차 AC 1·2, 추정 2) */}
        <p className="text-fm-caption text-foreground">{detail.statsLine}</p>
      </header>

      {/* 본문 단일 스크롤 컬럼 (2차 AC 12) — 하단 고정 버튼 영역 제거, 액션 행이 대체 (2차 AC 3) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-md">
          <CellActionRow accent={detail.accent} showMashup={detail.showMashup} />

          {/* 1열 피드 — 섹션 헤더 없이 내 영상이 앞 (MSG-253 AC 9 정렬 유지, MSG-277 AC 11 디자인 통일) */}
          <div className="flex flex-col gap-sm">
            {detail.myVideos.map((video) => (
              <FeedVideoCard key={video.id} video={video} mine />
            ))}
            {detail.otherVideos.map((video) => (
              <FeedVideoCard key={video.id} video={video} mine={false} />
            ))}
          </div>

          {/* 위치 정보 블록 — 아이콘 + 한 줄씩 (2차 AC 8, 네이버 주소·영업시간 블록 참고) */}
          <section className="flex flex-col gap-xs border-t border-border pt-md">
            <p className="flex items-center gap-xs text-fm-caption text-foreground">
              <MapPin aria-hidden className="size-4 shrink-0 text-foreground-muted" />
              {detail.locationLabel}
            </p>
            <p className="flex items-center gap-xs text-fm-caption text-foreground">
              <Clock aria-hidden className="size-4 shrink-0 text-foreground-muted" />
              {detail.lastUploadText}
            </p>
          </section>

          <CellHourChart
            buckets={hourBuckets}
            sampleCount={feedVideos.length}
            accent={detail.accent}
          />
        </div>
      </div>
    </div>
  );
};

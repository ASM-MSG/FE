import { cn } from "@fillmap/ui-web";
import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import { THEME_META, type ThemeId } from "@/features/map-home/model/theme";
import type { ThemeFeed } from "@/features/map-home/model/theme-feed";
import { FeedVideoList } from "./FeedVideoList";
import { useEscapeClose } from "./use-escape-close";

interface ThemeFeedPanelProps {
  feed: ThemeFeed;
  /** 영상 카드 클릭 — 미니 디테일 패널 열기/교체 (3차 AC 4·8, 셀 상세와 공통 배선).
      MSG-326: CellVideo → FeedVideo(상위 타입) 완화 — 스토어 open과 동일 시그니처 */
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
  /** 닫기 — Escape 배선 (추정 6 — 칩 해제와 동일 효과). 칩 재클릭·전환 닫힘은 스토어 연동이 담당 */
  onClose: () => void;
}

/**
 * 테마별 배지 액센트 — 토큰 클래스 리터럴 표 (ThemeChipsBar CHIP_VIEW 관례).
 * tailwind는 클래스를 정적 스캔하므로 동적 조립 대신 리터럴 표를 쓴다. 4칩 레이아웃은 동일, 색만 차등 (AC 8).
 */
const BADGE_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot/10 text-theme-hot",
  festival: "bg-theme-festival/10 text-theme-festival",
  popup: "bg-theme-popup/10 text-theme-popup",
  route: "bg-theme-route/10 text-theme-route",
};

/** 섹션 헤더 도트 — 칩 색 정체성을 피드 그룹 경계까지 잇는다 (리뷰 반영 — 섹션-카드 메타 위계 구분) */
const DOT_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot",
  festival: "bg-theme-festival",
  popup: "bg-theme-popup",
  route: "bg-theme-route",
};

/**
 * 테마 피드 패널 (MSG-277 AC 1·2·7·8) — 칩 클릭 즉시 좌측 패널에서 요약(CellSummaryPanel) 자리에
 * 전환 렌더된다(SearchBox 유지 — Figma 오탐 방지 7). 헤더 = 테마 배지 + "· N개"(실제 나열 표본 수,
 * 추정 1·7), 본문 = 셀 라벨 섹션 헤더(AC 7) 아래 1열 피드 카드. 순수 탐색 피드 — 하단 버튼·
 * "전체 보기" 없음 (확정 4). 닫힘: 칩 재클릭(스토어)·Escape (추정 6).
 */
export const ThemeFeedPanel = ({
  feed,
  onVideoSelect,
  onClose,
}: ThemeFeedPanelProps) => {
  useEscapeClose(onClose);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <header className="flex items-center gap-xs">
        <span
          className={cn(
            "rounded-full px-xs py-0.5 text-fm-caption",
            BADGE_CLASS[feed.theme],
          )}
        >
          {THEME_META[feed.theme].label}
        </span>
        <span className="text-fm-caption text-foreground-muted">
          · {feed.totalCount}개
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 섹션 간 gap은 카드 간 gap-sm보다 확실히 넓게 — 여백만으로 그룹 경계가 읽히게 (리뷰 반영) */}
        <div className="flex flex-col gap-lg">
          {feed.sections.map((section) => (
            <section key={section.cellId} className="flex flex-col gap-xs">
              {/* 셀 식별 섹션 헤더 (AC 7) — 와이어프레임의 헤더 셀명을 피드 내 요소로 이동 (기확정 1).
                  카드 핸들(fm-body-strong)과 같은 급이면 그룹 경계가 안 읽혀 fm-title + 테마 도트 + 개수로 승격 (리뷰 반영) */}
              <h3 className="flex items-center gap-xs text-fm-title text-foreground">
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", DOT_CLASS[feed.theme])}
                />
                {section.label}
                <span className="text-fm-caption font-normal text-foreground-muted">
                  · {section.videos.length}개
                </span>
              </h3>
              <FeedVideoList
                items={section.videos}
                onVideoSelect={onVideoSelect}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

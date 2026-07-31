import { cn } from "@fillmap/ui-web";
import { THEME_META, type ThemeId } from "@/features/map-home/model/theme";
import type { ThemeFeed } from "@/features/map-home/model/theme-feed";
import { FeedVideoCard } from "./FeedVideoCard";
import { useEscapeClose } from "./use-escape-close";

interface ThemeFeedPanelProps {
  feed: ThemeFeed;
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

/**
 * 테마 피드 패널 (MSG-277 AC 1·2·7·8) — 칩 클릭 즉시 좌측 패널에서 요약(CellSummaryPanel) 자리에
 * 전환 렌더된다(SearchBox 유지 — Figma 오탐 방지 7). 헤더 = 테마 배지 + "· N개"(실제 나열 표본 수,
 * 추정 1·7), 본문 = 셀 라벨 섹션 헤더(AC 7) 아래 1열 피드 카드. 순수 탐색 피드 — 하단 버튼·
 * "전체 보기" 없음 (확정 4). 닫힘: 칩 재클릭(스토어)·Escape (추정 6).
 */
export const ThemeFeedPanel = ({ feed, onClose }: ThemeFeedPanelProps) => {
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
        <div className="flex flex-col gap-md">
          {feed.sections.map((section) => (
            <section key={section.cellId} className="flex flex-col gap-xs">
              {/* 셀 식별 섹션 헤더 (AC 7) — 와이어프레임의 헤더 셀명을 피드 내 요소로 이동 (기확정 1) */}
              <h3 className="text-fm-body-strong text-foreground">
                {section.label}
              </h3>
              <div className="flex flex-col gap-sm">
                {section.videos.map((video) => (
                  <FeedVideoCard key={video.id} video={video} mine={video.mine} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

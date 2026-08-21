import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { HotRegionSummaryResult } from "../api/use-hot-region-summary";
import { formatViewCount } from "../../../shared/format";
import { THEME_META } from "../model/themes";
import { CellActionRow } from "./cell-action-row";
import { FeedVideoList } from "./feed-video-list";
import type { HomeSheetContentContext } from "./home-sheet";
import { HourlyBars } from "./hourly-bars";
import { RegionLocationLine } from "./region-location-line";
import { SheetHeader } from "./sheet-header";
import { SheetScrollView } from "./sheet-scroll-view";
import { SheetStatusView } from "./sheet-status-view";
import { THEME_BADGE_CLASS, THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 핫구역 동 요약 시트 (MSG-427 B2·B3·B6~B9, Figma 화면 1).
 * 헤더 `{동 이름} + 핫구역 배지 + 전체 보기 + ✕` (뒤로가기 없음 — Figma 실측) →
 * 요약 두 줄 → action-row → 1열 영상 목록 → 활발한 시간대 → 위치 줄.
 *
 * 요약 수치는 이 동 핫구역 상위 5격자의 표본 합계다 — **표본이라는 사실을 화면에 알리지
 * 않는다** (승인 Q7, 웹·Figma와 동일).
 */
interface HotRegionSheetContentProps extends HomeSheetContentContext {
  summary: HotRegionSummaryResult;
  /** 헤더 표시명 — 현재 행정동. 미판별이면 null이라 안내 문구로 대체한다 */
  regionName: string | null;
  /** `전체 보기` — 테마를 풀고 기본 시트(지역 격자 목록)로 (A4와 같은 복귀) */
  onViewAll: () => void;
  /** 테마 해제 (A4) — `showsCloseButton`이 false면 undefined라 ✕가 그려지지 않는다 */
  onClose?: () => void;
  /** [영상 추가] — 업로드 화면으로 (B6) */
  onUpload: () => void;
}

export const HotRegionSheetContent = ({
  summary,
  regionName,
  onViewAll,
  onClose,
  onUpload,
  ...sheet
}: HotRegionSheetContentProps) => {
  const { stats } = summary;

  return (
    <View className="flex-1 gap-sm">
      <SheetHeader
        title={regionName ?? "이 지역"}
        badge={
          <View
            className={cx(
              "rounded-full px-1.75 py-0.75",
              THEME_BADGE_CLASS.hot,
            )}
          >
            <Text className={cx("text-fm-caption", THEME_TEXT_CLASS.hot)}>
              {THEME_META.hot.label}
            </Text>
          </View>
        }
        action={
          /* 실제 동작이 있는 컨트롤이라 role을 준다 — 목적지 없는 가짜 버튼 금지 규칙
             (영상 카드 B10·공유/저장)과 상충하지 않는다 */
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이 지역 전체 보기"
            onPress={onViewAll}
            className="active:opacity-80"
          >
            <Text className="text-fm-label text-primary">전체 보기</Text>
          </Pressable>
        }
        onClose={onClose}
      />

      <Text className="text-fm-caption text-foreground-muted">
        내 영상 {stats.myVideoCount}개 · 최근 24시간 영상 +{stats.recentCount}개
      </Text>
      <Text className="text-fm-caption text-foreground-muted">
        영상 {stats.videoCount}개 · 조회 {formatViewCount(stats.viewCount)}
      </Text>

      {/* 빈 상태에서도 액션 행·위치 줄은 계속 보여야 하므로 emptyText를 넘기지 않는다 —
          0건 문구는 아래 영상 목록 자리에서 뜬다 (B7) */}
      <SheetStatusView
        state={summary.state}
        errorText="핫구역 영상을 불러오지 못했어요"
        onRetry={summary.retry}
      />

      {summary.state !== "loading" && summary.state !== "error" && (
        <SheetScrollView {...sheet} resetKey={regionName}>
          <CellActionRow onUpload={onUpload} />

          <FeedVideoList
            items={summary.videos}
            emptyText="아직 이 지역에 핫구역 영상이 없어요"
          />

          {/* 표본이 0건이면 그래프 영역을 그리지 않는다 (B9) */}
          {summary.chart.hasData && <HourlyBars chart={summary.chart} />}

          {regionName && <RegionLocationLine regionName={regionName} />}
        </SheetScrollView>
      )}
    </View>
  );
};

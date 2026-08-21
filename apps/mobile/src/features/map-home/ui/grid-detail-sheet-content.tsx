import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { HomeGridDetail } from "../api/use-home-grid-detail";
import type { HomeCellBadge } from "../model/home-cell-detail";
import { CellActionRow } from "./cell-action-row";
import { FeedSection } from "./feed-section";
import type { HomeSheetContentContext } from "./home-sheet";
import { RegionLocationLine } from "./region-location-line";
import { SheetHeader } from "./sheet-header";
import { SheetScrollView } from "./sheet-scroll-view";
import { SheetStatusView } from "./sheet-status-view";
import { THEME_BADGE_CLASS, THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 격자 상세 시트 (MSG-427 C1·C4·C5·C8~C11, Figma 화면 2·9).
 * `‹ + 격자명 + ✕` → 배지 행(격자 코드 · 핫구역/테마 · 내 점령 · 코스 N번) → 맥락 문구 →
 * 통계 줄 → (핫구역 진입일 때만) action-row → 1열 영상 목록 → 위치 줄.
 *
 * **새 라우트로 이동하지 않는다** (C1) — 시트 콘텐츠만 바뀐다. 기존 `/grid/[cellId]`
 * 라우트는 존치하되 홈에서의 진입이 끊긴다 (승인 Q6).
 * action-row는 핫구역 격자 상세(화면 2)에만 있고 코스 스팟 격자 상세(화면 9)에는 없다 (C9).
 */
const BADGE_CLASS: Record<HomeCellBadge["id"], string> = {
  occupied: "bg-primary/10",
  hot: THEME_BADGE_CLASS.hot,
  festival: THEME_BADGE_CLASS.festival,
  popup: THEME_BADGE_CLASS.popup,
  route: THEME_BADGE_CLASS.route,
};

const BADGE_TEXT_CLASS: Record<HomeCellBadge["id"], string> = {
  occupied: "text-primary",
  hot: THEME_TEXT_CLASS.hot,
  festival: THEME_TEXT_CLASS.festival,
  popup: THEME_TEXT_CLASS.popup,
  route: THEME_TEXT_CLASS.route,
};

interface GridDetailSheetContentProps extends HomeSheetContentContext {
  gridDetail: HomeGridDetail;
  /** 이 격자의 서버 id — 배지 행의 격자 코드 (C5) */
  gridId: string;
  /** action-row 표시 여부 — 핫구역 격자 상세에만 (C9) */
  showActions: boolean;
  onBack: () => void;
  /** 테마 해제 (A4) — `showsCloseButton`이 false면 undefined라 ✕가 그려지지 않는다 */
  onClose?: () => void;
  onUpload: () => void;
}

export const GridDetailSheetContent = ({
  gridDetail,
  gridId,
  showActions,
  onBack,
  onClose,
  onUpload,
  ...sheet
}: GridDetailSheetContentProps) => {
  const { detail, videos, contextLine, selectedSpot } = gridDetail;

  if (!detail.detail)
    return (
      <View className="flex-1 gap-sm">
        <SheetHeader title="격자" onBack={onBack} onClose={onClose} />
        <SheetStatusView
          state={detail.isError ? "error" : "loading"}
          errorText="격자 정보를 불러오지 못했어요"
          onRetry={detail.retry}
        />
      </View>
    );

  const cell = detail.detail;

  return (
    <View className="flex-1 gap-sm">
      <SheetHeader title={cell.label} onBack={onBack} onClose={onClose} />

      <View className="flex-row flex-wrap items-center gap-xs">
        <View className="rounded-full bg-surface px-1.75 py-0.75">
          <Text className="text-fm-caption text-foreground-muted">
            {gridId}
          </Text>
        </View>
        {cell.badges.map((badge) => (
          <View
            key={badge.id}
            className={cx(
              "rounded-full px-1.75 py-0.75",
              BADGE_CLASS[badge.id],
            )}
          >
            <Text className={cx("text-fm-caption", BADGE_TEXT_CLASS[badge.id])}>
              {badge.label}
            </Text>
          </View>
        ))}
        {/* 코스 스팟에서 내려온 상세는 순번 배지를 함께 보여준다 (E13) */}
        {selectedSpot && (
          <View
            className={cx(
              "rounded-full px-1.75 py-0.75",
              THEME_BADGE_CLASS.route,
            )}
          >
            <Text className={cx("text-fm-caption", THEME_TEXT_CLASS.route)}>
              코스 {selectedSpot.order}번
            </Text>
          </View>
        )}
      </View>

      {contextLine && (
        <Text className="text-fm-caption text-foreground-muted">
          {contextLine}
        </Text>
      )}
      <Text className="text-fm-caption text-foreground-muted">
        {cell.subtitle}
      </Text>

      <SheetScrollView {...sheet} resetKey={gridId}>
        {showActions && <CellActionRow onUpload={onUpload} />}

        <FeedSection
          status={videos}
          items={videos.items}
          emptyText="아직 이 격자에 영상이 없어요"
          errorText="영상 목록을 불러오지 못했어요"
        />

        {/* 행정동 미판정이면 줄 자체를 그리지 않는다 (C11) */}
        {cell.regionLabel && (
          <RegionLocationLine regionName={cell.regionLabel} />
        )}
      </SheetScrollView>
    </View>
  );
};

import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { semantic } from "@fillmap/design-tokens";
import { useExploreRegionsQuery } from "../api/use-explore-regions-query";
import { autoLoadMoreEnabled } from "../model/explore-regions-query";
import type { SheetState } from "../model/home-sheet-state";
import type { SelectedRegion } from "../model/region-panel-selection";
import type { HomeSheetContentContext } from "./home-sheet";
import { SheetHeader } from "./sheet-header";
import { SheetNotice } from "./sheet-notice";
import { SheetScrollView } from "./sheet-scroll-view";
import { SheetStatusView } from "./sheet-status-view";

/**
 * 전체 지역 목록 시트 (MSG-571 AC 6·8~12) — 웹 `RegionListView` 이식. "전체 보기"로
 * 열리고, 20개 커서 페이지를 스크롤 끝 근접으로 자동 이어받는다. 하단 3상태:
 * 이어받는 중(로더) / 실패(SheetNotice — 받은 목록 유지) / 더 없음(아무것도 없음).
 * 조회 훅은 여기서 부른다 — 마운트 자체가 "전체 보기" 게이트다 (추정 7).
 */
interface RegionListSheetContentProps extends HomeSheetContentContext {
  onBack: () => void;
  onSelectRegion: (region: SelectedRegion) => void;
}

export const RegionListSheetContent = ({
  onBack,
  onSelectRegion,
  ...sheet
}: RegionListSheetContentProps) => {
  const query = useExploreRegionsQuery();
  const { regions } = query;
  const state: SheetState = query.isError
    ? "error"
    : query.isPending || regions === undefined
      ? "loading"
      : regions.length === 0
        ? "empty"
        : "list";

  return (
    <View className="flex-1 gap-sm">
      <SheetHeader title="전체 지역" onBack={onBack} />
      <SheetStatusView
        state={state}
        emptyText="아직 표시할 지역이 없어요"
        errorText="지역 목록을 불러오지 못했어요"
        onRetry={query.retry}
      />
      {state === "list" && (
        <SheetScrollView
          {...sheet}
          onEndReached={autoLoadMoreEnabled(query) ? query.loadMore : undefined}
        >
          {regions?.map((region) => (
            <Pressable
              key={region.regionCode}
              accessibilityRole="button"
              accessibilityLabel={`${region.regionName}, 격자 ${region.gridCount}개`}
              onPress={() =>
                onSelectRegion({
                  regionCode: region.regionCode,
                  regionName: region.regionName,
                })
              }
              className="flex-row items-center justify-between gap-sm py-xs active:opacity-80"
            >
              <Text
                numberOfLines={1}
                className="flex-1 text-fm-body-strong text-foreground"
              >
                {region.regionName}
              </Text>
              <Text className="text-fm-caption text-foreground-muted">
                격자 {region.gridCount}개
              </Text>
            </Pressable>
          ))}
          {query.isLoadingMore && (
            <ActivityIndicator color={semantic.primary} />
          )}
          {query.loadMoreFailed && (
            <SheetNotice
              message="다음 지역을 불러오지 못했어요"
              onRetry={query.loadMore}
            />
          )}
        </SheetScrollView>
      )}
    </View>
  );
};

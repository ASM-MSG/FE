import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { SearchBar } from "@fillmap/ui-native";
import type { LatLng } from "../../../entities/cell/model/grid";
import { useExploreRegionsQuery } from "../../map-home/api/use-explore-regions-query";
import { autoLoadMoreEnabled } from "../../map-home/model/explore-regions-query";
import {
  homeFocusParams,
  type HomeFocusTarget,
} from "../../map-home/model/home-focus";
import { selectRegion } from "../../map-home/model/region-panel-selection";
import {
  LOAD_MORE_THRESHOLD_PX,
  isNearScrollEnd,
} from "../../map-home/model/scroll-end";
import { SheetNotice } from "../../map-home/ui/sheet-notice";
import { usePlaceSearchQuery } from "../api/use-place-search-query";
import { useTrendingQuery } from "../api/use-trending-query";
import { useZonesQuery } from "../api/use-zones-query";
import {
  deriveGridSearchResults,
  type GridSearchResult,
} from "../model/zone-search";
import {
  GridResultList,
  PlaceResultList,
  TrendingList,
} from "./search-result-lists";

/**
 * SOURCE: Figma "검색/지역 필터" (node 14094:4662) — 전체 화면 검색 UI (MSG-297 → MSG-578 실연동).
 * 입력 없음(idle): 인기 검색어 → 전체 지역(`GET /api/regions/explore`) — 웹 HomeSearchBox처럼
 * 최근 검색은 두지 않는다(2026-09-07 사용자 결정, 신 디자인에서 폐기).
 * 입력 중(결과 모드): 격자/구역 매치(zones 로컬 역파싱, 즉시) → 장소 결과(300ms 디바운스).
 * 결과 탭은 `/home` params(`homeFocusParams`)로 복귀하고 홈이 카메라·하이라이트를 처리한다.
 * 상단 행은 AppHeader(중앙 타이틀형) 불일치로 로컬 조립(MSG-297 스펙 재사용 계획).
 */
export const SearchScreen = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const hasInput = query.trim().length > 0;

  const search = usePlaceSearchQuery(query);
  // 화면 마운트 = 웹 드롭다운 open — 입력 없음일 때만 인기 검색어 조회 (D15)
  const trending = useTrendingQuery(!hasInput);
  const zones = useZonesQuery();
  const gridResults = useMemo(
    () => deriveGridSearchResults(zones, query),
    [zones, query],
  );
  const regions = useExploreRegionsQuery();

  /** 즉시 검색 커밋 — Enter·검색 아이콘·인기 검색어 탭 (D15). 빈 값 무시 */
  const commitSearch = (term: string) => {
    const q = term.trim();
    if (!q) return;
    setQuery(q);
    search.searchNow(q);
  };

  /**
   * 홈 복귀 + 카메라 목적지 — 매 복귀마다 5키 전부 실어 이전 params 잔존을 막는다 (D1).
   * `dismissTo`(POP_TO)라야 **기존 홈 인스턴스**로 돌아가 params만 갱신된다 — `navigate`는
   * 홈을 새로 마운트해 줌 16으로 리셋됐고(줌 18 실측) 하이라이트·뒤로가기 스택도 어긋났다(codex 리뷰 P2)
   */
  const goHome = (target: HomeFocusTarget) => {
    router.dismissTo({
      pathname: "/home",
      params: homeFocusParams(target, Date.now()),
    });
  };

  /** 장소 결과 탭 — 홈 복귀 + 그 좌표로 이동 */
  const selectPlace = (center: LatLng) => goHome({ kind: "point", center });

  /** 격자 → 중심 이동 + 줌 보장 + 하이라이트 / 구역 → fitBounds (D3·D4) */
  const selectGridResult = (result: GridSearchResult) => {
    if (result.kind === "grid") goHome({ kind: "grid", gridId: result.gridId });
    else goHome({ kind: "bounds", bounds: result.bounds });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* 상단 행: 뒤로가기 + 검색 입력 */}
      <View className="flex-row items-center gap-xxs border-b border-border py-2.5 pl-xs pr-md">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() => router.back()}
          className="size-10 items-center justify-center active:opacity-60"
        >
          <ChevronLeft size={24} color={semantic.iconDefault} />
        </Pressable>
        <SearchBar
          className="flex-1"
          placeholder="장소, 격자 검색"
          autoFocus
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => commitSearch(query)}
          onSearch={() => commitSearch(query)}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        // 전체 지역 이어받기 (D12) — 스크롤 끝 근접 + 자동 이어받기 허용 상태에서만
        onScroll={(event) => {
          if (
            !hasInput &&
            autoLoadMoreEnabled(regions) &&
            isNearScrollEnd(event.nativeEvent, LOAD_MORE_THRESHOLD_PX)
          )
            regions.loadMore();
        }}
      >
        {hasInput ? (
          <>
            {gridResults.length > 0 && (
              <GridResultList
                results={gridResults}
                onSelect={selectGridResult}
              />
            )}
            <PlaceResultList
              places={search.places}
              isError={search.isError}
              onRetry={search.retry}
              onSelect={selectPlace}
            />
          </>
        ) : (
          <>
            {/* 인기 검색어 (S1·S2) — 제거된 최근 방문 자리 (D10) */}
            <TrendingList
              keywords={trending.keywords}
              isError={trending.isError}
              onSelect={commitSearch}
            />

            {/* 회색 구분 밴드 (Figma divider, h 8) */}
            <View className="h-2 w-full bg-surface" />

            {/* 전체 지역 (S10, D11·D12) — 행 탭 시 시트 지역 교체 + 홈 복귀, 홈이 첫 격자 중심으로 지도 이동(A1 번복) */}
            <View className="px-5 pb-lg pt-md">
              <Text className="text-fm-body-strong text-foreground-muted">
                전체 지역
              </Text>
              {regions.isError ? (
                <View className="pt-sm">
                  <SheetNotice
                    message="지역 목록을 불러오지 못했어요"
                    onRetry={regions.retry}
                  />
                </View>
              ) : regions.regions === undefined ? (
                <View className="py-sm">
                  <ActivityIndicator color={semantic.primary} />
                </View>
              ) : regions.regions.length === 0 ? (
                <Text className="py-sm text-fm-body text-foreground-muted">
                  아직 표시할 지역이 없어요
                </Text>
              ) : (
                regions.regions.map((region, index, all) => (
                  <Pressable
                    key={region.regionCode}
                    accessibilityRole="button"
                    accessibilityLabel={`${region.regionName}, 격자 ${region.gridCount}개`}
                    onPress={() => {
                      selectRegion({
                        regionCode: region.regionCode,
                        regionName: region.regionName,
                      });
                      // back()으로 홈을 그대로 둔다 — navigate("/home")는 홈을 리마운트해
                      // 초기 현재 위치 이동 + clearSelectedRegion이 선택을 지웠다(검증 S10)
                      router.back();
                    }}
                    className={
                      index < all.length - 1
                        ? "flex-row items-center gap-xs border-b border-border py-3.5 active:opacity-60"
                        : "flex-row items-center gap-xs py-3.5 active:opacity-60"
                    }
                  >
                    <Text className="flex-1 text-fm-title font-medium text-foreground">
                      {region.regionName}
                    </Text>
                    <Text className="text-fm-body text-foreground-muted">
                      격자 {region.gridCount}개
                    </Text>
                    <ChevronRight size={16} color={semantic.muted} />
                  </Pressable>
                ))
              )}
              {regions.isLoadingMore && (
                <View className="py-sm">
                  <ActivityIndicator color={semantic.primary} />
                </View>
              )}
              {regions.loadMoreFailed && (
                <View className="pt-sm">
                  <SheetNotice
                    message="다음 지역을 불러오지 못했어요"
                    onRetry={regions.loadMore}
                  />
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

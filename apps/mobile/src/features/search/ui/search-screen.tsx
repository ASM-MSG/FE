import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Chip, SearchBar } from "@fillmap/ui-native";
import {
  MOCK_RECENT_VISITS,
  selectRegions,
  type Region,
} from "../../../entities/region/model/regions";
import { matchRegion } from "../model/match-region";
import { searchStore, useRecentSearches } from "../model/search-store";

/**
 * SOURCE: Figma "검색/지역 필터" (node 14094:4662) — 전체 화면 검색 UI (MSG-297).
 * 상단 뒤로가기+검색 입력, 최근 방문 칩, 최근 검색 목록, 전체 지역 목록 (idle 상태만 —
 * 결과 화면·서버 API 제외 범위). 지명·격자 수는 부산 목데이터가 정본(Figma 서울 지명은
 * 플레이스홀더, AC 12). 상단 행은 AppHeader(중앙 타이틀형) 불일치로 로컬 조립(스펙 재사용 계획).
 */
export const SearchScreen = () => {
  const router = useRouter();
  const recentSearches = useRecentSearches();
  const [query, setQuery] = useState("");
  const regions = selectRegions();

  /** 지도 이동 + 홈 복귀 (AC 3·10·11) — ts는 요청 식별자: 같은 구 연속 이동도 재발화 */
  const goToRegion = (region: Region) => {
    router.navigate({
      pathname: "/home",
      params: {
        lat: String(region.center.lat),
        lng: String(region.center.lng),
        ts: String(Date.now()),
      },
    });
  };

  /** 제출 의미론 (AC 7·11, D-Q1) — 기록 갱신 후, 구 이름 일치 시에만 지도 이동+홈 복귀 */
  const handleSubmit = (term: string) => {
    searchStore.submitSearch(term);
    const matched = matchRegion(regions, term);
    if (matched) goToRegion(matched);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* 상단 행: 뒤로가기 + 검색 입력 (AC 1·2) */}
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
          placeholder="장소, 격자, 영상 검색"
          autoFocus
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSubmit(query)}
          onSearch={() => handleSubmit(query)}
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {/* 최근 방문 (AC 3) — 목데이터 칩, 탭 시 해당 구로 지도 이동+홈 복귀 */}
        <View className="px-5 pt-md">
          <Text className="text-fm-body-strong text-foreground-muted">
            최근 방문
          </Text>
          <View className="flex-row gap-xs pb-xs pt-2.5">
            {MOCK_RECENT_VISITS.map((name) => {
              const region = regions.find((r) => r.name === name);
              return (
                <Chip
                  key={name}
                  text={name}
                  className="bg-surface"
                  onPress={region ? () => goToRegion(region) : undefined}
                />
              );
            })}
          </View>
        </View>

        {/* 최근 검색 (AC 4~6·11) — 0건이면 섹션 자체(제목·전체 삭제 포함) 미렌더 (AC 8) */}
        {recentSearches.length > 0 && (
          <View className="px-5 pb-xs pt-md">
            <View className="flex-row items-center pb-1.5">
              <Text className="flex-1 text-fm-body-strong text-foreground-muted">
                최근 검색
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => searchStore.clearSearches()}
                hitSlop={8}
                className="active:opacity-60"
              >
                <Text className="text-fm-body text-foreground-muted">
                  전체 삭제
                </Text>
              </Pressable>
            </View>
            {recentSearches.map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                // 탭한 검색어를 입력창에도 반영 — 불일치로 화면에 머무는 경우(D-Q1)
                // 무엇을 검색했는지 보이게 (PR #37 리뷰)
                onPress={() => {
                  setQuery(term);
                  handleSubmit(term);
                }}
                className="flex-row items-center gap-sm py-sm active:opacity-60"
              >
                <Clock size={20} color={semantic.muted} />
                <Text className="flex-1 text-fm-title font-normal text-foreground">
                  {term}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${term} 삭제`}
                  onPress={() => searchStore.removeSearch(term)}
                  hitSlop={8}
                  className="active:opacity-60"
                >
                  <X size={16} color={semantic.muted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}

        {/* 회색 구분 밴드 (Figma divider, h 8) */}
        <View className="h-2 w-full bg-surface" />

        {/* 전체 지역 (AC 9·10) — 행 탭 시 해당 구로 지도 이동+홈 복귀 */}
        <View className="px-5 pb-lg pt-md">
          <Text className="text-fm-body-strong text-foreground-muted">
            전체 지역
          </Text>
          {regions.map((region, index) => (
            <Pressable
              key={region.name}
              accessibilityRole="button"
              onPress={() => goToRegion(region)}
              className={
                index < regions.length - 1
                  ? "flex-row items-center gap-xs border-b border-border py-3.5 active:opacity-60"
                  : "flex-row items-center gap-xs py-3.5 active:opacity-60"
              }
            >
              <Text className="flex-1 text-fm-title font-medium text-foreground">
                {region.name}
              </Text>
              <Text className="text-fm-body text-foreground-muted">
                격자 {region.count.toLocaleString()}
              </Text>
              <ChevronRight size={16} color={semantic.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

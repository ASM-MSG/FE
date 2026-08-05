import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { Chip } from "@fillmap/ui-native";
import { MOCK_GRID_COUNT, MOCK_GRID_VIDEOS } from "../model/mock-grid-videos";
import { sortGridVideos, type GridVideoSort } from "../model/sort-grid-videos";
import type { HomeSheetContentContext } from "./home-sheet";
import { GridVideoCard } from "./grid-video-card";

/**
 * 시트 기본 콘텐츠 (MSG-294 AC 10 4차 통일 — 전 단계 동일 목록) — MSG-298 쉘/콘텐츠
 * 분리로 HomeSheet에서 이관. 헤더 "서면 격자"·정렬 칩·2열 그리드 구성은 이관 전과
 * 동일하다. 3단계(피크)는 PEEK_HEIGHT가 이 콘텐츠의 상단(헤더·정렬 칩)까지만 노출.
 */
export const DefaultSheetContent = ({
  scrollGesture,
  scrollEnabled,
  onScrollOffsetChange,
}: HomeSheetContentContext) => {
  const [sort, setSort] = useState<GridVideoSort>("popular");
  const videos = useMemo(() => sortGridVideos(MOCK_GRID_VIDEOS, sort), [sort]);

  // 콘텐츠 교체 재마운트 시 스크롤 가드 스테일 방지 — 새 스크롤 뷰는 오프셋 0 (쉘 계약)
  useEffect(() => {
    onScrollOffsetChange(0);
  }, [onScrollOffsetChange]);

  return (
    <View className="flex-1 gap-sm">
      <View className="flex-row items-center">
        <Text className="flex-1 text-fm-title text-foreground">서면 격자</Text>
        <Text className="text-fm-label text-foreground-muted">
          {MOCK_GRID_COUNT}개
        </Text>
      </View>
      <View className="flex-row gap-xs">
        <Chip
          text="인기순"
          active={sort === "popular"}
          onPress={() => setSort("popular")}
        />
        <Chip
          text="최신순"
          active={sort === "latest"}
          onPress={() => setSort("latest")}
        />
      </View>
      <GestureDetector gesture={scrollGesture}>
        <ScrollView
          style={{ flex: 1 }}
          scrollEnabled={scrollEnabled}
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            onScrollOffsetChange(event.nativeEvent.contentOffset.y);
          }}
        >
          <View className="flex-row flex-wrap justify-between gap-y-md pb-9">
            {videos.map((video) => (
              <GridVideoCard key={video.id} video={video} className="w-[48%]" />
            ))}
          </View>
        </ScrollView>
      </GestureDetector>
    </View>
  );
};

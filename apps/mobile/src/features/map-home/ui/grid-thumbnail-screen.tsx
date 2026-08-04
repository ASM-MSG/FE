import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BottomSheet, Chip, MapIconButton } from "@fillmap/ui-native";
import type { LatLng } from "../../../entities/cell/model/grid";
import { MOCK_GRID_COUNT, MOCK_GRID_VIDEOS } from "../model/mock-grid-videos";
import { sortGridVideos, type GridVideoSort } from "../model/sort-grid-videos";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { GridMap } from "./grid-map";
import { GridVideoCard } from "./grid-video-card";

interface GridThumbnailScreenProps {
  /** 직전 지도 영역 — 지도 홈이 넘긴 카메라 (AC 13) */
  initialCenter: LatLng;
  initialZoom?: number;
}

/**
 * 격자 썸네일 뷰 (Figma 14094:4124) — 상단 직전 지도 영역 + 확장 시트의
 * "서면 격자" 헤더·정렬 칩·2열 영상 그리드 (AC 13~16).
 * 바텀 내비는 Figma 프레임에 없지만 표시한다 — 사용자 결정 2 (Figma 오탐 방지 6).
 */
export const GridThumbnailScreen = ({
  initialCenter,
  initialZoom,
}: GridThumbnailScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<GridVideoSort>("popular");
  const videos = sortGridVideos(MOCK_GRID_VIDEOS, sort);

  return (
    <View className="flex-1 bg-background">
      <View className="h-2/5">
        <GridMap initialCenter={initialCenter} initialZoom={initialZoom} />
        <View className="absolute left-md" style={{ top: insets.top + 8 }}>
          <MapIconButton
            icon="back"
            onPress={() => router.back()}
            className="bg-surface-elevated shadow-raised"
          />
        </View>
      </View>

      <BottomSheet className="-mt-6 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-fm-title text-foreground">
            서면 격자
          </Text>
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
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-row flex-wrap justify-between gap-y-md pb-9"
        >
          {videos.map((video) => (
            <GridVideoCard
              key={video.id}
              video={video}
              size="lg"
              showDuration
              className="w-[48%]"
            />
          ))}
        </ScrollView>
      </BottomSheet>

      <View style={{ paddingBottom: insets.bottom }}>
        <AppBottomNav className="-mt-5" />
      </View>
    </View>
  );
};

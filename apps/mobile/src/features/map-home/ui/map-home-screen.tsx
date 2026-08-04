import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Avatar,
  BottomSheet,
  Chip,
  Fab,
  MapIconButton,
  SearchBar,
} from "@fillmap/ui-native";
import { SEOMYEON_CENTER, resolveMapCenter } from "../../../shared/geolocation";
import {
  MOCK_GRID_COUNT,
  MOCK_GRID_VIDEOS,
  MOCK_VIDEO_TOTAL,
} from "../model/mock-grid-videos";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { DEFAULT_ZOOM, GridMap } from "./grid-map";
import type { GridMapCamera, GridMapRef } from "./grid-map";
import { GridVideoCard } from "./grid-video-card";

/** 카테고리 칩 4종 (AC 7) — 탭 동작은 검색·필터 제외 범위 */
const CATEGORY_CHIPS = ["핫구역", "지역축제", "팝업스토어", "경로추천"];

/**
 * 지도 홈 (Figma 14094:3981) — 네이버 지도 + 격자 오버레이 위에
 * 검색바·칩·내 위치·FAB·피크 바텀시트·바텀 내비를 얹는다 (AC 5~12).
 */
export const MapHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<GridMapRef>(null);
  /** 직전 카메라(정착 시점 스냅샷) — 격자 썸네일 뷰 상단 지도에 그대로 넘긴다 (AC 13) */
  const [lastCamera, setLastCamera] = useState<GridMapCamera>({
    center: SEOMYEON_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  useEffect(() => {
    // 초기 중심 결정 (AC 2): 지도는 서면으로 먼저 뜨고, 권한 승인 + 조회 성공 시에만
    // 현재 위치로 이동한다 — 폴백(SEOMYEON_CENTER)은 동일 객체 참조라 이동 생략
    void resolveMapCenter().then((center) => {
      if (center !== SEOMYEON_CENTER) mapRef.current?.moveTo(center);
    });
  }, []);

  /** 내 위치 버튼 (AC 8) — 현재 위치(폴백: 서면)로 카메라 이동, 격자는 카메라 이벤트로 갱신 */
  const handleLocate = () => {
    void resolveMapCenter().then((center) => mapRef.current?.moveTo(center));
  };

  /** 전체 보기·시트 스와이프 업 공용 진입 (AC 11) — 직전 카메라를 파라미터로 전달 */
  const openGridVideos = () => {
    const { center, zoom } = lastCamera;
    router.push({
      pathname: "/grid-videos",
      params: {
        lat: String(center.lat),
        lng: String(center.lng),
        zoom: String(zoom),
      },
    });
  };

  // 시트 위로 스와이프 → 전체 보기와 동일 전환 (D4 — 연속 드래그 애니메이션은 범위 밖).
  // 수직 위 방향에서만 활성화해 시트 안 가로 스크롤과 충돌하지 않게 한다.
  const swipeUp = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(-12)
    .failOffsetY(12)
    .failOffsetX([-16, 16])
    .onEnd((event) => {
      if (event.translationY < -24) openGridVideos();
    });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <View className="absolute inset-0">
          <GridMap
            ref={mapRef}
            initialCenter={SEOMYEON_CENTER}
            onCameraIdle={setLastCamera}
          />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 top-0"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-sm px-md pt-sm">
            <SearchBar className="flex-1" placeholder="장소, 격자, 영상 검색" />
            <Avatar size="md" fallback="나" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-sm"
            contentContainerClassName="gap-xs px-md"
          >
            {CATEGORY_CHIPS.map((label) => (
              <Chip key={label} text={label} className="shadow-raised" />
            ))}
          </ScrollView>
        </View>

        <View className="absolute inset-x-0 bottom-0">
          <View
            pointerEvents="box-none"
            className="items-end gap-2.5 px-md pb-sm"
          >
            <MapIconButton icon="locate" onPress={handleLocate} />
            <Fab accessibilityLabel="기록하기" />
          </View>
          <GestureDetector gesture={swipeUp}>
            <BottomSheet
              title={`이 지역 격자 ${MOCK_GRID_COUNT}개 · 영상 ${MOCK_VIDEO_TOTAL}개`}
              actionLabel="전체 보기"
              onAction={openGridVideos}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2.5 pb-5"
              >
                {MOCK_GRID_VIDEOS.map((video) => (
                  <GridVideoCard
                    key={video.id}
                    video={video}
                    className="w-28"
                  />
                ))}
              </ScrollView>
            </BottomSheet>
          </GestureDetector>
          <View style={{ paddingBottom: insets.bottom }}>
            <AppBottomNav className="-mt-5" />
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

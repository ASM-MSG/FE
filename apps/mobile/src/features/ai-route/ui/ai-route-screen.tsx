import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { palette } from "@fillmap/design-tokens";
import { MapIconButton } from "@fillmap/ui-native";
import {
  SEOMYEON_CENTER,
  resolveMapCenter,
  resolveMapCenterWithPermission,
} from "../../../shared/geolocation";
import { goToLogin } from "../../../shared/navigation";
import type { PermissionState } from "../../../shared/permission-state";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { PermissionNoticeModal } from "../../permissions/ui/permission-notice-modal";
import { useOccupiedGridsQuery } from "../../map-home/api/use-occupied-grids-query";
import { locateBottomOffset } from "../../map-home/model/locate-offset";
import { MAP_SCALE_1KM_ZOOM } from "../../map-home/model/map-scale";
import type { SheetStage } from "../../map-home/model/sheet-snap";
import type { Viewport } from "../../map-home/model/viewport";
import { GridMap, type GridMapRef } from "../../map-home/ui/grid-map";
import { HomeSheet, type HomeSheetRef } from "../../map-home/ui/home-sheet";
import { useRouteRecommend } from "../api/use-route-recommend";
import { aiRouteStore, useAiRouteState } from "../model/ai-route-store";
import { buildRecommendBody } from "../model/route-request";
import { AiRouteSheetContent } from "./ai-route-sheet-content";
import { useAiRouteOverlays } from "./use-ai-route-overlays";

/** BottomNav 바 실높이(h-16=64px) — map-home-screen과 같은 값 */
const NAV_BAR_HEIGHT = 64;

/**
 * AI 경로 추천 화면 (MSG-556) — 전용 라우트 `/ai-route`에 자체 `GridMap` + `HomeSheet` +
 * `AppBottomNav`를 조립한다(격자 상세가 자체 지도를 띄우는 선례, §1-1 A안). 지도 홈은 0줄.
 *
 * 두 모드는 스토어 `status` 하나로 파생한다 (§1-2):
 * - 대기(`idle`) — 내 위치 버튼 + 대기 시트(빈 상태·칩·입력 카드) + 바텀 내비
 * - 결과(`loading`/`result`/`error`) — ← + 내 위치, 시트 half, 바텀 내비 숨김
 *
 * 초기 카메라는 진입 1회 현재 위치 + 1km 축척이다 (D1) — `initialZoom`이 1km 상수라
 * `moveTo`가 그 줌으로 정착한다. 결과 도착 시 카메라는 움직이지 않는다 (D2, 웹 S6).
 * [MSG-489 확장점] 요청 전 1km 축척 정규화·mentionedArea 이동 — 지금은 진입 1회 1km 세팅뿐,
 * 제출은 현재 뷰포트 그대로다 (`submit`).
 */
export const AiRouteScreen = () => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<GridMapRef>(null);
  const sheetRef = useRef<HomeSheetRef>(null);

  /** 지도 이동이 끝날 때마다 갱신되는 현재 뷰포트 (지도 준비 전 null) — 홈 관례 */
  const [viewport, setViewport] = useState<Viewport | null>(null);
  /** 내 위치 권한 안내 (MSG-447) — null이면 닫힘 */
  const [locationNotice, setLocationNotice] = useState<PermissionState | null>(
    null,
  );
  const [sheetLayout, setSheetLayout] = useState<{
    stage: SheetStage;
    containerHeight: number;
  }>({ stage: 2, containerHeight: 0 });

  const state = useAiRouteState();
  const { status, points, selectedOrder } = state;
  const bounds = viewport?.bounds ?? null;
  const resultMode = status !== "idle";

  // 점령 격자는 홈과 같은 쿼리키라 캐시 히트 — 교집합 빗금의 재료 (§1-3)
  const occupied = useOccupiedGridsQuery(bounds);
  const recommend = useRouteRecommend({ onLoginRequired: goToLogin });

  /** 지도 탭 — 시트 peek (D6). 4단(숨김)에서도 peek로 복귀. GridMap의 셀 탭 계약을 그대로 탄다 */
  const peekSheet = useCallback(() => {
    sheetRef.current?.snapTo(3);
  }, []);

  /** 마커 탭 — 선택 + 시트 half (카드 스크롤은 시트 콘텐츠가 selectedOrder에 반응) (D8) */
  const selectFromMarker = useCallback((seq: number) => {
    aiRouteStore.selectOrder(seq);
    sheetRef.current?.snapTo(2);
  }, []);

  const overlays = useAiRouteOverlays({
    points,
    selectedOrder,
    occupiedGrids: occupied.grids,
    onWaypointTap: selectFromMarker,
  });

  // 진입 1회 현재 위치 (D1) — 폴백(서면)은 초기 카메라와 같은 객체 참조라 이동 생략 (홈 관례).
  // 권한 프롬프트는 resolveMapCenter의 in-flight 공유를 타 홈과 동시에 떠도 한 번뿐이다 (R2)
  useEffect(() => {
    void resolveMapCenter().then((center) => {
      if (center !== SEOMYEON_CENTER) mapRef.current?.moveTo(center);
    });
  }, []);

  /** ← / Android 뒤로가기 — 결과 모드면 대기로, 대기면 false로 화면을 벗어난다 (§1-2) */
  const goBack = useCallback((): boolean => {
    if (aiRouteStore.getState().status === "idle") return false;
    aiRouteStore.dismissResult();
    return true;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        goBack,
      );
      return () => subscription.remove();
    }, [goBack]),
  );

  // 시트 단계 — 로딩·결과·에러 진입(status 전환)도, 탭 복귀(포커스)도 half (D12). 대기 복귀도 half
  useEffect(() => {
    sheetRef.current?.snapTo(2);
  }, [status]);
  useFocusEffect(
    useCallback(() => {
      sheetRef.current?.snapTo(2);
    }, []),
  );

  /** "동선 짜기"/"다시 짜기" — 입력 카드의 현재 문장 + 현재 뷰포트 (D4) */
  const submit = () => {
    const body = buildRecommendBody({
      text: aiRouteStore.getState().text,
      bounds,
    });
    if (body === null) return;
    Keyboard.dismiss();
    recommend.mutate(body);
  };

  /** 카드 탭 — 선택 + 그 지점으로 이동, 줌은 그대로 (D8, 웹 S8) */
  const selectFromCard = (order: number) => {
    aiRouteStore.selectOrder(order);
    const point = points.find((item) => item.order === order);
    if (point) mapRef.current?.panTo({ lat: point.lat, lng: point.lng });
  };

  /** 내 위치 — 권한 없으면 카메라를 움직이지 않고 안내 (MSG-447, 홈과 동일) */
  const handleLocate = () => {
    void resolveMapCenterWithPermission().then(({ center, permission }) => {
      if (permission !== "granted") {
        setLocationNotice(permission);
        return;
      }
      mapRef.current?.moveTo(center);
    });
  };

  /** 시트 컨테이너 하단 오프셋 — 결과 모드는 바텀 내비가 없어 인셋만 */
  const bottomOffset = insets.bottom + (resultMode ? 0 : NAV_BAR_HEIGHT);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <View className="absolute inset-0">
          <GridMap
            ref={mapRef}
            initialCenter={SEOMYEON_CENTER}
            initialZoom={MAP_SCALE_1KM_ZOOM}
            themeColor={palette["theme-route"]}
            occupiedCells={overlays.occupiedCells}
            themeCells={overlays.themeCells}
            hatchCells={overlays.hatchCells}
            route={overlays.route}
            onViewportChange={setViewport}
            onCellTap={peekSheet}
          />
        </View>

        {/* 결과 모드 좌상단 ← (§1-2) — 격자 상세와 같은 흰 원형·raised */}
        {resultMode && (
          <View
            pointerEvents="box-none"
            className="absolute inset-x-0 top-0 px-md"
            style={{ paddingTop: insets.top + 8 }}
          >
            <MapIconButton
              icon="back"
              onPress={goBack}
              className="self-start bg-surface-elevated shadow-raised"
            />
          </View>
        )}

        {/* 내 위치 — 시트 단계에 따라 함께 올라가 가려지지 않는다 (홈과 동일) */}
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 items-end px-md"
          style={{
            bottom: locateBottomOffset(
              sheetLayout.stage,
              sheetLayout.containerHeight,
              bottomOffset,
            ),
          }}
        >
          <MapIconButton icon="locate" onPress={handleLocate} />
        </View>

        <HomeSheet
          ref={sheetRef}
          bottomOffset={bottomOffset}
          onStageChange={(stage, containerHeight) =>
            setSheetLayout({ stage, containerHeight })
          }
        >
          {(context) => (
            <AiRouteSheetContent
              {...context}
              state={state}
              mapReady={bounds !== null}
              onChangeText={aiRouteStore.setText}
              onSubmit={submit}
              onInputFocus={() => sheetRef.current?.snapTo(1)}
              onSelectCard={selectFromCard}
            />
          )}
        </HomeSheet>

        <PermissionNoticeModal
          axis="location"
          state={locationNotice}
          onDismiss={() => setLocationNotice(null)}
          onRequest={handleLocate}
        />

        {/* 바텀 내비는 대기 모드에만 — 결과 모드는 탭바 숨김 (시안 승인안 A) */}
        {!resultMode && (
          <View className="absolute inset-x-0 bottom-0">
            <AppBottomNav />
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

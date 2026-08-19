import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Avatar, MapIconButton, SearchBar } from "@fillmap/ui-native";
import { SEOMYEON_CENTER, resolveMapCenter } from "../../../shared/geolocation";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { useOccupiedGridsQuery } from "../api/use-occupied-grids-query";
import { useRegionGridsQuery } from "../api/use-region-grids-query";
import { useReverseGeocodeQuery } from "../api/use-reverse-geocode-query";
import { deriveSheetState } from "../model/home-sheet-state";
import { locateBottomOffset } from "../model/locate-offset";
import { toOccupiedCells } from "../model/occupied-grids";
import type { SheetStage } from "../model/sheet-snap";
import { THEME_META, deriveHomeTopBar } from "../model/themes";
import type { ThemeId } from "../model/themes";
import { toggleTheme } from "../model/theme-chip-view";
import type { Viewport } from "../model/viewport";
import {
  MOCK_OCCUPIED_CELLS,
  MOCK_ROUTE_PATH,
  MOCK_THEME_GRIDS,
  buildRouteWaypoints,
} from "../model/mock-theme-data";
import { hasCellVideos } from "../../grid-detail/model/cell-detail";
import { classifyCells } from "../model/theme-cells";
import { setSelectedTheme, useSelectedTheme } from "../model/theme-selection";
import { buildThemeSheet } from "../model/theme-sheet";
import { GridMap } from "./grid-map";
import type { GridMapRef } from "./grid-map";
import { HomeSheet } from "./home-sheet";
import type { HomeSheetRef } from "./home-sheet";
import { DefaultSheetContent } from "./default-sheet-content";
import { ThemeChipsBar } from "./theme-chips-bar";
import { ThemeSheetContent } from "./theme-sheet-content";

/** BottomNav 바 실높이(h-16=64px) — 카메라 돌출부(상단 20px)는 시트 위로 겹친다 */
const NAV_BAR_HEIGHT = 64;

/**
 * 지도 홈 — 네이버 지도 + 격자 오버레이 위에 검색바·테마 칩·내 위치·4단계 드래그 시트·
 * 바텀 내비를 얹는다.
 *
 * 이 화면은 MSG-423이 소유하고 MSG-427(테마 상세)·MSG-428(클러스터)이 이어받는다.
 * 후속 티켓이 서로 다른 줄을 만지도록 층을 분리해 둔다:
 *
 * - **확장점 ①(뷰포트)** — 뷰포트·줌은 이 화면이 단일 소유(useState)하고 아래로 내려준다.
 *   갱신은 GridMap의 `onViewportChange`(SDK onCameraIdle = 이동 종료)로만 들어온다.
 *   MSG-428 클러스터는 같은 `viewport.zoom`을 구독하고 새 상태를 만들지 않는다.
 * - **확장점 ②(테마)** — 테마 상태는 `theme-selection.ts`(모듈 싱글턴) 하나뿐이고, 화면은
 *   `themeId`로 **시트 콘텐츠 스위치 한 줄**과 **지도 테마 prop 3개**만 분기한다.
 *   MSG-427은 `ThemeSheetContent`와 그 model만 갈아끼운다.
 * - **확장점 ③(지도 오버레이)** — GridMap의 오버레이 prop을 층별로 유지한다
 *   (`occupiedCells` = 실 API 상시 점령 층 / `themeCells`·`hatchCells`·`route` = 테마 층 /
 *   MSG-428이 신설할 `clusters`). 층을 섞지 않는다.
 * - 조회 훅은 전부 `features/map-home/api/`에 있고 화면은 훅 호출만 한다 —
 *   화면에 `useQuery` 직접 호출을 두지 않는다.
 */
export const MapHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<GridMapRef>(null);
  const sheetRef = useRef<HomeSheetRef>(null);
  // 검색 복귀 params (MSG-297 AC 3·10·11) — 검색 화면이 navigate로 전달한 목적지 좌표
  const { lat, lng, ts } = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    ts?: string;
  }>();
  /** 검색 목적지 이동이 발생하면 초기 현재 위치 이동을 건너뛴다 — 카메라 경합 방지 */
  const movedToSearchTargetRef = useRef(false);

  /** 확장점 ① — 지도 이동이 끝날 때마다 갱신되는 현재 뷰포트 (지도 준비 전 null) */
  const [viewport, setViewport] = useState<Viewport | null>(null);
  /** 확장점 ① — 시트 단계·컨테이너 높이 (내 위치 버튼 오프셋 계산용, 요구 8) */
  const [sheetLayout, setSheetLayout] = useState<{
    stage: SheetStage;
    containerHeight: number;
  }>({ stage: 2, containerHeight: 0 });

  /** 선택 테마 (MSG-298 확정 4 수정판 — 재마운트를 넘는 모듈 상태 구독) */
  const themeId = useSelectedTheme();
  const topBar = deriveHomeTopBar(themeId);

  /** 조회 3종 (요구 5) — 뷰포트 bbox·중심·행정동 코드가 각각의 입력이다 */
  const occupied = useOccupiedGridsQuery(viewport?.bounds ?? null);
  const geocode = useReverseGeocodeQuery(viewport?.center ?? null);
  const regionGrids = useRegionGridsQuery(geocode.region?.regionCode ?? null);

  /** 상시 점령 층 — 서버 5179 격자를 모바일 격자 인덱스로 정규화 (승인 Q2 A안) */
  const occupiedCells = useMemo(
    () => toOccupiedCells(occupied.grids),
    [occupied.grids],
  );

  const grids = regionGrids.data?.grids ?? [];
  const sheetState = deriveSheetState(
    [occupied, geocode, regionGrids],
    grids.length,
  );

  /** 실패 재시도 (요구 7) — 세 쿼리를 함께 다시 조회한다 */
  const handleRetry = () => {
    occupied.retry();
    geocode.retry();
    regionGrids.retry();
  };

  /**
   * 테마 셀 3분류 (MSG-298 AC 7~9) — 테마 상세는 아직 mock이라 두 번째 인자도 mock
   * 점령 셀을 쓴다(같은 좌표계여야 교집합 판정이 성립). 실 API 점령 층은 지도에
   * 별도 prop으로 그린다. 이 mock 결합은 MSG-427에서 함께 소멸한다.
   */
  const classification = useMemo(
    () =>
      themeId
        ? classifyCells(
            MOCK_THEME_GRIDS[themeId].map(({ cell }) => cell),
            MOCK_OCCUPIED_CELLS,
          )
        : null,
    [themeId],
  );

  /** 시트 테마 콘텐츠 모델 (MSG-298 AC 11·12) — 확장점 ②, MSG-427이 교체한다 */
  const themeSheetModel = useMemo(
    () =>
      themeId
        ? buildThemeSheet(themeId, MOCK_THEME_GRIDS[themeId], new Date())
        : null,
    [themeId],
  );

  /** 추천 경로 — 경로추천 선택 시에만 (MSG-298 AC 10) */
  const route = useMemo(
    () =>
      themeId === "route"
        ? {
            path: MOCK_ROUTE_PATH,
            waypoints: buildRouteWaypoints(MOCK_ROUTE_PATH),
          }
        : undefined,
    [themeId],
  );

  /** 칩 탭 (요구 4) — 같은 칩 재탭은 해제, 다른 칩은 전환. 시트는 항상 2단계 스냅 */
  const handleToggleTheme = (id: ThemeId) => {
    setSelectedTheme(toggleTheme(themeId, id));
    sheetRef.current?.snapTo(2);
  };

  // 타 탭에 갔다가 홈 탭으로 복귀하면 시트 2단계 재시작 (AC 13, D9).
  useFocusEffect(
    useCallback(() => {
      sheetRef.current?.snapTo(2);
    }, []),
  );

  // 검색 복귀 카메라 이동 (MSG-297 AC 3·10·11) — ts는 요청 식별자: 같은 구를
  // 연속 선택해도 params가 달라져 재이동한다. 초기 현재 위치 이동보다 우선.
  useEffect(() => {
    if (typeof lat !== "string" || typeof lng !== "string" || !ts) return;
    const target = { lat: Number(lat), lng: Number(lng) };
    // 딥링크로 훼손된 params가 올 수 있다 — NaN·좌표 범위 밖 값을 네이티브 지도에 넘기지 않는다
    if (!Number.isFinite(target.lat) || Math.abs(target.lat) > 90) return;
    if (!Number.isFinite(target.lng) || Math.abs(target.lng) > 180) return;
    movedToSearchTargetRef.current = true;
    mapRef.current?.moveTo(target);
  }, [lat, lng, ts]);

  useEffect(() => {
    // 초기 중심 결정 (AC 2): 지도는 서면으로 먼저 뜨고, 권한 승인 + 조회 성공 시에만
    // 현재 위치로 이동한다 — 폴백(SEOMYEON_CENTER)은 동일 객체 참조라 이동 생략.
    void resolveMapCenter().then((center) => {
      if (movedToSearchTargetRef.current) return;
      if (center !== SEOMYEON_CENTER) mapRef.current?.moveTo(center);
    });
  }, []);

  /** 내 위치 버튼 (AC 8) — 현재 위치(폴백: 서면)로 카메라 이동, 조회는 이동 종료가 갱신 */
  const handleLocate = () => {
    void resolveMapCenter().then((center) => mapRef.current?.moveTo(center));
  };

  /** 4단계(숨김)에서 홈 탭 재탭 = 2단계 복귀 (AC 13, D12) */
  const handleHomeRetap = () => {
    sheetRef.current?.restoreIfHidden();
  };

  /** 시트 컨테이너·바텀 내비 하단 오프셋 — 내비 바는 전 단계 상시 노출 (AC 16) */
  const bottomOffset = insets.bottom + NAV_BAR_HEIGHT;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <View className="absolute inset-0">
          {/* 격자 탭 → 격자 상세 진입 (MSG-296 AC 1) — 영상 보유 격자만, 빈 격자·
              미등재 셀은 no-op (MSG-317 AC 15) */}
          <GridMap
            ref={mapRef}
            initialCenter={SEOMYEON_CENTER}
            onCellTap={(cellId) => {
              if (hasCellVideos(cellId)) router.push(`/grid/${cellId}`);
            }}
            occupiedCells={occupiedCells}
            themeCells={classification?.themeOnly}
            themeColor={themeId ? THEME_META[themeId].color : undefined}
            hatchCells={classification?.both}
            route={route}
            onViewportChange={setViewport}
          />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 top-0"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-sm px-md pt-sm">
            {/* 검색바 = 검색 화면 진입점 (MSG-297 AC 1) — 홈에서는 타이핑 불가:
                editable=false + pointerEvents 차단으로 탭 전체가 화면 전환만 한다 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색 화면 열기"
              onPress={() => router.push("/search")}
              className="flex-1 active:opacity-80"
            >
              <View pointerEvents="none">
                <SearchBar
                  placeholder="장소, 격자, 영상 검색"
                  editable={false}
                />
              </View>
            </Pressable>
            {/* 프로필 진입 (MSG-317 AC 18) — 바텀 내비 프로필 탭과 같은 목적지 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 열기"
              onPress={() => router.navigate("/profile")}
              className="active:opacity-80"
            >
              <Avatar size="md" fallback="나" />
            </Pressable>
          </View>
          {/* 확장점 ② — 칩 행은 테마 선택과 무관하게 항상 보인다 (요구 4) */}
          {topBar.showChips && (
            <ThemeChipsBar selected={themeId} onToggle={handleToggleTheme} />
          )}
        </View>

        {/* 내 위치 — 시트 단계에 따라 함께 올라가 가려지지 않는다 (요구 8).
            FAB(기록하기)는 바텀 내비 카메라와 기능 중복으로 제거 (MSG-317 AC 16) */}
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

        {/* 시트 쉘/콘텐츠 분리 (MSG-298) — 쉘은 콘텐츠를 모르고, 여기서 테마 여부로 스위칭 */}
        <HomeSheet
          ref={sheetRef}
          bottomOffset={bottomOffset}
          onStageChange={(stage, containerHeight) =>
            setSheetLayout({ stage, containerHeight })
          }
        >
          {(context) =>
            themeSheetModel ? (
              /* 확장점 ② — MSG-427이 이 한 줄만 교체한다 */
              <ThemeSheetContent {...context} model={themeSheetModel} />
            ) : (
              <DefaultSheetContent
                {...context}
                regionName={geocode.region?.regionName ?? null}
                grids={grids}
                state={sheetState}
                onRetry={handleRetry}
              />
            )
          }
        </HomeSheet>

        {/* 하단 인셋 배경 채움은 AppBottomNav가 소유 (AC 16 4차) */}
        <View className="absolute inset-x-0 bottom-0">
          <AppBottomNav onHomeRetap={handleHomeRetap} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

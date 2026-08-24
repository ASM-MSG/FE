import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MapIconButton } from "@fillmap/ui-native";
import type { GridCellIndex } from "../../../entities/cell/model/grid";
import {
  SEOMYEON_CENTER,
  resolveMapCenter,
  resolveMapCenterWithPermission,
} from "../../../shared/geolocation";
import type { PermissionState } from "../../../shared/permission-state";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { PermissionNoticeModal } from "../../permissions/ui/permission-notice-modal";
import { useCollectedGridsQuery } from "../api/use-collected-grids-query";
import { useGridAggregationQuery } from "../api/use-grid-aggregation-query";
import { useHomeGridDetail } from "../api/use-home-grid-detail";
import { useHomeMissions } from "../api/use-home-missions";
import { useHotRegionSummary } from "../api/use-hot-region-summary";
import { useOccupiedGridsQuery } from "../api/use-occupied-grids-query";
import { useRegionGridsQuery } from "../api/use-region-grids-query";
import { useReverseGeocodeQuery } from "../api/use-reverse-geocode-query";
import { MAP_MIN_ZOOM } from "../model/aggregation-unit";
import { gridIdOfCell } from "../model/cell-grid-id-index";
import { setSelectedGridId, useSelectedGridId } from "../model/grid-selection";
import { canOpenDetail } from "../model/home-cell-detail";
import { deriveSheetState } from "../model/home-sheet-state";
import { locateBottomOffset } from "../model/locate-offset";
import {
  setSelectedMissionId,
  useSelectedMissionId,
} from "../model/mission-selection";
import { homePanelKind } from "../model/panel-branch";
import {
  closeTheme,
  sheetStageFor,
  showsCloseButton,
  stepBack,
} from "../model/sheet-navigation";
import type { SheetStage } from "../model/sheet-snap";
import { THEME_META, type ThemeId } from "../model/themes";
import { toggleTheme } from "../model/theme-chip-view";
import { setSelectedTheme, useSelectedTheme } from "../model/theme-selection";
import type { Viewport } from "../model/viewport";
import { GridMap } from "./grid-map";
import type { GridMapRef } from "./grid-map";
import { HomeSheet } from "./home-sheet";
import type { HomeSheetRef } from "./home-sheet";
import { ClusterErrorNotice } from "./cluster-error-notice";
import { HomeSheetSwitch } from "./home-sheet-switch";
import { HomeTopBar } from "./home-top-bar";
import { useHomeOverlays } from "./use-home-overlays";

/** BottomNav 바 실높이(h-16=64px) — 카메라 돌출부(상단 20px)는 시트 위로 겹친다 */
const NAV_BAR_HEIGHT = 64;

/**
 * 지도 홈 — 네이버 지도 + 격자 오버레이 위에 검색바·테마 칩·내 위치·4단계 드래그 시트·
 * 바텀 내비를 얹는다.
 *
 * MSG-423이 만든 층 구조를 MSG-427이 이어받았고, 먼저 머지된 MSG-428(클러스터)을
 * 이 브랜치가 리베이스로 합쳤다. 후속 티켓이 서로 다른 줄을 만지도록 층을 분리해 둔다:
 *
 * - **확장점 ①(뷰포트)** — 뷰포트·줌은 이 화면이 단일 소유(useState)하고 아래로 내려준다.
 *   갱신은 GridMap의 `onViewportChange`(SDK onCameraIdle = 이동 종료)로만 들어온다.
 *   MSG-428 클러스터도 같은 `viewport`를 구독하고 새 상태를 만들지 않는다.
 * - **확장점 ②(시트 콘텐츠)** — 분기는 `homePanelKind` 한 값이고 렌더는
 *   `home-sheet-switch.tsx`가 소유한다. 선택 상태 3종(테마·미션·격자)은 전부 모듈
 *   싱글턴이고, 단계 이동 규칙은 `sheet-navigation.ts`에 있다 — 헤더 `‹`·`✕`·안드로이드
 *   뒤로가기가 같은 함수를 부른다(A3~A5). 시트 분기를 늘릴 때는 스위치 파일만 만진다.
 * - **확장점 ③(지도 오버레이)** — 오버레이 3층 파생은 `use-home-overlays.ts`가 갖고
 *   GridMap의 prop을 층별로 유지한다 (`occupiedCells` = 상시 점령 층 /
 *   `themeCells`·`hatchCells`·`route`·`missionLabel` = 테마 층 /
 *   `clusters` = MSG-428 저줌 집계 층, 자체 훅 소유).
 * - 조회 훅은 전부 `features/map-home/api/`에 있고 화면은 조립 훅 3종만 부른다 —
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
  /**
   * 내 위치 권한 안내 (MSG-447 기준 2·3) — null이면 닫힘. 초기 진입 거부에는 세우지 않는다:
   * 방금 사용자가 내린 결정을 되묻는 꼴이 된다 (기준 1).
   */
  const [locationNotice, setLocationNotice] = useState<PermissionState | null>(
    null,
  );
  /** 확장점 ① — 시트 단계·컨테이너 높이 (내 위치 버튼 오프셋 계산용) */
  const [sheetLayout, setSheetLayout] = useState<{
    stage: SheetStage;
    containerHeight: number;
  }>({ stage: 2, containerHeight: 0 });

  /** 확장점 ② — 선택 상태 3종 (재마운트를 넘는 모듈 상태 구독) */
  const themeId = useSelectedTheme();
  const selectedMissionId = useSelectedMissionId();
  const selectedGridId = useSelectedGridId();
  const panelKind = homePanelKind({
    activeTheme: themeId,
    selectedMissionId,
    selectedGridId,
  });

  const bounds = viewport?.bounds ?? null;
  const isHotChip = themeId === "hot";

  /** 기본 시트 조회 3종 (MSG-423) — 뷰포트 bbox·중심·행정동 코드가 각각의 입력이다 */
  const occupied = useOccupiedGridsQuery(bounds);
  const geocode = useReverseGeocodeQuery(viewport?.center ?? null);
  const regionGrids = useRegionGridsQuery(geocode.region?.regionCode ?? null);
  const collected = useCollectedGridsQuery();
  const regionName = geocode.region?.regionName ?? null;
  /** 확장점 ③ — 저줌 지역 집계 마커 (MSG-428). 게이트·파생은 전부 훅 안 */
  const aggregation = useGridAggregationQuery(viewport);

  /** 핫구역 요약 (B) — 핫구역 칩일 때만 bbox·행정동 코드를 넘겨 조회를 연다 */
  const hotRegion = useHotRegionSummary({
    bounds: isHotChip ? bounds : null,
    regionName,
    regionCode: isHotChip ? (geocode.region?.regionCode ?? null) : null,
  });

  /** 미션 목록·선택 (D·E) — 칩이 축제·팝업·경로일 때만 조회가 열린다 */
  const missions = useHomeMissions({
    activeTheme: themeId,
    selectedMissionId,
    bounds,
  });

  /** 확장점 ③ — 지도 오버레이 3층 (뷰포트 클리핑 포함, F-12) */
  const overlays = useHomeOverlays({
    themeId,
    bounds,
    hotGridIds: hotRegion.hotGridIds,
    missions,
    occupiedGrids: occupied.grids,
  });

  /** 격자 상세 조립 (C) — 선택 격자가 없으면 조회가 열리지 않는다 */
  const gridDetail = useHomeGridDetail({
    selectedGridId,
    activeTheme: themeId,
    selectedCourse: missions.selectedCourse,
    collectedGrids: collected.grids,
    hotGridCount: hotRegion.hotGridIds.length,
    progressFailed: missions.progressFailed || collected.isError,
  });

  const grids = useMemo(
    () => regionGrids.data?.grids ?? [],
    [regionGrids.data],
  );
  const defaultSheetState = deriveSheetState(
    [occupied, geocode, regionGrids],
    grids.length,
  );

  /** 기본 시트 재시도 — 세 쿼리를 함께 다시 조회한다 */
  const handleRetryDefault = () => {
    occupied.retry();
    geocode.retry();
    regionGrids.retry();
  };

  /** 선택 상태 3종을 한 번에 반영한다 — `sheet-navigation` 결과의 유일한 적용점 */
  const applySelection = useCallback(
    (next: {
      activeTheme: ThemeId | null;
      selectedMissionId: number | null;
      selectedGridId: string | null;
    }) => {
      setSelectedTheme(next.activeTheme);
      setSelectedMissionId(next.selectedMissionId);
      setSelectedGridId(next.selectedGridId);
    },
    [],
  );

  /** 한 단계 위로 (A3) — 최상위면 false를 돌려 안드로이드 뒤로가기가 화면을 벗어나게 한다 */
  const goBack = useCallback((): boolean => {
    const next = stepBack({
      activeTheme: themeId,
      selectedMissionId,
      selectedGridId,
    });
    if (next === null) return false;
    applySelection(next);
    return true;
  }, [themeId, selectedMissionId, selectedGridId, applySelection]);

  /** 헤더 ✕ (A2·A4) — 테마·선택 미션·선택 격자를 함께 초기화해 최초 홈 상태로 */
  const handleClose = () =>
    applySelection(
      closeTheme({ activeTheme: themeId, selectedMissionId, selectedGridId }),
    );
  /**
   * ✕ 노출 여부를 시트별 분기가 아니라 규칙 한 곳(`showsCloseButton`)에서 정한다 (A4) —
   * Figma 실측상 목록 3종에는 ✕가 없고, 분기마다 기억해서 넣으면 한 곳이 어긋난다.
   */
  const closeAction = showsCloseButton(panelKind) ? handleClose : undefined;

  // Android 하드웨어 뒤로가기 (A5) — 헤더 `‹`와 같은 규칙을 타고, 최상위에서만 화면을 벗어난다
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        goBack,
      );
      return () => subscription.remove();
    }, [goBack]),
  );

  // 시트 단계 (A6) — 목록·요약은 2단계(절반), 상세는 1단계(전체 확장)로 스냅한다.
  // 탭 왕복 복귀(포커스)와 단계 전환(panelKind 변경)이 같은 규칙을 타야 하므로 한 곳이다
  useFocusEffect(
    useCallback(() => {
      sheetRef.current?.snapTo(sheetStageFor(panelKind));
    }, [panelKind]),
  );

  /** 칩 탭 (MSG-423 요구 4) — 같은 칩 재탭은 해제, 다른 칩은 전환. 선택도 함께 초기화 (A2) */
  const handleToggleTheme = (id: ThemeId) => {
    applySelection({
      activeTheme: toggleTheme(themeId, id),
      selectedMissionId: null,
      selectedGridId: null,
    });
  };

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
    // 초기 중심 결정: 지도는 서면으로 먼저 뜨고, 권한 승인 + 조회 성공 시에만
    // 현재 위치로 이동한다 — 폴백(SEOMYEON_CENTER)은 동일 객체 참조라 이동 생략.
    void resolveMapCenter().then((center) => {
      if (movedToSearchTargetRef.current) return;
      if (center !== SEOMYEON_CENTER) mapRef.current?.moveTo(center);
    });
  }, []);

  /**
   * 내 위치 버튼 — 현재 위치로 카메라 이동. 조회는 이동 종료가 갱신한다.
   *
   * [MSG-447 기준 2·4] 권한이 없으면 **카메라를 움직이지 않고** 안내를 띄운다. 종전에는
   * 폴백 좌표(서면)로 그냥 이동해, 사용자가 보고 있던 위치를 권한 거부의 부작용으로 잃고도
   * 왜 그랬는지 알 수 없었다. 측위만 실패한 경우(권한 있음)는 종전대로 폴백 좌표로 이동한다 —
   * 권한 문제가 아닌 것을 권한 문제로 안내하지 않는다.
   */
  const handleLocate = () => {
    void resolveMapCenterWithPermission().then(({ center, permission }) => {
      if (permission !== "granted") {
        setLocationNotice(permission);
        return;
      }
      mapRef.current?.moveTo(center);
    });
  };

  /**
   * 격자 탭 → 격자 상세 **시트** 전환 (C1·C2·C3) — 새 라우트로 이동하지 않는다.
   * 역인덱스에 없는 셀과 게이트(canOpenDetail)에 걸린 셀은 no-op이다.
   */
  const handleCellTap = (_cellId: string, index: GridCellIndex) => {
    const gridId = gridIdOfCell(overlays.gridIdIndex, index);
    if (gridId === null) return;
    if (
      !canOpenDetail(
        themeId,
        gridId,
        overlays.themeGridIds,
        overlays.occupiedGridIds,
      )
    )
      return;
    setSelectedGridId(gridId);
  };

  /** 4단계(숨김)에서 홈 탭 재탭 = 2단계 복귀 */
  const handleHomeRetap = () => sheetRef.current?.restoreIfHidden();

  /** 시트 컨테이너·바텀 내비 하단 오프셋 — 내비 바는 전 단계 상시 노출 */
  const bottomOffset = insets.bottom + NAV_BAR_HEIGHT;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <View className="absolute inset-0">
          <GridMap
            ref={mapRef}
            initialCenter={SEOMYEON_CENTER}
            minZoom={MAP_MIN_ZOOM}
            onCellTap={handleCellTap}
            occupiedCells={overlays.occupiedCells}
            themeCells={overlays.classification?.themeOnly}
            themeColor={themeId ? THEME_META[themeId].color : undefined}
            hatchCells={overlays.classification?.both}
            route={overlays.route}
            missionLabel={overlays.missionLabel}
            clusters={aggregation.clusters}
            onViewportChange={setViewport}
          />
        </View>

        <HomeTopBar
          topInset={insets.top}
          selectedTheme={themeId}
          onToggleTheme={handleToggleTheme}
          onOpenSearch={() => router.push("/search")}
          onOpenProfile={() => router.navigate("/profile")}
        />
        {aggregation.isError && (
          <ClusterErrorNotice onRetry={aggregation.retry} />
        )}

        {/* 내 위치 — 시트 단계에 따라 함께 올라가 가려지지 않는다.
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

        {/* 시트 쉘/콘텐츠 분리 (MSG-298) — 쉘은 콘텐츠를 모르고, 분기는 스위치가 소유한다 */}
        <HomeSheet
          ref={sheetRef}
          bottomOffset={bottomOffset}
          onStageChange={(stage, containerHeight) =>
            setSheetLayout({ stage, containerHeight })
          }
        >
          {(context) => (
            <HomeSheetSwitch
              kind={panelKind}
              sheet={context}
              missions={missions}
              hotRegion={hotRegion}
              gridDetail={gridDetail}
              selectedGridId={selectedGridId}
              regionName={regionName}
              grids={grids}
              defaultSheetState={defaultSheetState}
              // action-row는 코스 스팟 격자 상세(Figma 화면 9)에만 없다 (C9) —
              // 핫구역 격자 상세(화면 2)와 칩 미선택 상태의 내 점령 격자에는 있다
              showGridActions={gridDetail.selectedSpot === null}
              onSelectMission={setSelectedMissionId}
              onSelectGrid={setSelectedGridId}
              onBack={goBack}
              onClose={closeAction}
              onUpload={() => router.push("/upload")}
              onRetryDefault={handleRetryDefault}
            />
          )}
        </HomeSheet>

        {/* 권한 안내 (MSG-447 기준 2·3) — [권한 요청]은 같은 핸들러를 다시 태워
            OS 프롬프트 → 성공 시 이동까지 한 번에 간다 */}
        <PermissionNoticeModal
          axis="location"
          state={locationNotice}
          onDismiss={() => setLocationNotice(null)}
          onRequest={handleLocate}
        />

        {/* 하단 인셋 배경 채움은 AppBottomNav가 소유 */}
        <View className="absolute inset-x-0 bottom-0">
          <AppBottomNav onHomeRetap={handleHomeRetap} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

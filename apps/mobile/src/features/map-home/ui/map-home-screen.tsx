import { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Flame, PartyPopper, Route, Store } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  Avatar,
  Chip,
  Fab,
  MapIconButton,
  SearchBar,
} from "@fillmap/ui-native";
import { SEOMYEON_CENTER, resolveMapCenter } from "../../../shared/geolocation";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { PEEK_HEIGHT } from "../model/sheet-snap";
import { THEME_IDS, THEME_META, deriveHomeTopBar } from "../model/themes";
import type { ThemeId } from "../model/themes";
import {
  MOCK_OCCUPIED_CELLS,
  MOCK_ROUTE_PATH,
  MOCK_THEME_GRIDS,
  buildRouteWaypoints,
} from "../model/mock-theme-data";
import { classifyCells } from "../model/theme-cells";
import { setSelectedTheme, useSelectedTheme } from "../model/theme-selection";
import { buildThemeSheet } from "../model/theme-sheet";
import { GridMap } from "./grid-map";
import type { GridMapRef } from "./grid-map";
import { HomeSheet } from "./home-sheet";
import type { HomeSheetRef } from "./home-sheet";
import { DefaultSheetContent } from "./default-sheet-content";
import { ThemeSheetContent } from "./theme-sheet-content";

/**
 * 카테고리 칩 4종의 리딩 아이콘 (AC 7, D10) — 웹 정본 ThemeChipsBar CHIP_VIEW와
 * 동일 매핑(핫구역=Flame·지역축제=PartyPopper·팝업스토어=Store·경로추천=Route).
 * 라벨·색은 themes.ts THEME_META가 정본 (MSG-298 AC 5 — 아이콘만 뷰 레이어 소유).
 */
const CHIP_ICONS: Record<ThemeId, LucideIcon> = {
  hot: Flame,
  festival: PartyPopper,
  popup: Store,
  route: Route,
};

/** BottomNav 바 실높이(h-16=64px) — 카메라 돌출부(상단 20px)는 시트 위로 겹친다 */
const NAV_BAR_HEIGHT = 64;

/**
 * 지도 홈 (Figma 14094:3981, 2차: 한 화면 통합 — D9) — 네이버 지도 + 격자 오버레이 위에
 * 검색바·칩·내 위치·FAB·4단계 드래그 시트·바텀 내비를 얹는다 (AC 5~16).
 * MSG-298: 칩 탭 → 칩 행 숨김 + 테마 검색어 바(<·테마명·X) + 지도 테마 오버레이 +
 * 시트 테마 콘텐츠 전환 (네이버 지도 방식). X·< → 최초 홈 상태 전체 복귀 (확정 1).
 * 테마 상태는 feature 로컬 모듈 상태(theme-selection.ts) 구독 (확정 4 수정판) —
 * 탭 왕복 시 이 화면이 재마운트되어도(루트 Stack + navigate 구조 실측) 검색어·강조·
 * 시트 콘텐츠가 유지된다 (AC 4).
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
  /** 검색 목적지 이동이 발생하면 초기 현재 위치 이동을 건너뛴다 — 카메라 경합 방지 (스펙 리스크 2) */
  const movedToSearchTargetRef = useRef(false);

  /** 선택 테마 (MSG-298, 확정 4 수정판 — 재마운트를 넘는 모듈 상태 구독, AC 4) */
  const themeId = useSelectedTheme();
  const topBar = deriveHomeTopBar(themeId);

  /** 테마 셀 3분류 (AC 7~9) — 테마 전용은 테마 색, 교집합은 빗금 */
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

  /** 시트 테마 콘텐츠 모델 (AC 11·12) — 표시값 확정은 theme-sheet.ts */
  const themeSheetModel = useMemo(
    () =>
      themeId
        ? buildThemeSheet(themeId, MOCK_THEME_GRIDS[themeId], new Date())
        : null,
    [themeId],
  );

  /** 추천 경로 — 경로추천 선택 시에만 (AC 10) */
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

  /** 칩 탭 (AC 1) — 테마 선택 + 시트 항상 2단계 스냅 (확정 3 — 4단계 숨김 상태 포함) */
  const handleSelectTheme = (id: ThemeId) => {
    setSelectedTheme(id);
    sheetRef.current?.snapTo(2);
  };

  /** X·< 탭 (AC 2·3) — 최초 홈 상태 전체 복귀: 테마 해제(모듈 상태까지 리셋 —
      전역화 누수 방지) + 시트 2단계 (확정 1) */
  const handleClearTheme = () => {
    setSelectedTheme(null);
    sheetRef.current?.snapTo(2);
  };

  // 타 탭에 갔다가 홈 탭으로 복귀하면 시트 2단계 재시작 (AC 13, D9).
  // 최초 마운트에도 발화하지만 시트 초기 단계(2)와 동일해 무해하다.
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
    // 검색 목적지 이동이 먼저 발생했으면 늦게 도착한 위치 조회로 카메라를 덮지 않는다 (MSG-297)
    void resolveMapCenter().then((center) => {
      if (movedToSearchTargetRef.current) return;
      if (center !== SEOMYEON_CENTER) mapRef.current?.moveTo(center);
    });
  }, []);

  /** 내 위치 버튼 (AC 8) — 현재 위치(폴백: 서면)로 카메라 이동, 격자는 카메라 이벤트로 갱신 */
  const handleLocate = () => {
    void resolveMapCenter().then((center) => mapRef.current?.moveTo(center));
  };

  /** 4단계(숨김)에서 홈 탭 재탭 = 2단계 복귀 (AC 13, D12) — 그립이 없어 유일한 복귀 수단 */
  const handleHomeRetap = () => {
    sheetRef.current?.restoreIfHidden();
  };

  /** 시트 컨테이너·바텀 내비 하단 오프셋 — 내비 바는 전 단계 상시 노출 (AC 16) */
  const bottomOffset = insets.bottom + NAV_BAR_HEIGHT;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <View className="absolute inset-0">
          {/* 격자 탭 → 격자 상세 진입 (MSG-296 AC 1) */}
          <GridMap
            ref={mapRef}
            initialCenter={SEOMYEON_CENTER}
            onCellTap={(cellId) => router.push(`/grid/${cellId}`)}
            occupiedCells={MOCK_OCCUPIED_CELLS}
            themeCells={classification?.themeOnly}
            themeColor={themeId ? THEME_META[themeId].color : undefined}
            hatchCells={classification?.both}
            route={route}
          />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 top-0"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-sm px-md pt-sm">
            {topBar.mode === "default" ? (
              /* 검색바 = 검색 화면 진입점 (MSG-297 AC 1) — 홈에서는 타이핑 불가:
                 editable=false + pointerEvents 차단으로 탭 전체가 화면 전환만 한다 */
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
            ) : (
              /* 테마 검색어 바 (MSG-298 AC 1~3) — 표시 전용(제외 범위: 직접 입력 없음).
                 <·X 모두 최초 홈 상태 전체 복귀 (확정 1) */
              <View className="flex-1">
                <SearchBar
                  value={topBar.query}
                  editable={false}
                  onBack={handleClearTheme}
                  onClear={handleClearTheme}
                />
              </View>
            )}
            <Avatar size="md" fallback="나" />
          </View>
          {/* 칩 행 — 테마 선택 시 행 전체 숨김 (AC 1, 네이버 지도 방식) */}
          {topBar.showChips && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-sm"
              contentContainerClassName="gap-xs px-md"
            >
              {/* 칩 4종 고정 배열 — 규칙 문서 suppress-when(10행 미만 고정 배열, 가상화 이득 없음) 해당 */}
              {/* react-doctor-disable-next-line react-doctor/rn-no-scrollview-mapped-list */}
              {THEME_IDS.map((id) => {
                const Icon = CHIP_ICONS[id];
                return (
                  <Chip
                    key={id}
                    text={THEME_META[id].label}
                    icon={<Icon size={14} color={THEME_META[id].color} />}
                    onPress={() => handleSelectTheme(id)}
                    className="shadow-raised"
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 내 위치·FAB — 피크 시트 바로 위 우하단. 뒤에 렌더되는 시트가 확장되면 덮인다 */}
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 items-end gap-2.5 px-md"
          style={{ bottom: bottomOffset + PEEK_HEIGHT + 12 }}
        >
          <MapIconButton icon="locate" onPress={handleLocate} />
          <Fab accessibilityLabel="기록하기" />
        </View>

        {/* 시트 쉘/콘텐츠 분리 (MSG-298) — 쉘은 콘텐츠를 모르고, 여기서 테마 여부로 스위칭 */}
        <HomeSheet ref={sheetRef} bottomOffset={bottomOffset}>
          {(context) =>
            themeSheetModel ? (
              <ThemeSheetContent {...context} model={themeSheetModel} />
            ) : (
              <DefaultSheetContent {...context} />
            )
          }
        </HomeSheet>

        {/* 하단 인셋 배경 채움은 AppBottomNav가 소유 (AC 16 4차) — 여기서 padding 중복 금지 */}
        <View className="absolute inset-x-0 bottom-0">
          <AppBottomNav onHomeRetap={handleHomeRetap} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

import { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Flame, PartyPopper, Route, Store } from "lucide-react-native";
import { palette } from "@fillmap/design-tokens";
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
import { GridMap } from "./grid-map";
import type { GridMapRef } from "./grid-map";
import { HomeSheet } from "./home-sheet";
import type { HomeSheetRef } from "./home-sheet";

/**
 * 카테고리 칩 4종 + 리딩 아이콘 (AC 7, D10) — 웹 정본 ThemeChipsBar CHIP_VIEW와
 * 동일 매핑(핫구역=Flame·지역축제=PartyPopper·팝업스토어=Store·경로추천=Route,
 * 테마 토큰 색). 탭 동작은 검색·필터 제외 범위.
 */
const CATEGORY_CHIPS = [
  { label: "핫구역", Icon: Flame, color: palette["theme-hot"] },
  { label: "지역축제", Icon: PartyPopper, color: palette["theme-festival"] },
  { label: "팝업스토어", Icon: Store, color: palette["theme-popup"] },
  { label: "경로추천", Icon: Route, color: palette["theme-route"] },
] as const;

/** BottomNav 바 실높이(h-16=64px) — 카메라 돌출부(상단 20px)는 시트 위로 겹친다 */
const NAV_BAR_HEIGHT = 64;

/**
 * 지도 홈 (Figma 14094:3981, 2차: 한 화면 통합 — D9) — 네이버 지도 + 격자 오버레이 위에
 * 검색바·칩·내 위치·FAB·4단계 드래그 시트·바텀 내비를 얹는다 (AC 5~16).
 * 구 격자 썸네일 뷰(별도 라우트)의 콘텐츠는 시트로 이관되었고, 4차부터 시트는
 * 전 단계 동일 콘텐츠다 (AC 10 통일 — 구 AC 19 "전체 보기"는 폐기).
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
            <Avatar size="md" fallback="나" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-sm"
            contentContainerClassName="gap-xs px-md"
          >
            {/* 칩 4종 고정 배열 — 규칙 문서 suppress-when(10행 미만 고정 배열, 가상화 이득 없음) 해당 */}
            {/* react-doctor-disable-next-line react-doctor/rn-no-scrollview-mapped-list */}
            {CATEGORY_CHIPS.map(({ label, Icon, color }) => (
              <Chip
                key={label}
                text={label}
                icon={<Icon size={14} color={color} />}
                className="shadow-raised"
              />
            ))}
          </ScrollView>
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

        <HomeSheet ref={sheetRef} bottomOffset={bottomOffset} />

        {/* 하단 인셋 배경 채움은 AppBottomNav가 소유 (AC 16 4차) — 여기서 padding 중복 금지 */}
        <View className="absolute inset-x-0 bottom-0">
          <AppBottomNav onHomeRetap={handleHomeRetap} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

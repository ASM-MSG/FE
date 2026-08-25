import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, BackHandler, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader } from "@fillmap/ui-native";
import type { RecentRegion } from "../../../entities/dex/model/dex";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { DEFAULT_DEX_TAB, selectDexTab, type DexTab } from "../model/dex-tab";
import {
  deriveRecentRegions,
  excludeRemovedRegions,
  limitRecentRegions,
} from "../model/recent-regions";
import {
  useCollectionGridsQuery,
  useCollectionSummaryQuery,
} from "../model/use-collection-query";
import { useCurrentRegionStatQuery } from "../model/use-region-stat-query";
import { BadgeTabBody } from "./badge-tab-body";
import { DexErrorState } from "./dex-error-state";
import { DexHeaderSummary } from "./dex-header-summary";
import { DexTabBar } from "./dex-tab-bar";
import { MapTabBody } from "./map-tab-body";
import { RecordTabBody } from "./record-tab-body";
import { RegionGalleryView } from "./region-gallery-view";

/**
 * SOURCE: Figma "개인 도감 — 지도 탭"(node 14799:26328) · "동 갤러리"(node 14799:26373) — MSG-425.
 * 개인 도감 3탭 셸 — 헤더 + 공통 요약(진행 바·통계 타일) + 탭 바 + 본문 스위치.
 * 종전 mock 2탭 화면(MSG-299~301)을 실 API 3탭 구조로 전면 교체한다.
 *
 * **이 파일이 셸을 소유한다 — 후속 티켓의 확장 계약은 다음과 같다.**
 * - **MSG-430**(뱃지·기록 탭 내용): **완료.** 렌더 스위치 2줄이 `<BadgeTabBody />` ·
 *   `<RecordTabBody />`로 교체됐고(`badge-shelf`·`dex-tab-placeholder`는 삭제),
 *   `dex-header-summary`·`dex-tab-bar`·`dex-error-state`·이 셸은 무수정으로 남았다.
 * - **MSG-431**(내 영상 관리): `gallery-video-card.tsx` **한 파일**만 고친다.
 *   `VideoCard`의 `overlay` prop에 ⋯ 버튼 + `ActionSheet`를 얹으면 되고, 셸·갤러리 뷰·
 *   `ui-native`는 무수정이다.
 *
 * 상태는 전부 화면 로컬·비영속이다(추정 A2·A4) — 모바일에 `/dex/:tab` 라우트가 없고
 * expo-router 세그먼트를 추가하면 MSG-430과 소유권이 충돌한다. X 감춤도 `useState`다
 * (apps/mobile에 zustand 의존성이 없고, 감춤은 화면 1곳 상태다).
 * 골격 게이트는 요약·수집 격자 두 쿼리만 본다 — 탐험률(by-point)은 부분 실패해도
 * 화면을 막지 않고 진행 바만 숨긴다.
 */
export const DexScreen = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<DexTab>(DEFAULT_DEX_TAB);
  const [selected, setSelected] = useState<RecentRegion | null>(null);
  const [removedRegionNames, setRemovedRegionNames] = useState<string[]>([]);

  const summary = useCollectionSummaryQuery();
  const grids = useCollectionGridsQuery();
  const regionStat = useCurrentRegionStatQuery();

  const isError = summary.isError || grids.isError;
  const summaryData = summary.data;
  const gridsData = grids.data;

  const recentRegions = useMemo(
    () => (gridsData ? deriveRecentRegions(gridsData) : []),
    [gridsData],
  );

  // 파생 → 감춤 → 20개 상한 순서 (승인 Q5 — 감춘 만큼 아래 동이 올라온다)
  const visibleRegions = useMemo(
    () =>
      limitRecentRegions(
        excludeRemovedRegions(recentRegions, removedRegionNames),
      ),
    [recentRegions, removedRegionNames],
  );

  const clearSelected = useCallback(() => setSelected(null), []);

  const handleRemove = useCallback(
    (regionName: string) =>
      setRemovedRegionNames((prev) =>
        prev.includes(regionName) ? prev : [...prev, regionName],
      ),
    [],
  );

  /*
   * 하드웨어 뒤로가기 (S9, 승인 Q3) — 갤러리가 열려 있을 때만 가로채 갤러리를 닫고,
   * 닫힌 상태에서는 false를 돌려 기존 라우트 동작을 보존한다(앱 종료·이전 화면).
   * Effect Event로 감싸 구독을 마운트 1회로 고정한다 — 본문이 읽는 selected는 매번
   * 최신이지만 의존성이 아니므로 갤러리 진입·복귀가 BackHandler를 재등록시키지 않는다.
   */
  /*
   * **포커스 게이트 (MSG-446 실기 환류)** — `BackHandler` 구독은 화면 단위가 아니라 **앱 전역**이라
   * 이 화면이 배경에 있어도 계속 살아 있다. MSG-446이 갤러리 카드에 재생 화면
   * (`/video/[videoId]`)을 push하면서 그 누수가 실기로 드러났다: 재생 화면에서 뒤로가기를
   * 누르면 라우트가 pop되는 것과 **동시에** 아래 핸들러가 `setSelected(null)`을 때려, 보고 있던
   * 갤러리가 닫히고 동 목록으로 떨어졌다(티켓 요구 "직전 목록으로 돌아간다" 위반).
   * 이 화면에서 push할 목적지가 없던 때는 드러날 수 없던 결함이다.
   *
   * 구독 자체는 마운트 1회로 유지하고(위 주석의 이유 그대로) **포커스 여부만 ref로 읽는다** —
   * `useFocusEffect`로 구독을 옮기면 그 안의 Effect Event 호출이 react-hooks 규칙 위반이 되고,
   * 상태로 두면 포커스 전환마다 리렌더가 붙는다. `map-home-screen`은 Effect Event를 쓰지 않아
   * 구독 자체를 `useFocusEffect`에 넣었다 — 목적은 같고 수단만 다르다.
   */
  const focusedRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
      };
    }, []),
  );

  const handleHardwareBack = useEffectEvent(() => {
    if (!focusedRef.current) return false;
    if (selected === null) return false;
    setSelected(null);
    return true;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () =>
      handleHardwareBack(),
    );
    return () => subscription.remove();
  }, []);

  /*
   * 본문이 바뀔 때 스크롤을 맨 위로 되돌린다 (codex 리뷰 P2).
   * 셸이 ScrollView 하나를 계속 들고 본문만 갈아끼우므로, 목록 아래쪽 동을 눌러
   * 갤러리를 열면 직전 오프셋이 그대로 남아 갤러리가 중간부터 보인다(헤더·첫 영상이
   * 가려짐). 복귀·탭 전환도 같은 문제라 세 경로를 한 곳에서 처리한다.
   * animated: false — 화면이 이미 교체된 뒤라 스크롤 연출은 이동으로 읽히지 않는다.
   */
  const selectedRegionName = selected?.regionName ?? null;
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [selectedRegionName, tab]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader
        title="개인 도감"
        // 갤러리 뷰에서만 뒤로가기 표시 — 동 목록으로 복귀 (S9)
        onBack={selected ? clearSelected : undefined}
      />
      {/* 바디 패딩 24 (Figma 실측) — 바텀 내비는 형제 요소라 겹치지 않는다 */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-lg pb-lg pt-md"
      >
        {isError ? (
          <DexErrorState
            title="도감을 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요"
            onRetry={() => {
              void summary.refetch();
              void grids.refetch();
            }}
          />
        ) : !summaryData || !gridsData ? (
          <View className="py-xl">
            <ActivityIndicator color={semantic.primary} />
          </View>
        ) : (
          <View className="gap-md">
            <DexHeaderSummary
              regionStat={regionStat.data ?? null}
              summary={summaryData}
            />
            <DexTabBar
              active={tab}
              onSelect={(next) => {
                // 지도 탭 재탭 포함 — 탭을 누르면 갤러리를 닫아 동 목록으로 복귀한다
                setTab((current) => selectDexTab(current, next));
                clearSelected();
              }}
            />
            {tab === "map" ? (
              selected ? (
                <RegionGalleryView
                  // key — 동 변경 시 리마운트로 상태를 초기화한다
                  key={selected.regionName}
                  selection={selected}
                  onViewAll={clearSelected}
                />
              ) : (
                <MapTabBody
                  regions={visibleRegions}
                  hasCollected={recentRegions.length > 0}
                  onSelect={setSelected}
                  onRemove={handleRemove}
                />
              )
            ) : tab === "badges" ? (
              <BadgeTabBody />
            ) : (
              <RecordTabBody />
            )}
          </View>
        )}
      </ScrollView>
      <AppBottomNav />
    </View>
  );
};

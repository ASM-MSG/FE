import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import type { HomeSheetContentContext } from "../../map-home/ui/home-sheet";
import type { AiRouteState } from "../model/ai-route-store";
import { buildRouteLegs } from "../model/route-legs";
import { partialBannerText } from "../model/route-point-view";
import { canSubmit } from "../model/route-request";
import { RouteEmptyState } from "./route-empty-state";
import { RouteErrorNotice } from "./route-error-notice";
import { RouteInputCard } from "./route-input-card";
import { RoutePartialBanner } from "./route-partial-banner";
import { RouteResultHeader } from "./route-result-header";
import { RouteSkeletonList } from "./route-skeleton-list";
import { RouteStopCard } from "./route-stop-card";
import { RouteSuggestionChips } from "./route-suggestion-chips";
import { RouteWalkConnector } from "./route-walk-connector";

/** 추천 근거 각주 (Figma 15751:512·15751:448) — 로딩·결과에 공통으로 붙는다 */
const RESULT_FOOTNOTE =
  "축제, 팝업, 코스, 행사 정보와 장소 검색 결과로만 추천해요";

/**
 * AI 추천 시트 콘텐츠 (MSG-556 §1-2) — 스토어 `status` 하나로 대기 / 로딩 / 결과 / 에러를 가른다.
 * 입력 카드는 전 상태 공통이고, 결과 모드는 웹 패널 순서(입력 카드 → 상태 헤더 → 배너 →
 * 카드·커넥터 → 각주)다 (D4).
 *
 * 스크롤 배선은 `SheetScrollView`와 같다(제스처 동시 인식·scrollEnabled·오프셋 보고·재마운트
 * 0 보고) — 그 컴포넌트가 ref를 노출하지 않아 마커 탭 → 카드 `scrollTo`(S15)를 위해
 * 여기서 직접 배선하고 ref를 든다. 카드 y 오프셋은 `onLayout`으로 수집한다.
 */
interface AiRouteSheetContentProps extends HomeSheetContentContext {
  state: AiRouteState;
  /** 요청 뷰포트를 만들 수 있는가 — 화면 `viewport.bounds !== null` */
  mapReady: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  /** 입력 포커스 — 시트 full 스냅 (D3) */
  onInputFocus: () => void;
  /** 카드 탭 — 선택 + 지도 이동 (D8) */
  onSelectCard: (order: number) => void;
}

export const AiRouteSheetContent = ({
  scrollGesture,
  scrollEnabled,
  onScrollOffsetChange,
  state,
  mapReady,
  onChangeText,
  onSubmit,
  onInputFocus,
  onSelectCard,
}: AiRouteSheetContentProps) => {
  const { text, status, points, notice, selectedOrder, errorNotice } = state;
  const featureDisabled = state.featureDisabled;
  const scrollRef = useRef<ScrollView>(null);
  /** 목록 컨테이너 y + 카드별 y — 둘을 더한 값이 스크롤 콘텐츠 기준 오프셋 */
  const listYRef = useRef(0);
  // 지연 초기화 — useRef(new Map())은 렌더마다 Map을 만들고 버린다 (react-doctor rerender-lazy-ref-init)
  const [cardY] = useState(() => new Map<number, number>());

  const legs = useMemo(() => buildRouteLegs(points), [points]);
  const loading = status === "loading";
  const bannerText = partialBannerText(notice, points.length);

  // 상태 전환으로 콘텐츠가 바뀌면 오프셋 가드가 스테일해진다 — 0에서 다시 시작한다 (쉘 계약)
  useEffect(() => {
    onScrollOffsetChange(0);
  }, [onScrollOffsetChange, status]);

  // 선택이 바뀌면 그 카드를 시트 안에 보이게 스크롤한다 (S15 — 웹 RouteResultList 대응)
  useEffect(() => {
    if (selectedOrder === null) return;
    const y = cardY.get(selectedOrder);
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: listYRef.current + y, animated: true });
  }, [cardY, selectedOrder]);

  const inputCard = (
    <RouteInputCard
      text={text}
      onChange={onChangeText}
      onSubmit={onSubmit}
      onFocus={onInputFocus}
      canSubmit={canSubmit({ text, status, featureDisabled, mapReady })}
      submitLabel={status === "idle" ? "동선 짜기" : "다시 짜기"}
      loading={loading}
    />
  );

  return (
    <GestureDetector gesture={scrollGesture}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        // 키보드가 떠 있어도 칩·버튼 탭이 한 번에 먹는다
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          onScrollOffsetChange(event.nativeEvent.contentOffset.y);
        }}
      >
        <View className="gap-md pb-9">
          {status === "idle" ? (
            <>
              <RouteEmptyState />
              <RouteSuggestionChips onSelect={onChangeText} />
              {inputCard}
            </>
          ) : (
            <>
              {inputCard}
              {status === "error" && errorNotice && (
                <RouteErrorNotice notice={errorNotice} onRetry={onSubmit} />
              )}
              {status !== "error" && (
                <RouteResultHeader loading={loading} count={points.length} />
              )}
              {status === "result" && bannerText && (
                <RoutePartialBanner text={bannerText} />
              )}
              {loading && <RouteSkeletonList />}
              {status === "result" && points.length > 0 && (
                <View
                  className="gap-1.5"
                  onLayout={(event) => {
                    listYRef.current = event.nativeEvent.layout.y;
                  }}
                >
                  {points.map((point, index) => {
                    const leg = legs.find(
                      (item) => item.toOrder === point.order,
                    );
                    return (
                      <View
                        key={point.order}
                        onLayout={(event) => {
                          cardY.set(point.order, event.nativeEvent.layout.y);
                        }}
                      >
                        {index > 0 && leg && (
                          <View className="py-1.5">
                            <RouteWalkConnector label={leg.label} />
                          </View>
                        )}
                        <RouteStopCard
                          point={point}
                          selected={point.order === selectedOrder}
                          onSelect={() => onSelectCard(point.order)}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
              {status !== "error" && (
                <Text className="text-fm-caption text-foreground-muted">
                  {RESULT_FOOTNOTE}
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </GestureDetector>
  );
};

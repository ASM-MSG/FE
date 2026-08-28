import { useCallback, useMemo } from "react";
import { useRouteRecommend } from "@/features/ai-route/api/use-route-recommend";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import { partialBannerText } from "@/features/ai-route/model/route-point-view";
import {
  buildRecommendBody,
  canSubmit,
} from "@/features/ai-route/model/route-request";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { RouteEmptyState } from "./ui/RouteEmptyState";
import { RouteErrorNotice } from "./ui/RouteErrorNotice";
import { RouteInputCard } from "./ui/RouteInputCard";
import { RouteLoadingList } from "./ui/RouteLoadingList";
import { RoutePartialBanner } from "./ui/RoutePartialBanner";
import { RouteResultHeader } from "./ui/RouteResultHeader";
import { RouteResultList } from "./ui/RouteResultList";
import { RouteSuggestionChips } from "./ui/RouteSuggestionChips";
import { useAiRouteOverlayPublish } from "./ui/use-ai-route-overlay-publish";

/**
 * AI 경로추천 패널 (MSG-488) — 문장 한 줄 + 현재 뷰포트로 추천을 1회 요청하고,
 * 네 상태(입력 대기·로딩·결과·결과 부족)와 지도 표시(번호 마커·격자 틴트·직선)를 그린다.
 *
 * 셸은 도감·프로필과 같은 388px aside 관례다 — `SectionPanel`은 제목 헤더를 강제하는데
 * Figma 패널에는 제목 바가 없어 쓰지 않는다(§3-1).
 * 상태 정본은 `useAiRouteStore`라 섹션을 떠났다 돌아와도 입력·결과·지도 표시가 복원된다 (S11).
 */
/** 추천 근거 각주 (Figma 15666:12621·12855) — 로딩·결과에 공통으로 붙는다 */
const RESULT_FOOTNOTE =
  "축제, 팝업, 코스, 행사 정보와 장소 검색 결과로만 추천해요";

export const AiRoutePage = () => {
  useDocumentTitle(formatDocumentTitle("AI 경로추천"));

  const { moveTo } = useMapShell();
  const openLoginModal = useLoginModalStore((s) => s.openModal);

  const text = useAiRouteStore((s) => s.text);
  const status = useAiRouteStore((s) => s.status);
  const points = useAiRouteStore((s) => s.points);
  const notice = useAiRouteStore((s) => s.notice);
  const selectedOrder = useAiRouteStore((s) => s.selectedOrder);
  const errorNotice = useAiRouteStore((s) => s.errorNotice);
  const featureDisabled = useAiRouteStore((s) => s.featureDisabled);
  const setText = useAiRouteStore((s) => s.setText);
  const selectOrder = useAiRouteStore((s) => s.selectOrder);

  // 요청 뷰포트는 "지금 보이는 지도 범위"(viewport-store), 점령 격자는 확정 영역 기준
  // 기존 쿼리를 그대로 재사용한다 — 같은 키라 캐시 히트로 추가 요청이 없다 (§3-1)
  const bounds = useViewportStore((s) => s.bounds);
  const committedBounds = useRegionPanelStore((s) => s.committedBounds);
  const { grids } = useOccupiedGridsQuery(committedBounds);
  const occupiedGridIds = useMemo(
    () => grids.map((grid) => grid.gridId),
    [grids],
  );

  const { mutate } = useRouteRecommend({ onLoginRequired: openLoginModal });
  const submit = useCallback(() => {
    // 지도 준비 전(bounds null)이거나 빈 문장이면 요청을 만들지 않는다 (L9)
    const body = buildRecommendBody({ text, bounds });
    if (body === null) return;
    mutate(body);
  }, [text, bounds, mutate]);

  // 카드 클릭 — 선택 강조 + 그 지점으로 지도 이동(줌은 그대로). fitBounds·zoomTo는 489 몫
  const selectFromCard = useCallback(
    (order: number) => {
      selectOrder(order);
      const point = points.find((item) => item.order === order);
      if (point) moveTo({ lat: point.lat, lng: point.lng });
    },
    [points, selectOrder, moveTo],
  );
  // 마커 클릭 — 선택만 바꾼다(카드 스크롤은 RouteResultList가 반응). 지도는 이미 그 자리다
  const selectFromMarker = useCallback(
    (order: number) => selectOrder(order),
    [selectOrder],
  );

  useAiRouteOverlayPublish({
    points,
    occupiedGridIds,
    selectedOrder,
    onWaypointSelect: selectFromMarker,
  });

  // [MSG-489 확장점] mentionedArea 자동 이동 훅을 여기서 마운트한다.

  const loading = status === "loading";
  const bannerText = partialBannerText(notice, points.length);

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 shrink-0 flex-col bg-background shadow-raised">
      <h1 className="sr-only">AI 경로추천</h1>
      <div className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto p-5">
        {status === "idle" && <RouteEmptyState />}
        {status === "error" && errorNotice && (
          <RouteErrorNotice notice={errorNotice} onRetry={submit} />
        )}
        {loading && (
          <>
            <RouteResultHeader loading count={0} />
            <RouteLoadingList />
            <p className="text-fm-caption text-foreground-muted">
              {RESULT_FOOTNOTE}
            </p>
          </>
        )}
        {status === "result" && (
          <>
            <RouteResultHeader loading={false} count={points.length} />
            {bannerText && <RoutePartialBanner text={bannerText} />}
            {points.length > 0 && (
              <RouteResultList
                points={points}
                selectedOrder={selectedOrder}
                onSelect={selectFromCard}
              />
            )}
            <p className="text-fm-caption text-foreground-muted">
              {RESULT_FOOTNOTE}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-md p-5 pt-0">
        {status === "idle" && <RouteSuggestionChips onSelect={setText} />}
        <RouteInputCard
          text={text}
          onChange={setText}
          onSubmit={submit}
          canSubmit={canSubmit({ text, status, featureDisabled })}
          submitLabel={status === "idle" ? "동선 짜기" : "다시 짜기"}
          loading={loading}
        />
      </div>
    </aside>
  );
};

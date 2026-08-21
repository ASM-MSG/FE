import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  getGridGlobalVideosOptions,
  getGridVideosOptions,
} from "../../../shared/api/query-options";
import { useAuth } from "../../auth/model/auth-session";
import {
  mergeFeedItems,
  toFeedItemFromGlobal,
  toFeedItemFromMine,
  type GridFeedItem,
} from "../model/grid-videos";
import type { GatedQueryStatus } from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 격자 영상 목록 조합 (MSG-427 C10) — 전역 `GET /api/grids/{gridId}/videos`(첫 페이지)
 * + 내 영상 `/my-videos` 2쿼리 병합. 웹 `use-grid-videos-query.ts` 이식.
 * 지도 SDK를 import하지 않는다.
 *
 * 부분 실패는 실패로 본다 — 성공분만 그리면 목록이 조용히 짧아진다(MSG-325 리뷰 결).
 */
export interface GridVideosResult extends GatedQueryStatus {
  /** 병합 피드 — 내 영상 앞, videoId 중복 제거. 미완이면 빈 배열 */
  items: GridFeedItem[];
}

export const useGridVideosQuery = (gridId: string | null): GridVideosResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const active = isAuthenticated && gridId !== null;
  const path = { gridId: gridId ?? "" };

  const global = useQuery({
    ...getGridGlobalVideosOptions({ path }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });
  const mine = useQuery({
    ...getGridVideosOptions({ path }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  const items = useMemo(() => {
    if (!global.data || !mine.data) return [];
    return mergeFeedItems(
      mine.data.map(toFeedItemFromMine),
      global.data.videos.map(toFeedItemFromGlobal),
    );
  }, [global.data, mine.data]);

  return {
    items,
    isError: global.isError || mine.isError,
    isResolved:
      (!active && hydrated) ||
      (global.data !== undefined && mine.data !== undefined),
    retry: () => {
      if (!active) return;
      void global.refetch();
      void mine.refetch();
    },
  };
};

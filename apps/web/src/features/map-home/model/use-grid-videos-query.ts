import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import {
  getGridGlobalVideosOptions,
  getGridVideosOptions,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import {
  mergeFeedItems,
  toFeedItemFromGlobal,
  toFeedItemFromMine,
  type GridFeedItem,
} from "./grid-videos";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 격자 영상 목록 조합 훅 (MSG-326 기준 7) — 전역 `GET /api/grids/{gridId}/videos`(첫 페이지,
 * 기본 20건 — 커서 페이지네이션은 후속 여지, 추정 2) + 내 영상 `/my-videos` 2쿼리 병합.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * MSG-474: `/my-videos`는 사용자별 API(익명 401 — 실측 2026-08-26)라 비로그인은 발사하지
 * 않는다 — 전역 목록만으로 items·isEmpty가 성립한다 (AC 3). 전역 목록은 익명 200.
 *
 * 부분 실패 처리 (추정 7): 한쪽이라도 실패하면 isError — 실패를 성공분 표시로 위장하지
 * 않는다(MSG-325 리뷰 결). retry는 활성 쿼리만 refetch.
 */

/** 목록 조합 결과 — 상세 패널 피드 영역의 상태 분기(로딩·실패·빈 목록) 근거 (기준 10) */
export interface GridVideosResult {
  /** 병합 피드 — 내 영상 앞, videoId 중복 제거 (기준 3). 미완이면 빈 배열 */
  items: GridFeedItem[];
  isPending: boolean;
  isError: boolean;
  /** 빈 목록 판정 — 두 응답이 모두 도착했고 둘 다 0건 (기준 7) */
  isEmpty: boolean;
  /** 실패 후 재시도 — 두 목록을 함께 다시 부른다 (추정 7) */
  retry: () => void;
}

export const useGridVideosQuery = (gridId: string | null): GridVideosResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enabled = gridId !== null;
  // 내 영상은 사용자별 API — 비로그인 미발사 (MSG-474 AC 3)
  const mineEnabled = enabled && isAuthenticated;
  const path = { gridId: gridId ?? "" };

  const global = useQuery({
    ...getGridGlobalVideosOptions({ path }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });
  const mine = useQuery({
    ...getGridVideosOptions({ path }),
    select: unwrapEnvelope,
    enabled: mineEnabled,
    ...entityQueryPolicy,
  });

  const items = useMemo(() => {
    if (!global.data) return [];
    const globalItems = global.data.videos.map(toFeedItemFromGlobal);
    // 비로그인 — 전역 목록 그대로 (내 영상 조회 없음)
    if (!mineEnabled) return globalItems;
    if (!mine.data) return [];
    return mergeFeedItems(mine.data.map(toFeedItemFromMine), globalItems);
  }, [global.data, mine.data, mineEnabled]);

  return {
    items,
    // 비활성(gridId null·비로그인 mine) 쿼리는 영원히 pending이라 enabled로 게이트한다
    isPending: enabled && (global.isPending || (mineEnabled && mine.isPending)),
    isError: global.isError || mine.isError,
    isEmpty:
      !!global.data && (!mineEnabled || !!mine.data) && items.length === 0,
    retry: () => {
      void global.refetch();
      if (mineEnabled) void mine.refetch();
    },
  };
};

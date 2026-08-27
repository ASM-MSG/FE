import type { QueryClient } from "@tanstack/react-query";
// 생성 키 함수는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getCellQueryKey,
  getGridGlobalVideosQueryKey,
  getGridVideosQueryKey,
  getOccupiedAggregatesInViewportQueryKey,
  getOccupiedInViewportQueryKey,
  getStatByGridQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 격자 관련 쿼리 무효화 (B13) — 업로드·교체 확정 직후와 영상 삭제(video-actions)가 공유한다.
 * (구 READY 전이 호출은 블러 폴링 워처와 함께 삭제 — MSG-476.)
 * 점령 격자는 뷰포트 파라미터별로 캐시 키가 갈라져 있어 생성 키의 식별자(`_id`)만 남긴
 * 부분 키(TanStack 부분 일치)로 전 뷰포트를 무효화하고, 격자 상세(cell·stat)와
 * 영상 목록 2종(전역·내 영상 — MSG-326 병합으로 구 대표 영상 cover를 대체)은 gridId로
 * 정확 무효화한다.
 *
 * gridId를 모르는 호출(MSG-411 영상 삭제 — 미니 패널에서 playback 해소 전 확정,
 * codex 리뷰 4)은 null을 넘긴다 — gridId 계열 4종도 점령 격자와 같은 부분 키(_id)
 * 방식으로 전 격자 무효화한다. 확정 차단 대안은 playback 실패 시 삭제 자체가
 * 영구 불가가 되어 기각.
 */
export const invalidateGridQueries = (
  queryClient: QueryClient,
  gridId: string | null,
): void => {
  const [occupiedKey] = getOccupiedInViewportQueryKey({
    query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
  });
  void queryClient.invalidateQueries({ queryKey: [{ _id: occupiedKey._id }] });

  // 저줌 집계 마커 count 재조회 (MSG-410 AC 11) — 캐시 키가 unit·bbox별로 갈라져
  // 점령 격자와 같은 부분 키(_id) 방식으로 전부 무효화한다
  const [aggregationKey] = getOccupiedAggregatesInViewportQueryKey({
    query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0, unit: "DONG" },
  });
  void queryClient.invalidateQueries({
    queryKey: [{ _id: aggregationKey._id }],
  });

  if (gridId === null) {
    // 격자 미상 — gridId 계열 4종을 식별자(_id)만 남긴 부분 키로 광역 무효화
    const anyGridPath = { path: { gridId: "" } };
    const broadKeys = [
      getCellQueryKey(anyGridPath),
      getGridGlobalVideosQueryKey(anyGridPath),
      getGridVideosQueryKey(anyGridPath),
      getStatByGridQueryKey({ query: { gridId: "" } }),
    ];
    for (const [key] of broadKeys) {
      void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
    }
    return;
  }

  const gridPath = { path: { gridId } };
  void queryClient.invalidateQueries({ queryKey: getCellQueryKey(gridPath) });
  void queryClient.invalidateQueries({
    queryKey: getGridGlobalVideosQueryKey(gridPath),
  });
  void queryClient.invalidateQueries({
    queryKey: getGridVideosQueryKey(gridPath),
  });
  void queryClient.invalidateQueries({
    queryKey: getStatByGridQueryKey({ query: { gridId } }),
  });
};

import type { QueryClient } from "@tanstack/react-query";
// 생성 키 함수는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getCellQueryKey,
  getGridCoverQueryKey,
  getOccupiedInViewportQueryKey,
  getStatByGridQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 격자 관련 쿼리 무효화 (B13 + 블러 완료 갱신) — 업로드 확정 직후와 READY 전이가 공유한다.
 * 점령 격자는 뷰포트 파라미터별로 캐시 키가 갈라져 있어 생성 키의 식별자(`_id`)만 남긴
 * 부분 키(TanStack 부분 일치)로 전 뷰포트를 무효화하고, 격자 상세 3종은 gridId로 정확
 * 무효화한다. READY 전이에서 다시 부르는 이유: 확정 시점 재조회는 서버 READY 필터에 걸려
 * 대표 영상이 비어 있고, 블러 완료 후에야 노출되므로 그때 한 번 더 신선 조회가 필요하다.
 */
export const invalidateGridQueries = (
  queryClient: QueryClient,
  gridId: string,
): void => {
  const [occupiedKey] = getOccupiedInViewportQueryKey({
    query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
  });
  void queryClient.invalidateQueries({ queryKey: [{ _id: occupiedKey._id }] });

  const gridPath = { path: { gridId } };
  void queryClient.invalidateQueries({ queryKey: getCellQueryKey(gridPath) });
  void queryClient.invalidateQueries({
    queryKey: getGridCoverQueryKey(gridPath),
  });
  void queryClient.invalidateQueries({
    queryKey: getStatByGridQueryKey({ query: { gridId } }),
  });
};

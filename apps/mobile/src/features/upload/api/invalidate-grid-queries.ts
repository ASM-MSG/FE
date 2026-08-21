import type { QueryClient } from "@tanstack/react-query";
import {
  getCellQueryKey,
  getGridGlobalVideosQueryKey,
  getGridVideosQueryKey,
  getOccupiedAggregatesInViewportQueryKey,
  getOccupiedInViewportQueryKey,
  getStatByGridQueryKey,
  getUploadHistoryQueryKey,
} from "../../../shared/api/query-options";

/**
 * 격자 관련 쿼리 무효화 (기준 28) — 웹 `features/upload/api/invalidate-grid-queries.ts`의
 * 키 구성을 그대로 이식했다.
 *
 * **환류 F3 / 리스크 R2 — MSG-423과의 유일한 접점이 이 쿼리 키다.**
 * 지금 모바일 지도의 점령 격자는 아직 `MOCK_OCCUPIED_CELLS` 하드코딩이라 이 무효화는
 * **무해한 no-op**이다. 점령 격자 실연동은 병렬 진행 중인 MSG-423의 범위이고(MSG-424는
 * `entities/cell`·`features/map-home`을 한 파일도 건드리지 않는다), MSG-423이 붙이는
 * 점령 격자 쿼리가 바로 이 키를 쓰게 되면 여기 호출이 자동으로 효력을 갖는다.
 * 따라서 "확인 → 홈 복귀 후 격자가 채워져 보인다"의 화면 반영은 MSG-424의 결함이 아니다.
 * MSG-423 머지 후 업로드 → 홈 복귀 격자 채움을 한 번 교차 확인할 것.
 *
 * 점령 격자·집계는 뷰포트 파라미터별로 캐시 키가 갈라져 있어 생성 키의 식별자(`_id`)만
 * 남긴 부분 키(TanStack 부분 일치)로 전 뷰포트를 무효화한다 — 생성 `createQueryKey`가
 * 무한 쿼리에만 `_infinite: true`를 **추가**하므로 MSG-423이 무한 쿼리를 쓰더라도
 * 같은 부분 키에 매칭된다(스펙 "무효화 키 정합 확인").
 */
export const invalidateGridQueries = (
  queryClient: QueryClient,
  gridId: string,
): void => {
  const [occupiedKey] = getOccupiedInViewportQueryKey({
    query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
  });
  void queryClient.invalidateQueries({ queryKey: [{ _id: occupiedKey._id }] });

  // 저줌 집계 마커 count 재조회 — 캐시 키가 unit·bbox별로 갈라져 같은 부분 키 방식을 쓴다
  const [aggregationKey] = getOccupiedAggregatesInViewportQueryKey({
    query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0, unit: "DONG" },
  });
  void queryClient.invalidateQueries({
    queryKey: [{ _id: aggregationKey._id }],
  });

  // 업로드한 격자의 상세·영상 목록·통계는 gridId로 정확 무효화한다
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

  // 업로드 잔디 이력 — 오늘 셀 카운트가 늘었다 (웹 MSG-414 A8과 같은 이유)
  void queryClient.invalidateQueries({ queryKey: getUploadHistoryQueryKey() });
};

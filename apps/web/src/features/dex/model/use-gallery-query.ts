import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  MOCK_COLLECTED_VIDEOS,
  MOCK_DEX,
  type CollectedVideo,
} from "@/entities/dex";
import { selectRegionVideos } from "./gallery";

/**
 * 지역 갤러리 조회 queryFn. [AC 7·9, A2]
 * 현재는 mock 데이터에서 지역 필터를 수행한다 — 실 API 전환 시 서버가 지역 필터를 맡을
 * 것으로 예상되며, `(region) => Promise<CollectedVideo[]>` 시그니처가 그 계약이다.
 * use-dex-query의 fetchDex 패턴 — 이 함수 내부만 교체하면 된다.
 */
export const fetchGalleryVideos = async (
  region: string,
): Promise<CollectedVideo[]> =>
  selectRegionVideos(MOCK_DEX.collectedCells, MOCK_COLLECTED_VIDEOS, region);

/**
 * 지역 파라미터 분리 쿼리 옵션 (A2) — queryKey ["dex", "gallery", region].
 * 도감 쿼리(["dex"])에 내장하지 않아 갤러리 고유의 pending·오류 라이프사이클(스켈레톤·재시도)이
 * 지역 단위로 관찰된다.
 */
export const galleryQueryOptions = (region: string) =>
  queryOptions({
    queryKey: ["dex", "gallery", region] as const,
    queryFn: () => fetchGalleryVideos(region),
  });

/** 지역 갤러리 조회 훅 — 뷰는 이 훅으로 로딩/에러/데이터 상태를 받는다 */
export const useGalleryQuery = (region: string) =>
  useQuery(galleryQueryOptions(region));

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { decodeGridCenter } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import type { CollectionGridResponseDto } from "@/shared/api/generated";
import { getCollectionGridsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { entityQueryPolicy } from "./map-query-policy";
import type { CollectedGrid } from "./mission-progress";

/**
 * 내 수집 격자 조회 (MSG-395 AC 3·11·28) — `GET /api/collections/grids`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 미션 진행도(`mission-progress`)의 교집합 입력이자, 격자 상세의 "…부터 내가 점령 중"
 * 문구 근거(`firstCollectedAt`)다. 보호 API라 비로그인은 조회하지 않는다 —
 * 게이트 없이는 홈 (재)마운트마다 401 + reissue가 재발사된다(핫구역 훅과 같은 이유).
 */
export interface CollectedGridsResult {
  /** 격자 id 집합 — 방문 판정(코스 스팟) */
  gridIds: ReadonlySet<string>;
  /**
   * 진행도 판정 입력 — id + 중심 좌표. 좌표 변환(proj4)을 여기서 목록당 1회만 하고
   * 미션 수만큼 반복하지 않는다 (BOX 미션 포함 판정이 중심 좌표를 쓴다)
   */
  collected: CollectedGrid[];
  /** 원본 목록 — 점령 시작일 등 격자별 부가 정보 조회용 */
  grids: CollectionGridResponseDto[];
}

const EMPTY_GRIDS: CollectionGridResponseDto[] = [];

export const useCollectedGridsQuery = (): CollectedGridsResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data } = useQuery({
    ...getCollectionGridsOptions(),
    select: unwrapEnvelope,
    enabled: isAuthenticated,
    ...entityQueryPolicy,
  });

  return useMemo(() => {
    const grids = data ?? EMPTY_GRIDS;
    return {
      gridIds: new Set(grids.map((grid) => grid.gridId)),
      collected: grids.map((grid) => ({
        gridId: grid.gridId,
        center: decodeGridCenter(grid.gridId),
      })),
      grids,
    };
  }, [data]);
};

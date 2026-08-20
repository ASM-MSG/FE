import { gridDisplayName, type GridNaming } from "../model/home-grid-label";

/**
 * 격자 표시명 일괄 조회의 순수 파생 (MSG-427 E12·E-16) — 웹
 * `features/map-home/model/use-grid-names-query.ts`의 반환 계산부다.
 *
 * 훅(`use-grid-names-query.ts`)과 이 팩토리를 나눈 이유(MSG-428 `grid-aggregation-query`
 * 선례): 훅은 `auth-session`을 import하고 그 모듈이 파싱 단계에 expo-secure-store를 끌고
 * 와 vitest에서 파일을 열 수조차 없다. 게이트 판정을 여기(네이티브 무의존)로 내려
 * 순수 테스트가 계약을 덮게 한다 — **이 파생이 틀리면 코스 상세가 영구 로딩에 갇힌다.**
 */

/** 표시명 파생에 필요한 격자 응답의 부분집합 */
export type GridNameCell = GridNaming & { regionName?: string | null };

/** 쿼리에서 실제로 읽는 두 필드만 — `useQueries` 결과를 그대로 받는다 */
export interface GridNameQueryLike {
  data: GridNameCell | undefined;
  /**
   * TanStack Query의 `status === "pending"`. **`data === undefined`로 대신하면 안 된다** —
   * 실패한 쿼리도 `data`가 undefined인 채로 남아 게이트가 영원히 안 풀린다.
   */
  isPending: boolean;
}

export interface GridNamesResult {
  names: ReadonlyMap<string, string>;
  /** 하나라도 도착 전 — 로딩 중에 "이름 없는 경유 지점"을 거짓말하지 않게 게이트한다 */
  isPending: boolean;
}

export const deriveGridNames = (
  queries: readonly GridNameQueryLike[],
  active: boolean,
): GridNamesResult => {
  const names = new Map<string, string>();
  for (const query of queries) {
    const cell = query.data;
    // 구역 밖 격자는 zoneName이 null이라 gridDisplayName이 행정동명으로 폴백한다.
    // 둘 다 없으면 gridId가 나오는데 그건 이름이 아니므로 담지 않는다 — 뷰가
    // "이름 없는 경유 지점"으로 분기할 수 있게 부재를 그대로 남긴다
    if (!cell) continue;
    const name = gridDisplayName(cell, cell.regionName);
    if (name !== cell.gridId) names.set(cell.gridId, name);
  }

  return {
    names,
    // `active &&`가 필요한 이유: 모바일은 `enabled: active`로 게이트하는데 **비활성 쿼리는
    // TanStack Query에서 영원히 pending**이라 누르지 않으면 게이트가 안 풀린다
    // (shared/api/gated-query-status가 문서화한 함정과 같다). 웹 원본에는 이 게이트가 없다.
    isPending: active && queries.some((query) => query.isPending),
  };
};

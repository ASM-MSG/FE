import type { Bounds } from "../../../entities/cell/model/grid";
import { getActiveMissionsInViewportOptions } from "../../../shared/api/query-options";
import type { GetActiveMissionsInViewportResponse } from "../../../shared/api/sdk";
import { mapQueryPolicy } from "../model/map-query-policy";
import type { MissionChip } from "../model/mission";
import { activeMissionsQueryArgs } from "../model/mission-query-args";

/**
 * 활성 미션 조회 옵션 (MSG-427 D1 · MSG-579) — `GET /api/missions/active`.
 * 훅(`use-active-missions-query.ts`)과 나눈 이유는 grid-aggregation-query와 같다 —
 * 훅은 `auth-session`(expo-secure-store)을 끌고 와 vitest에서 열 수 없으므로,
 * 게이트·요청 인자·직전 데이터 유지 규칙을 여기(네이티브 무의존)에 둔다.
 */

/** placeholderData가 읽는 직전 쿼리의 최소 형태 — 키에 실린 type 하나뿐이다 */
type PreviousMissionsQuery =
  | { queryKey: readonly [{ query?: { type?: string } }] }
  | undefined;

/**
 * `mapQueryPolicy`의 keepPreviousData는 **같은 칩(type)의 bbox 이동**에만 적용한다.
 * TanStack은 비활성(pending·data 없음) 쿼리에도 placeholder를 주고, 그 인자는
 * 키·type과 무관하게 이 옵저버가 마지막으로 데이터를 가졌던 쿼리의 것이다 — bbox가
 * 0.5°를 넘어 조회가 닫힌 구간에서 칩을 바꾸면 직전 칩 목록이 새 칩 카드로 그려졌다
 * (MSG-579: 경로추천에 지역축제, 지역축제에 코스). 그래서 정책을 펼친 뒤 placeholder만
 * 덮어쓴다 — 비활성이거나 type이 다르면 비운다.
 */
export const activeMissionsQueryOptions = (
  chip: MissionChip | null,
  bounds: Bounds | null,
) => {
  const { query, enabled } = activeMissionsQueryArgs(chip, bounds);
  return {
    ...getActiveMissionsInViewportOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    placeholderData: (
      previousData: GetActiveMissionsInViewportResponse | undefined,
      previousQuery: PreviousMissionsQuery,
    ): GetActiveMissionsInViewportResponse | undefined =>
      enabled && previousQuery?.queryKey[0]?.query?.type === query.type
        ? previousData
        : undefined,
  };
};

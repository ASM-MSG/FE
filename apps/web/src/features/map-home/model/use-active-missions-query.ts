import { useQuery } from "@tanstack/react-query";
import type { Bounds } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import type { MissionResponseDto } from "@/shared/api/generated";
import { getActiveMissionsInViewportOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { mapQueryPolicy } from "./map-query-policy";
import { missionTypeParam, type MissionChip } from "./mission";
import { viewportQueryArgs } from "./viewport-query";

/**
 * 활성 미션 조회 (MSG-395 AC 1·26 → MSG-403 AC 19) — `GET /api/missions/active`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 명세 개편으로 **칩 종류(type)와 bbox가 필수**가 됐다 — 전역 1회 조회 후 프론트에서
 * type으로 나누던 방식이 사라지고 칩당 한 번씩 조회한다. bbox는 뷰포트가 아니라
 * **확정 영역**이다(AC 12): 뷰포트를 쓰면 지도를 미는 동안 요청이 계속 나간다.
 *
 * 인증 게이트를 건다 — MSG-395는 "공개 정보"를 전제로 게이트가 없었으나 익명 호출이
 * 401(developCode 2403)로 실측됐다(2026-08-15). 게이트가 없으면 비로그인 홈에서 칩을
 * 누를 때마다 401 + auth-pipeline 재발급이 돈다(핫구역·지역 훅과 같은 이유).
 */
export interface ActiveMissionsResult {
  missions: MissionResponseDto[];
  isPending: boolean;
  isError: boolean;
  /**
   * 지금 들고 있는 목록이 **직전 bbox의 것**인지 (MSG-451 검증 재작업 1).
   * `mapQueryPolicy`의 `keepPreviousData` 때문에 bbox가 바뀌어도 새 응답이 올 때까지
   * 이전 목록이 `isPending: false`인 채로 반환된다 — 깜빡임을 없애려는 의도적 정책이라
   * 그대로 두고, "이 영역 기준 목록인가"를 물어야 하는 소비처만 이 값을 본다.
   */
  isPlaceholder: boolean;
  retry: () => void;
}

const EMPTY_MISSIONS: MissionResponseDto[] = [];

export const useActiveMissionsQuery = (
  chip: MissionChip | null,
  bounds: Bounds | null,
): ActiveMissionsResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { query: viewport, enabled: boundsReady } = viewportQueryArgs(bounds);
  const active = boundsReady && isAuthenticated && chip !== null;

  const query = useQuery({
    ...getActiveMissionsInViewportOptions({
      query: {
        // 비활성 쿼리는 발사되지 않지만 옵션 타입이 값을 요구한다 (viewportQueryArgs 관례)
        type: chip === null ? "EVENT" : missionTypeParam(chip),
        ...viewport,
      },
    }),
    select: unwrapEnvelope,
    enabled: active,
    ...mapQueryPolicy,
  });

  return {
    missions: query.data ?? EMPTY_MISSIONS,
    isPlaceholder: active && query.isPlaceholderData,
    // 비활성 쿼리는 영원히 pending이라 게이트로 눌러준다 (region 훅 관례)
    ...gatedQueryStatus(query, active),
  };
};

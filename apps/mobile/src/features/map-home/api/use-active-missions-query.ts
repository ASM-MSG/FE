import { useQuery } from "@tanstack/react-query";
import type { Bounds } from "../../../entities/cell/model/grid";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getActiveMissionsInViewportOptions } from "../../../shared/api/query-options";
import type { MissionResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { mapQueryPolicy } from "../model/map-query-policy";
import type { MissionChip } from "../model/mission";
import { activeMissionsQueryArgs } from "../model/mission-query-args";

/**
 * 활성 미션 조회 (MSG-427 D1) — `GET /api/missions/active`.
 * 웹 `features/map-home/model/use-active-missions-query.ts` 이식 — 같은 생성 SDK·같은
 * 쿼리키를 쓰고, 새 fetch·새 QueryClient를 만들지 않는다 (F6).
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다.
 *
 * bbox는 **현재 뷰포트**다 (스펙 추정 4): 웹은 "확정 영역"을 쓰지만 모바일에는 그 개념이
 * 없고(MSG-423이 뷰포트 단일 소유로 갔다), 재조회는 카메라 이동 종료(onCameraIdle)마다다.
 * 인증 게이트를 건다 — 익명 호출이 401로 실측됐고(웹 2026-08-15), 게이트가 없으면
 * 칩을 누를 때마다 401 + auth-pipeline 재발급이 돈다.
 */
export interface ActiveMissionsResult extends GatedQueryStatus {
  missions: MissionResponseDto[];
}

const EMPTY_MISSIONS: MissionResponseDto[] = [];

export const useActiveMissionsQuery = (
  chip: MissionChip | null,
  bounds: Bounds | null,
): ActiveMissionsResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const { query, enabled } = activeMissionsQueryArgs(chip, bounds);
  const active = enabled && isAuthenticated;
  // 게이트 판정이 확정됐는가 — 재수화 전이나 뷰포트 미확정에는 "조회 안 함"이 아니라
  // "아직 모름"이므로 접지 않는다 (MSG-423 관례, PR #72 리뷰)
  const settled = hydrated && (bounds !== null || chip === null);

  const queryResult = useQuery({
    ...getActiveMissionsInViewportOptions({ query }),
    select: unwrapEnvelope,
    enabled: active,
    ...mapQueryPolicy,
  });

  return {
    missions: queryResult.data ?? EMPTY_MISSIONS,
    ...gatedQueryStatus(queryResult, active, settled),
  };
};

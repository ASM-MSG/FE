import type { Bounds } from "../../../entities/cell/model/grid";
import { missionTypeParam, type MissionChip } from "./mission";
import { viewportQueryArgs } from "./viewport-query";

/**
 * 미션 조회 요청 인자·게이트 (MSG-427 D1·D2) — 순수 함수.
 * 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * 훅에서 떼어낸 이유는 `viewport-query.ts`(MSG-423)와 같다: "무엇을 언제 보내는가"가
 * 수용 기준(칩당 1회·진행도 1회)인데, 훅 안에 두면 쿼리 스텁 없이는 검증할 수 없다.
 */

/**
 * 활성 미션 조회 인자 — `GET /api/missions/active`. [D1]
 * `type`·bbox 4개가 **전부 필수**라 칩이 없거나 뷰포트가 미확정이면 발사하지 않는다.
 * 비활성 쿼리는 나가지 않지만 생성 옵션 타입이 값을 요구해 EVENT로 채운다
 * (`viewportQueryArgs`가 bbox를 0으로 채우는 것과 같은 관례).
 */
export const activeMissionsQueryArgs = (
  chip: MissionChip | null,
  bounds: Bounds | null,
) => {
  const { query, enabled } = viewportQueryArgs(bounds);
  return {
    query: {
      type: chip === null ? "EVENT" : missionTypeParam(chip),
      ...query,
    },
    enabled: enabled && chip !== null,
  };
};

/**
 * 진행도 일괄 조회 인자 — `GET /api/missions/progress?missionIds=`. [D2]
 * 목록에 뜬 미션 전체를 **한 번에** 받는다(명세 상한 300 — 한 화면 목록은 그 아래).
 * 미션당 호출이 아니다. 대상이 없으면 요청하지 않는다.
 */
export const missionProgressQueryArgs = (missionIds: number[]) => ({
  query: { missionIds },
  enabled: missionIds.length > 0,
});

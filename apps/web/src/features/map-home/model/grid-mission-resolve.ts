import type { GridMissionResponseDto } from "@/shared/api/generated";
import { missionTypeParam } from "./mission";
import type { ThemeId } from "./theme";

/**
 * 축제·팝업 칩 활성 중 격자 클릭 대상 판정 (MSG-462 AC 6) — 하이브리드(스펙 승인).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * `GET /api/grids/{gridId}/missions`는 **대표 격자**(영상이 모인 칸)에서만 미션을 답하고
 * 판정 범위(축제 9×9)에만 걸친 격자는 빈 배열이라, API 단독으로는 "영역 안 어디를
 * 누르든"(티켓)을 만족할 수 없다. API 우선 + FE 도형 소속 폴백으로 판정한다:
 * - ⓐ 응답에 활성 칩 type(EVENT↔festival·POPUP↔popup) 일치 항목이 있으면 그중 첫 항목
 *   (type 불일치 항목은 활성 목록에 없어 상세를 만들 수 없다 — 칩 자동 전환 없음, 추정 2)
 * - ⓑ 응답이 비거나 일치가 없거나 조회 실패면 활성 미션의 도형 소속 첫 미션
 * - ⓒ 소속도 없으면 null — 호출부가 기존 격자 상세로 폴백한다 (AC 10)
 *
 * 서버가 이후 판정 범위 전체를 답하게 바뀌어도 FE 폴백 비중이 줄 뿐 동작은 같다(리스크 절).
 */
export type EventChip = Extract<ThemeId, "festival" | "popup">;

export const resolveGridMission = (input: {
  gridId: string;
  chip: EventChip;
  /** `GET /api/grids/{gridId}/missions` 응답 — 조회 실패면 null */
  responses: GridMissionResponseDto[] | null;
  /** 활성 미션 도형 소속 맵 (buildMissionGridMembership) — gridId → 활성 목록 순 첫 missionId */
  membership: ReadonlyMap<string, number>;
}): number | null => {
  const wantedType = missionTypeParam(input.chip);
  const matched = input.responses?.find((item) => item.type === wantedType);
  if (matched !== undefined) return matched.missionId;
  return input.membership.get(input.gridId) ?? null;
};

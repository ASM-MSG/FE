import { useQuery } from "@tanstack/react-query";
import type { Bounds } from "../../../entities/cell/model/grid";
import type { EventOccurrenceChip } from "../../../entities/event/model/event";
import { getOccurrencesInViewportOptions } from "../../../shared/api/query-options";
import { useDebouncedValue } from "../../../shared/use-debounced-value";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../../map-home/model/home-sheet-state";
import { entityQueryPolicy } from "../../map-home/model/map-query-policy";
import {
  EVENT_OCCURRENCES_DEBOUNCE_MS,
  eventOccurrencesQueryArgs,
  selectEventChips,
} from "./event-occurrences-query";

/**
 * 뷰포트 행사 회차 조회 (MSG-557 D3) — `GET /api/event-occurrences`. 웹
 * `use-event-occurrences-query.ts` 이식: 디바운스 정착 후 bbox, 익명 발사, `entityQueryPolicy`,
 * keepPreviousData 불채택(시 경계 이동에서 이전 시 행사가 남지 않게 — pending 동안 빈 배열).
 * 게이트·인자·빈 배열 수렴은 `event-occurrences-query.ts`(순수)가 갖고 그쪽이 테스트 대상이다.
 */
export const useEventOccurrencesQuery = (
  bounds: Bounds | null,
): { chips: EventOccurrenceChip[] } & GatedQueryStatus => {
  const debounced = useDebouncedValue(bounds, EVENT_OCCURRENCES_DEBOUNCE_MS);
  const { enabled, query: params } = eventOccurrencesQueryArgs(debounced);

  const query = useQuery({
    ...getOccurrencesInViewportOptions({ query: params }),
    enabled,
    ...entityQueryPolicy,
  });

  return {
    chips: selectEventChips(enabled, query.data),
    // 뷰포트 미확정(null)은 "아직 모른다" — 저줌 상한 초과는 "쏘지 않기로 확정"
    ...gatedQueryStatus(query, enabled, debounced !== null),
  };
};

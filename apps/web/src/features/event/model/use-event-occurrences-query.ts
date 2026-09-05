import { useQuery } from "@tanstack/react-query";
import type { Bounds } from "@/entities/cell";
import type { EventOccurrenceChip } from "@/entities/event";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getOccurrencesInViewportOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { useDebouncedValue } from "@/shared/use-debounced-value";

/** 뷰포트 정착 판정 지연 — 역지오코딩과 동일 계열(500ms), 드래그 중 연사 방지 */
export const EVENT_OCCURRENCES_DEBOUNCE_MS = 500;

/** 서버 bbox 상한 — 한 변 0.5도 초과 시 400(13401). 초과 뷰포트(저줌)는 미발사한다 */
export const EVENT_VIEWPORT_SPAN_CAP_DEG = 0.5;

/** bbox 한 변 0.5도 상한 초과 판정 (AC 7) — 순수 함수, 13401 예방 게이트 */
export const exceedsEventViewportSpan = (bounds: Bounds): boolean =>
  bounds.ne.lat - bounds.sw.lat > EVENT_VIEWPORT_SPAN_CAP_DEG ||
  bounds.ne.lng - bounds.sw.lng > EVENT_VIEWPORT_SPAN_CAP_DEG;

const EMPTY_CHIPS: EventOccurrenceChip[] = [];

/**
 * 뷰포트 행사 회차 조회 (MSG-516 AC 7·8) — `GET /api/event-occurrences`.
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 *
 * bbox 정본은 **뷰포트**(디바운스 정착 후)다 — 확정 영역 정본(MSG-403)의 명시적 예외
 * (추정 2, 저줌 집계 MSG-410 선례): 캡슐이 지도 이동을 따라가야 하는데 저줌 밖에서는
 * "장소 불러오기"가 없어 확정 영역으로는 갱신 수단이 없다.
 *
 * 게이트: 뷰포트 존재 && 한 변 0.5도 이내(저줌 미발사 — 추정 4).
 * 인증 게이트 없음 — 익명 200 실측(2026-08-31), 사용자별 값이 없다 (AC 7).
 * 빈 배열·조회 실패·미발사 전부 `chips: []` — 캡슐 미렌더 판정으로 수렴한다 (AC 8).
 */
export const useEventOccurrencesQuery = (
  bounds: Bounds | null,
): { chips: EventOccurrenceChip[] } => {
  const { debounced } = useDebouncedValue(
    bounds,
    EVENT_OCCURRENCES_DEBOUNCE_MS,
  );
  const enabled = debounced !== null && !exceedsEventViewportSpan(debounced);

  const query = useQuery({
    // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
    ...getOccurrencesInViewportOptions({
      query:
        debounced && enabled
          ? {
              swLat: debounced.sw.lat,
              swLng: debounced.sw.lng,
              neLat: debounced.ne.lat,
              neLng: debounced.ne.lng,
            }
          : { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
    }),
    select: unwrapEnvelope,
    enabled,
    // keepPreviousData(mapQueryPolicy) 불채택 (codex 리뷰 P2) — 캡슐 지역명은 역지오코딩이
    // 독립 갱신하므로, 시 경계 이동에서 이전 bbox 행사를 유지하면 새 지역명 옆에 이전 시
    // 행사가 남아 짝이 어긋난다. pending 동안 캡슐이 잠시 걷히는 쪽(빈 배열 수렴)이 정합.
    ...entityQueryPolicy,
  });

  return { chips: enabled && query.data ? query.data : EMPTY_CHIPS };
};

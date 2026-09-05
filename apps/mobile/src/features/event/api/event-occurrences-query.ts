import type { Bounds } from "../../../entities/cell/model/grid";
import type { EventOccurrenceChip } from "../../../entities/event/model/event";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import type { GetOccurrencesInViewportResponse } from "../../../shared/api/sdk";

/**
 * 뷰포트 행사 회차 조회 게이트 (MSG-557 D3·D4) — 웹 `use-event-occurrences-query.ts`의
 * 순수 부분 포팅. 훅(`use-event-occurrences-query.ts`)은 디바운스 + useQuery만 남긴 얇은 층
 * (MSG-426 "옵션 팩토리 + 얇은 훅" 구조). 지도 SDK를 import하지 않는다 — 뷰포트는
 * 플랫폼 중립 `Bounds`(RN 경계).
 */

/** 뷰포트 정착 판정 지연 — 역지오코딩과 동일 계열(500ms), 드래그 중 연사 방지 */
export const EVENT_OCCURRENCES_DEBOUNCE_MS = 500;

/** 서버 bbox 상한 — 한 변 0.5도 초과 시 400(13401). 초과 뷰포트(저줌)는 미발사한다 */
export const EVENT_VIEWPORT_SPAN_CAP_DEG = 0.5;

/** bbox 한 변 0.5도 상한 초과 판정 — 순수 함수, 13401 예방 게이트 */
export const exceedsEventViewportSpan = (bounds: Bounds): boolean =>
  bounds.ne.lat - bounds.sw.lat > EVENT_VIEWPORT_SPAN_CAP_DEG ||
  bounds.ne.lng - bounds.sw.lng > EVENT_VIEWPORT_SPAN_CAP_DEG;

/** 게이트 비활성 반환 전용 — 매 렌더 새 배열이면 카드 useMemo가 헛돈다 */
const EMPTY_CHIPS: EventOccurrenceChip[] = [];

/**
 * 게이트 판정 + 요청 인자. 미발사 상태에서도 생성 옵션 타입이 좌표를 요구해 0으로 채운다
 * (viewportQueryArgs 관례) — `enabled: false`라 실제로 나가지 않는다.
 */
export const eventOccurrencesQueryArgs = (
  bounds: Bounds | null,
): {
  enabled: boolean;
  query: { swLat: number; swLng: number; neLat: number; neLng: number };
} => {
  const enabled = bounds !== null && !exceedsEventViewportSpan(bounds);
  return {
    enabled,
    query:
      bounds && enabled
        ? {
            swLat: bounds.sw.lat,
            swLng: bounds.sw.lng,
            neLat: bounds.ne.lat,
            neLng: bounds.ne.lng,
          }
        : { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
  };
};

/** 빈 배열·조회 실패·미발사 전부 `[]` — 칩 미렌더 판정으로 수렴한다 (D4) */
export const selectEventChips = (
  enabled: boolean,
  data: GetOccurrencesInViewportResponse | undefined,
): EventOccurrenceChip[] =>
  enabled && data ? unwrapEnvelope(data) : EMPTY_CHIPS;

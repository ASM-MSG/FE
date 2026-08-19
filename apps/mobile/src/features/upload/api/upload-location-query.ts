import { unwrapEnvelope } from "../../../shared/api/envelope";
import { reverseGeocodeOptions } from "../../../shared/api/query-options";
import type { ReverseGeocodeResponse } from "../../../shared/api/sdk";
import type { GeoCoords } from "../../../shared/geolocation";

/**
 * 업로드 위치 역지오코딩 조회 옵션 (기준 20·26) — 좌표가 확보되기 전(null)에는 조회하지 않는다.
 *
 * 좌표 확보(`resolveMapCenter()`)와 분리해 별도 파일에 두는 이유: 그쪽은 expo-location을
 * 끌고 오는 네이티브 어댑터라 vitest에서 import할 수 없고, 한 파일에 두면 "확보한 좌표가
 * 실제 요청에 실리는가"를 고정할 수단이 사라진다(token-storage가 포트를 분리한 것과 같은 이유).
 * 여기는 생성 쿼리 옵션만 조합하므로 네이티브 의존이 없다 — 타입만 shared/geolocation에서 빌린다.
 */
export const uploadLocationQueryOptions = (center: GeoCoords | null) => ({
  ...reverseGeocodeOptions({
    query: { lat: center?.lat ?? 0, lng: center?.lng ?? 0 },
  }),
  // 명시 시그니처 — 훅의 useQuery가 봉투를 벗긴 타입으로 data를 좁힐 수 있게 한다
  // (인라인 스프레드였을 때와 달리 빌더로 빼면 제네릭 추론이 unknown으로 풀린다)
  select: (response: ReverseGeocodeResponse) => unwrapEnvelope(response),
  enabled: center !== null,
});

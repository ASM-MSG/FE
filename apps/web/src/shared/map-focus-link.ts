/**
 * 유저 지도 focus 딥링크 (MSG-554 AC 6) — 조립·해석의 단일 정본.
 * 관리자 콘솔이 "지도에서 보기"로 `/?focus=lat,lng`를 열고, 지도 홈 진입 훅이 같은
 * 규칙으로 읽는다. 양쪽이 형식을 따로 알면 조용히 어긋나므로 한 파일에 둔다.
 * 순수 함수 — window·라우터 미참조.
 */

/** 위경도 좌표 — shared는 최하층이라 entities의 LatLng를 참조하지 않고 구조 동형 타입을 쓴다 */
interface FocusCoords {
  lat: number;
  lng: number;
}

/** 쿼리 파라미터 이름 */
export const MAP_FOCUS_PARAM = "focus";

/** 소수 6자리 = 약 0.1m 해상도 — 100m 격자 중심을 표현하기에 충분하다 */
const COORD_PRECISION = 6;

/** 좌표를 유저 지도 진입 경로로 조립한다 (AC 6) */
export const buildMapFocusPath = ({ lat, lng }: FocusCoords): string => {
  const focus = `${Number(lat.toFixed(COORD_PRECISION))},${Number(
    lng.toFixed(COORD_PRECISION),
  )}`;
  return `/?${MAP_FOCUS_PARAM}=${focus}`;
};

/**
 * focus 파라미터를 좌표로 해석한다 (AC 6).
 * 없거나 형식·범위가 잘못되면 null — 지도 홈은 기존 진입과 동일하게 동작한다(회귀 0).
 */
export const parseMapFocusParam = (raw: string | null): FocusCoords | null => {
  if (raw === null || raw === "") return null;

  const parts = raw.split(",");
  if (parts.length !== 2) return null;

  const [lat, lng] = parts.map((part) =>
    part.trim() === "" ? Number.NaN : Number(part),
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
};

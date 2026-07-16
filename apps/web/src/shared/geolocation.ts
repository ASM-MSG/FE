/** 위경도 좌표 (LatLng와 구조 호환) — shared는 entities에 의존하지 않으므로 로컬 정의 */
export interface GeoCoords {
  lat: number;
  lng: number;
}

/** 위치 조회 폴백 — 서울 시청 */
export const SEOUL_CITY_HALL: GeoCoords = { lat: 37.5665, lng: 126.978 };

/**
 * 현재 위치 조회 어댑터. [L6]
 * `navigator.geolocation`은 이 파일 안에서만 참조한다(RN 경계 — RN에서는 구현만 교체).
 * 권한 거부·조회 실패·API 미지원 시 서울 시청 좌표로 폴백한다.
 */
export const getCurrentPosition = (): Promise<GeoCoords> =>
  new Promise((resolve) => {
    const geolocation =
      typeof navigator !== "undefined" ? navigator.geolocation : undefined;

    if (!geolocation) {
      resolve(SEOUL_CITY_HALL);
      return;
    }

    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(SEOUL_CITY_HALL),
    );
  });

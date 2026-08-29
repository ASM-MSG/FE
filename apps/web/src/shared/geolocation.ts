/** 위경도 좌표 (LatLng와 구조 호환) — shared는 entities에 의존하지 않으므로 로컬 정의 */
export interface GeoCoords {
  lat: number;
  lng: number;
}

/** 위치 조회 폴백 — 서면 */
export const SEOMYEON_CENTER: GeoCoords = { lat: 35.1579, lng: 129.0594 };

/**
 * 현재 위치 조회 어댑터 — 폴백 없음 (MSG-489 A1).
 * `navigator.geolocation`은 이 파일 안에서만 참조한다(RN 경계 — RN에서는 구현만 교체).
 * 권한 거부·조회 실패·API 미지원은 `null`로 구분해 돌려준다.
 *
 * 폴백판(`getCurrentPosition`)과 나뉘어 있는 이유: 폴백 좌표가 MVP 지역(서면)이라
 * 거부한 사용자도 지도 뷰포트 안으로 들어와 "현위치가 화면 안"으로 **오판정**된다.
 * 판정이 필요한 소비자(경로추천 출발지)는 이쪽을, 표시 좌표가 필요한 소비자는 폴백판을 쓴다.
 */
export const getCurrentPositionOrNull = (): Promise<GeoCoords | null> =>
  new Promise((resolve) => {
    const geolocation =
      typeof navigator !== "undefined" ? navigator.geolocation : undefined;

    if (!geolocation) {
      resolve(null);
      return;
    }

    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(null),
    );
  });

/**
 * 현재 위치 조회 어댑터. [L6]
 * 권한 거부·조회 실패·API 미지원 시 서면 중심 좌표로 폴백한다.
 */
export const getCurrentPosition = (): Promise<GeoCoords> =>
  getCurrentPositionOrNull().then((coords) => coords ?? SEOMYEON_CENTER);

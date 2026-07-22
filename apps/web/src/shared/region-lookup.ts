/** 위경도 좌표 (LatLng와 구조 호환) — shared는 entities에 의존하지 않으므로 로컬 정의(geolocation 선례) */
export interface RegionLookupCoords {
  lat: number;
  lng: number;
}

/**
 * 좌표 → 행정구(區) 이름 역지오코딩 어댑터 (개정 D2). [AC 21·R7]
 * `kakao.maps.services`(Geocoder.coord2RegionCode) 참조는 이 파일 안에서만 한다
 * (RN 경계 — geolocation.ts의 navigator 선례와 동일 패턴, RN에서는 구현만 교체).
 * SDK 미로드·services 미포함·조회 실패·예외 등 어떤 경우에도 크래시 없이 null로 폴백한다(R7) —
 * null 해석(디폴트 "중구")은 호출 측(current-region)의 몫.
 */
export const lookupRegionName = (
  coords: RegionLookupCoords,
): Promise<string | null> =>
  new Promise((resolve) => {
    const services =
      typeof kakao !== "undefined" ? kakao.maps?.services : undefined;
    if (!services) {
      resolve(null);
      return;
    }

    try {
      const geocoder = new services.Geocoder();
      // 카카오 API는 x=경도(lng), y=위도(lat) 순서
      geocoder.coord2RegionCode(coords.lng, coords.lat, (result, status) => {
        if (status !== services.Status.OK) {
          resolve(null);
          return;
        }
        // 행정동(H) 우선 — 구 이름은 region_2depth_name (예: "중구")
        const region =
          result.find((r) => r.region_type === "H") ?? result[0];
        resolve(region?.region_2depth_name || null);
      });
    } catch {
      // SDK 부분 로드 등 비정상 상태 — 크래시 대신 폴백 (R7)
      resolve(null);
    }
  });

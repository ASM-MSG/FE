/** 위경도 좌표 (LatLng와 구조 호환) — shared는 entities에 의존하지 않으므로 로컬 정의(geolocation 선례) */
export interface RegionLookupCoords {
  lat: number;
  lng: number;
}

/**
 * 좌표 → 행정구(區) 이름 역지오코딩 어댑터 (MSG-254 AC 6). [R7 계약 유지]
 * `naver.maps.Service`(reverseGeocode, geocoder 서브모듈) 참조는 이 파일 안에서만 한다
 * (RN 경계 — geolocation.ts의 navigator 선례와 동일 패턴, RN에서는 구현만 교체).
 * SDK 미로드·geocoder 서브모듈 미포함·조회 실패·예외 등 어떤 경우에도 크래시 없이 null로 폴백한다 —
 * null 해석(디폴트 "부산진구")은 호출 측(current-region)의 몫.
 */
export const lookupRegionName = (
  coords: RegionLookupCoords,
): Promise<string | null> =>
  new Promise((resolve) => {
    const service =
      typeof naver !== "undefined" ? naver.maps?.Service : undefined;
    if (!service) {
      resolve(null);
      return;
    }

    try {
      service.reverseGeocode(
        {
          coords: new naver.maps.LatLng(coords.lat, coords.lng),
          // 기존 카카오 행정동(H) 우선 방침 승계 — admcode 우선, legalcode 보조 (A4)
          orders: "admcode,legalcode",
        },
        (status, response) => {
          // 콜백은 SDK 스택에서 비동기 실행되므로 바깥 try/catch가 닿지 않는다 — 자체 방어 (R7)
          try {
            if (status !== service.Status.OK) {
              resolve(null);
              return;
            }
            // 구 이름은 region.area2.name (예: "부산진구") — admcode 결과 우선, 부재 시 첫 결과 (A4)
            const results = response.v2.results;
            const item =
              results.find((r) => r.name === "admcode") ?? results[0];
            resolve(item?.region.area2.name || null);
          } catch {
            resolve(null);
          }
        },
      );
    } catch {
      // SDK 부분 로드 등 비정상 상태 — 크래시 대신 폴백 (R7)
      resolve(null);
    }
  });

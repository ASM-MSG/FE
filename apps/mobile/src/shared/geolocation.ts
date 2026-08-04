import * as Location from "expo-location";

/** 위경도 좌표 — shared는 entities에 의존하지 않으므로 로컬 정의 (웹 shared/geolocation 동일 패턴) */
export interface GeoCoords {
  lat: number;
  lng: number;
}

/** 위치 조회 폴백 — 서면 (웹 shared/geolocation.ts와 동일 좌표) */
export const SEOMYEON_CENTER: GeoCoords = { lat: 35.1579, lng: 129.0594 };

/**
 * 지도 중심 결정 어댑터. [AC 2]
 * expo-location 참조는 이 파일 안에서만 한다 (스펙 구현 계획 — 웹 shared/geolocation.ts의
 * navigator.geolocation 격리와 동일 패턴).
 * 권한 승인 + 조회 성공 시 현재 위치, 권한 거부·조회 실패 시 서면 중심으로 폴백하는
 * 총함수(절대 reject하지 않음) — 호출부(지도 홈 초기 중심·내 위치 버튼)는 then만 쓴다.
 */
export const resolveMapCenter = async (): Promise<GeoCoords> => {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return SEOMYEON_CENTER;
    const position = await Location.getCurrentPositionAsync({});
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch {
    return SEOMYEON_CENTER;
  }
};

import * as Location from "expo-location";

/** 위경도 좌표 — shared는 entities에 의존하지 않으므로 로컬 정의 (웹 shared/geolocation 동일 패턴) */
export interface GeoCoords {
  lat: number;
  lng: number;
}

/** 위치 조회 폴백 — 서면 (웹 shared/geolocation.ts와 동일 좌표) */
export const SEOMYEON_CENTER: GeoCoords = { lat: 35.1579, lng: 129.0594 };

/**
 * 신규 위치 조회 대기 상한 (MSG-317 AC 17) — getCurrentPositionAsync는 위치 픽스가
 * 없는 환경(에뮬레이터·실내)에서 무기한 대기할 수 있어(재현 확인) 상한을 건다.
 */
const CURRENT_POSITION_TIMEOUT_MS = 3000;

/**
 * 진행 중 신규 조회 공유(single-flight, MSG-317 리뷰 반영) — getCurrentPositionAsync는
 * 취소 API가 없어, 타임아웃 후에도 네이티브 요청이 pending으로 남는다. 호출마다 새로
 * 발행하면 무응답 환경에서 내 위치 연타 시 미해결 요청이 탭 횟수만큼 누적되므로,
 * in-flight 프라미스를 재사용하고 settle 시(성공·실패 모두) 클리어한다.
 * 늦게 도착한 픽스는 다음 탭이 같은 프라미스로 재사용한다.
 */
let inFlightPosition: Promise<Location.LocationObject | null> | null = null;

/** 실패를 null로 흡수한 공유 조회 — 절대 reject하지 않음 (총함수 계약의 재료) */
const sharedCurrentPosition = (): Promise<Location.LocationObject | null> => {
  inFlightPosition ??= Location.getCurrentPositionAsync({}).then(
    (position) => {
      inFlightPosition = null;
      return position;
    },
    () => {
      inFlightPosition = null;
      return null;
    },
  );
  return inFlightPosition;
};

/** 테스트 전용 — 모듈 레벨 in-flight 상태 초기화 (vitest 케이스 간 격리, 프로덕션 호출 금지) */
export const resetInFlightPositionForTest = (): void => {
  inFlightPosition = null;
};

/** 공유 조회를 호출자별 타임아웃과 레이스 — 타임아웃·실패 모두 null (폴백 체인으로 계속) */
const currentPositionWithTimeout = () => {
  const shared = sharedCurrentPosition();
  return new Promise<Location.LocationObject | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), CURRENT_POSITION_TIMEOUT_MS);
    void shared.then((position) => {
      clearTimeout(timer);
      resolve(position);
    });
  });
};

const toCoords = (position: Location.LocationObject): GeoCoords => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
});

/**
 * 지도 중심 결정 어댑터. [AC 2, MSG-317 AC 17]
 * expo-location 참조는 이 파일 안에서만 한다 (스펙 구현 계획 — 웹 shared/geolocation.ts의
 * navigator.geolocation 격리와 동일 패턴).
 * 권한 승인 시 신규 조회(타임아웃 레이스) → last-known(즉시 응답) → 서면 순 폴백,
 * 권한 거부·전 단계 실패 시 서면 중심 — 총함수(절대 reject하지 않음) 계약 유지.
 * 호출부(지도 홈 초기 중심·내 위치 버튼)는 then만 쓴다.
 */
export const resolveMapCenter = async (): Promise<GeoCoords> => {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return SEOMYEON_CENTER;
    const position = await currentPositionWithTimeout();
    if (position) return toCoords(position);
    // 신규 조회 타임아웃·실패 — last-known이 있으면 그 좌표로 즉시 응답 (AC 17)
    const lastKnown = await Location.getLastKnownPositionAsync().catch(
      () => null,
    );
    return lastKnown ? toCoords(lastKnown) : SEOMYEON_CENTER;
  } catch {
    return SEOMYEON_CENTER;
  }
};

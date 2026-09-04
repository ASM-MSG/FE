import * as Location from "expo-location";
import { toPermissionState, type PermissionState } from "./permission-state";

/** 위경도 좌표 — shared는 entities에 의존하지 않으므로 로컬 정의 (웹 shared/geolocation 동일 패턴) */
export interface GeoCoords {
  lat: number;
  lng: number;
}

/** 현재 위치 + 측위 정확도(m, 없으면 null) — 지도 홈 현재 위치 점·원의 재료 (MSG-565) */
export interface CurrentLocation extends GeoCoords {
  accuracy: number | null;
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

/** expo LocationObject → 플랫폼 중립 CurrentLocation (MSG-565 L2) — expo 타입은 여기서 끊는다 */
export const toCurrentLocation = (
  position: Location.LocationObject,
): CurrentLocation => ({
  ...toCoords(position),
  accuracy: position.coords.accuracy,
});

/**
 * 위치 구독 옵션 (MSG-565 A4 개정) — `High`: 네이버 지도 앱처럼 점이 실제 위치에 붙어야 하고,
 * `Balanced`는 GMS fused가 GNSS를 켜지 않아 실측(에뮬레이터 `geo fix`·실기 첫 탭)에서 점이
 * 옛 캐시 위치에 머물렀다. 구독은 홈 포커스+포그라운드에서만 살아 있어 배터리 비용은 한정된다.
 */
const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 3000,
  distanceInterval: 5,
};

/**
 * 위치 구독 어댑터 (MSG-565 D4·D5·L3·L4) — 권한을 **판독만** 하고(요청 없음 — 새 프롬프트
 * 시점을 만들지 않는다) granted일 때만 `watchPositionAsync`를 건다. 거부·미결정·판독 실패·
 * 구독 실패·provider 오류는 전부 "구독 없음"으로 흡수하고 화면에 예외를 내지 않는다.
 *
 * 반환한 함수가 해제다. 구독 프라미스가 해소되기 **전**에 해제되면(포커스 즉시 이탈) 해소
 * 직후 remove해 네이티브 구독이 새지 않게 한다.
 */
export const watchPosition = (
  /** 권한이 granted가 아니면 `null` 1회 — 이전 픽스를 지우라는 신호(codex 리뷰: 백그라운드 권한 회수 시 옛 점 잔존) */
  onPosition: (location: CurrentLocation | null) => void,
): (() => void) => {
  let cancelled = false;
  let subscription: Location.LocationSubscription | null = null;
  const stop = () => {
    subscription?.remove();
    subscription = null;
  };
  void Location.getForegroundPermissionsAsync()
    .then(({ granted }) => {
      if (cancelled) return null;
      if (!granted) {
        onPosition(null);
        return null;
      }
      return Location.watchPositionAsync(
        WATCH_OPTIONS,
        (position) => onPosition(toCurrentLocation(position)),
        stop,
      );
    })
    .then((result) => {
      if (!result) return;
      if (cancelled) result.remove();
      else subscription = result;
    })
    .catch(() => {
      // 권한 판독·구독 자체 실패 — 이전 픽스를 지우고 점 없이 끝난다 (기존 MSG-447 안내 흐름은
      // 탭이 담당). 미승인 분기와 같은 신호라 화면은 추적도 함께 끈다 (Claude 리뷰 🟢)
      if (!cancelled) onPosition(null);
    });
  return () => {
    cancelled = true;
    stop();
  };
};

/** 좌표 + 그 좌표가 나온 권한 사정 (MSG-447 기준 2·3·4) */
export interface MapCenterResult {
  center: GeoCoords;
  permission: PermissionState;
}

/**
 * 전경 위치 권한 요청 + 3상태 판정 (MSG-447). 이미 결정된 권한에는 OS가 프롬프트를 띄우지
 * 않고 즉시 응답하므로, 내 위치 버튼처럼 매 탭 호출해도 사용자를 괴롭히지 않는다 — 이것이
 * 설정에서 권한을 바꾸고 돌아온 사용자를 별도 재판독 장치 없이 반영하는 근거다(기준 5).
 *
 * 판독 자체가 던지면(네이티브 모듈 부재 등) **`null`** — 권한 축의 판정 불가다. 이것을 거부로
 * 취급하면 권한 축의 문제가 아닌 것을 권한 안내로 띄워, 사용자를 설정 화면으로 보내 놓고
 * 아무것도 고칠 수 없게 만든다(기준 4).
 */
const requestLocationPermission = async (): Promise<PermissionState | null> => {
  try {
    const { granted, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();
    return toPermissionState({ granted, canAskAgain });
  } catch {
    return null;
  }
};

/**
 * 지도 중심 결정 어댑터 **+ 권한 사정**. [AC 2, MSG-317 AC 17, MSG-447 기준 2·3·4]
 * expo-location 참조는 이 파일 안에서만 한다 (스펙 구현 계획 — 웹 shared/geolocation.ts의
 * navigator.geolocation 격리와 동일 패턴).
 * 권한 승인 시 신규 조회(타임아웃 레이스) → last-known(즉시 응답) → 서면 순 폴백,
 * 권한 거부·전 단계 실패 시 서면 중심 — 총함수(절대 reject하지 않음) 계약 유지.
 *
 * `permission`을 함께 돌려주는 이유(결정 D1): 종전의 `resolveMapCenter()`는 총함수라 **거부를
 * 서면 좌표로 흡수**했고, 호출부는 "거부"와 "측위 실패"를 구분할 수 없었다. 그래서 내 위치
 * 버튼이 권한 없이도 조용히 서면으로 튀었다 — 안내도 복구 경로도 붙일 자리가 없었다.
 */
export const resolveMapCenterWithPermission =
  async (): Promise<MapCenterResult> => {
    const permission = await requestLocationPermission();
    /**
     * 판정 불가(네이티브 접점 장애) — 좌표는 서면으로 접고 **권한은 `granted`로 보고**한다.
     * 권한 안내를 띄우지 않기 위한 인코딩이다(기준 4): `derivePermissionNotice`는 `granted`에
     * 아무것도 내지 않는다. 종전 `resolveMapCenter()`의 폴백 동작도 이 줄로 그대로 보존된다.
     */
    if (permission === null) {
      return { center: SEOMYEON_CENTER, permission: "granted" };
    }
    if (permission !== "granted") {
      return { center: SEOMYEON_CENTER, permission };
    }
    try {
      const position = await currentPositionWithTimeout();
      if (position) return { center: toCoords(position), permission };
      // 신규 조회 타임아웃·실패 — last-known이 있으면 그 좌표로 즉시 응답 (AC 17)
      const lastKnown = await Location.getLastKnownPositionAsync().catch(
        () => null,
      );
      return {
        center: lastKnown ? toCoords(lastKnown) : SEOMYEON_CENTER,
        permission,
      };
    } catch {
      return { center: SEOMYEON_CENTER, permission };
    }
  };

/**
 * 좌표만 필요한 호출부(도감 지역 통계·업로드 위치·지도 초기 중심)의 진입점 — 계약은 종전과
 * 동일하다(총함수, 서면 폴백). 권한 사정까지 필요한 곳만 위 함수를 쓴다 (결정 D1).
 */
export const resolveMapCenter = async (): Promise<GeoCoords> =>
  (await resolveMapCenterWithPermission()).center;

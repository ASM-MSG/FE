import type { CurrentLocation } from "../../../shared/geolocation";
import type { PermissionState } from "../../../shared/permission-state";

export type { CurrentLocation };

/**
 * 현재 위치 오버레이 순수 모델 (MSG-565) — 지도 SDK를 import하지 않는다(RN 경계).
 * 렌더는 `ui/grid-map.tsx`의 `NaverMapView.locationOverlay`가, 구독은
 * `shared/geolocation.watchPosition`이, 화면 배선은 `use-current-location.ts`가 맡는다.
 */

/** SDK `CameraChangeReason`과 같은 리터럴 — 모델이 SDK 타입을 import하지 않기 위한 로컬 정의 */
export type CameraReason = "Developer" | "Gesture" | "Control" | "Location";

/** 드래그·핀치만 추적을 푼다 — panTo(Developer)·SDK 줌 버튼(Control)은 해제하지 않는다 (D7) */
export const isGestureCameraChange = (reason: CameraReason): boolean =>
  reason === "Gesture";

export type TrackingEvent =
  | { kind: "locate"; permission: PermissionState }
  | { kind: "camera"; reason: CameraReason };

/** 내 위치 버튼 "추적 중" 리듀서 — 탭 승인이면 켜고, 제스처면 끄고, 나머지는 불변 (L5) */
export const nextTracking = (
  tracking: boolean,
  event: TrackingEvent,
): boolean => {
  if (event.kind === "locate") {
    return event.permission === "granted" ? true : tracking;
  }
  return isGestureCameraChange(event.reason) ? false : tracking;
};

/** `NaverMapView.locationOverlay` 중 위치 파생분 — 이미지·앵커·색은 GridMap 상수 */
export const locationOverlayProps = (
  location: CurrentLocation | null | undefined,
): {
  isVisible: boolean;
  position?: { latitude: number; longitude: number };
  circleRadius?: number;
} => {
  if (!location) return { isVisible: false };
  return {
    isVisible: true,
    position: { latitude: location.lat, longitude: location.lng },
    // SDK 단색 원은 끈다 — glow는 점 이미지에 그라데이션으로 구워져 있다 (GridMap 주석)
    circleRadius: 0,
  };
};

import { describe, expect, it } from "vitest";
import {
  isGestureCameraChange,
  locationOverlayProps,
  nextTracking,
} from "./location-overlay";

/** 템플릿 ① 순수 로직 — MSG-565 L1·L5·L6·L7 */
describe("nextTracking — 내 위치 버튼 추적 상태 리듀서 (L5)", () => {
  it("내 위치 탭이 권한 승인으로 끝나면 추적이 켜진다", () => {
    expect(nextTracking(false, { kind: "locate", permission: "granted" })).toBe(
      true,
    );
  });

  it("제스처 카메라 변경은 추적을 끈다", () => {
    expect(nextTracking(true, { kind: "camera", reason: "Gesture" })).toBe(
      false,
    );
  });

  it.each(["undetermined", "denied"] as const)(
    "내 위치 탭이 %s로 끝나면 추적이 꺼진다 — 추적 중 권한이 회수돼도 파란 아이콘이 남지 않는다",
    (permission) => {
      expect(nextTracking(true, { kind: "locate", permission })).toBe(false);
      expect(nextTracking(false, { kind: "locate", permission })).toBe(false);
    },
  );

  it.each(["Developer", "Control", "Location"] as const)(
    "%s 카메라 변경(panTo·줌 버튼 등)은 추적 상태를 바꾸지 않는다",
    (reason) => {
      expect(nextTracking(true, { kind: "camera", reason })).toBe(true);
      expect(nextTracking(false, { kind: "camera", reason })).toBe(false);
    },
  );
});

describe("locationOverlayProps — GridMap locationOverlay 파생 (L6)", () => {
  it.each([undefined, null])(
    "currentLocation이 %s이면 isVisible=false다 (AI 추천·격자 상세 렌더 불변)",
    (location) => {
      expect(locationOverlayProps(location)).toEqual({ isVisible: false });
    },
  );

  it.each([100, null])(
    "위치가 있으면 보이고(정확도 %s 무관), SDK 단색 원은 0으로 꺼진다 — glow는 이미지 (L1 개정)",
    (accuracy) => {
      const props = locationOverlayProps({ lat: 35.16, lng: 129.06, accuracy });

      expect(props.isVisible).toBe(true);
      expect(props.position).toEqual({ latitude: 35.16, longitude: 129.06 });
      expect(props.circleRadius).toBe(0);
    },
  );
});

describe("isGestureCameraChange — 드래그·핀치 판별 (L7)", () => {
  it("Gesture만 참이다", () => {
    expect(isGestureCameraChange("Gesture")).toBe(true);
  });

  it.each(["Developer", "Control", "Location"] as const)(
    "%s는 거짓이다",
    (reason) => {
      expect(isGestureCameraChange(reason)).toBe(false);
    },
  );
});

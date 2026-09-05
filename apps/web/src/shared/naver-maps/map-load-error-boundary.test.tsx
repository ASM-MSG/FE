import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MapLoadErrorBoundary } from "./MapLoadErrorBoundary";

const Throwing = () => {
  throw new TypeError("naver.maps is null");
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MapLoadErrorBoundary", () => {
  it("예외가 없으면 자식을 그대로 보인다", () => {
    render(
      <MapLoadErrorBoundary fallback={<p>폴백</p>}>
        <p>지도</p>
      </MapLoadErrorBoundary>,
    );

    expect(screen.getByText("지도")).toBeDefined();
    expect(screen.queryByText("폴백")).toBeNull();
  });

  it("하위 트리가 던지면 앱을 죽이지 않고 폴백으로 전환한다", () => {
    // React가 흡수된 예외를 콘솔에 남긴다 — 테스트 출력만 막고 단정은 폴백으로 한다
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MapLoadErrorBoundary fallback={<p>폴백</p>}>
        <Throwing />
      </MapLoadErrorBoundary>,
    );

    expect(screen.getByText("폴백")).toBeDefined();
  });

  it("흡수한 예외를 콘솔에 남긴다 (폴백 전환 사유의 조용한 유실 방지)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MapLoadErrorBoundary fallback={<p>폴백</p>}>
        <Throwing />
      </MapLoadErrorBoundary>,
    );

    expect(
      spy.mock.calls.some(([first]) =>
        String(first).includes("지도 SDK 하위 트리 예외를 흡수"),
      ),
    ).toBe(true);
  });
});

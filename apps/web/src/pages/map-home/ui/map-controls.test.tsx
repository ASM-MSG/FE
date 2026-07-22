import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapControls } from "./MapControls";

const noop = () => {};

const renderControls = (zoomLevel: number) =>
  render(
    <MapControls
      onUpload={noop}
      onLocate={noop}
      onZoomIn={noop}
      onZoomOut={noop}
      zoomLevel={zoomLevel}
    />,
  );

describe("MapControls 축척 바", () => {
  afterEach(() => {
    cleanup();
  });

  it("현재 줌 레벨의 축척 거리를 표시한다 (레벨 5 → 250m)", () => {
    renderControls(5);
    expect(screen.getByText("250m")).toBeTruthy();
  });

  it("zoomLevel prop이 바뀌면 축척 표기가 갱신된다 (5 → 4)", () => {
    const { rerender } = renderControls(5);
    expect(screen.getByText("250m")).toBeTruthy();
    rerender(
      <MapControls
        onUpload={noop}
        onLocate={noop}
        onZoomIn={noop}
        onZoomOut={noop}
        zoomLevel={4}
      />,
    );
    expect(screen.getByText("100m")).toBeTruthy();
    expect(screen.queryByText("250m")).toBeNull();
  });

  it("축척은 status 역할로 노출되고 버튼이 아니다", () => {
    renderControls(8);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("지도 축척 2km");
    // 축척이 버튼으로 렌더되지 않는다 — 인터랙티브 요소는 기존 컨트롤뿐
    const buttonLabels = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    expect(buttonLabels).toEqual(["업로드", "내 위치", "확대", "축소"]);
  });

  it("지도 미준비(zoomLevel null)면 축척 바를 표시하지 않는다", () => {
    render(
      <MapControls
        onUpload={noop}
        onLocate={noop}
        onZoomIn={noop}
        onZoomOut={noop}
        zoomLevel={null}
      />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    // 컨트롤 버튼들은 폴백 상태에서도 기존대로 렌더된다
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("기존 컨트롤 콜백은 축척 추가 후에도 그대로 동작한다 (회귀)", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    render(
      <MapControls
        onUpload={noop}
        onLocate={noop}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        zoomLevel={5}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "확대" }));
    fireEvent.click(screen.getByRole("button", { name: "축소" }));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });
});

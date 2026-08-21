import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Bounds, LatLng } from "@/entities/cell";
import type { ThemeId } from "./theme";
import { useNearestEntry } from "./use-nearest-entry";

const SEOMYEON: LatLng = { lat: 35.1579, lng: 129.0594 };

const boxAt = (lat: number, lng: number): Bounds => ({
  sw: { lat: lat - 0.001, lng: lng - 0.001 },
  ne: { lat: lat + 0.001, lng: lng + 0.001 },
});

const target = (missionId: number, lat: number, lng: number) => ({
  missionId,
  shape: { bbox: boxAt(lat, lng) },
});

/** 축제 칩 기본 입력 — 칩 진입 줌(500m)에 도달한 안정 상태 */
const baseInput = (over: Record<string, unknown> = {}) => ({
  activeTheme: "festival" as ThemeId | null,
  // 이 활성화의 확정이 끝난 칩 — 확정 전에는 null이다
  committedChip: "festival" as ThemeId | null,
  center: SEOMYEON,
  targets: [target(1, 35.18, 129.09), target(2, 35.159, 129.06)],
  listSettled: true,
  moveTo: vi.fn(),
  select: vi.fn(),
  ...over,
});

describe("useNearestEntry — 칩 진입 시 최근접 대상 자동 선택 (AC 11~14)", () => {
  it("칩이 켜지면 최근접 대상으로 이동하고 그 대상을 선택한다 (AC 13)", () => {
    const input = baseInput();

    renderHook(() => useNearestEntry(input));

    expect(input.select).toHaveBeenCalledExactlyOnceWith(2);
    expect(input.moveTo).toHaveBeenCalledExactlyOnceWith({
      lat: 35.159,
      lng: 129.06,
    });
  });

  it("칩 활성화당 한 번만 선택한다 — 이후 지도 이동에는 반응하지 않는다 (AC 11)", () => {
    const input = baseInput();

    const { rerender } = renderHook((props) => useNearestEntry(props), {
      initialProps: input,
    });
    rerender({ ...input, center: { lat: 35.2, lng: 129.12 } });
    rerender({ ...input, center: { lat: 35.3, lng: 129.2 } });

    expect(input.select).toHaveBeenCalledTimes(1);
    expect(input.moveTo).toHaveBeenCalledTimes(1);
  });

  it("칩이 바뀌면 새 칩의 최근접 대상으로 다시 진입한다 (AC 11)", () => {
    const input = baseInput();

    const { rerender } = renderHook((props) => useNearestEntry(props), {
      initialProps: input,
    });
    rerender({
      ...input,
      activeTheme: "popup" as ThemeId | null,
      committedChip: "popup" as ThemeId | null,
      targets: [target(7, 35.1585, 129.0596)],
    });

    expect(input.select).toHaveBeenCalledTimes(2);
    expect(input.select).toHaveBeenLastCalledWith(7);
  });

  it("목록이 비면 이동·선택 명령이 나가지 않는다 (AC 10)", () => {
    const input = baseInput({ targets: [] });

    renderHook(() => useNearestEntry(input));

    expect(input.select).not.toHaveBeenCalled();
    expect(input.moveTo).not.toHaveBeenCalled();
  });

  it("이 영역 기준 목록이 도착하기 전에는 기다린다 (AC 11)", () => {
    const pending = baseInput({ listSettled: false });

    const { rerender } = renderHook((props) => useNearestEntry(props), {
      initialProps: pending,
    });
    expect(pending.select).not.toHaveBeenCalled();

    rerender({ ...pending, listSettled: true });

    expect(pending.select).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("확정 전 목록이 비어 있어도 활성화를 소진하지 않는다 — 확정 후 도착한 목록으로 진입한다 (AC 13 회귀)", () => {
    // 콜드 첫 활성화의 실제 순서: 칩 진입 줌에 도달한 시점의 목록은 아직 **직전 확정
    // 영역**(더 좁은 화면) 기준이고, 그 응답이 이미 resolved라 listPending이 false다.
    // 여기서 활성화를 소진하면 확정이 넓어져 대상이 도착해도 영영 진입하지 못한다
    const cold = baseInput({ committedChip: null, targets: [] });

    const { rerender } = renderHook((props) => useNearestEntry(props), {
      initialProps: cold,
    });
    expect(cold.moveTo).not.toHaveBeenCalled();

    // 확정 완료 — 아직은 keepPreviousData가 넘겨준 직전 영역의 빈 목록이다
    rerender({
      ...cold,
      committedChip: "festival" as ThemeId | null,
      listSettled: false,
    });
    expect(cold.moveTo).not.toHaveBeenCalled();

    // 확정 영역 기준 목록 도착
    rerender({
      ...cold,
      committedChip: "festival" as ThemeId | null,
      listSettled: true,
      targets: [target(2, 35.159, 129.06)],
    });

    expect(cold.select).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("확정이 끝나기 전에는 이동하지 않는다 — 확정 전 목록으로 엉뚱한 대상을 고르지 않게 (AC 12·13)", () => {
    const beforeCommit = baseInput({ committedChip: null });

    renderHook(() => useNearestEntry(beforeCommit));

    expect(beforeCommit.moveTo).not.toHaveBeenCalled();
    expect(beforeCommit.select).not.toHaveBeenCalled();
  });

  it("이전 칩의 확정이 남아 있으면 새 칩은 기다린다 (AC 11)", () => {
    const stale = baseInput({
      activeTheme: "popup" as ThemeId | null,
      committedChip: "festival" as ThemeId | null,
    });

    renderHook(() => useNearestEntry(stale));

    expect(stale.moveTo).not.toHaveBeenCalled();
  });

  it("칩이 없으면 아무것도 하지 않는다 (경계)", () => {
    const input = baseInput({ activeTheme: null });

    renderHook(() => useNearestEntry(input));

    expect(input.select).not.toHaveBeenCalled();
    expect(input.moveTo).not.toHaveBeenCalled();
  });

  it("핫구역 칩은 대상이 아니다 — 격자 요약 화면이라 옮겨 갈 곳이 없다 (제외 범위)", () => {
    const input = baseInput({ activeTheme: "hot" as ThemeId, targets: [] });

    renderHook(() => useNearestEntry(input));

    expect(input.moveTo).not.toHaveBeenCalled();
  });
});

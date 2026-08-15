import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { MAP_SCALE_1KM_ZOOM, MAP_SCALE_500M_ZOOM } from "./map-scale";
import { useChipEntry } from "./use-chip-entry";

const AREA_A: Bounds = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};
/** 줌 아웃이 반영된 화면 — 참조도 값도 다르다 */
const AREA_B: Bounds = {
  sw: { lat: 35.14, lng: 129.03 },
  ne: { lat: 35.18, lng: 129.09 },
};
/** 사용자가 지도를 밀어 옮긴 화면 — 줌은 그대로다 */
const AREA_C: Bounds = {
  sw: { lat: 35.2, lng: 129.15 },
  ne: { lat: 35.24, lng: 129.21 },
};

const REGION = { regionCode: "2644056000", regionName: "부전제1동" };

type Props = {
  activeTheme: "route" | "hot" | null;
  zoom: number;
  bounds: Bounds;
  region: typeof REGION | null;
};

const setup = (initial: { zoom: number; bounds: Bounds }) => {
  const zoomTo = vi.fn();
  const commit = vi.fn();
  const { rerender: raw } = renderHook(
    (props: Props) =>
      useChipEntry({
        activeTheme: props.activeTheme,
        bounds: props.bounds,
        zoom: props.zoom,
        region: props.region,
        zoomTo,
        commit,
      }),
    {
      initialProps: {
        activeTheme: null,
        region: REGION,
        ...initial,
      } as Props,
    },
  );
  const rerender = (
    props: Omit<Props, "region"> & { region?: typeof REGION | null },
  ) => raw({ region: REGION, ...props } as Props);
  return { zoomTo, commit, rerender };
};

describe("useChipEntry — 칩 진입 줌 + 1회 확정 (AC 6·9·11)", () => {
  it("칩을 켜면 그 칩의 줌으로 옮긴다 (AC 6)", () => {
    const { zoomTo, commit, rerender } = setup({
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });

    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });

    expect(zoomTo).toHaveBeenCalledWith(MAP_SCALE_1KM_ZOOM);
    // 확정은 줌이 반영된 화면에서 한다 — 줌 전 좁은 영역을 확정하면 넓힌 화면이 빈다
    expect(commit).not.toHaveBeenCalled();
  });

  it("줌이 반영된 화면이 오면 그 화면으로 확정한다 — 활성화당 1회 (AC 9)", () => {
    const { commit, rerender } = setup({
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });
    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });

    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_B,
    });

    expect(commit).toHaveBeenLastCalledWith(REGION, AREA_B);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("확정 후 지도를 밀어도 다시 확정하지 않는다 — 갱신은 '장소 불러오기'만 (AC 11)", () => {
    const { commit, rerender } = setup({
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });
    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });
    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_B,
    });
    commit.mockClear();

    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_C,
    });

    expect(commit).not.toHaveBeenCalled();
  });

  it("줌 명령이 화면을 바꾸지 않아도(이미 그 줌) 이후 지도 이동이 확정을 바꾸지 않는다 (AC 11 — 회귀)", () => {
    // 칩을 켤 때 이미 목표 줌이면 지도는 idle을 쏘지 않는다. 이 경우 "줌 반영 대기"가
    // 남아 있으면 사용자의 **첫 이동**을 줌 결과로 오인해 목록이 통째로 갱신됐다
    const { commit, rerender } = setup({
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_A,
    });
    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_A,
    });
    commit.mockClear();

    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_C,
    });

    expect(commit).not.toHaveBeenCalled();
  });
});

describe("useChipEntry — 행정동 판별이 늦게 끝나는 경우 (codex 리뷰)", () => {
  it("칩을 켤 때 행정동이 아직 없으면, 판별이 끝난 뒤 확정한다 (AC 9)", () => {
    const { commit, rerender } = setup({
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_A,
    });

    // 역지오코딩 디바운스 중 — 행정동 미판별 상태에서 칩 활성화
    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_A,
      region: null,
    });
    expect(commit).not.toHaveBeenCalled();

    // 판별 완료
    rerender({
      activeTheme: "route",
      zoom: MAP_SCALE_1KM_ZOOM,
      bounds: AREA_A,
    });

    expect(commit).toHaveBeenCalledWith(REGION, AREA_A);
  });

  it("줌이 없는 칩(핫구역)도 행정동이 늦게 오면 그때 확정한다 (AC 9)", () => {
    const { commit, rerender } = setup({
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
    });

    rerender({
      activeTheme: "hot",
      zoom: MAP_SCALE_500M_ZOOM,
      bounds: AREA_A,
      region: null,
    });
    expect(commit).not.toHaveBeenCalled();

    rerender({ activeTheme: "hot", zoom: MAP_SCALE_500M_ZOOM, bounds: AREA_A });

    expect(commit).toHaveBeenCalledWith(REGION, AREA_A);
  });
});

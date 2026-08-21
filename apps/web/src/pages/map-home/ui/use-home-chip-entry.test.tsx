import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Bounds, LatLng } from "@/entities/cell";
import {
  MAP_SCALE_1KM_ZOOM,
  MAP_SCALE_500M_ZOOM,
} from "@/features/map-home/model/map-scale";
import type {
  CourseView,
  MissionView,
} from "@/features/map-home/model/mission-view";
import type { ThemeId } from "@/features/map-home/model/theme";
import { useHomeChipEntry } from "./use-home-chip-entry";

/**
 * 칩 진입 배선 통합 (MSG-451) — 두 훅(줌+확정 / 최근접 이동)이 **칩을 갈아탈 때**도
 * 순서대로 물리는지 본다. 단위 테스트가 각 훅을 따로 세워 놓으면 놓치는 축이다.
 */

const SEOMYEON: LatLng = { lat: 35.1579, lng: 129.0594 };

const boxAt = (lat: number, lng: number): Bounds => ({
  sw: { lat: lat - 0.001, lng: lng - 0.001 },
  ne: { lat: lat + 0.001, lng: lng + 0.001 },
});

const REGION = { regionCode: "2644056000", regionName: "부전제1동" };

/** 화면 영역 — 줌이 바뀌면 참조도 값도 달라진다 */
const AREA_1KM: Bounds = {
  sw: { lat: 35.13, lng: 129.02 },
  ne: { lat: 35.19, lng: 129.1 },
};
const AREA_500M: Bounds = {
  sw: { lat: 35.145, lng: 129.045 },
  ne: { lat: 35.171, lng: 129.075 },
};

/** 광안리 축제 — 서면 중심에서 멀어 이동이 관찰 가능하다 */
const FESTIVAL = { shape: { bbox: boxAt(35.1536, 129.1186) } } as MissionView;
/** 서면 코스 */
const COURSE = { shape: { bbox: boxAt(35.158, 129.06) } } as CourseView;

interface Props {
  activeTheme: ThemeId | null;
  viewportZoom: number;
  viewportBounds: Bounds;
}

/** 첫 하네스의 rerender 인자 — activeTheme이 리터럴로 좁혀지지 않게 한다 */
type BasicProps = Props;

const setup = () => {
  const zoomTo = vi.fn();
  const moveTo = vi.fn();
  const commit = vi.fn();

  const { rerender: raw } = renderHook(
    (props: Props) =>
      useHomeChipEntry({
        activeTheme: props.activeTheme,
        viewportBounds: props.viewportBounds,
        viewportCenter: SEOMYEON,
        viewportZoom: props.viewportZoom,
        currentRegion: REGION,
        missionViews: [FESTIVAL],
        courseViews: [COURSE],
        isRouteChip: props.activeTheme === "route",
        listPending: false,
        listPlaceholder: false,
        zoomTo,
        moveTo,
        commit,
      }),
    {
      initialProps: {
        activeTheme: null,
        viewportZoom: MAP_SCALE_500M_ZOOM,
        viewportBounds: AREA_500M,
      } as BasicProps,
    },
  );

  return { zoomTo, moveTo, commit, rerender: raw };
};

/**
 * 실제 순서 재현 — commit은 확정 영역을 바꾸므로 목록 쿼리 키가 바뀌고,
 * `keepPreviousData` 탓에 한 박자 동안 직전 영역 목록이 placeholder로 남는다.
 */
const setupRealistic = () => {
  const zoomTo = vi.fn();
  const moveTo = vi.fn();
  const commit = vi.fn();

  const { rerender } = renderHook(
    (
      props: Props & {
        listPlaceholder: boolean;
        currentRegion?: typeof REGION | null;
      },
    ) =>
      useHomeChipEntry({
        activeTheme: props.activeTheme,
        viewportBounds: props.viewportBounds,
        viewportCenter: SEOMYEON,
        viewportZoom: props.viewportZoom,
        currentRegion:
          props.currentRegion === undefined ? REGION : props.currentRegion,
        missionViews: [FESTIVAL],
        courseViews: [COURSE],
        isRouteChip: props.activeTheme === "route",
        listPending: false,
        listPlaceholder: props.listPlaceholder,
        zoomTo,
        moveTo,
        commit,
      }),
    {
      initialProps: {
        activeTheme: null as ThemeId | null,
        viewportZoom: MAP_SCALE_500M_ZOOM,
        viewportBounds: AREA_500M,
        listPlaceholder: false,
        currentRegion: REGION as typeof REGION | null,
      },
    },
  );

  return { zoomTo, moveTo, commit, rerender };
};

describe("useHomeChipEntry — 칩을 갈아탈 때의 진입 순서 (MSG-451)", () => {
  it("경로추천 진입을 완주한 뒤 지역축제로 갈아타도 이동이 일어난다 (사용자 환류 재현)", () => {
    const { moveTo, rerender } = setupRealistic();

    // ── 경로추천 진입: 1km로 줌 → 확정 → 목록 재조회 한 박자 → 코스로 이동
    rerender({
      activeTheme: "route",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
      listPlaceholder: false,
      currentRegion: REGION,
    });
    rerender({
      activeTheme: "route",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
      listPlaceholder: true,
      currentRegion: REGION,
    });
    rerender({
      activeTheme: "route",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
      listPlaceholder: false,
      currentRegion: REGION,
    });
    expect(moveTo).toHaveBeenCalledTimes(1);

    // ── 지역축제로 전환: 500m로 줌 → 확정 → 목록 재조회 한 박자 → 축제로 이동
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
      listPlaceholder: false,
      currentRegion: REGION,
    });
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
      listPlaceholder: true,
      currentRegion: REGION,
    });
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
      listPlaceholder: false,
      currentRegion: REGION,
    });

    expect(moveTo).toHaveBeenCalledTimes(2);
    expect(moveTo).toHaveBeenLastCalledWith({ lat: 35.1536, lng: 129.1186 });
  });

  it("지도 중심이 행정동 밖(바다)이라 확정이 미뤄져도 이동은 일어난다 (사용자 환류 원인)", () => {
    // 경로추천은 해안 코스로 지도를 옮기는 일이 잦고, 그러면 중심이 바다가 되어
    // 역지오코딩이 null이다. 확정(commit)은 행정동을 요구해 무기한 대기하는데(MSG-403),
    // 이동까지 그 대기에 볼모로 잡히면 "줌만 바뀌고 화면은 안 움직이는" 상태가 된다
    const { moveTo, commit, rerender } = setupRealistic();

    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
      listPlaceholder: false,
      currentRegion: null,
    });
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
      listPlaceholder: false,
      currentRegion: null,
    });

    expect(moveTo).toHaveBeenCalledExactlyOnceWith({
      lat: 35.1536,
      lng: 129.1186,
    });
    // 확정은 여전히 행정동을 기다린다 — 이동만 풀어 준 것이지 규칙을 바꾼 것이 아니다
    expect(commit).not.toHaveBeenCalled();
  });

  it("행정동이 뒤늦게 잡히면 그때 확정된다 — 확정 규칙은 그대로다 (MSG-403 회귀)", () => {
    const { commit, rerender } = setupRealistic();

    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
      listPlaceholder: false,
      currentRegion: null,
    });
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
      listPlaceholder: false,
      currentRegion: null,
    });
    expect(commit).not.toHaveBeenCalled();

    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
      listPlaceholder: false,
      currentRegion: REGION,
    });

    expect(commit).toHaveBeenCalledExactlyOnceWith(REGION, AREA_500M);
  });

  it("경로추천(1km) 뒤 지역축제(500m)로 갈아타면 줌뿐 아니라 이동도 일어난다 (사용자 환류)", () => {
    const { zoomTo, moveTo, rerender } = setup();

    // 경로추천 진입 — 1km로 줌아웃하고 그 화면을 확정한다
    rerender({
      activeTheme: "route",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
    });
    expect(zoomTo).toHaveBeenLastCalledWith(MAP_SCALE_1KM_ZOOM);
    rerender({
      activeTheme: "route",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
    });
    expect(moveTo).toHaveBeenCalledTimes(1); // 코스로 이동

    // 곧바로 지역축제로 전환 — 500m로 다시 줌인된다
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_1KM_ZOOM,
      viewportBounds: AREA_1KM,
    });
    expect(zoomTo).toHaveBeenLastCalledWith(MAP_SCALE_500M_ZOOM);

    // 줌이 반영된 화면 — 여기서 축제 최근접으로 이동해야 한다
    rerender({
      activeTheme: "festival",
      viewportZoom: MAP_SCALE_500M_ZOOM,
      viewportBounds: AREA_500M,
    });

    expect(moveTo).toHaveBeenCalledTimes(2);
    expect(moveTo).toHaveBeenLastCalledWith({
      lat: 35.1536,
      lng: 129.1186,
    });
  });
});

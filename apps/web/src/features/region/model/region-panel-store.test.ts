import { beforeEach, describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import { useRegionPanelStore } from "./region-panel-store";

const SEOMYEON: Bounds = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};
const JEONPO: Bounds = {
  sw: { lat: 35.146, lng: 129.06 },
  ne: { lat: 35.156, lng: 129.072 },
};

describe("useRegionPanelStore — 확정 지역·확정 영역 (AC 9·13)", () => {
  beforeEach(() => {
    useRegionPanelStore.setState(useRegionPanelStore.getInitialState(), true);
  });

  it("최초 상태는 확정 지역·확정 영역 없음 + 격자 리스트 모드다", () => {
    const state = useRegionPanelStore.getState();

    expect(state.displayedRegion).toBeNull();
    expect(state.committedBounds).toBeNull();
    expect(state.mode).toBe("grids");
  });

  it("확정하면 그 지역과 그 시점의 지도 영역이 함께 기록된다 (AC 9)", () => {
    useRegionPanelStore
      .getState()
      .commit({ regionCode: "2644056000", regionName: "부전제1동" }, SEOMYEON);

    const state = useRegionPanelStore.getState();
    expect(state.displayedRegion).toEqual({
      regionCode: "2644056000",
      regionName: "부전제1동",
    });
    expect(state.committedBounds).toEqual(SEOMYEON);
  });

  it("다시 확정하면 지역과 영역이 함께 갱신된다 — 장소 불러오기 (AC 9)", () => {
    useRegionPanelStore
      .getState()
      .commit({ regionCode: "2644056000", regionName: "부전제1동" }, SEOMYEON);

    useRegionPanelStore
      .getState()
      .commit({ regionCode: "2644057000", regionName: "부전제2동" }, JEONPO);

    const state = useRegionPanelStore.getState();
    expect(state.displayedRegion?.regionName).toBe("부전제2동");
    expect(state.committedBounds).toEqual(JEONPO);
  });

  it("전체 보기에서 지역만 고르면 확정 영역은 그대로다 — 지도 데이터가 몰래 갱신되지 않는다 (AC 11, codex 리뷰)", () => {
    useRegionPanelStore
      .getState()
      .commit({ regionCode: "2644056000", regionName: "부전제1동" }, SEOMYEON);

    useRegionPanelStore
      .getState()
      .selectRegion({ regionCode: "2644057000", regionName: "부전제2동" });

    const state = useRegionPanelStore.getState();
    expect(state.displayedRegion?.regionName).toBe("부전제2동");
    expect(state.committedBounds).toEqual(SEOMYEON);
    expect(state.mode).toBe("grids");
  });

  it("전체 보기를 열면 전체 지역 리스트 모드가 된다 (AC 10)", () => {
    useRegionPanelStore.getState().openRegionList();

    expect(useRegionPanelStore.getState().mode).toBe("regions");
  });

  it("지역 리스트에서 지역을 고르면 격자 리스트 모드로 전환된다 (AC 10)", () => {
    useRegionPanelStore.getState().openRegionList();

    useRegionPanelStore
      .getState()
      .selectRegion({ regionCode: "2644057000", regionName: "부전제2동" });

    expect(useRegionPanelStore.getState().mode).toBe("grids");
    expect(useRegionPanelStore.getState().displayedRegion?.regionName).toBe(
      "부전제2동",
    );
  });

  it("전체 지역 리스트를 닫으면 격자 리스트 모드로 돌아간다 — 사이드레일 초기화 대상 (AC 16)", () => {
    useRegionPanelStore.getState().openRegionList();

    useRegionPanelStore.getState().closeRegionList();

    expect(useRegionPanelStore.getState().mode).toBe("grids");
  });
});

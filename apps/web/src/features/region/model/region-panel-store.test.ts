import { beforeEach, describe, expect, it } from "vitest";
import { useRegionPanelStore } from "./region-panel-store";

describe("useRegionPanelStore — 표시 지역·패널 모드 (AC 9·10)", () => {
  beforeEach(() => {
    useRegionPanelStore.setState(useRegionPanelStore.getInitialState(), true);
  });

  it("최초 상태는 표시 지역 없음 + 격자 리스트 모드다", () => {
    expect(useRegionPanelStore.getState().displayedRegion).toBeNull();
    expect(useRegionPanelStore.getState().mode).toBe("grids");
  });

  it("지역을 표시하면 그 지역이 표시 중 지역이 된다 (AC 9 — 장소 불러오기 갱신)", () => {
    useRegionPanelStore.getState().showRegion({
      regionCode: "2644056000",
      regionName: "부전제1동",
    });

    expect(useRegionPanelStore.getState().displayedRegion).toEqual({
      regionCode: "2644056000",
      regionName: "부전제1동",
    });
  });

  it("전체 보기를 열면 전체 지역 리스트 모드가 된다 (AC 10)", () => {
    useRegionPanelStore.getState().openRegionList();

    expect(useRegionPanelStore.getState().mode).toBe("regions");
  });

  it("지역 리스트에서 지역을 선택하면 그 지역의 격자 리스트 모드로 전환된다 (AC 10)", () => {
    useRegionPanelStore.getState().openRegionList();

    useRegionPanelStore.getState().showRegion({
      regionCode: "2644057000",
      regionName: "부전제2동",
    });

    expect(useRegionPanelStore.getState().mode).toBe("grids");
    expect(useRegionPanelStore.getState().displayedRegion?.regionName).toBe(
      "부전제2동",
    );
  });
});

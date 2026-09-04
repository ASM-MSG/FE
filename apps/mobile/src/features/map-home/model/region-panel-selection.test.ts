import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSelectedRegion,
  closeRegionList,
  getRegionPanel,
  openRegionList,
  resetRegionPanel,
  selectRegion,
  subscribeRegionPanel,
} from "./region-panel-selection";

/**
 * MSG-571 AC 11~14: 시트 기본 화면의 "전체 보기" 모드·선택 지역 오버라이드 —
 * 웹 `region-panel-store` 상당(모듈 싱글턴). 지도 이동·칩·포커스 이탈이 각각 어디까지
 * 초기화하는지가 계약이다.
 */
const BUJEON = { regionCode: "2623053000", regionName: "부전2동" };

describe("region-panel-selection — 전체 지역 모드·선택 지역 (AC 11~14)", () => {
  beforeEach(() => {
    resetRegionPanel();
  });

  it("초기 상태는 격자 모드·선택 지역 없음이다", () => {
    expect(getRegionPanel()).toEqual({ mode: "grids", selectedRegion: null });
  });

  it("지역 행을 탭하면 목록 모드가 풀리고 그 지역이 선택 지역이 된다 (AC 11)", () => {
    openRegionList();

    selectRegion(BUJEON);

    expect(getRegionPanel()).toEqual({
      mode: "grids",
      selectedRegion: BUJEON,
    });
  });

  it("목록 모드에서 ‹·하드웨어 back은 모드만 풀고 선택 지역은 유지한다 (AC 12·13)", () => {
    selectRegion(BUJEON);
    openRegionList();

    closeRegionList();

    expect(getRegionPanel()).toEqual({
      mode: "grids",
      selectedRegion: BUJEON,
    });
  });

  it("칩 탭·이벤트 칩 활성은 목록 모드와 선택 지역을 함께 초기화한다 (AC 13)", () => {
    selectRegion(BUJEON);
    openRegionList();

    resetRegionPanel();

    expect(getRegionPanel()).toEqual({ mode: "grids", selectedRegion: null });
  });

  it("지도가 이동하면 선택 지역 오버라이드만 풀리고 모드는 유지된다 (AC 14)", () => {
    selectRegion(BUJEON);
    openRegionList();

    clearSelectedRegion();

    expect(getRegionPanel()).toEqual({ mode: "regions", selectedRegion: null });
  });

  it("상태 변경 시 구독자에게 알리고, 해제된 구독자에게는 알리지 않는다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRegionPanel(listener);

    openRegionList();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    closeRegionList();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("값이 바뀌지 않는 호출은 스냅샷 참조를 유지한다 (useSyncExternalStore 안정성)", () => {
    const before = getRegionPanel();

    clearSelectedRegion();

    expect(getRegionPanel()).toBe(before);
  });
});

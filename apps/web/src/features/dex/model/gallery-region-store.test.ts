import { beforeEach, describe, expect, it } from "vitest";
import { useGalleryRegionStore } from "./gallery-region-store";

describe("useGalleryRegionStore — 갤러리 셀 클릭 선택 지역 (AC 5, A1)", () => {
  beforeEach(() => {
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
  });

  it("초기 상태는 선택 없음(null)이다 — 직접 진입은 현재 지역 폴백 경로", () => {
    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
  });

  it("select(region)로 선택 지역을 설정한다", () => {
    useGalleryRegionStore.getState().select("성동구");

    expect(useGalleryRegionStore.getState().selectedRegion).toBe("성동구");
  });

  it("clear()로 선택을 해제한다 — 탭 클릭 진입 시 초기화 경로", () => {
    useGalleryRegionStore.getState().select("성동구");
    useGalleryRegionStore.getState().clear();

    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
  });
});

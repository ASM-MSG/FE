import { beforeEach, describe, expect, it } from "vitest";
import { useGalleryRegionStore } from "./gallery-region-store";

describe("useGalleryRegionStore — 갤러리 뷰 지역 상태 (AC 5, ② B1 개정)", () => {
  beforeEach(() => {
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
  });

  it("초기 상태는 null이다 — 지도 탭 본문(최근 수집 목록) 표시 (② 개정: selectedRegion이 갤러리 뷰 상태를 겸한다)", () => {
    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
  });

  it("select(region)로 설정한다 — 그 지역의 갤러리 뷰 표시", () => {
    useGalleryRegionStore.getState().select("수영구");

    expect(useGalleryRegionStore.getState().selectedRegion).toBe("수영구");
  });

  it("clear()로 해제한다 — 지도 탭 클릭 복귀(AC 22)·패널 언마운트(B4) 경로", () => {
    useGalleryRegionStore.getState().select("수영구");
    useGalleryRegionStore.getState().clear();

    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
  });
});

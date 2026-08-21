import { beforeEach, describe, expect, it } from "vitest";
import { useGalleryRegionStore } from "./gallery-region-store";

const SELECTION = { regionName: "부전제1동", gridId: "39064_112221" };

describe("useGalleryRegionStore — 갤러리 뷰 동 상태 (기준 10)", () => {
  beforeEach(() => {
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
  });

  it("초기 상태는 null이다 — 지도 탭 본문(최근 수집 동 목록) 표시", () => {
    expect(useGalleryRegionStore.getState().selected).toBeNull();
  });

  it("select로 동과 대표 격자를 함께 잡는다 — 격자 id가 regionCode 조회 입력이다 (기준 11)", () => {
    useGalleryRegionStore.getState().select(SELECTION);

    expect(useGalleryRegionStore.getState().selected).toEqual(SELECTION);
  });

  it("clear로 해제한다 — 지도 탭 클릭 복귀·'전체 보기'·패널 언마운트 경로", () => {
    useGalleryRegionStore.getState().select(SELECTION);
    useGalleryRegionStore.getState().clear();

    expect(useGalleryRegionStore.getState().selected).toBeNull();
  });
});

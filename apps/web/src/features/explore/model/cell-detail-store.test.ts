import { beforeEach, describe, expect, it } from "vitest";
import type { Cell, CellVideo } from "@/entities/cell";
import { useCellDetailStore } from "./cell-detail-store";
import { useExploreFilterStore } from "./explore-filter-store";

const video = (id: string): CellVideo => ({
  id,
  title: `영상 ${id}`,
  viewCount: 100,
  uploadedAt: "2026-07-20T00:00:00.000Z",
  durationSec: 42,
});

const makeCell = (id: string, videos: CellVideo[]): Cell => ({
  id,
  label: `격자 ${id}`,
  district: "마포구",
  center: { lat: 37.5, lng: 127 },
  videoCount: videos.length,
  createdAt: "2026-07-20T00:00:00.000Z",
  location: `서울 마포구 ${id}`,
  recentUploadedAt: "2026-07-20T00:00:00.000Z",
  fillRate: 50,
  viewCount: 1000,
  videos,
});

const cellA = makeCell("A", [video("A-v1"), video("A-v2"), video("A-v3")]);
const cellB = makeCell("B", [video("B-v1"), video("B-v2")]);
const emptyCell = makeCell("Z", []);

const state = () => useCellDetailStore.getState();

describe("cell-detail-store 선택/영상 액션", () => {
  beforeEach(() => {
    useCellDetailStore.setState({ selectedCellId: null, activeVideoId: null });
  });

  it("videoCount === 0 격자를 선택하면 no-op이다 — 선택 상태가 바뀌지 않는다 (AC 2)", () => {
    state().select(emptyCell);
    expect(state().selectedCellId).toBeNull();
    expect(state().activeVideoId).toBeNull();
  });

  it("격자를 선택하면 selectedCellId와 대표 영상(activeVideoId=videos[0])이 설정된다", () => {
    state().select(cellA);
    expect(state().selectedCellId).toBe("A");
    expect(state().activeVideoId).toBe("A-v1");
  });

  it("close()는 선택을 해제한다 — selectedCellId=null (AC 4)", () => {
    state().select(cellA);
    state().close();
    expect(state().selectedCellId).toBeNull();
  });

  it("다른 격자를 선택하면 selectedCellId가 새 격자로 갱신된다 — 중간에 null로 떨어지지 않는다 (AC 6)", () => {
    state().select(cellA);
    state().select(cellB);
    expect(state().selectedCellId).toBe("B");
  });

  it("리스트 영상 클릭은 activeVideoId를 그 영상으로 바꾼다 (AC 17)", () => {
    state().select(cellA);
    state().selectVideo("A-v3");
    expect(state().activeVideoId).toBe("A-v3");
  });

  it("다른 격자를 선택하면 activeVideoId가 새 격자의 대표 영상으로 초기화된다 (AC 20)", () => {
    state().select(cellA);
    state().selectVideo("A-v3");
    state().select(cellB);
    expect(state().activeVideoId).toBe("B-v1");
  });

  it("이미 열린 같은 격자를 재선택하면 no-op이다 — 선택해둔 영상이 대표 영상으로 리셋되지 않는다", () => {
    state().select(cellA);
    state().selectVideo("A-v3");
    state().select(cellA);
    expect(state().activeVideoId).toBe("A-v3");
    expect(state().selectedCellId).toBe("A");
  });
});

describe("필터 스토어 변경과 선택 상태의 독립성 (AC 8)", () => {
  beforeEach(() => {
    useCellDetailStore.setState({ selectedCellId: null, activeVideoId: null });
    useExploreFilterStore.getState().reset();
  });

  it("검색어·지역 필터를 변경해도 selectedCellId는 유지된다", () => {
    useCellDetailStore.getState().select(cellA);
    useExploreFilterStore.getState().applySearch("성수");
    useExploreFilterStore.getState().selectRegion("강남구");
    useExploreFilterStore.getState().clearFilters();
    expect(useCellDetailStore.getState().selectedCellId).toBe("A");
  });
});

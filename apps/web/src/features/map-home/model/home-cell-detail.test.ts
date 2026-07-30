import { describe, expect, it } from "vitest";
import { MOCK_CELLS } from "@/entities/cell";
import { MOCK_COLLECTED_VIDEOS } from "@/entities/dex";
import {
  canOpenDetail,
  deriveHomeCellDetail,
  myVideoIdsOf,
} from "./home-cell-detail";

const THEME_CELL_IDS = ["A-14", "A-15", "B-07", "G-04"];
const OCCUPIED_IDS = ["A-14", "B-08", "B-07", "C-02", "A-15", "G-03"];

const cellOf = (id: string) => {
  const cell = MOCK_CELLS.find((c) => c.id === id);
  if (!cell) throw new Error(`MOCK_CELLS에 없는 격자 id: ${id}`);
  return cell;
};

describe("canOpenDetail — 셀 탭 → 상세 오픈 판정 (AC 9·10)", () => {
  it("핫구역·지역축제·팝업스토어 활성 상태에서 강조(테마) 셀 탭은 상세를 연다 (AC 9, A5 — 3테마 공통)", () => {
    expect(canOpenDetail("hot", "A-14", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(true);
    expect(canOpenDetail("festival", "A-14", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(true);
    expect(canOpenDetail("popup", "A-14", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(true);
  });

  it("테마 활성 중 강조 셀이 아닌 셀 탭은 무시된다 — 점령 셀이라도 열지 않는다", () => {
    expect(canOpenDetail("hot", "C-02", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(false);
  });

  it("칩 비활성 상태에서는 내 점령 셀 탭만 상세를 연다 (AC 10)", () => {
    expect(canOpenDetail(null, "B-08", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(true);
    expect(canOpenDetail(null, "E-05", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(false);
  });

  it("경로추천 활성 중에는 상세를 열지 않는다 — 경로 강조는 표시 전용 (AC 8·9 문언)", () => {
    expect(canOpenDetail("route", "A-14", THEME_CELL_IDS, OCCUPIED_IDS)).toBe(false);
  });
});

describe("myVideoIdsOf — 셀별 내 수집 영상 id (AC 9·10 — 내 영상 판별 키)", () => {
  it("A-14의 내 영상은 수집 영상 mock의 A-14 항목들이다 (A2 — 도감 수집 재사용)", () => {
    expect(myVideoIdsOf(MOCK_COLLECTED_VIDEOS, "A-14")).toEqual([
      "A-14-v1",
      "A-14-v2",
      "A-14-v3",
      "A-14-v4",
    ]);
  });

  it("수집하지 않은 셀은 빈 목록이다", () => {
    expect(myVideoIdsOf(MOCK_COLLECTED_VIDEOS, "E-05")).toEqual([]);
  });
});

describe("deriveHomeCellDetail — 배지·영상 목록·버튼 파생 (AC 9·10, A5·A7)", () => {
  it("테마 활성 + 내 점령 교집합 셀: 배지 [내 점령, 테마] + 내/다른 사용자 영상 분리 + 몰아보기 노출 (AC 9)", () => {
    const cell = cellOf("A-14");
    const myIds = myVideoIdsOf(MOCK_COLLECTED_VIDEOS, "A-14");
    const detail = deriveHomeCellDetail({
      cell,
      activeTheme: "hot",
      occupied: true,
      myVideoIds: myIds,
    });

    expect(detail.label).toBe("서면 A-14");
    expect(detail.badges).toEqual([
      { id: "occupied", label: "내 점령" },
      { id: "hot", label: "핫구역" },
    ]);
    expect(detail.myVideos.map((v) => v.id)).toEqual(myIds);
    expect(detail.otherVideos.map((v) => v.id)).toEqual(
      cell.videos.filter((v) => !myIds.includes(v.id)).map((v) => v.id),
    );
    expect(detail.showMashup).toBe(true);
  });

  it("배지는 활성 테마를 따른다 — 지역축제·팝업스토어 분기 (AC 9 테마별 분기)", () => {
    const base = {
      cell: cellOf("B-08"),
      occupied: true,
      myVideoIds: myVideoIdsOf(MOCK_COLLECTED_VIDEOS, "B-08"),
    };
    expect(
      deriveHomeCellDetail({ ...base, activeTheme: "festival" }).badges,
    ).toContainEqual({ id: "festival", label: "지역축제" });
    expect(
      deriveHomeCellDetail({ ...base, activeTheme: "popup" }).badges,
    ).toContainEqual({ id: "popup", label: "팝업스토어" });
  });

  it("테마 활성 + 비점령 셀: 테마 배지만 + 다른 사용자 영상만 + 두 버튼 (A7)", () => {
    const cell = cellOf("G-04");
    const detail = deriveHomeCellDetail({
      cell,
      activeTheme: "hot",
      occupied: false,
      myVideoIds: [],
    });

    expect(detail.badges).toEqual([{ id: "hot", label: "핫구역" }]);
    expect(detail.myVideos).toEqual([]);
    expect(detail.otherVideos.map((v) => v.id)).toEqual(
      cell.videos.map((v) => v.id),
    );
    expect(detail.showMashup).toBe(true);
  });

  it("칩 비활성 + 내 점령 셀: 배지 '내 점령' + 내 영상 목록 + 추가하기만 — 몰아보기·다른 사용자 목록 없음 (AC 10)", () => {
    const cell = cellOf("B-08");
    const myIds = myVideoIdsOf(MOCK_COLLECTED_VIDEOS, "B-08");
    const detail = deriveHomeCellDetail({
      cell,
      activeTheme: null,
      occupied: true,
      myVideoIds: myIds,
    });

    expect(detail.badges).toEqual([{ id: "occupied", label: "내 점령" }]);
    expect(detail.myVideos.map((v) => v.id)).toEqual(myIds);
    expect(detail.otherVideos).toEqual([]);
    expect(detail.showMashup).toBe(false);
  });

  it("상세 헤더 메타는 목 격자에서 파생된다 — 디자인 예시 라벨 하드코딩 없음 (Figma 오탐 방지 4)", () => {
    const cell = cellOf("C-02");
    const detail = deriveHomeCellDetail({
      cell,
      activeTheme: "festival",
      occupied: true,
      myVideoIds: myVideoIdsOf(MOCK_COLLECTED_VIDEOS, "C-02"),
    });

    expect(detail.cellId).toBe("C-02");
    expect(detail.label).toBe(cell.label);
    expect(detail.location).toBe(cell.location);
    expect(detail.videoCount).toBe(cell.videoCount);
  });
});

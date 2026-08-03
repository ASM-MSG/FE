import { describe, expect, it } from "vitest";
import type { Cell } from "@/entities/cell";
import {
  filterByDistrict,
  formatDuration,
  searchCells,
  selectExploreCells,
  sortCells,
} from "./explore-cells";

const cell = (
  id: string,
  label: string,
  videoCount: number,
  createdAt: string,
  district = "부산진구",
): Cell => ({
  id,
  label,
  district,
  center: { lat: 0, lng: 0 },
  videoCount,
  createdAt,
  location: label,
  recentUploadedAt: createdAt,
  fillRate: 0,
  viewCount: 0,
  videos: [],
});

describe("searchCells (L1)", () => {
  const cells = [
    cell("A", "서면 A-14", 10, "2026-01-01T00:00:00.000Z"),
    cell("B", "전포 A-15", 20, "2026-01-02T00:00:00.000Z"),
    cell("C", "광안리 C-02", 30, "2026-01-03T00:00:00.000Z"),
  ];

  it("검색어가 label의 부분 문자열인 격자만 반환한다", () => {
    expect(searchCells(cells, "서면").map((c) => c.id)).toEqual(["A"]);
  });

  it("대소문자를 무시하고 매칭한다", () => {
    expect(searchCells(cells, "c-02").map((c) => c.id)).toEqual(["C"]);
    expect(searchCells(cells, "a-1").map((c) => c.id)).toEqual(["A", "B"]);
  });

  it("빈 검색어는 입력 목록을 그대로 반환한다", () => {
    expect(searchCells(cells, "")).toEqual(cells);
  });

  it("공백만 있는 검색어는 입력 목록을 그대로 반환한다", () => {
    expect(searchCells(cells, "   ")).toEqual(cells);
  });

  it("매칭이 없으면 빈 배열을 반환한다", () => {
    expect(searchCells(cells, "존재하지않음")).toEqual([]);
  });
});

describe("sortCells (L2)", () => {
  it("popular는 videoCount 내림차순으로 정렬한다", () => {
    const cells = [
      cell("a", "a", 10, "2026-01-01T00:00:00.000Z"),
      cell("b", "b", 50, "2026-01-01T00:00:00.000Z"),
      cell("c", "c", 30, "2026-01-01T00:00:00.000Z"),
    ];

    expect(sortCells(cells, "popular").map((c) => c.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("popular는 videoCount 동률 시 id 오름차순으로 안정 정렬한다", () => {
    const cells = [
      cell("z", "z", 40, "2026-01-01T00:00:00.000Z"),
      cell("m", "m", 40, "2026-01-01T00:00:00.000Z"),
      cell("a", "a", 40, "2026-01-01T00:00:00.000Z"),
    ];

    expect(sortCells(cells, "popular").map((c) => c.id)).toEqual([
      "a",
      "m",
      "z",
    ]);
  });

  it("recent는 createdAt 내림차순(최신 우선)으로 정렬한다", () => {
    const cells = [
      cell("old", "old", 99, "2026-01-01T00:00:00.000Z"),
      cell("new", "new", 1, "2026-03-01T00:00:00.000Z"),
      cell("mid", "mid", 50, "2026-02-01T00:00:00.000Z"),
    ];

    expect(sortCells(cells, "recent").map((c) => c.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const cells = [
      cell("a", "a", 1, "2026-01-01T00:00:00.000Z"),
      cell("b", "b", 2, "2026-01-02T00:00:00.000Z"),
    ];
    const snapshot = cells.map((c) => c.id);

    sortCells(cells, "popular");
    sortCells(cells, "recent");

    expect(cells.map((c) => c.id)).toEqual(snapshot);
  });
});

describe("formatDuration (L3)", () => {
  it("초 값을 m:ss로 포맷한다", () => {
    expect(formatDuration(24)).toBe("0:24");
    expect(formatDuration(84)).toBe("1:24");
    expect(formatDuration(605)).toBe("10:05");
  });

  it("undefined이면 null을 반환한다(배지 미표시 신호)", () => {
    expect(formatDuration(undefined)).toBeNull();
  });
});

describe("filterByDistrict 지역 필터 (AC 16)", () => {
  const cells = [
    cell("A", "서면 A-14", 10, "2026-01-01T00:00:00.000Z", "부산진구"),
    cell("B", "전포 A-15", 20, "2026-01-02T00:00:00.000Z", "부산진구"),
    cell("C", "광안리 C-02", 30, "2026-01-03T00:00:00.000Z", "수영구"),
    cell("D", "해운대 E-05", 40, "2026-01-04T00:00:00.000Z", "해운대구"),
  ];

  it("지정한 구(district)에 속한 격자만 반환한다", () => {
    expect(filterByDistrict(cells, "부산진구").map((c) => c.id)).toEqual([
      "A",
      "B",
    ]);
  });

  it("매칭되는 격자가 없는 구는 빈 배열을 반환한다(범위 밖 셀 제거)", () => {
    expect(filterByDistrict(cells, "사상구")).toEqual([]);
  });

  it("district가 null이거나 undefined면 입력 목록을 그대로 반환한다", () => {
    expect(filterByDistrict(cells, null)).toEqual(cells);
    expect(filterByDistrict(cells, undefined)).toEqual(cells);
  });
});

describe("selectExploreCells 지역 필터 통합 (AC 16)", () => {
  const cells = [
    cell("A", "서면 A-14", 10, "2026-01-01T00:00:00.000Z", "부산진구"),
    cell("B", "전포 A-15", 50, "2026-01-02T00:00:00.000Z", "부산진구"),
    cell("C", "광안리 C-02", 30, "2026-01-03T00:00:00.000Z", "수영구"),
  ];

  it("설정된 지역 필터가 결과 집합을 해당 구로 좁힌다", () => {
    const result = selectExploreCells(cells, {
      query: "",
      order: "popular",
      district: "부산진구",
    });
    expect(result.map((c) => c.id)).toEqual(["B", "A"]);
  });

  it("district 미지정 시 기존 동작(전체 대상)을 유지한다 — 시그니처 호환", () => {
    const result = selectExploreCells(cells, { query: "", order: "popular" });
    expect(result.map((c) => c.id)).toEqual(["B", "C", "A"]);
  });

  it("지역 필터와 검색어 필터가 함께 적용된다(교집합)", () => {
    const result = selectExploreCells(cells, {
      query: "전포",
      order: "popular",
      district: "부산진구",
    });
    expect(result.map((c) => c.id)).toEqual(["B"]);
  });
});

describe("selectExploreCells 검색+정렬 파이프라인 (L4)", () => {
  const cells = [
    cell("A", "서면 A-14", 10, "2026-01-03T00:00:00.000Z"),
    cell("B", "전포 A-15", 50, "2026-01-01T00:00:00.000Z"),
    cell("C", "광안리 C-02", 30, "2026-01-02T00:00:00.000Z"),
    cell("D", "서면 A-16", 40, "2026-01-04T00:00:00.000Z"),
  ];

  it("정렬 상태를 바꿔도 동일 검색어의 결과 집합(원소)은 동일하다", () => {
    const query = "서면";
    const popular = selectExploreCells(cells, { query, order: "popular" });
    const recent = selectExploreCells(cells, { query, order: "recent" });

    const ids = (list: Cell[]) => list.map((c) => c.id).sort();
    expect(ids(popular)).toEqual(ids(recent));
  });

  it("정렬은 순서만 결정한다 — 같은 집합을 다른 순서로 반환한다", () => {
    const query = "";
    const popular = selectExploreCells(cells, { query, order: "popular" });
    const recent = selectExploreCells(cells, { query, order: "recent" });

    expect(popular.map((c) => c.id)).toEqual(["B", "D", "C", "A"]);
    expect(recent.map((c) => c.id)).toEqual(["D", "A", "C", "B"]);
  });
});

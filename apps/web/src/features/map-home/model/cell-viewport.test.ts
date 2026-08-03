import { describe, expect, it } from "vitest";
import type { Bounds, Cell } from "@/entities/cell";
import {
  filterCellsInBounds,
  summarizeCells,
  topCellsByVideo,
} from "./cell-viewport";

const cell = (
  id: string,
  lat: number,
  lng: number,
  videoCount: number,
): Cell => ({
  id,
  label: id,
  district: "부산진구",
  center: { lat, lng },
  videoCount,
  createdAt: "2026-01-01T00:00:00.000Z",
  location: id,
  recentUploadedAt: "2026-01-01T00:00:00.000Z",
  fillRate: 0,
  viewCount: 0,
  videos: [],
});

// 부산 도심을 감싸는 예시 bounds
const bounds: Bounds = {
  sw: { lat: 35.1, lng: 129.0 },
  ne: { lat: 35.2, lng: 129.1 },
};

describe("filterCellsInBounds (L1)", () => {
  it("중심 좌표가 bounds 안에 있는 격자만 반환한다", () => {
    const inside = cell("in", 35.15, 129.05, 10);
    const outsideLat = cell("outLat", 35.3, 129.05, 10);
    const outsideLng = cell("outLng", 35.15, 129.5, 10);

    const result = filterCellsInBounds(
      [inside, outsideLat, outsideLng],
      bounds,
    );

    expect(result).toEqual([inside]);
  });

  it("bounds 경계 위의 격자는 포함한다 (경계 포함)", () => {
    const onSw = cell("sw", 35.1, 129.0, 1);
    const onNe = cell("ne", 35.2, 129.1, 1);

    const result = filterCellsInBounds([onSw, onNe], bounds);

    expect(result).toEqual([onSw, onNe]);
  });
});

describe("summarizeCells (L2)", () => {
  it("뷰포트 내 격자 수와 영상 수 합계를 정확히 반환한다", () => {
    const cells = [cell("a", 0, 0, 5), cell("b", 0, 0, 7), cell("c", 0, 0, 3)];

    expect(summarizeCells(cells)).toEqual({ cellCount: 3, videoCount: 15 });
  });
});

describe("summarizeCells / filterCellsInBounds 빈 상태 (L4)", () => {
  it("뷰포트 내 격자가 없으면 빈 배열과 격자 0·영상 0을 반환한다", () => {
    const outside = [cell("far", 40, 130, 100)];

    const filtered = filterCellsInBounds(outside, bounds);

    expect(filtered).toEqual([]);
    expect(summarizeCells(filtered)).toEqual({ cellCount: 0, videoCount: 0 });
  });
});

describe("topCellsByVideo (L3)", () => {
  it("영상 수 내림차순으로 최대 3개를 반환한다", () => {
    const cells = [
      cell("a", 0, 0, 10),
      cell("b", 0, 0, 50),
      cell("c", 0, 0, 30),
      cell("d", 0, 0, 20),
    ];

    expect(topCellsByVideo(cells).map((c) => c.id)).toEqual(["b", "c", "d"]);
  });

  it("영상 수 동률이면 격자 id 오름차순으로 안정 정렬한다", () => {
    const cells = [
      cell("z", 0, 0, 40),
      cell("m", 0, 0, 40),
      cell("a", 0, 0, 40),
    ];

    expect(topCellsByVideo(cells).map((c) => c.id)).toEqual(["a", "m", "z"]);
  });

  it("격자가 3개 미만이면 있는 만큼만 반환한다", () => {
    const cells = [cell("a", 0, 0, 5), cell("b", 0, 0, 9)];

    expect(topCellsByVideo(cells).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const cells = [cell("a", 0, 0, 1), cell("b", 0, 0, 2)];
    const snapshot = cells.map((c) => c.id);

    topCellsByVideo(cells);

    expect(cells.map((c) => c.id)).toEqual(snapshot);
  });
});

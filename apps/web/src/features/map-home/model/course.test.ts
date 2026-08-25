import { describe, expect, it } from "vitest";
import {
  coursePath,
  courseSpots,
  isLoopCourse,
  parseLineString,
} from "./course";

describe("parseLineString — 코스 라인 GeoJSON 파싱 (AC 21)", () => {
  it("LineString 좌표를 [경도, 위도] 순서로 읽어 좌표 배열을 만든다 (AC 21)", () => {
    const line = JSON.stringify({
      type: "LineString",
      coordinates: [
        [129.0596, 35.1578],
        [129.0614, 35.1596],
      ],
    });

    expect(parseLineString(line)).toEqual([
      { lat: 35.1578, lng: 129.0596 },
      { lat: 35.1596, lng: 129.0614 },
    ]);
  });

  it("라인이 없으면 빈 배열이라 마커만 그린다 (AC 21)", () => {
    expect(parseLineString(null)).toEqual([]);
  });

  it("JSON이 깨졌으면 빈 배열로 흡수한다 (AC 21)", () => {
    expect(parseLineString("{not json")).toEqual([]);
  });

  it("LineString이 아닌 도형이면 빈 배열이다 (경계)", () => {
    expect(
      parseLineString(JSON.stringify({ type: "Point", coordinates: [1, 2] })),
    ).toEqual([]);
  });

  it("GeoJSON 객체 입력은 파싱 단계 없이 수용한다 (AC 1)", () => {
    expect(
      parseLineString({
        type: "LineString",
        coordinates: [
          [129.0596, 35.1578],
          [129.0614, 35.1596],
        ],
      }),
    ).toEqual([
      { lat: 35.1578, lng: 129.0596 },
      { lat: 35.1596, lng: 129.0614 },
    ]);
  });

  it("객체·문자열 어느 쪽이 와도 같은 코스는 같은 좌표 배열이다 (AC 2)", () => {
    const object = {
      type: "LineString",
      coordinates: [
        [129.03597, 35.09656],
        [129.03528, 35.09823],
      ],
    };

    expect(parseLineString(object)).toEqual(
      parseLineString(JSON.stringify(object)),
    );
  });

  it("객체인데 LineString이 아니면 빈 배열이다 (AC 3)", () => {
    expect(parseLineString({ type: "Point", coordinates: [1, 2] })).toEqual([]);
  });

  it("객체 coordinates가 배열이 아니면 빈 배열로 흡수한다 (AC 3)", () => {
    expect(
      parseLineString({ type: "LineString", coordinates: "깨짐" }),
    ).toEqual([]);
  });
});

describe("courseSpots — 포토스팟을 코스 순서로 정렬하고 방문을 판정한다 (AC 23)", () => {
  const spots = [
    { gridId: "g3", lat: 35.16, lng: 129.06, seq: 3 },
    { gridId: "g1", lat: 35.15, lng: 129.05, seq: 1 },
    { gridId: "g2", lat: 35.155, lng: 129.055, seq: 2 },
  ];

  it("seq 오름차순으로 정렬한다 (AC 23)", () => {
    expect(courseSpots(spots, new Set()).map((s) => s.gridId)).toEqual([
      "g1",
      "g2",
      "g3",
    ]);
  });

  it("순번이 1부터 다시 매겨져 표시 번호가 된다 (AC 23)", () => {
    expect(courseSpots(spots, new Set()).map((s) => s.order)).toEqual([
      1, 2, 3,
    ]);
  });

  it("내 수집 격자에 있으면 방문함으로 판정한다 (AC 23)", () => {
    const result = courseSpots(spots, new Set(["g2"]));

    expect(result.map((s) => s.visited)).toEqual([false, true, false]);
  });

  it("seq가 없는 스팟은 뒤로 보낸다 (경계 — seq는 NULL 허용 컬럼)", () => {
    const result = courseSpots(
      [
        { gridId: "gx", lat: 35.16, lng: 129.06, seq: null },
        { gridId: "g1", lat: 35.15, lng: 129.05, seq: 1 },
      ],
      new Set(),
    );

    expect(result.map((s) => s.gridId)).toEqual(["g1", "gx"]);
  });
});

describe("isLoopCourse — 순환/비순환 판별 (AC 22)", () => {
  it("시작점과 끝점이 100m 안이면 순환형이다 (AC 22)", () => {
    expect(
      isLoopCourse([
        { lat: 35.1578, lng: 129.0596 },
        { lat: 35.162, lng: 129.064 },
        { lat: 35.15785, lng: 129.05965 },
      ]),
    ).toBe(true);
  });

  it("시작점과 끝점이 멀면 비순환형이다 (AC 22)", () => {
    expect(
      isLoopCourse([
        { lat: 35.1578, lng: 129.0596 },
        { lat: 35.1696, lng: 129.0756 },
      ]),
    ).toBe(false);
  });

  it("라인이 비면 비순환형으로 본다 (경계)", () => {
    expect(isLoopCourse([])).toBe(false);
  });
});

describe("coursePath — 코스 연결선 좌표 (MSG-473 — 스팟 직선 폴백 제거)", () => {
  const LINE_OBJECT = {
    type: "LineString",
    coordinates: [
      [129.0, 35.1],
      [129.01, 35.11],
    ],
  };

  it("서버 코스 라인이 있으면 그 라인을 그대로 쓴다", () => {
    expect(coursePath(JSON.stringify(LINE_OBJECT))).toEqual([
      { lat: 35.1, lng: 129.0 },
      { lat: 35.11, lng: 129.01 },
    ]);
  });

  it("GeoJSON 객체 라인도 문자열과 같은 경로를 낸다 (AC 1·2)", () => {
    expect(coursePath(LINE_OBJECT)).toEqual(
      coursePath(JSON.stringify(LINE_OBJECT)),
    );
  });

  it("라인이 없으면 빈 배열 — 스팟 직선으로 잇지 않고 번호 마커만 남긴다 (AC 5)", () => {
    expect(coursePath(null)).toEqual([]);
  });

  it("라인 원문이 깨져도 빈 배열로 흡수한다 — 스팟 폴백 없음 (AC 5)", () => {
    expect(coursePath("{ not json")).toEqual([]);
  });
});

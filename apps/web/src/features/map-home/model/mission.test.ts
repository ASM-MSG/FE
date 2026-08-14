import { describe, expect, it } from "vitest";
import { cellCenterAt, cellIndexAt, encodeGridId } from "@/entities/cell";
import type { MissionResponseDto } from "@/shared/api/generated";
import {
  missionChipOf,
  missionCoversGrid,
  missionGridIdsInBounds,
  missionShapeOf,
  toMissionBuckets,
} from "./mission";

/** 서면 일대 기준점 — MVP 지역(부산 서면) 규칙 */
const SEOMYEON = { lat: 35.1578, lng: 129.0596 };

const mission = (over: Partial<MissionResponseDto>): MissionResponseDto => ({
  missionId: 1,
  type: "EVENT",
  title: "테스트 미션",
  targetCount: 1,
  startAt: null,
  endAt: null,
  shape: { polygon: [] },
  description: null,
  placeName: null,
  sourceUrl: null,
  operationTime: null,
  imageUrl: null,
  distanceMeters: null,
  durationMinutes: null,
  difficulty: null,
  ...over,
});

/** 중심점 주변 정사각 폴리곤 (도 단위 반폭) */
const squareAround = (
  { lat, lng }: { lat: number; lng: number },
  half: number,
) => [
  { lat: lat - half, lng: lng - half },
  { lat: lat - half, lng: lng + half },
  { lat: lat + half, lng: lng + half },
  { lat: lat + half, lng: lng - half },
];

const boundsAround = (
  { lat, lng }: { lat: number; lng: number },
  half: number,
) => ({
  sw: { lat: lat - half, lng: lng - half },
  ne: { lat: lat + half, lng: lng + half },
});

describe("missionChipOf — 미션 type을 칩 버킷으로 분류한다 (AC 1)", () => {
  it("EVENT와 THEME는 지역축제 버킷이다 (AC 1)", () => {
    expect(missionChipOf("EVENT")).toBe("festival");
    expect(missionChipOf("THEME")).toBe("festival");
  });

  it("POPUP은 팝업스토어, COURSE는 경로추천 버킷이다 (AC 1)", () => {
    expect(missionChipOf("POPUP")).toBe("popup");
    expect(missionChipOf("COURSE")).toBe("route");
  });

  it("칩에 대응하지 않는 type은 어느 버킷에도 넣지 않는다 (AC 1)", () => {
    expect(missionChipOf("AREA")).toBeNull();
    expect(missionChipOf("CONTINUOUS")).toBeNull();
  });
});

describe("toMissionBuckets — 응답을 칩별 목록으로 가른다 (AC 1)", () => {
  it("칩별로 갈라 담고 대응 없는 type은 버린다 (AC 1)", () => {
    const buckets = toMissionBuckets([
      mission({ missionId: 1, type: "EVENT" }),
      mission({ missionId: 2, type: "POPUP" }),
      mission({
        missionId: 3,
        type: "COURSE",
        shape: { line: null, spots: [] },
      }),
      mission({ missionId: 4, type: "AREA", shape: { regionCode: "2635058" } }),
      mission({ missionId: 5, type: "THEME", shape: { cells: [] } }),
    ]);

    expect(buckets.festival.map((m) => m.missionId)).toEqual([1, 5]);
    expect(buckets.popup.map((m) => m.missionId)).toEqual([2]);
    expect(buckets.route.map((m) => m.missionId)).toEqual([3]);
  });

  it("빈 응답이면 세 버킷 모두 빈 목록이다 (경계)", () => {
    const buckets = toMissionBuckets([]);

    expect(buckets.festival).toEqual([]);
    expect(buckets.popup).toEqual([]);
    expect(buckets.route).toEqual([]);
  });
});

describe("missionShapeOf — shape를 런타임 판별한다 (AC 2)", () => {
  it("코스는 라인·포토스팟과 경계 상자를 함께 판별한다 (AC 2)", () => {
    const shape = missionShapeOf(
      mission({
        type: "COURSE",
        shape: {
          line: '{"type":"LineString","coordinates":[]}',
          spots: [
            { gridId: "g1", lat: 35.15, lng: 129.05, seq: 1 },
            { gridId: "g2", lat: 35.16, lng: 129.06, seq: 2 },
          ],
        },
      }),
    );

    expect(shape.kind).toBe("path");
    expect(shape.spots).toHaveLength(2);
    expect(shape.line).toContain("LineString");
    expect(shape.bbox).toEqual({
      sw: { lat: 35.15, lng: 129.05 },
      ne: { lat: 35.16, lng: 129.06 },
    });
  });

  it("셀 집합은 격자 id 집합으로 판별한다 (AC 2)", () => {
    const shape = missionShapeOf(
      mission({
        type: "THEME",
        shape: { cells: [{ gridId: "g1", lat: 35.15, lng: 129.05 }] },
      }),
    );

    expect(shape.kind).toBe("cells");
    expect(shape.gridIds.has("g1")).toBe(true);
  });

  it("구역(REGION)은 경계가 없어 도형 없음으로 떨어진다 (경계)", () => {
    const shape = missionShapeOf(
      mission({ type: "AREA", shape: { regionCode: "2635058" } }),
    );

    expect(shape.kind).toBe("none");
    expect(shape.bbox).toBeNull();
  });
});

describe("missionCoversGrid — 내 격자가 미션 영역 안인지 (AC 3)", () => {
  it("셀·코스 미션은 격자 id 포함으로 판정한다 (AC 3)", () => {
    const shape = missionShapeOf(
      mission({
        type: "THEME",
        shape: { cells: [{ gridId: "g1", lat: 35.15, lng: 129.05 }] },
      }),
    );

    expect(missionCoversGrid(shape, "g1", { lat: 0, lng: 0 })).toBe(true);
    expect(missionCoversGrid(shape, "g2", { lat: 0, lng: 0 })).toBe(false);
  });

  it("BOX 미션은 격자 중심이 폴리곤 안인지로 판정한다 (AC 3)", () => {
    const shape = missionShapeOf(
      mission({
        type: "EVENT",
        shape: { polygon: squareAround(SEOMYEON, 0.002) },
      }),
    );

    expect(missionCoversGrid(shape, "무관한id", SEOMYEON)).toBe(true);
    expect(
      missionCoversGrid(shape, "무관한id", { lat: 35.2, lng: 129.2 }),
    ).toBe(false);
  });
});

describe("missionGridIdsInBounds — 뷰포트 안 격자만 펼친다 (AC 2·15)", () => {
  it("BOX는 폴리곤 ∩ 뷰포트만 훑는다 — 화면 밖은 펼치지 않는다 (AC 15)", () => {
    const shape = missionShapeOf(
      mission({
        type: "EVENT",
        shape: { polygon: squareAround(SEOMYEON, 0.004) },
      }),
    );

    const wide = missionGridIdsInBounds(shape, boundsAround(SEOMYEON, 0.01));
    const narrow = missionGridIdsInBounds(
      shape,
      boundsAround(SEOMYEON, 0.0005),
    );

    expect(narrow.length).toBeGreaterThan(0);
    expect(narrow.length).toBeLessThan(wide.length);
  });

  it("BOX가 격자 하나보다 작으면 그 격자 하나만 담는다 (경계)", () => {
    const center = cellCenterAt(cellIndexAt(SEOMYEON));
    const shape = missionShapeOf(
      mission({
        type: "EVENT",
        shape: { polygon: squareAround(center, 0.0002) },
      }),
    );

    expect(missionGridIdsInBounds(shape, boundsAround(center, 0.01))).toEqual([
      encodeGridId(center),
    ]);
  });

  it("코스는 뷰포트 안에 든 포토스팟의 격자만 준다 (AC 15)", () => {
    const shape = missionShapeOf(
      mission({
        type: "COURSE",
        shape: {
          line: null,
          spots: [
            { gridId: "in", lat: SEOMYEON.lat, lng: SEOMYEON.lng, seq: 1 },
            { gridId: "far", lat: 36.5, lng: 127.5, seq: 2 },
          ],
        },
      }),
    );

    expect(missionGridIdsInBounds(shape, boundsAround(SEOMYEON, 0.01))).toEqual(
      ["in"],
    );
  });

  it("뷰포트와 겹치지 않는 미션은 아무것도 펼치지 않는다 (AC 15 — 렉 회귀 방지)", () => {
    const shape = missionShapeOf(
      mission({
        type: "EVENT",
        shape: { polygon: squareAround(SEOMYEON, 0.002) },
      }),
    );

    expect(
      missionGridIdsInBounds(
        shape,
        boundsAround({ lat: 37.5, lng: 127 }, 0.01),
      ),
    ).toEqual([]);
  });
});

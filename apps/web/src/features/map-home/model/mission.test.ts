import { describe, expect, it } from "vitest";
import { cellCenterAt, cellIndexAt, encodeGridId } from "@/entities/cell";
import type { MissionResponseDto, PathShape } from "@/shared/api/generated";
import {
  missionChipOfTheme,
  missionCoversGrid,
  missionGridIdsInBounds,
  missionShapeOf,
  missionTypeParam,
} from "./mission";

/** 서면 일대 기준점 — MVP 지역(부산 서면) 규칙 */
const SEOMYEON = { lat: 35.1578, lng: 129.0596 };

// shape는 unknown으로 받는다 — 명세(MSG-472 정정: line은 객체)가 뭐라 하든 FE는
// 문자열 원문·객체·깨진 형태까지 방어 수용하는 것이 계약이라(MSG-473 AC 2·3) 명세 밖
// 표현도 픽스처로 쓴다.
const mission = (
  over: Omit<Partial<MissionResponseDto>, "shape"> & { shape?: unknown },
): MissionResponseDto =>
  ({
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
  }) as MissionResponseDto;

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

describe("missionChipOfTheme — 활성 칩을 미션 칩으로 좁힌다 (AC 19)", () => {
  it("축제·팝업·경로추천은 그대로 미션 칩이다 (AC 19)", () => {
    expect(missionChipOfTheme("festival")).toBe("festival");
    expect(missionChipOfTheme("popup")).toBe("popup");
    expect(missionChipOfTheme("route")).toBe("route");
  });

  it("핫구역과 칩 해제 상태는 미션 조회 대상이 아니다 (AC 19)", () => {
    expect(missionChipOfTheme("hot")).toBeNull();
    expect(missionChipOfTheme(null)).toBeNull();
  });
});

describe("missionTypeParam — 칩을 조회 파라미터 이름으로 (AC 19)", () => {
  it("축제는 EVENT, 팝업은 POPUP, 경로추천은 COURSE로 조회한다 (AC 19)", () => {
    expect(missionTypeParam("festival")).toBe("EVENT");
    expect(missionTypeParam("popup")).toBe("POPUP");
    expect(missionTypeParam("route")).toBe("COURSE");
  });
});

describe("missionShapeOf — shape를 런타임 판별한다 (AC 2)", () => {
  it("코스는 라인·포토스팟과 경계 상자를 함께 판별한다 (AC 2)", () => {
    const shape = missionShapeOf(
      mission({
        type: "COURSE",
        shape: {
          // BE가 MSG-473에서 line을 문자열이 아닌 GeoJSON 객체로 내리기 시작했다(DTO 타입 변경).
          // FE 파싱 대응은 MSG-473 소관 — 여기서는 기존 문자열 계약 픽스처를 좁은 캐스트로 유지한다.
          line: '{"type":"LineString","coordinates":[]}' as unknown as PathShape["line"],
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

  it("코스 라인이 GeoJSON 객체로 와도 버리지 않고 보존한다 (AC 4)", () => {
    const line = {
      type: "LineString",
      coordinates: [
        [129.05, 35.15],
        [129.07, 35.17],
      ],
    };
    const shape = missionShapeOf(
      mission({
        type: "COURSE",
        shape: {
          line,
          spots: [{ gridId: "g1", lat: 35.15, lng: 129.05, seq: 1 }],
        },
      }),
    );

    expect(shape.kind).toBe("path");
    expect(shape.line).toEqual(line);
  });

  it("PATH bbox는 스팟 ∪ 라인 좌표를 포함한다 — 실경로 끝단이 잘리지 않는다 (AC 6)", () => {
    const line = {
      type: "LineString",
      coordinates: [
        [129.04, 35.14], // 스팟 bbox 남서쪽 밖
        [129.08, 35.18], // 스팟 bbox 북동쪽 밖
      ],
    };
    const spots = [
      { gridId: "g1", lat: 35.15, lng: 129.05, seq: 1 },
      { gridId: "g2", lat: 35.16, lng: 129.06, seq: 2 },
    ];
    const expected = {
      sw: { lat: 35.14, lng: 129.04 },
      ne: { lat: 35.18, lng: 129.08 },
    };

    expect(
      missionShapeOf(mission({ type: "COURSE", shape: { line, spots } })).bbox,
    ).toEqual(expected);
    // 문자열 원문으로 와도 같은 bbox — 두 표현이 같은 코스다 (AC 2)
    expect(
      missionShapeOf(
        mission({
          type: "COURSE",
          shape: { line: JSON.stringify(line), spots },
        }),
      ).bbox,
    ).toEqual(expected);
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

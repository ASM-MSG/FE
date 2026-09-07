import { describe, expect, it } from "vitest";
import { cellIndexAt } from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";
import { homeFocusParams, parseHomeFocus } from "./home-focus";

/**
 * L4: 검색 복귀 params(`/home?lat&lng&gridId&bounds&ts`) 파싱·빌더 (MSG-578 D1).
 * 기존 `map-home-screen` effect의 NaN·범위 가드를 여기로 이관하고 gridId 숫자 가드를 더한다.
 */
const GRID_ID = "16853_11419";
const BOUNDS = "35.15,129.05,35.16,129.07";
const POINT = { lat: "35.1578", lng: "129.0604" };

describe("parseHomeFocus — 격자 (L4)", () => {
  it("gridId가 오면 격자 중심(cellCenterAt)과 하이라이트 셀(cellIndexAt)을 파생한다", () => {
    const focus = parseHomeFocus({ gridId: GRID_ID });

    const center = cellCenterAt(decodeGridIndex(GRID_ID));
    expect(focus).toEqual({
      kind: "grid",
      gridId: GRID_ID,
      center,
      cell: cellIndexAt(center),
    });
  });

  it("비숫자 gridId는 null이다 — 지도에 넘기지 않는다", () => {
    expect(parseHomeFocus({ gridId: "abc" })).toBeNull();
    expect(parseHomeFocus({ gridId: "16853_x" })).toBeNull();
    expect(parseHomeFocus({ gridId: "16853" })).toBeNull();
  });
});

describe("parseHomeFocus — 구역 bounds (L4)", () => {
  it('bounds="swLat,swLng,neLat,neLng"는 sw/ne로 풀린다', () => {
    expect(parseHomeFocus({ bounds: BOUNDS })).toEqual({
      kind: "bounds",
      bounds: {
        sw: { lat: 35.15, lng: 129.05 },
        ne: { lat: 35.16, lng: 129.07 },
      },
    });
  });

  it("항목 수가 4개가 아니면 null이다", () => {
    expect(parseHomeFocus({ bounds: "35.15,129.05,35.16" })).toBeNull();
  });

  it("NaN·범위 밖 항목이 섞이면 null이다", () => {
    expect(parseHomeFocus({ bounds: "35.15,abc,35.16,129.07" })).toBeNull();
    expect(parseHomeFocus({ bounds: "35.15,129.05,91,129.07" })).toBeNull();
    expect(parseHomeFocus({ bounds: "35.15,181,35.16,129.07" })).toBeNull();
  });
});

describe("parseHomeFocus — 장소 좌표 (L4, 기존 MSG-297 가드 이관)", () => {
  it("lat·lng가 오면 point다", () => {
    expect(parseHomeFocus(POINT)).toEqual({
      kind: "point",
      center: { lat: 35.1578, lng: 129.0604 },
    });
  });

  it("NaN이면 null이다", () => {
    expect(parseHomeFocus({ lat: "abc", lng: "129.06" })).toBeNull();
  });

  it("위도 90·경도 180 초과는 null이다", () => {
    expect(parseHomeFocus({ lat: "91", lng: "129.06" })).toBeNull();
    expect(parseHomeFocus({ lat: "35.15", lng: "181" })).toBeNull();
  });

  it("한쪽만 있거나 아무것도 없으면 null이다", () => {
    expect(parseHomeFocus({ lat: "35.15" })).toBeNull();
    expect(parseHomeFocus({})).toBeNull();
  });
});

describe("parseHomeFocus — 우선순위 gridId > bounds > point (L4)", () => {
  it("셋이 동시에 오면 gridId가 이긴다", () => {
    expect(
      parseHomeFocus({ ...POINT, bounds: BOUNDS, gridId: GRID_ID })?.kind,
    ).toBe("grid");
  });

  it("bounds와 point가 동시에 오면 bounds가 이긴다", () => {
    expect(parseHomeFocus({ ...POINT, bounds: BOUNDS })?.kind).toBe("bounds");
  });

  it("빈 문자열 키는 없는 것으로 본다 — 빌더가 비운 키가 우선순위를 가로채지 않는다", () => {
    expect(parseHomeFocus({ ...POINT, gridId: "", bounds: "" })?.kind).toBe(
      "point",
    );
  });
});

describe("homeFocusParams — 검색 화면이 보내는 params 빌더 (L4, 리스크 'params 병합')", () => {
  it("모든 키(lat·lng·gridId·bounds·ts)를 항상 실어 이전 복귀의 값이 잔존하지 않게 한다", () => {
    const params = homeFocusParams({ kind: "grid", gridId: GRID_ID }, 1);

    expect(Object.keys(params).sort()).toEqual(
      ["bounds", "gridId", "lat", "lng", "ts"].sort(),
    );
    expect(params.gridId).toBe(GRID_ID);
    expect(params.lat).toBe("");
    expect(params.bounds).toBe("");
    expect(params.ts).toBe("1");
  });

  it("장소·격자·구역 타깃이 파서와 왕복한다", () => {
    const center = { lat: 35.1578, lng: 129.0604 };
    const bounds = {
      sw: { lat: 35.15, lng: 129.05 },
      ne: { lat: 35.16, lng: 129.07 },
    };

    expect(
      parseHomeFocus(homeFocusParams({ kind: "point", center }, 1)),
    ).toEqual({
      kind: "point",
      center,
    });
    expect(
      parseHomeFocus(homeFocusParams({ kind: "grid", gridId: GRID_ID }, 1))
        ?.kind,
    ).toBe("grid");
    expect(
      parseHomeFocus(homeFocusParams({ kind: "bounds", bounds }, 1)),
    ).toEqual({ kind: "bounds", bounds });
  });
});

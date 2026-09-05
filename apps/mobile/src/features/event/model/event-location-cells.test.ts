import { palette } from "@fillmap/design-tokens";
import { describe, expect, it } from "vitest";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";
import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import { toMissionCells } from "../../map-home/model/mission-cells";
import {
  eventBaseCells,
  eventCellMembership,
  eventLocationAccent,
  eventLocationCells,
  eventLocationIdAt,
  eventLocationLabel,
  eventLocationsCenter,
} from "./event-location-cells";

/**
 * AC 7 (D12·D13): 전 위치 `gridIds` 셀이 채색되고(중복 격자 1회) 카메라가 위치 대표 격자
 * 중심들의 평균점으로 이동한다 — 셀·중심 파생은 순수 함수.
 */
const location = (
  locationId: number,
  gridIds: string[],
  representativeGridId: string,
): EventLocationResponseDto => ({
  locationId,
  name: `위치 ${locationId}`,
  type: "ETC",
  operatingHours: null,
  gridIds,
  representativeGridId,
  zoneName: null,
  zoneCell: null,
  regionName: null,
  videoCount: 0,
  organizerName: null,
  description: null,
  imageUrl: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
});

const A = ["16858_11420", "16858_11421", "16859_11420"];
const B = ["16852_11426", "16858_11420"]; // 첫 격자와 겹친다

describe("eventLocationCells — 전 위치 격자 합집합 셀 (AC 7)", () => {
  it("전 위치 gridIds를 합쳐 스냅하고 중복 격자는 1회만 파생한다", () => {
    const cells = eventLocationCells([
      location(10, A, A[0]),
      location(11, B, B[0]),
    ]);

    expect(cells).toEqual(toMissionCells([...A, ...B]));
    expect(cells).toHaveLength(4);
  });

  it("위치가 없으면 빈 배열이다", () => {
    expect(eventLocationCells([])).toEqual([]);
  });
});

describe("eventLocationsCenter — 대표 격자 중심 평균 (AC 7·D13)", () => {
  it("대표 격자 중심들의 위경도 평균을 낸다", () => {
    const c1 = cellCenterAt(decodeGridIndex(A[0]));
    const c2 = cellCenterAt(decodeGridIndex(B[0]));

    const center = eventLocationsCenter([
      location(10, A, A[0]),
      location(11, B, B[0]),
    ]);

    expect(center?.lat).toBeCloseTo((c1.lat + c2.lat) / 2, 10);
    expect(center?.lng).toBeCloseTo((c1.lng + c2.lng) / 2, 10);
  });

  it("위치가 없으면 null — 카메라를 움직이지 않는다", () => {
    expect(eventLocationsCenter([])).toBeNull();
  });
});

/**
 * AC 5·6 (MSG-560 D2·D3): 셀 membership(먼저 온 위치 우선) · 강조 셀 · 라벨 앵커.
 */
describe("eventCellMembership — 셀 키 → 소속 위치 (AC 5)", () => {
  it("공유 격자는 먼저 온 위치가 가진다", () => {
    const membership = eventCellMembership([
      location(10, A, A[0]),
      location(11, B, B[0]),
    ]);
    const shared = toMissionCells([A[0]])[0];

    expect(membership.get(`${shared.col}:${shared.row}`)).toBe(10);
    expect(membership.size).toBe(4);
  });

  it("소속 없는 셀은 null이다 — 비소속 셀 탭은 무동작 (AC 5)", () => {
    const membership = eventCellMembership([location(10, A, A[0])]);

    expect(eventLocationIdAt(membership, { col: -1, row: -1 })).toBeNull();
  });

  it("소속 셀 탭은 그 위치 id를 낸다 (AC 5)", () => {
    const membership = eventCellMembership([location(10, A, A[0])]);
    const cell = toMissionCells([A[1]])[0];

    expect(eventLocationIdAt(membership, cell)).toBe(10);
  });
});

describe("eventLocationAccent — 선택 위치 강조 셀 (AC 6)", () => {
  it("선택 위치의 셀만 낸다 — 공유 격자는 먼저 온 위치 쪽에 남는다", () => {
    const locations = [location(10, A, A[0]), location(11, B, B[0])];

    expect(eventLocationAccent(locations, 10)).toEqual(toMissionCells(A));
    // B의 둘째 격자(=A[0])는 공유라 10이 가진다 — 11의 강조는 고유 격자 1칸뿐
    expect(eventLocationAccent(locations, 11)).toEqual(toMissionCells([B[0]]));
  });

  it("선택 위치가 목록에 없으면 빈 배열이다", () => {
    expect(eventLocationAccent([location(10, A, A[0])], 99)).toEqual([]);
  });
});

describe("eventLocationLabel — 위치명 라벨 앵커 (AC 6)", () => {
  it("텍스트는 위치명, 좌표는 대표 격자 셀 중심이다", () => {
    const dto = location(11, B, B[0]);

    expect(eventLocationLabel(dto)).toEqual({
      text: "위치 11",
      coord: cellCenterAt(decodeGridIndex(B[0])),
      color: palette["theme-festival"],
    });
  });
});

describe("eventBaseCells — 강조를 뺀 나머지 위치 셀 (AC 6)", () => {
  it("강조 셀을 제외해 두 색 층이 같은 셀에 겹치지 않게 한다", () => {
    const locations = [location(10, A, A[0]), location(11, B, B[0])];
    const accent = eventLocationAccent(locations, 10);

    expect(eventBaseCells(locations, accent)).toEqual(toMissionCells([B[0]]));
  });

  it("강조가 없으면(개요) 전 위치 셀 그대로다 — 557 렌더 불변", () => {
    const locations = [location(10, A, A[0]), location(11, B, B[0])];

    expect(eventBaseCells(locations, [])).toEqual(
      eventLocationCells(locations),
    );
  });
});

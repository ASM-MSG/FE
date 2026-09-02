import { describe, expect, it } from "vitest";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";
import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import { toMissionCells } from "../../map-home/model/mission-cells";
import {
  eventLocationCells,
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

import { describe, expect, it } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import {
  activeMissionsQueryArgs,
  missionProgressQueryArgs,
} from "./mission-query-args";

/**
 * D1·D2: 축제/팝업/경로 칩 선택 시 `GET /api/missions/active`가 `type` + 뷰포트 bbox로
 * 조회되고, 목록 미션 id 전체의 진행도는 `GET /api/missions/progress?missionIds=`
 * **1회**로 조회된다 (미션당 호출이 아니다) — MSG-427.
 */
const VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.165, lng: 129.07 },
};
/** 명세 상한(한 변 0.5도)을 넘긴 뷰포트 — 조회하지 않는다 */
const TOO_WIDE: Bounds = {
  sw: { lat: 35, lng: 128 },
  ne: { lat: 36, lng: 129 },
};

describe("활성 미션 조회 인자 (D1)", () => {
  it("칩을 서버 type 파라미터로 바꾸고 뷰포트 bbox를 함께 싣는다", () => {
    expect(activeMissionsQueryArgs("festival", VIEWPORT)).toEqual({
      query: {
        type: "EVENT",
        swLat: 35.15,
        swLng: 129.05,
        neLat: 35.165,
        neLng: 129.07,
      },
      enabled: true,
    });
    expect(activeMissionsQueryArgs("popup", VIEWPORT).query.type).toBe("POPUP");
    expect(activeMissionsQueryArgs("route", VIEWPORT).query.type).toBe(
      "COURSE",
    );
  });

  it("칩이 없거나 뷰포트가 미확정·상한 초과면 조회하지 않는다", () => {
    expect(activeMissionsQueryArgs(null, VIEWPORT).enabled).toBe(false);
    expect(activeMissionsQueryArgs("festival", null).enabled).toBe(false);
    expect(activeMissionsQueryArgs("festival", TOO_WIDE).enabled).toBe(false);
  });
});

describe("진행도 일괄 조회 인자 (D2)", () => {
  it("목록 미션 id 전체를 한 요청에 담는다", () => {
    expect(missionProgressQueryArgs([11, 12, 13])).toEqual({
      query: { missionIds: [11, 12, 13] },
      enabled: true,
    });
  });

  it("조회 대상이 없으면 발사하지 않는다", () => {
    expect(missionProgressQueryArgs([]).enabled).toBe(false);
  });
});

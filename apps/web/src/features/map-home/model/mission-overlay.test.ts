import { describe, expect, it } from "vitest";
import { decodeGridCenter, encodeGridId, type Bounds } from "@/entities/cell";
import type { MissionResponseDto } from "@/shared/api/generated";
import { missionShapeOf } from "./mission";
import {
  buildCourseLabels,
  buildCourseRoutes,
  buildMissionCells,
  buildMissionLabels,
} from "./mission-overlay";
import type { CourseView, MissionView } from "./mission-view";

const COLOR = "#8B5CF6";

const P1 = { lat: 35.1578, lng: 129.0596 };
const P2 = { lat: 35.1596, lng: 129.0614 };
const G1 = encodeGridId(P1);
const G2 = encodeGridId(P2);

/** 서면 일대를 넉넉히 덮는 뷰포트 */
const VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.17, lng: 129.07 },
};
/** 서울 — 서면 미션과 겹치지 않는 뷰포트 */
const FAR_VIEWPORT: Bounds = {
  sw: { lat: 37.5, lng: 126.9 },
  ne: { lat: 37.6, lng: 127.0 },
};

const cellsView = (missionId: number, gridIds: string[]): MissionView =>
  ({
    missionId,
    title: `미션 ${missionId}`,
    shape: missionShapeOf({
      shape: {
        cells: gridIds.map((gridId) => {
          const center = decodeGridCenter(gridId);
          return { gridId, lat: center.lat, lng: center.lng };
        }),
      },
    } as MissionResponseDto),
    progress: { done: 0, total: 1, completed: false },
    status: { kind: "ongoing", label: "진행 중" },
  }) as MissionView;

const course = (
  missionId: number,
  path: { lat: number; lng: number }[],
  spots: { gridId: string; lat: number; lng: number; order: number }[],
): CourseView =>
  ({
    ...cellsView(
      missionId,
      spots.map((s) => s.gridId),
    ),
    path,
    loop: false,
    spots: spots.map((s) => ({
      gridId: s.gridId,
      position: { lat: s.lat, lng: s.lng },
      order: s.order,
      visited: false,
    })),
  }) as CourseView;

describe("buildMissionCells — 미션 격자를 지도 타일로 (AC 15·16)", () => {
  it("미션마다 자기 격자만큼 타일을 만든다 (AC 15)", () => {
    const cells = buildMissionCells(
      [cellsView(1, [G1]), cellsView(2, [G2])],
      COLOR,
      [],
      null,
      VIEWPORT,
    );

    expect(cells.map((c) => c.id).toSorted()).toEqual([G1, G2].toSorted());
    expect(cells.every((c) => c.color === COLOR)).toBe(true);
  });

  it("화면 밖 미션은 타일을 만들지 않는다 (AC 15 — 렉 회귀 방지)", () => {
    const cells = buildMissionCells(
      [cellsView(1, [G1]), cellsView(2, [G2])],
      COLOR,
      [],
      null,
      FAR_VIEWPORT,
    );

    expect(cells).toEqual([]);
  });

  it("내가 점령한 격자와 겹치면 빗금이 얹힌다 (AC 15)", () => {
    const cells = buildMissionCells(
      [cellsView(1, [G1, G2])],
      COLOR,
      [G2],
      null,
      VIEWPORT,
    );

    expect(cells.find((c) => c.id === G1)?.hatched).toBe(false);
    expect(cells.find((c) => c.id === G2)?.hatched).toBe(true);
  });

  it("포커스된 미션의 타일만 테두리가 강조된다 (AC 16)", () => {
    const cells = buildMissionCells(
      [cellsView(1, [G1]), cellsView(2, [G2])],
      COLOR,
      [],
      2,
      VIEWPORT,
    );

    expect(cells.find((c) => c.id === G1)?.emphasized).toBeFalsy();
    expect(cells.find((c) => c.id === G2)?.emphasized).toBe(true);
  });

  it("두 미션이 같은 격자를 덮어도 타일은 하나다 (경계)", () => {
    const cells = buildMissionCells(
      [cellsView(1, [G1]), cellsView(2, [G1])],
      COLOR,
      [],
      null,
      VIEWPORT,
    );

    expect(cells).toHaveLength(1);
  });

  it("겹친 격자라도 포커스된 미션 쪽 강조가 살아남는다 (경계)", () => {
    const cells = buildMissionCells(
      [cellsView(1, [G1]), cellsView(2, [G1])],
      COLOR,
      [],
      2,
      VIEWPORT,
    );

    expect(cells[0].emphasized).toBe(true);
  });
});

describe("buildMissionLabels — 미션명 라벨 마커 (AC 16·18)", () => {
  it("포커스된 미션에만 라벨을 붙인다 (AC 16)", () => {
    const labels = buildMissionLabels(
      [cellsView(1, [G1]), cellsView(2, [G2])],
      COLOR,
      2,
      VIEWPORT,
    );

    expect(labels).toHaveLength(1);
    expect(labels[0].text).toBe("미션 2");
  });

  it("포커스가 없으면 라벨을 그리지 않는다 (AC 15 — 목록만 볼 때는 타일만)", () => {
    expect(
      buildMissionLabels([cellsView(1, [G1])], COLOR, null, VIEWPORT),
    ).toEqual([]);
  });

  it("포커스된 미션이 화면 밖이면 이름표를 놓지 않는다 (경계)", () => {
    expect(
      buildMissionLabels([cellsView(1, [G1])], COLOR, 1, FAR_VIEWPORT),
    ).toEqual([]);
  });
});

describe("buildCourseRoutes — 코스 라인과 번호 경유지 (AC 21)", () => {
  const SPOTS = [
    { gridId: G1, lat: P1.lat, lng: P1.lng, order: 1 },
    { gridId: G2, lat: P2.lat, lng: P2.lng, order: 2 },
  ];

  it("코스마다 라인과 순번 경유지를 만든다 (AC 21)", () => {
    const routes = buildCourseRoutes([course(3, [P1], SPOTS)], COLOR, VIEWPORT);

    expect(routes).toHaveLength(1);
    expect(routes[0].waypoints.map((w) => w.seq)).toEqual([1, 2]);
    expect(routes[0].color).toBe(COLOR);
  });

  it("라인이 없으면 경유지만 남는다 (AC 21)", () => {
    const routes = buildCourseRoutes([course(3, [], SPOTS)], COLOR, VIEWPORT);

    expect(routes[0].path).toEqual([]);
    expect(routes[0].waypoints).toHaveLength(2);
  });

  it("코스가 여럿이면 라인도 여럿이다 (AC 21)", () => {
    const routes = buildCourseRoutes(
      [course(3, [], SPOTS), course(4, [], SPOTS)],
      COLOR,
      VIEWPORT,
    );

    expect(routes.map((r) => r.id)).toEqual(["3", "4"]);
  });

  it("화면 밖 코스는 그리지 않는다 (AC 21 — 렉 회귀 방지)", () => {
    expect(
      buildCourseRoutes([course(3, [], SPOTS)], COLOR, FAR_VIEWPORT),
    ).toEqual([]);
  });
});

describe("buildCourseLabels — 코스명 라벨 (AC 21)", () => {
  it("코스마다 첫 스팟 자리에 이름표를 둔다 (AC 21)", () => {
    const labels = buildCourseLabels(
      [course(3, [], [{ gridId: G1, lat: P1.lat, lng: P1.lng, order: 1 }])],
      COLOR,
      VIEWPORT,
    );

    expect(labels).toHaveLength(1);
    expect(labels[0].text).toBe("미션 3");
    expect(labels[0].position).toEqual(P1);
  });

  it("스팟이 없는 코스는 이름표를 놓지 않는다 (경계)", () => {
    expect(buildCourseLabels([course(3, [], [])], COLOR, VIEWPORT)).toEqual([]);
  });
});

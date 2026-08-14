import { describe, expect, it } from "vitest";
import type { MissionResponseDto } from "@/shared/api/generated";
import { toCourseView, toMissionView } from "./mission-view";

const NOW = new Date("2026-08-14T10:00:00+09:00");

const dto = (over: Partial<MissionResponseDto>): MissionResponseDto => ({
  missionId: 1,
  type: "THEME",
  title: "물놀이 페스타",
  targetCount: 1,
  startAt: "2026-07-16T00:00:00",
  endAt: "2026-08-17T23:59:59",
  shape: { cells: [] },
  description: null,
  placeName: "서면 A-14",
  sourceUrl: null,
  operationTime: null,
  imageUrl: null,
  distanceMeters: null,
  durationMinutes: null,
  difficulty: null,
  ...over,
});

describe("toMissionView — 카드·상세·오버레이가 공유할 표시 모델 (AC 3·4·13)", () => {
  it("격자·진행도·상태를 한 번에 붙인다 (AC 13)", () => {
    const view = toMissionView(
      dto({
        shape: {
          cells: [
            { gridId: "g1", lat: 35.15, lng: 129.05 },
            { gridId: "g2", lat: 35.16, lng: 129.06 },
          ],
        },
      }),
      [{ gridId: "g1", center: { lat: 35.15, lng: 129.05 } }],
      NOW,
    );

    expect(view.shape.gridIds.has("g1")).toBe(true);
    expect(view.progress.done).toBe(1);
    expect(view.status.kind).toBe("completed");
  });

  it("한 칸도 채우지 않았으면 기간 배지가 그대로 보인다 (AC 4)", () => {
    const view = toMissionView(
      dto({ shape: { cells: [{ gridId: "g1", lat: 35.15, lng: 129.05 }] } }),
      [],
      NOW,
    );

    expect(view.progress.done).toBe(0);
    expect(view.status.kind).toBe("ongoing");
  });
});

describe("toCourseView — 코스 전용 파생을 얹는다 (AC 21~23)", () => {
  const courseDto = dto({
    missionId: 3,
    type: "COURSE",
    title: "남파랑길 3코스",
    targetCount: 3,
    startAt: null,
    endAt: null,
    distanceMeters: 14000,
    durationMinutes: 330,
    shape: {
      line: JSON.stringify({
        type: "LineString",
        coordinates: [
          [129.05, 35.15],
          [129.06, 35.16],
        ],
      }),
      spots: [
        { gridId: "s2", lat: 35.16, lng: 129.06, seq: 2 },
        { gridId: "s1", lat: 35.15, lng: 129.05, seq: 1 },
      ],
    },
  });

  it("라인과 코스 순서 스팟을 함께 만든다 (AC 21·23)", () => {
    const view = toCourseView(
      courseDto,
      [{ gridId: "s1", center: { lat: 35.15, lng: 129.05 } }],
      NOW,
    );

    expect(view.path).toHaveLength(2);
    expect(view.spots.map((s) => s.gridId)).toEqual(["s1", "s2"]);
    expect(view.spots[0].visited).toBe(true);
  });

  it("진행도의 분자는 방문한 스팟 수다 (AC 3·20)", () => {
    const view = toCourseView(
      courseDto,
      [{ gridId: "s1", center: { lat: 35.15, lng: 129.05 } }],
      NOW,
    );

    expect(view.progress.done).toBe(1);
    expect(view.progress.total).toBe(3);
  });

  it("코스가 아닌 미션을 넘기면 라인·스팟이 비어 있다 (경계)", () => {
    const view = toCourseView(dto({}), [], NOW);

    expect(view.path).toEqual([]);
    expect(view.spots).toEqual([]);
  });
});

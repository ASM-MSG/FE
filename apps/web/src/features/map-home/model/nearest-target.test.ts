import { describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import { nearestTarget } from "./nearest-target";

/** 서면 일대 — 지도 중심 기준 최근접 판정용 픽스처 (부산) */
const SEOMYEON = { lat: 35.1579, lng: 129.0594 };

/** 중심 좌표를 그대로 갖는 정사각 bbox — 대표점이 center가 되게 만든다 */
const boxAt = (lat: number, lng: number): Bounds => ({
  sw: { lat: lat - 0.001, lng: lng - 0.001 },
  ne: { lat: lat + 0.001, lng: lng + 0.001 },
});

const target = (missionId: number, bbox: Bounds | null) => ({
  missionId,
  shape: { bbox },
});

describe("nearestTarget — 지도 중심에서 가장 가까운 대상 1건 (AC 9·10)", () => {
  it("지도 중심에서 최단거리인 대상을 고른다 (AC 9)", () => {
    const targets = [
      target(1, boxAt(35.18, 129.09)),
      target(2, boxAt(35.159, 129.06)),
      target(3, boxAt(35.21, 129.12)),
    ];

    expect(nearestTarget(targets, SEOMYEON)?.missionId).toBe(2);
  });

  it("거리가 같으면 목록 순서가 앞선 대상을 고른다 (AC 9)", () => {
    const targets = [
      target(1, boxAt(SEOMYEON.lat, SEOMYEON.lng + 0.02)),
      target(2, boxAt(SEOMYEON.lat, SEOMYEON.lng - 0.02)),
    ];

    expect(nearestTarget(targets, SEOMYEON)?.missionId).toBe(1);
  });

  it("목록이 비면 null이다 — 이동·선택 명령이 나가지 않는다 (AC 10, 경계)", () => {
    expect(nearestTarget([], SEOMYEON)).toBeNull();
  });

  it("좌표가 없는(bbox null) 대상은 후보에서 빠진다 (AC 10, 경계)", () => {
    const targets = [target(1, null), target(2, boxAt(35.2, 129.1))];

    expect(nearestTarget(targets, SEOMYEON)?.missionId).toBe(2);
  });

  it("모든 대상에 좌표가 없으면 null이다 (AC 10, 경계)", () => {
    expect(nearestTarget([target(1, null)], SEOMYEON)).toBeNull();
  });

  it("지도 중심이 없으면(지도 준비 전) null이다 (AC 10, 경계)", () => {
    expect(nearestTarget([target(1, boxAt(35.2, 129.1))], null)).toBeNull();
  });
});

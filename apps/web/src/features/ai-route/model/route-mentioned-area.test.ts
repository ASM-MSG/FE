import { describe, expect, it } from "vitest";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import type { MentionedAreaDto } from "@/shared/api/generated";
import {
  MOVED_TOAST_DESCRIPTION,
  movedToastTitle,
  resolveAutoMove,
} from "./route-mentioned-area";

const area = (kind: string): MentionedAreaDto => ({
  name: "부산 서면",
  centerLat: 35.1579,
  centerLng: 129.0594,
  minLat: 35.1521,
  minLng: 129.0537,
  maxLat: 35.1662,
  maxLng: 129.0712,
  kind,
});

describe("resolveAutoMove — 언급 지역 자동 이동 판정 (L6~L9)", () => {
  it("MOVE 신호는 지역 중심과 1km 축척 줌·지역명을 낸다 (L6)", () => {
    expect(
      resolveAutoMove({ mentionedArea: area("MOVE"), alreadyMoved: false }),
    ).toEqual({
      center: { lat: 35.1579, lng: 129.0594 },
      zoom: MAP_SCALE_1KM_ZOOM,
      areaName: "부산 서면",
      kind: "MOVE",
    });
  });

  it("ZOOM_OUT 신호도 MOVE와 같은 이동으로 처리한다 (L7)", () => {
    const moved = resolveAutoMove({
      mentionedArea: area("MOVE"),
      alreadyMoved: false,
    });
    const zoomedOut = resolveAutoMove({
      mentionedArea: area("ZOOM_OUT"),
      alreadyMoved: false,
    });

    expect({ ...zoomedOut, kind: "MOVE" }).toEqual(moved);
    expect(zoomedOut?.center).toEqual(moved?.center);
    expect(zoomedOut?.zoom).toBe(moved?.zoom);
  });

  it("언급 지역 신호가 없으면 이동하지 않는다 (L8)", () => {
    expect(
      resolveAutoMove({ mentionedArea: null, alreadyMoved: false }),
    ).toBeNull();
  });

  it("이미 자동 이동한 사이클이면 신호가 또 와도 이동하지 않는다 — 무한 루프 차단 (L9)", () => {
    expect(
      resolveAutoMove({ mentionedArea: area("MOVE"), alreadyMoved: true }),
    ).toBeNull();
  });
});

describe("토스트 문구 파생 (L10)", () => {
  it("제목은 지역명에 조사를 붙이고, 본문은 1km 기준을 알린다 — '2km'는 쓰지 않는다 (L10)", () => {
    expect(movedToastTitle("부산 서면")).toBe("부산 서면으로 이동했어요");
    expect(MOVED_TOAST_DESCRIPTION).toBe(
      "지도 범위 약 1km 기준으로 동선을 짜요",
    );
    expect(MOVED_TOAST_DESCRIPTION).not.toContain("2km");
  });

  it("받침 없는 지역명은 '로', ㄹ 받침도 '로'를 쓴다 (L10, 조사)", () => {
    expect(movedToastTitle("해운대")).toBe("해운대로 이동했어요");
    expect(movedToastTitle("물만골")).toBe("물만골로 이동했어요");
  });
});

import { describe, expect, it } from "vitest";
import { MAP_SCALE_1KM_ZOOM } from "../../map-home/model/map-scale";
import {
  MOVED_TOAST_DESCRIPTION,
  movedToastTitle,
  resolveAutoMove,
} from "./route-mentioned-area";

/**
 * L3: 언급 지역 자동 이동 판정 + 토스트 문구가 웹
 * `features/ai-route/model/route-mentioned-area.ts`와 동치다 (MSG-559).
 * 웹 원본은 `@/features/map-home/model/map-scale`·`@/shared/format`을 별칭으로 import하므로
 * 모바일 vitest.config의 "@" → 웹 src 별칭(parity 전용)이 전제다 (format.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-mentioned-area.ts",
  import.meta.url,
).pathname;

interface MentionedArea {
  name: string;
  centerLat: number;
  centerLng: number;
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  kind: string;
}

interface WebMentionedArea {
  resolveAutoMove: (input: {
    mentionedArea: MentionedArea | null;
    alreadyMoved: boolean;
  }) => unknown;
  MOVED_TOAST_DESCRIPTION: string;
  movedToastTitle: (areaName: string) => string;
}

const loadWeb = (): Promise<WebMentionedArea> => import(WEB_PATH);

const area = (kind: string): MentionedArea => ({
  name: "부산 서면",
  centerLat: 35.1579,
  centerLng: 129.0594,
  minLat: 35.1521,
  minLng: 129.0537,
  maxLat: 35.1662,
  maxLng: 129.0712,
  kind,
});

describe("route-mentioned-area 동등성 (L3)", () => {
  it("MOVE는 {center, zoom: 1km 단, areaName, kind}를 내고 웹과 같다", async () => {
    const web = await loadWeb();
    const input = { mentionedArea: area("MOVE"), alreadyMoved: false };

    expect(resolveAutoMove(input)).toEqual(web.resolveAutoMove(input));
    expect(resolveAutoMove(input)).toEqual({
      center: { lat: 35.1579, lng: 129.0594 },
      zoom: MAP_SCALE_1KM_ZOOM,
      areaName: "부산 서면",
      kind: "MOVE",
    });
  });

  it("ZOOM_OUT이 MOVE와 동치다 — kind는 기록만 하고 분기하지 않는다", () => {
    const move = resolveAutoMove({
      mentionedArea: area("MOVE"),
      alreadyMoved: false,
    });
    const zoomOut = resolveAutoMove({
      mentionedArea: area("ZOOM_OUT"),
      alreadyMoved: false,
    });

    expect({ ...zoomOut, kind: "MOVE" }).toEqual(move);
  });

  it("mentionedArea null이거나 이미 이동한 사이클이면 null이다 (무한 루프 차단)", async () => {
    const web = await loadWeb();
    const cases = [
      { mentionedArea: null, alreadyMoved: false },
      { mentionedArea: null, alreadyMoved: true },
      { mentionedArea: area("MOVE"), alreadyMoved: true },
    ];

    for (const input of cases) {
      expect(resolveAutoMove(input)).toEqual(web.resolveAutoMove(input));
      expect(resolveAutoMove(input)).toBeNull();
    }
  });

  it("토스트 문구가 웹과 같다 — 받침 판정 '(으)로' + 본문은 1km 기준", async () => {
    const web = await loadWeb();

    for (const name of ["부산 서면", "강남", "서울", "해운대", "을지로"]) {
      expect(movedToastTitle(name)).toBe(web.movedToastTitle(name));
    }
    expect(movedToastTitle("부산 서면")).toBe("부산 서면으로 이동했어요");
    expect(movedToastTitle("강남")).toBe("강남으로 이동했어요");
    expect(MOVED_TOAST_DESCRIPTION).toBe(web.MOVED_TOAST_DESCRIPTION);
    expect(MOVED_TOAST_DESCRIPTION).toContain("1km");
    expect(MOVED_TOAST_DESCRIPTION).not.toContain("2km");
  });
});

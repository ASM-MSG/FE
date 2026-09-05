import { describe, expect, it } from "vitest";
import { kindTag, partialBannerText, stopMetaLine } from "./route-point-view";

/**
 * L1~L3: 추천 지점 표시 텍스트 파생이 웹 `route-point-view.ts`와 전건 동치다 (MSG-556).
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-point-view.ts",
  import.meta.url,
).pathname;

interface WebRoutePointView {
  kindTag: (kind: string) => { label: string; tone: string } | null;
  stopMetaLine: (point: {
    zoneName: string | null;
    zoneCell: string | null;
    regionName: string | null;
  }) => string | null;
  partialBannerText: (notice: string | null, count: number) => string | null;
}

const loadWeb = (): Promise<WebRoutePointView> => import(WEB_PATH);

const KINDS = [
  "PLACE",
  "EVENT",
  "MISSION_FESTIVAL",
  "MISSION_POPUP",
  "MISSION_COURSE",
  "SOMETHING_NEW",
  "",
];

const META_SAMPLES = [
  { zoneName: "서면", zoneCell: "A-14", regionName: "부산 부산진구" },
  { zoneName: null, zoneCell: null, regionName: "부산 부산진구" },
  { zoneName: "서면", zoneCell: "A-14", regionName: null },
  { zoneName: "서면", zoneCell: null, regionName: null },
  { zoneName: null, zoneCell: null, regionName: null },
  { zoneName: "", zoneCell: "", regionName: "" },
];

describe("route-point-view 동등성 (L1~L3)", () => {
  it("kindTag가 kind 5종 + 미지 문자열에서 웹과 같은 라벨·톤을 낸다 — PLACE→장소/place, EVENT→행사/festival, MISSION_FESTIVAL→축제/festival, MISSION_POPUP→팝업/popup, MISSION_COURSE→코스/route, 미지→null (L1)", async () => {
    const web = await loadWeb();

    for (const kind of KINDS) {
      expect(kindTag(kind)).toEqual(web.kindTag(kind));
    }
    expect(kindTag("PLACE")).toEqual({ label: "장소", tone: "place" });
    expect(kindTag("EVENT")).toEqual({ label: "행사", tone: "festival" });
    expect(kindTag("MISSION_FESTIVAL")).toEqual({
      label: "축제",
      tone: "festival",
    });
    expect(kindTag("MISSION_POPUP")).toEqual({ label: "팝업", tone: "popup" });
    expect(kindTag("MISSION_COURSE")).toEqual({ label: "코스", tone: "route" });
    expect(kindTag("SOMETHING_NEW")).toBeNull();
  });

  it("stopMetaLine이 `[zoneName zoneCell] · [regionName]` non-null join이고 둘 다 없으면 null — 표본 전건 웹 동치 (L2)", async () => {
    const web = await loadWeb();

    for (const meta of META_SAMPLES) {
      expect(stopMetaLine(meta)).toBe(web.stopMetaLine(meta));
    }
    expect(stopMetaLine(META_SAMPLES[0])).toBe("서면 A-14 · 부산 부산진구");
    expect(stopMetaLine(META_SAMPLES[4])).toBeNull();
  });

  it("partialBannerText(null, n)은 null, non-null이면 개수가 든 FE 고정 문구(서버 문자열 미포함) — 웹 동치 (L3)", async () => {
    const web = await loadWeb();

    for (const notice of [null, "서버가 준 안내 문구", ""]) {
      for (const count of [0, 1, 2, 3, 8]) {
        expect(partialBannerText(notice, count)).toBe(
          web.partialBannerText(notice, count),
        );
      }
    }
    expect(partialBannerText(null, 3)).toBeNull();
    const text = partialBannerText("서버가 준 안내 문구", 2);
    expect(text).toBe(
      "조건에 맞는 곳을 2곳만 찾았어요. 문장을 바꾸거나 다른 지역에서 다시 짜 보세요",
    );
    expect(text).not.toContain("서버가 준 안내 문구");
  });
});

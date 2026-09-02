import { describe, expect, it } from "vitest";
import {
  eventLocationTypeLabel,
  type EventLocationType,
} from "./event-location";

/** AC 6: 위치 유형 라벨 5종이 웹 원본과 동등하다 (팝업·체험존·퍼레이드·포토존·기타). */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-location.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{
  eventLocationTypeLabel: typeof eventLocationTypeLabel;
}> => import(WEB_PATH);

const TYPES: EventLocationType[] = [
  "POPUP",
  "EXPERIENCE_ZONE",
  "PARADE",
  "PHOTO_ZONE",
  "ETC",
];

describe("eventLocationTypeLabel 웹 원본 동등성 (AC 6)", () => {
  it("유형 5종 전건에서 웹과 같은 한글 라벨을 낸다", async () => {
    const web = await loadWeb();

    for (const type of TYPES) {
      expect(eventLocationTypeLabel(type)).toBe(
        web.eventLocationTypeLabel(type),
      );
    }
    expect(TYPES.map(eventLocationTypeLabel)).toEqual([
      "팝업",
      "체험존",
      "퍼레이드",
      "포토존",
      "기타",
    ]);
  });
});

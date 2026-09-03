import { describe, expect, it } from "vitest";
import {
  eventUploadLabel,
  isEventUploadTarget,
  type EventUploadTarget,
} from "./event-upload-target";

/**
 * AC 9 (D11·D12): 행사 모드 위치 라벨이 웹 원본과 동등하고(`{행사명} · {위치명}`),
 * 저장값 형상 검증이 4필드 온전한 대상만 통과시킨다(구버전 저장값은 필드 부재 → null 정규화).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/upload/model/wizard-mode.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ eventUploadLabel: typeof eventUploadLabel }> =>
  import(WEB_PATH);

const TARGET: EventUploadTarget = {
  occurrenceId: 5,
  locationId: 11,
  occurrenceTitle: "서면 목데이터 축제",
  locationName: "서면 목데이터 포토존",
};

describe("eventUploadLabel 웹 원본 동등성 (AC 9)", () => {
  it("`{행사명} · {위치명}`을 웹과 같게 낸다", async () => {
    const web = await loadWeb();
    const cases: [string, string][] = [
      ["서면 목데이터 축제", "서면 목데이터 포토존"],
      ["포켓몬 메가페스타 부산", "광안리"],
    ];

    for (const [title, name] of cases) {
      expect(eventUploadLabel(title, name)).toBe(
        web.eventUploadLabel(title, name),
      );
    }
    expect(eventUploadLabel(...cases[0])).toBe(
      "서면 목데이터 축제 · 서면 목데이터 포토존",
    );
  });
});

describe("isEventUploadTarget — 저장값 형상 검증 (AC 9)", () => {
  it("4필드가 온전한 대상만 통과시킨다", () => {
    expect(isEventUploadTarget(TARGET)).toBe(true);
  });

  it("필드가 빠지거나 타입이 어긋나면 거부한다", () => {
    expect(isEventUploadTarget({ ...TARGET, occurrenceId: "5" })).toBe(false);
    expect(isEventUploadTarget({ ...TARGET, locationName: undefined })).toBe(
      false,
    );
    expect(isEventUploadTarget(null)).toBe(false);
    expect(isEventUploadTarget(undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { eventStatusBadge, isArchivedEventStatus } from "./event-status";

/**
 * AC 5 (D7): 상태 표기 — `UPCOMING`→`D-n`(당일·경과 `D-0`), `LIVE`→null,
 * `UPLOAD_GRACE`·`ARCHIVED`→`지난 행사 기록`. `isArchivedEventStatus`는 웹
 * event-room-mode 원본과 동등.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-room-mode.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{
  isArchivedEventStatus: typeof isArchivedEventStatus;
}> => import(WEB_PATH);

const STARTS_AT = "2026-09-05T14:00:00";
const TODAY = "2026-09-02";

describe("eventStatusBadge — 상태 표기 4분기 (AC 5·D7)", () => {
  it("UPCOMING이면 KST 날짜 산술 D-n 배지다", () => {
    expect(eventStatusBadge("UPCOMING", STARTS_AT, TODAY)).toEqual({
      kind: "upcoming",
      label: "D-3",
    });
  });

  it("UPCOMING인데 당일·경과면 D-0으로 통일한다", () => {
    expect(eventStatusBadge("UPCOMING", STARTS_AT, "2026-09-05")?.label).toBe(
      "D-0",
    );
    expect(eventStatusBadge("UPCOMING", STARTS_AT, "2026-09-09")?.label).toBe(
      "D-0",
    );
  });

  it("LIVE면 표기가 없다(null)", () => {
    expect(eventStatusBadge("LIVE", STARTS_AT, TODAY)).toBeNull();
  });

  it("UPLOAD_GRACE·ARCHIVED면 `지난 행사 기록` 배지다", () => {
    const archived = { kind: "archived", label: "지난 행사 기록" };

    expect(eventStatusBadge("UPLOAD_GRACE", STARTS_AT, TODAY)).toEqual(
      archived,
    );
    expect(eventStatusBadge("ARCHIVED", STARTS_AT, TODAY)).toEqual(archived);
  });
});

describe("isArchivedEventStatus 웹 원본 동등성 (AC 5)", () => {
  it("4상태 전건에서 웹과 같은 판정을 낸다", async () => {
    const web = await loadWeb();

    for (const status of [
      "UPCOMING",
      "LIVE",
      "UPLOAD_GRACE",
      "ARCHIVED",
    ] as const) {
      expect(isArchivedEventStatus(status)).toBe(
        web.isArchivedEventStatus(status),
      );
    }
    expect(isArchivedEventStatus("LIVE")).toBe(false);
    expect(isArchivedEventStatus("ARCHIVED")).toBe(true);
  });
});

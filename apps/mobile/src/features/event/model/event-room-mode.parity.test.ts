import { describe, expect, it } from "vitest";
import type { EventOccurrenceDetailStatus } from "../../../entities/event/model/event";
import { eventRoomMode, type EventRoomMode } from "./event-room-mode";

/**
 * AC 3·7 (D7): 행사방 본문 모드 판정이 웹 원본과 동등하다 — 위치 선택이 status보다 먼저이고
 * (종료 행사도 위치를 고르면 videos/empty), 미선택이면 종료 여부가 archive/overview를 가른다.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-room-mode.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ eventRoomMode: typeof eventRoomMode }> =>
  import(WEB_PATH);

const STATUSES: EventOccurrenceDetailStatus[] = [
  "UPCOMING",
  "LIVE",
  "UPLOAD_GRACE",
  "ARCHIVED",
];

/** 상태 4값 × 위치 선택 유무 × 영상 유무 = 16건 전수 */
const MATRIX = STATUSES.flatMap((status) =>
  [null, 11].flatMap((selectedLocationId) =>
    [true, false].map((hasLocationVideos) => ({
      status,
      selectedLocationId,
      hasLocationVideos,
    })),
  ),
);

describe("eventRoomMode 웹 원본 동등성 (AC 3·7)", () => {
  it("상태 × 위치 선택 × 영상 유무 16건 전부에서 웹과 같은 모드를 낸다", async () => {
    const web = await loadWeb();

    for (const input of MATRIX) {
      expect(eventRoomMode(input)).toBe(web.eventRoomMode(input));
    }
  });

  it("위치를 고르면 영상 유무가 videos/empty를 가른다 — 종료 행사도 같다 (AC 7)", () => {
    const expected: [EventOccurrenceDetailStatus, boolean, EventRoomMode][] = [
      ["LIVE", true, "videos"],
      ["LIVE", false, "empty"],
      ["UPLOAD_GRACE", true, "videos"],
      ["ARCHIVED", false, "empty"],
    ];

    for (const [status, hasLocationVideos, mode] of expected) {
      expect(
        eventRoomMode({
          status,
          selectedLocationId: 11,
          hasLocationVideos,
        }),
      ).toBe(mode);
    }
  });

  it("위치 미선택은 종료면 archive, 아니면 overview다", () => {
    expect(eventRoomMode({ status: "LIVE", selectedLocationId: null })).toBe(
      "overview",
    );
    expect(
      eventRoomMode({ status: "UPCOMING", selectedLocationId: null }),
    ).toBe("overview");
    expect(
      eventRoomMode({ status: "UPLOAD_GRACE", selectedLocationId: null }),
    ).toBe("archive");
    expect(
      eventRoomMode({ status: "ARCHIVED", selectedLocationId: null }),
    ).toBe("archive");
  });
});

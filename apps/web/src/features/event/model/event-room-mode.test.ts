import { describe, expect, it } from "vitest";
import { eventRoomMode } from "./event-room-mode";

describe("eventRoomMode — 행사방 본문 모드 판정 (AC 11)", () => {
  it("현재 티켓 입력(칩 status 2값·위치 미선택)으로는 항상 overview다 (AC 11)", () => {
    expect(eventRoomMode({ status: "UPCOMING" })).toBe("overview");
    expect(eventRoomMode({ status: "LIVE" })).toBe("overview");
  });

  it("종료 회차(ARCHIVED)는 archive다 — MSG-519 입력 슬롯", () => {
    expect(eventRoomMode({ status: "ARCHIVED" })).toBe("archive");
  });

  it("업로드 유예(UPLOAD_GRACE)에서 archive를 반환한다 — 위치 선택이 남아 있어도 (MSG-519 AC 1)", () => {
    expect(eventRoomMode({ status: "UPLOAD_GRACE" })).toBe("archive");
    expect(
      eventRoomMode({
        status: "UPLOAD_GRACE",
        selectedLocationId: 4,
        hasLocationVideos: true,
      }),
    ).toBe("archive");
  });

  it("위치를 고르면 영상 유무로 videos/empty가 갈린다 — MSG-518 입력 슬롯", () => {
    expect(
      eventRoomMode({
        status: "LIVE",
        selectedLocationId: 4,
        hasLocationVideos: true,
      }),
    ).toBe("videos");
    expect(
      eventRoomMode({
        status: "LIVE",
        selectedLocationId: 4,
        hasLocationVideos: false,
      }),
    ).toBe("empty");
  });

  it("아카이브 판정이 위치 선택보다 앞선다 (경계 — 종료 행사에서 위치가 남아 있어도 아카이브)", () => {
    expect(
      eventRoomMode({
        status: "ARCHIVED",
        selectedLocationId: 4,
        hasLocationVideos: true,
      }),
    ).toBe("archive");
  });
});

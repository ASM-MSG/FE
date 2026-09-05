import { describe, expect, it } from "vitest";
import { eventRoomMode, isArchivedEventStatus } from "./event-room-mode";

describe("eventRoomMode — 행사방 본문 모드 판정 (AC 11)", () => {
  it("현재 티켓 입력(칩 status 2값·위치 미선택)으로는 항상 overview다 (AC 11)", () => {
    expect(eventRoomMode({ status: "UPCOMING" })).toBe("overview");
    expect(eventRoomMode({ status: "LIVE" })).toBe("overview");
  });

  it("종료 회차(ARCHIVED)는 archive다 — MSG-519 입력 슬롯", () => {
    expect(eventRoomMode({ status: "ARCHIVED" })).toBe("archive");
  });

  it("업로드 유예(UPLOAD_GRACE)에서 위치 미선택이면 archive다 — 방 open은 위치 리셋이라 첫 화면은 항상 개요 (MSG-519 AC 1 재해석)", () => {
    expect(eventRoomMode({ status: "UPLOAD_GRACE" })).toBe("archive");
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

  it("종료 회차(UPLOAD_GRACE)에서도 위치를 고르면 영상 유무로 videos/empty가 갈린다 — 읽기 전용 표현은 소비처 몫 (MSG-535 AC 1)", () => {
    expect(
      eventRoomMode({
        status: "UPLOAD_GRACE",
        selectedLocationId: 4,
        hasLocationVideos: true,
      }),
    ).toBe("videos");
    expect(
      eventRoomMode({
        status: "UPLOAD_GRACE",
        selectedLocationId: 4,
        hasLocationVideos: false,
      }),
    ).toBe("empty");
  });

  it("1개월 지난 ARCHIVED도 위치 선택 시 같은 판정을 탄다 (MSG-535 AC 1, 경계)", () => {
    expect(
      eventRoomMode({
        status: "ARCHIVED",
        selectedLocationId: 4,
        hasLocationVideos: true,
      }),
    ).toBe("videos");
  });
});

describe("isArchivedEventStatus — 종료 행사 판정 단일 정본 (MSG-535 readOnly·헤더 공용)", () => {
  it("UPLOAD_GRACE·ARCHIVED만 종료다 — 활성(UPCOMING·LIVE)은 아니다", () => {
    expect(isArchivedEventStatus("UPLOAD_GRACE")).toBe(true);
    expect(isArchivedEventStatus("ARCHIVED")).toBe(true);
    expect(isArchivedEventStatus("UPCOMING")).toBe(false);
    expect(isArchivedEventStatus("LIVE")).toBe(false);
  });
});

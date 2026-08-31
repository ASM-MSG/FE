import { beforeEach, describe, expect, it } from "vitest";
import { useEventRoomStore } from "./event-room-store";

describe("useEventRoomStore — 열린 행사방 선택 (AC 9·10)", () => {
  beforeEach(() => {
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
  });

  it("세그먼트 선택을 열면 그 회차가 방이 된다 (AC 9)", () => {
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });

    expect(useEventRoomStore.getState().room).toEqual({
      occurrenceId: 7,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });
  });

  it("닫으면 방이 비고 세그먼트 활성의 근거가 사라진다 (AC 10)", () => {
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });

    useEventRoomStore.getState().close();

    expect(useEventRoomStore.getState().room).toBeNull();
  });
});

describe("useEventRoomStore — 격자 클릭 위치 강조 (MSG-517 AC 7)", () => {
  const ROOM = {
    occurrenceId: 7,
    title: "부산 불꽃축제",
    status: "UPCOMING",
  } as const;

  beforeEach(() => {
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
  });

  it("행사 위치 격자를 클릭하면 그 위치가 강조된다 (AC 7)", () => {
    useEventRoomStore.getState().open(ROOM);

    useEventRoomStore.getState().highlightLocation(12);

    expect(useEventRoomStore.getState().highlightedLocationId).toBe(12);
  });

  it("행사방을 닫으면 강조가 함께 리셋된다 (AC 6 — 닫으면 전부 걷힘)", () => {
    useEventRoomStore.getState().open(ROOM);
    useEventRoomStore.getState().highlightLocation(12);

    useEventRoomStore.getState().close();

    expect(useEventRoomStore.getState().highlightedLocationId).toBeNull();
  });

  it("다른 행사방으로 전환하면 이전 방의 강조가 남지 않는다 (방 전환 리셋)", () => {
    useEventRoomStore.getState().open(ROOM);
    useEventRoomStore.getState().highlightLocation(12);

    useEventRoomStore.getState().open({ ...ROOM, occurrenceId: 8 });

    expect(useEventRoomStore.getState().highlightedLocationId).toBeNull();
  });
});

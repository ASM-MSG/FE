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

import { beforeEach, describe, expect, it } from "vitest";
import { useEventCapsuleStore } from "./event-capsule-store";
import { useEventRoomStore } from "./event-room-store";

describe("useEventCapsuleStore — 캡슐 펼침/접힘 (AC 5·10)", () => {
  beforeEach(() => {
    useEventCapsuleStore.setState(useEventCapsuleStore.getInitialState(), true);
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
  });

  it("기본은 접힘이고 펼치면 expanded가 된다 (AC 3·5)", () => {
    expect(useEventCapsuleStore.getState().expanded).toBe(false);

    useEventCapsuleStore.getState().expand();

    expect(useEventCapsuleStore.getState().expanded).toBe(true);
  });

  it("collapseOnly는 캡슐만 접고 열려 있는 행사방은 유지한다 — 시 경계 전환 등 비명시 문맥 리셋용 (PR 리뷰 반영)", () => {
    useEventCapsuleStore.getState().expand();
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });

    useEventCapsuleStore.getState().collapseOnly();

    expect(useEventCapsuleStore.getState().expanded).toBe(false);
    expect(useEventRoomStore.getState().room).not.toBeNull();
  });

  it("접으면(✕) 열려 있던 행사방도 함께 닫힌다 (AC 10)", () => {
    useEventCapsuleStore.getState().expand();
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });

    useEventCapsuleStore.getState().collapse();

    expect(useEventCapsuleStore.getState().expanded).toBe(false);
    expect(useEventRoomStore.getState().room).toBeNull();
  });
});

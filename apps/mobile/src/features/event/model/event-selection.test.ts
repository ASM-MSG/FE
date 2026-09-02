import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateEvent,
  deactivateEvent,
  eventBack,
  eventSheetStage,
  getEventSelection,
  openEventRoom,
  stepBackEvent,
  subscribeEventSelection,
  withEventRoom,
  type EventRoomSelection,
} from "./event-selection";

/**
 * AC 8 (D14·D15·D16·D17): 이벤트 모드 전이 — 순수 리듀서 `eventBack` 3단 + 시트 단계 +
 * 같은 행사 재open 무변화 + 탭 왕복(재마운트)을 가로지르는 모듈 상태.
 */
const ROOM: EventRoomSelection = {
  occurrenceId: 5,
  title: "서면 목데이터 축제",
  status: "LIVE",
};
const OTHER: EventRoomSelection = {
  occurrenceId: 3,
  title: "서울세계불꽃축제",
  status: "UPCOMING",
};

describe("eventBack — 개요 → 목록 → 해제 → 최상위 (AC 8·D14)", () => {
  it("개요(방 열림)에서는 방만 닫고 이벤트 모드를 유지한다", () => {
    expect(eventBack({ active: true, room: ROOM })).toEqual({
      active: true,
      room: null,
    });
  });

  it("목록(방 없음)에서는 이벤트 모드를 해제한다", () => {
    expect(eventBack({ active: true, room: null })).toEqual({
      active: false,
      room: null,
    });
  });

  it("이벤트 모드가 아니면 null — 화면이 자기 규칙으로 넘어간다", () => {
    expect(eventBack({ active: false, room: null })).toBeNull();
  });
});

describe("eventSheetStage — 목록 2단계 · 개요 1단계 (D15)", () => {
  it("방이 열려 있으면 1단계, 아니면 2단계다", () => {
    expect(eventSheetStage({ active: true, room: ROOM })).toBe(1);
    expect(eventSheetStage({ active: true, room: null })).toBe(2);
  });
});

describe("withEventRoom — 같은 행사 재탭 무변화, 다른 행사 교체 (D16)", () => {
  it("같은 occurrenceId면 상태 객체가 그대로다", () => {
    const state = { active: true, room: ROOM };

    expect(withEventRoom(state, { ...ROOM })).toBe(state);
  });

  it("다른 행사면 방을 교체하고 이벤트 모드를 켠다", () => {
    expect(withEventRoom({ active: true, room: ROOM }, OTHER)).toEqual({
      active: true,
      room: OTHER,
    });
  });
});

describe("이벤트 선택 모듈 상태 (D17)", () => {
  beforeEach(() => {
    deactivateEvent();
  });

  it("칩 활성 → 카드 선택 후 재마운트(구독 해제→재구독)를 가로질러 상태가 유지된다", () => {
    const unsubscribe = subscribeEventSelection(vi.fn());
    activateEvent();
    openEventRoom(ROOM);
    unsubscribe();

    const cleanup = subscribeEventSelection(vi.fn());
    expect(getEventSelection()).toEqual({ active: true, room: ROOM });
    cleanup();
  });

  it("stepBackEvent는 소비했으면 true, 이벤트 모드가 아니면 false를 돌려준다 (AC 8)", () => {
    activateEvent();
    openEventRoom(ROOM);

    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection()).toEqual({ active: true, room: null });
    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection()).toEqual({ active: false, room: null });
    expect(stepBackEvent()).toBe(false);
  });

  it("deactivateEvent(✕)는 방과 모드를 함께 비우고 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEventSelection(listener);
    activateEvent();
    openEventRoom(ROOM);

    deactivateEvent();

    expect(getEventSelection()).toEqual({ active: false, room: null });
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});

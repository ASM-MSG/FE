import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventLocationSelection } from "./event-location";
import {
  activateEvent,
  deactivateEvent,
  eventBack,
  eventSheetStage,
  getEventSelection,
  openEventRoom,
  selectEventLocation,
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
/** MSG-560 — 위치 선택 스냅숏 (실데이터 loc 11) */
const LOCATION: EventLocationSelection = {
  locationId: 11,
  name: "서면 목데이터 포토존",
  type: "PHOTO_ZONE",
  operatingHours: null,
  gridCount: 9,
  videoCount: 1,
};

describe("eventBack — 개요 → 목록 → 해제 → 최상위 (AC 8·D14)", () => {
  it("개요(방 열림)에서는 방만 닫고 이벤트 모드를 유지한다", () => {
    expect(eventBack({ active: true, room: ROOM, location: null })).toEqual({
      active: true,
      room: null,
      location: null,
    });
  });

  it("목록(방 없음)에서는 이벤트 모드를 해제한다", () => {
    expect(eventBack({ active: true, room: null, location: null })).toEqual({
      active: false,
      room: null,
      location: null,
    });
  });

  it("이벤트 모드가 아니면 null — 화면이 자기 규칙으로 넘어간다", () => {
    expect(eventBack({ active: false, room: null, location: null })).toBeNull();
  });
});

describe("eventSheetStage — 목록 2단계 · 개요 1단계 (D15)", () => {
  it("방이 열려 있으면 1단계, 아니면 2단계다", () => {
    expect(eventSheetStage({ active: true, room: ROOM, location: null })).toBe(
      1,
    );
    expect(
      eventSheetStage({ active: true, room: ROOM, location: LOCATION }),
    ).toBe(1);
    expect(eventSheetStage({ active: true, room: null, location: null })).toBe(
      2,
    );
  });
});

describe("withEventRoom — 같은 행사 재탭 무변화, 다른 행사 교체 (D16)", () => {
  it("같은 occurrenceId면 상태 객체가 그대로다", () => {
    const state = { active: true, room: ROOM, location: LOCATION };

    expect(withEventRoom(state, { ...ROOM })).toBe(state);
  });

  it("다른 행사면 방을 교체하고 이벤트 모드를 켠다", () => {
    expect(
      withEventRoom({ active: true, room: ROOM, location: LOCATION }, OTHER),
    ).toEqual({
      active: true,
      room: OTHER,
      location: null,
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
    expect(getEventSelection()).toEqual({
      active: true,
      room: ROOM,
      location: null,
    });
    cleanup();
  });

  it("stepBackEvent는 소비했으면 true, 이벤트 모드가 아니면 false를 돌려준다 (AC 8)", () => {
    activateEvent();
    openEventRoom(ROOM);

    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection()).toEqual({
      active: true,
      room: null,
      location: null,
    });
    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection()).toEqual({
      active: false,
      room: null,
      location: null,
    });
    expect(stepBackEvent()).toBe(false);
  });

  it("deactivateEvent(✕)는 방과 모드를 함께 비우고 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEventSelection(listener);
    activateEvent();
    openEventRoom(ROOM);

    deactivateEvent();

    expect(getEventSelection()).toEqual({
      active: false,
      room: null,
      location: null,
    });
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});

/**
 * AC 4 (MSG-560 D1·D15): `location` 슬롯이 붙어 뒤로가기가 4단(위치 → 개요 → 목록 → 해제)이
 * 되고, 같은 행사 재open은 위치를 유지하며 다른 행사·해제는 리셋한다.
 */
describe("eventBack — 위치 → 개요 → 목록 → 해제 4단 (AC 4·D1)", () => {
  it("위치 상세에서는 위치만 닫고 개요로 돌아간다", () => {
    expect(eventBack({ active: true, room: ROOM, location: LOCATION })).toEqual(
      { active: true, room: ROOM, location: null },
    );
  });
});

describe("위치 선택 모듈 상태 (AC 4·D1·D15)", () => {
  beforeEach(() => {
    deactivateEvent();
  });

  it("selectEventLocation이 위치 스냅숏을 세우고 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEventSelection(listener);
    activateEvent();
    openEventRoom(ROOM);
    listener.mockClear();

    selectEventLocation(LOCATION);

    expect(getEventSelection().location).toEqual(LOCATION);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("같은 행사 재open은 위치 선택을 유지한다 (웹 store sameRoom)", () => {
    activateEvent();
    openEventRoom(ROOM);
    selectEventLocation(LOCATION);

    openEventRoom({ ...ROOM });

    expect(getEventSelection().location).toEqual(LOCATION);
  });

  it("다른 행사 open은 위치를 리셋한다 — 아카이브 첫 화면이 개요다", () => {
    activateEvent();
    openEventRoom(ROOM);
    selectEventLocation(LOCATION);

    openEventRoom(OTHER);

    expect(getEventSelection().location).toBeNull();
  });

  it("✕(deactivate)는 위치까지 전부 비운다 — 지도 강조·라벨이 함께 걷힌다", () => {
    activateEvent();
    openEventRoom(ROOM);
    selectEventLocation(LOCATION);

    deactivateEvent();

    expect(getEventSelection()).toEqual({
      active: false,
      room: null,
      location: null,
    });
  });

  it("하드웨어 백 4단 — 위치 → 개요 → 목록 → 해제 후 false (AC 4)", () => {
    activateEvent();
    openEventRoom(ROOM);
    selectEventLocation(LOCATION);

    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection().location).toBeNull();
    expect(getEventSelection().room).toEqual(ROOM);
    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection().room).toBeNull();
    expect(stepBackEvent()).toBe(true);
    expect(getEventSelection().active).toBe(false);
    expect(stepBackEvent()).toBe(false);
  });
});

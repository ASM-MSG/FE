import { beforeEach, describe, expect, it } from "vitest";
import type { EventLocationSelection } from "./event-location";
import { useEventRoomStore } from "./event-room-store";

const LOCATION: EventLocationSelection = {
  locationId: 4,
  name: "광안리 피카츄 퍼레이드",
  type: "PARADE",
  operatingHours: "19:00~20:00",
  gridCount: 4,
  videoCount: 34,
};

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

  it("방을 닫는 뒤로가기(back)도 강조를 함께 리셋한다 (AC 6 — MSG-518 back 합류)", () => {
    useEventRoomStore.getState().open(ROOM);
    useEventRoomStore.getState().highlightLocation(12);

    useEventRoomStore.getState().back();

    expect(useEventRoomStore.getState().room).toBeNull();
    expect(useEventRoomStore.getState().highlightedLocationId).toBeNull();
  });
});

describe("useEventRoomStore — 선택 위치 상태 (MSG-518 AC 1)", () => {
  beforeEach(() => {
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "포켓몬 메가페스타 부산",
      status: "LIVE",
    });
  });

  it("selectLocation이 선택 시점 위치 스냅숏을 채운다 (AC 1)", () => {
    useEventRoomStore.getState().selectLocation(LOCATION);

    expect(useEventRoomStore.getState().location).toEqual(LOCATION);
  });

  it("clearLocation은 위치만 비우고 행사방은 유지한다 (AC 1)", () => {
    useEventRoomStore.getState().selectLocation(LOCATION);

    useEventRoomStore.getState().clearLocation();

    expect(useEventRoomStore.getState().location).toBeNull();
    expect(useEventRoomStore.getState().room?.occurrenceId).toBe(7);
  });

  it("close()가 위치도 함께 리셋한다 — 유령 위치 방지 (AC 1)", () => {
    useEventRoomStore.getState().selectLocation(LOCATION);

    useEventRoomStore.getState().close();

    expect(useEventRoomStore.getState().location).toBeNull();
  });

  it("다른 행사 open()이 위치를 리셋한다 — 유령 위치 방지 (AC 1)", () => {
    useEventRoomStore.getState().selectLocation(LOCATION);

    useEventRoomStore.getState().open({
      occurrenceId: 8,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });

    expect(useEventRoomStore.getState().location).toBeNull();
  });

  it("같은 행사 재open은 보던 위치를 유지한다 (경계 — 활성 세그먼트 재클릭)", () => {
    useEventRoomStore.getState().selectLocation(LOCATION);

    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "포켓몬 메가페스타 부산",
      status: "LIVE",
    });

    expect(useEventRoomStore.getState().location).toEqual(LOCATION);
  });
});

describe("useEventRoomStore.back — 뒤로가기 2단 (MSG-518 AC 12)", () => {
  beforeEach(() => {
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "포켓몬 메가페스타 부산",
      status: "LIVE",
    });
  });

  it("위치 선택 중 뒤로가기는 위치만 해제하고 행사방(개요)으로 돌아간다 (AC 12)", () => {
    useEventRoomStore.getState().selectLocation(LOCATION);

    useEventRoomStore.getState().back();

    expect(useEventRoomStore.getState().location).toBeNull();
    expect(useEventRoomStore.getState().room?.occurrenceId).toBe(7);
  });

  it("위치 미선택 뒤로가기는 행사방을 닫는다 (AC 12)", () => {
    useEventRoomStore.getState().back();

    expect(useEventRoomStore.getState().room).toBeNull();
  });
});

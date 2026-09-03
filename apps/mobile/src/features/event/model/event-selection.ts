import { useSyncExternalStore } from "react";
import type { EventOccurrenceStatus } from "../../../entities/event/model/event";
import type { SheetStage } from "../../map-home/model/sheet-snap";
import type { EventLocationSelection } from "./event-location";

/**
 * 이벤트 모드 선택 상태 (MSG-557 D2·D14~D17) — 웹 `event-room-store.ts`의 open/close/back
 * 계약을 앱 관례(`theme-selection.ts` 모듈 싱글턴 + useSyncExternalStore, zustand 미도입)로
 * 이식했다. 탭 왕복으로 홈 스크린이 재마운트돼도 세션 동안 유지된다 (D17).
 *
 * 테마 칩과의 상호 배타(D5)는 뷰 레이어(`use-event-home` onActivate · 화면 handleToggleTheme)가
 * 배선한다 — 교차 feature 상태 의존을 피한다(웹 스토어와 같은 분리).
 * MSG-560: `location` 슬롯이 붙어 뒤로가기가 4단(위치 → 개요 → 목록 → 해제)이 됐다
 * (웹 store `:83-93`의 3단 + 위치). 앱은 웹의 `highlightedLocationId`(표시 전용) 슬롯을
 * 두지 않는다 — 지도 셀 탭이 곧 위치 상세 진입이라(D2) 강조 근원이 이 슬롯 하나다.
 *
 * 테스트 주의: 진짜 전역 싱글턴이므로 이 모듈을 (간접) import하는 테스트는 beforeEach에서
 * deactivateEvent()로 리셋해야 케이스 간 상태가 새지 않는다.
 */

/** 열린 행사방 — 카드에서 받은 최소 참조. 상세는 use-event-room-query가 조회한다 */
export interface EventRoomSelection {
  occurrenceId: number;
  title: string;
  status: EventOccurrenceStatus;
}

export interface EventSelectionState {
  /** 이벤트 칩 활성(목록·개요 시트) 여부 */
  active: boolean;
  /** 열린 행사방 — null이면 목록 */
  room: EventRoomSelection | null;
  /** 선택된 행사 위치 — null이면 개요. 지도 강조·라벨의 단일 근원 [MSG-560 D1·D3] */
  location: EventLocationSelection | null;
}

const INACTIVE: EventSelectionState = {
  active: false,
  room: null,
  location: null,
};

/**
 * 뒤로가기 한 단계 — 위치 → 개요 → 목록 → 해제 4단 [D14 · MSG-560 D1].
 * 이벤트 모드가 아니면 null(화면 규칙으로 넘긴다).
 */
export const eventBack = (
  state: EventSelectionState,
): EventSelectionState | null => {
  if (state.location !== null)
    return { active: true, room: state.room, location: null };
  if (state.room !== null) return { active: true, room: null, location: null };
  if (state.active) return INACTIVE;
  return null;
};

/** 시트 스냅 — 목록 2단계(절반), 개요·위치 상세 1단계(전체) [D15 · MSG-560 D1] */
export const eventSheetStage = (state: EventSelectionState): SheetStage =>
  state.room !== null ? 1 : 2;

/**
 * 카드 탭 — 같은 행사 재탭은 무변화(같은 참조라 위치 선택도 유지, 웹 store sameRoom),
 * 다른 행사는 교체하며 위치를 리셋한다 [D16 · MSG-560 D1].
 */
export const withEventRoom = (
  state: EventSelectionState,
  selection: EventRoomSelection,
): EventSelectionState =>
  state.room?.occurrenceId === selection.occurrenceId
    ? state
    : { active: true, room: selection, location: null };

let state: EventSelectionState = INACTIVE;
const listeners = new Set<() => void>();

const setState = (next: EventSelectionState): void => {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
};

export const getEventSelection = (): EventSelectionState => state;

/** 칩 탭(비활성 → 활성) — 목록 시트 */
export const activateEvent = (): void => {
  if (state.active) return; // 이미 활성이면 새 객체를 만들지 않아 리스너 통지 없음 (PR #123 리뷰)
  setState({ active: true, room: null, location: null });
};

/** ✕·칩 재탭·테마 칩 탭 — 이벤트 모드 종료 [D5·D14] */
export const deactivateEvent = (): void => setState(INACTIVE);

export const openEventRoom = (selection: EventRoomSelection): void =>
  setState(withEventRoom(state, selection));

/** 위치 행 탭·지도 셀 탭 — 위치 상세 시트로 [MSG-560 D1·D2] */
export const selectEventLocation = (location: EventLocationSelection): void =>
  setState({ ...state, location });

/** `‹`·하드웨어 백 — 소비했으면 true, 이벤트 모드가 아니면 false [D14] */
export const stepBackEvent = (): boolean => {
  const next = eventBack(state);
  if (next === null) return false;
  setState(next);
  return true;
};

/** 구독 등록 — 반환 함수로 해제 (useSyncExternalStore 계약) */
export const subscribeEventSelection = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useEventSelection = (): EventSelectionState =>
  useSyncExternalStore(subscribeEventSelection, getEventSelection);

/**
 * 선택 격자 id (서버 `gridId`) — feature 로컬 모듈 스코프 보관 (MSG-427,
 * `theme-selection.ts` 관례). 격자 상세는 **새 라우트가 아니라 시트 안에서** 열리므로
 * (C1) 선택 격자도 화면 재마운트를 넘어 유지돼야 한다.
 *
 * 테스트 주의: 전역 싱글턴이므로 이 모듈을 (간접) import하는 테스트는 beforeEach에서
 * setSelectedGridId(null)로 리셋한다.
 */
import { useSyncExternalStore } from "react";

let selectedGridId: string | null = null;
const listeners = new Set<() => void>();

export const getSelectedGridId = (): string | null => selectedGridId;

export const setSelectedGridId = (next: string | null): void => {
  selectedGridId = next;
  for (const listener of listeners) listener();
};

/** 구독 등록 — 반환 함수로 해제 (useSyncExternalStore 계약) */
export const subscribeSelectedGridId = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 홈 스크린용 구독 훅 */
export const useSelectedGridId = (): string | null =>
  useSyncExternalStore(subscribeSelectedGridId, getSelectedGridId);

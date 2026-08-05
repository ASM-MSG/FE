/**
 * 테마 선택 상태 — feature 로컬 모듈 스코프 보관 (MSG-298 AC 4, 확정 4 수정판).
 * 루트 Stack + router.navigate 구조에서 홈 스크린이 탭 왕복마다 재마운트되어
 * useState가 소실되므로(검증 리포트 실측), 상태를 모듈 스코프에 두고
 * useSyncExternalStore로 구독한다 — zustand 등 신규 의존성 금지(단순성 우선).
 * 세션 내 유지면 충분(앱 재시작 간 영속 요구 없음 — AsyncStorage 불사용).
 * X·< 전체 복귀(AC 2·3)는 setSelectedTheme(null)로 모듈 상태까지 리셋한다.
 *
 * 테스트 주의: 진짜 전역 싱글턴이므로 이 모듈을 (간접) import하는 테스트는
 * beforeEach에서 setSelectedTheme(null)로 리셋해야 케이스 간 상태가 새지 않는다.
 */
import { useSyncExternalStore } from "react";
import type { ThemeId } from "./themes";

let selectedTheme: ThemeId | null = null;
const listeners = new Set<() => void>();

export const getSelectedTheme = (): ThemeId | null => selectedTheme;

export const setSelectedTheme = (next: ThemeId | null): void => {
  selectedTheme = next;
  for (const listener of listeners) listener();
};

/** 구독 등록 — 반환 함수로 해제 (useSyncExternalStore 계약) */
export const subscribeSelectedTheme = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 홈 스크린용 구독 훅 — 재마운트를 가로질러 모듈 상태를 읽는다 (AC 4) */
export const useSelectedTheme = (): ThemeId | null =>
  useSyncExternalStore(subscribeSelectedTheme, getSelectedTheme);

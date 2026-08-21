/**
 * 선택 미션 id — feature 로컬 모듈 스코프 보관 (MSG-427, `theme-selection.ts` 관례).
 * 루트 Stack + router.navigate 구조에서 홈 스크린이 탭 왕복마다 재마운트되어 useState가
 * 소실되므로, 상태를 모듈 스코프에 두고 useSyncExternalStore로 구독한다 —
 * zustand 등 신규 의존성 금지(단순성 우선).
 *
 * 웹 `mission-selection-store`의 `hoveredMissionId`는 **RN에 hover가 없어 옮기지 않는다**
 * (스펙 R4) — 지도 강조·이름표는 선택된 미션에만 붙는다 (승인 Q4).
 *
 * 테스트 주의: 진짜 전역 싱글턴이므로 이 모듈을 (간접) import하는 테스트는 beforeEach에서
 * setSelectedMissionId(null)로 리셋해야 케이스 간 상태가 새지 않는다.
 */
import { useSyncExternalStore } from "react";

let selectedMissionId: number | null = null;
const listeners = new Set<() => void>();

export const getSelectedMissionId = (): number | null => selectedMissionId;

export const setSelectedMissionId = (next: number | null): void => {
  selectedMissionId = next;
  for (const listener of listeners) listener();
};

/** 구독 등록 — 반환 함수로 해제 (useSyncExternalStore 계약) */
export const subscribeSelectedMissionId = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 홈 스크린용 구독 훅 — 재마운트를 가로질러 모듈 상태를 읽는다 */
export const useSelectedMissionId = (): number | null =>
  useSyncExternalStore(subscribeSelectedMissionId, getSelectedMissionId);

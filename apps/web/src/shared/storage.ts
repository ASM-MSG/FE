import type { StateStorage } from "zustand/middleware";

/**
 * 웹 스토리지 어댑터 (MSG-46 후속 3 P1) — RN 경계 규칙의 지정 경유지.
 * model 레이어는 localStorage를 직접 참조하지 못하며(eslint no-restricted-globals),
 * 이 어댑터를 통해서만 영속화한다. RN 확장 시 이 파일만 AsyncStorage 구현으로 교체한다.
 * zustand persist의 createJSONStorage(() => webStorage)로 주입해 사용한다.
 */
export const webStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

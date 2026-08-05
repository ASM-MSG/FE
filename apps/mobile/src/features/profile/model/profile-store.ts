import { useSyncExternalStore } from "react";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";

/**
 * 프로필 편집 상태 스토어 (MSG-306, AC 12~14) — 프로필/설정 화면(카드 표시)과
 * 편집 화면(저장 반영)이 단일 인스턴스로 상태를 잇는다. search-store 선례
 * (모듈 스코프 팩토리 + useSyncExternalStore 구독 훅, zustand 미사용)를 따르며,
 * 라우터·플랫폼 API를 참조하지 않는다 (RN 경계 규칙 — 화면 이동은 화면이 콜백으로 수행).
 * 편집 드래프트는 화면 로컬 상태 — 스토어는 save로만 전이한다 (AC 14: 취소 시 불변).
 */

/** 편집 가능한 프로필 상태 — 나머지 필드(email·joinedAt 등)는 MOCK_PROFILE 고정값 */
export interface ProfileState {
  nickname: string;
  locationEnabled: boolean;
}

export interface ProfileStore {
  getState: () => ProfileState;
  subscribe: (listener: () => void) => () => void;
  /** [저장] 탭 — 닉네임·위치정보 값을 갱신하고 구독자에게 전파 (AC 12·13) */
  save: (next: ProfileState) => void;
}

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 아래 단일 인스턴스를 쓴다 */
export const createProfileStore = (
  seed: ProfileState = {
    nickname: MOCK_PROFILE.nickname,
    locationEnabled: MOCK_PROFILE.locationEnabled,
  },
): ProfileStore => {
  let state = { ...seed };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    save: (next) => {
      state = { ...next };
      listeners.forEach((listener) => listener());
    },
  };
};

/** 앱 전역 단일 인스턴스 — 화면 전환에도 유지되는 세션 상태 (비영속, API 연동 시 교체점) */
export const profileStore = createProfileStore();

/** 프로필 상태 구독 훅 — 프로필/설정 카드(AC 13)·편집 초기값(AC 11)이 사용한다 */
export const useProfile = (): ProfileState =>
  useSyncExternalStore(profileStore.subscribe, profileStore.getState);

import { create } from "zustand";

interface RecentRemovalState {
  /** X로 제거한 격자 id 목록 — 표시 목록 필터(excludeRemoved) 입력 */
  removedIds: string[];
  removeRecent: (id: string) => void;
}

/**
 * 최근 수집 목록 X 제거 상태 (AC 23, 개정 D4).
 * 비영속(메모리, A11) — 새로고침 시 목록이 복원된다. 제거는 서버 동기화 대상 상태로 보여
 * mock 단계에서 localStorage 영속을 도입하면 API 계약을 선점하게 된다(MOCK_RECENT_VISITS 선례).
 * 수집 취소가 아니다 — 통계·오버레이 파생(deriveDexView)은 이 스토어를 참조하지 않는다(AC 24).
 * 라우터를 참조하지 않는다(RN 경계).
 */
export const useRecentRemovalStore = create<RecentRemovalState>((set) => ({
  removedIds: [],
  removeRecent: (id) =>
    set((state) =>
      state.removedIds.includes(id)
        ? state
        : { removedIds: [...state.removedIds, id] },
    ),
}));

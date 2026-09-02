import { useSyncExternalStore } from "react";
import type { RoutePointDto } from "../../../shared/api/sdk";
import type { RouteErrorNotice } from "./route-error";

/**
 * AI 경로추천 세션 상태 (L9, MSG-556) — 웹 `ai-route-store.ts`(zustand)의 모바일판.
 * zustand 미도입이라 모듈 스코프 팩토리 + `useSyncExternalStore` 구독 훅이다(search-store 관례).
 * 스토어가 정본이라 탭을 나갔다 돌아와도(재마운트) 입력·결과·지도 표시가 복원된다 (S9).
 * 플랫폼 중립 — 지도 SDK·라우터·네이티브 API를 import하지 않는다.
 *
 * 필드는 웹 MSG-488 부분집합이다. MSG-489 필드(`autoMoved`·`originSent`·`movedAreaName`·
 * `secondaryPending`·`normalizePending`·`requestedAt`)는 그 티켓이 얹는다.
 */
export type AiRouteStatus = "idle" | "loading" | "result" | "error";

export interface AiRouteState {
  /** 입력 문장 — 요청 실패·성공·결과 닫기와 무관하게 유지된다 (§1-4 전 행 공통) */
  text: string;
  status: AiRouteStatus;
  points: RoutePointDto[];
  /** 서버 부족 신호 — 문구는 쓰지 않고 null 여부만 읽는다 (L3) */
  notice: string | null;
  /** 선택된 지점 order — 카드↔마커 양방향 강조 (D8) */
  selectedOrder: number | null;
  errorNotice: RouteErrorNotice | null;
  /** 14503(기능 꺼짐) — 세션 동안 제출을 막는다 (§1-4) */
  featureDisabled: boolean;
}

export interface AiRouteStore {
  getState: () => AiRouteState;
  subscribe: (listener: () => void) => () => void;
  setText: (text: string) => void;
  /** 요청 시작 — 이전 결과·안내·선택·에러를 **먼저** 비운다 (로딩 중 잔상 0) */
  startRequest: () => void;
  succeed: (points: RoutePointDto[], notice: string | null) => void;
  fail: (notice: RouteErrorNotice) => void;
  selectOrder: (order: number | null) => void;
  /** 결과 모드 ← / Android 뒤로가기 — 결과·에러·선택을 비우고 대기로, text 유지 */
  dismissResult: () => void;
  /** 전부 초기화 — text까지 비운다. featureDisabled는 세션 플래그라 남긴다 */
  reset: () => void;
}

/** 결과·선택·에러가 비워진 상태 — startRequest·dismissResult·reset이 공유한다 (매번 새 배열) */
const cleared = (): Omit<AiRouteState, "text" | "featureDisabled"> => ({
  status: "idle",
  points: [],
  notice: null,
  selectedOrder: null,
  errorNotice: null,
});

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 아래 단일 인스턴스를 쓴다 */
export const createAiRouteStore = (): AiRouteStore => {
  let state: AiRouteState = { text: "", featureDisabled: false, ...cleared() };
  const listeners = new Set<() => void>();

  // 스냅샷은 불변 교체 — useSyncExternalStore가 참조 동일성으로 리렌더를 거른다
  const set = (patch: Partial<AiRouteState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setText: (text) => set({ text }),
    startRequest: () => set({ ...cleared(), status: "loading" }),
    succeed: (points, notice) =>
      set({ status: "result", points, notice, errorNotice: null }),
    fail: (notice) =>
      set({
        // 로그인 필요는 에러 화면 없이 입력 대기로 되돌린다 — 이동은 호출부 몫 (§1-4)
        status: notice.requiresLogin ? "idle" : "error",
        errorNotice: notice.requiresLogin ? null : notice,
        featureDisabled: state.featureDisabled || notice.disablesFeature,
      }),
    selectOrder: (order) => set({ selectedOrder: order }),
    dismissResult: () => set(cleared()),
    reset: () => set({ ...cleared(), text: "" }),
  };
};

/** 앱 전역 단일 인스턴스 — 화면 재진입에도 유지되는 세션 상태 */
export const aiRouteStore = createAiRouteStore();

/** 화면 구독 훅 — 재마운트를 가로질러 모듈 상태를 읽는다 */
export const useAiRouteState = (): AiRouteState =>
  useSyncExternalStore(aiRouteStore.subscribe, aiRouteStore.getState);

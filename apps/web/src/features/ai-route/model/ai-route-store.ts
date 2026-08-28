import { create } from "zustand";
import type { RoutePointDto } from "@/shared/api/generated";
import type { RouteErrorNotice } from "./route-error";

/**
 * AI 경로추천 세션 상태 (MSG-488 L7).
 * 플랫폼 중립 — 지도 SDK·라우터·웹 API를 import하지 않는다(RN 경계).
 * 스토어가 정본이라 다른 섹션에 갔다 돌아와도 입력·결과·지도 표시가 복원된다 (S11).
 *
 * [MSG-489 확장점] 출발지(origin)·mentionedArea·2차 자동 재요청 플래그가 이 스토어에 얹힌다.
 */
export type AiRouteStatus = "idle" | "loading" | "result" | "error";

interface AiRouteState {
  /** 입력 문장 — 요청 실패·성공과 무관하게 유지된다 (§1-4 전 행 공통) */
  text: string;
  status: AiRouteStatus;
  points: RoutePointDto[];
  /** 서버 부족 신호 — 문구는 쓰지 않고 null 여부만 읽는다 (L4) */
  notice: string | null;
  /** 선택된 지점 order — 카드↔마커 양방향 강조 (S8) */
  selectedOrder: number | null;
  errorNotice: RouteErrorNotice | null;
  /** 14503(기능 꺼짐) — 세션 동안 제출을 막는다 (§1-4) */
  featureDisabled: boolean;
  setText: (text: string) => void;
  startRequest: () => void;
  succeed: (points: RoutePointDto[], notice: string | null) => void;
  fail: (notice: RouteErrorNotice) => void;
  selectOrder: (order: number | null) => void;
  reset: () => void;
}

/** 결과·선택·에러가 비워진 상태 — 새 요청 시작과 reset이 공유한다 (매번 새 배열) */
const cleared = (): Pick<
  AiRouteState,
  "status" | "points" | "notice" | "selectedOrder" | "errorNotice"
> => ({
  status: "idle",
  points: [],
  notice: null,
  selectedOrder: null,
  errorNotice: null,
});

export const useAiRouteStore = create<AiRouteState>((set) => ({
  text: "",
  featureDisabled: false,
  ...cleared(),
  setText: (text) => set({ text }),
  // 새 요청은 이전 결과를 **먼저** 비운다 — 잔상(이전 카드·지도 표시)이 로딩 중에 남지 않는다
  startRequest: () => set({ ...cleared(), status: "loading" }),
  succeed: (points, notice) =>
    set({ status: "result", points, notice, errorNotice: null }),
  fail: (notice) =>
    set((state) => ({
      // 로그인 필요는 에러 화면 없이 입력 대기로 되돌린다 — 모달 열기는 호출부 몫 (§1-3)
      status: notice.requiresLogin ? "idle" : "error",
      errorNotice: notice.requiresLogin ? null : notice,
      featureDisabled: state.featureDisabled || notice.disablesFeature,
    })),
  selectOrder: (order) => set({ selectedOrder: order }),
  // 레일 재클릭 2단의 초기화 — 입력까지 비운다. featureDisabled는 세션 플래그라 남긴다
  reset: () => set({ ...cleared(), text: "" }),
}));

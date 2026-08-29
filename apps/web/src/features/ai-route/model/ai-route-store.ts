import { create } from "zustand";
import type { RoutePointDto } from "@/shared/api/generated";
import type { RouteErrorNotice } from "./route-error";

/**
 * AI 경로추천 세션 상태 (MSG-488 L7).
 * 플랫폼 중립 — 지도 SDK·라우터·웹 API를 import하지 않는다(RN 경계).
 * 스토어가 정본이라 다른 섹션에 갔다 돌아와도 입력·결과·지도 표시가 복원된다 (S11).
 *
 * MSG-489가 출발지·자동 이동·2차 자동 재요청 플래그를 얹었다 — 전부 **요청 사이클** 단위라
 * 새 1차 요청이 한꺼번에 초기화한다 (L15).
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
  /** 이번 사이클에서 자동 이동을 이미 했는가 — 2차 응답의 mentionedArea를 무시한다 (L9·L14) */
  autoMoved: boolean;
  /** 직전 요청이 origin을 실어 보냈는가 — 결과 화면 버튼 문구의 근거 (L13) */
  originSent: boolean;
  /** 자동 이동한 지역명 — 안내 토스트가 읽는다. 이동이 없었으면 null (D3) */
  movedAreaName: string | null;
  /** 2차 요청이 예약됐지만 아직 발사되지 않았는가 — 섹션 이탈·재진입에도 예약이 살아남는다 */
  secondaryPending: boolean;
  /** 1차 요청을 쏜 시각(ms) — 2차 발사가 서버 10초 창을 계산하는 기준 (Q2 안 B) */
  requestedAt: number | null;
  setText: (text: string) => void;
  /** 1차 요청 시작 — 사이클 플래그를 전부 초기화한다 (L15) */
  startRequest: (originSent?: boolean) => void;
  /** 자동 이동 확정 + 2차 요청 예약 — 1차 결과는 게시하지 않고 로딩을 유지한다 (D5·L14) */
  startSecondaryRequest: (areaName: string) => void;
  /** 예약된 2차를 실제로 발사한 시점 — 재발사를 막고 출발지 재판정 결과를 반영한다 */
  markSecondarySent: (originSent: boolean) => void;
  succeed: (points: RoutePointDto[], notice: string | null) => void;
  fail: (notice: RouteErrorNotice) => void;
  selectOrder: (order: number | null) => void;
  reset: () => void;
}

/** 요청 사이클 플래그 초기값 — startRequest와 reset이 공유한다 (L15) */
const clearedCycle = (): Pick<
  AiRouteState,
  "autoMoved" | "originSent" | "movedAreaName" | "secondaryPending"
> => ({
  autoMoved: false,
  originSent: false,
  movedAreaName: null,
  secondaryPending: false,
});

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
  requestedAt: null,
  ...cleared(),
  ...clearedCycle(),
  setText: (text) => set({ text }),
  // 새 요청은 이전 결과를 **먼저** 비운다 — 잔상(이전 카드·지도 표시)이 로딩 중에 남지 않는다
  startRequest: (originSent = false) =>
    set({
      ...cleared(),
      ...clearedCycle(),
      status: "loading",
      originSent,
      requestedAt: Date.now(),
    }),
  startSecondaryRequest: (areaName) =>
    set({
      status: "loading",
      autoMoved: true,
      movedAreaName: areaName,
      secondaryPending: true,
    }),
  markSecondarySent: (originSent) =>
    set({ secondaryPending: false, originSent }),
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
  reset: () =>
    set({ ...cleared(), ...clearedCycle(), text: "", requestedAt: null }),
}));

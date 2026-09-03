import { useSyncExternalStore } from "react";
import type { LatLng } from "../../../entities/cell/model/grid";
import type { RoutePointDto } from "../../../shared/api/sdk";
import type { RouteErrorNotice } from "./route-error";

/**
 * AI 경로추천 세션 상태 (L9, MSG-556) — 웹 `ai-route-store.ts`(zustand)의 모바일판.
 * zustand 미도입이라 모듈 스코프 팩토리 + `useSyncExternalStore` 구독 훅이다(search-store 관례).
 * 스토어가 정본이라 탭을 나갔다 돌아와도(재마운트) 입력·결과·지도 표시가 복원된다 (S9).
 * 플랫폼 중립 — 지도 SDK·라우터·네이티브 API를 import하지 않는다.
 *
 * MSG-559가 웹 MSG-489의 자동 동작 플래그(`autoMoved`·`originSent`·`movedAreaName`·
 * `secondaryPending`·`normalizePending`·`requestedAt`)를 얹었다 — 전부 **요청 사이클** 단위라
 * 새 1차 요청이 한꺼번에 초기화한다. `movedCenter`만 모바일 고유다(§6 A6): 앱은 탭 왕복에
 * 화면이 재마운트되므로 2차 대기 중 복귀하면 카메라를 이동한 지역으로 되돌려야 한다.
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
  /** 이번 사이클에서 자동 이동을 이미 했는가 — 2차 응답의 mentionedArea를 무시한다 (L10) */
  autoMoved: boolean;
  /** 직전 요청이 origin을 실어 보냈는가 — 결과 화면 버튼 문구의 근거 (L8) */
  originSent: boolean;
  /** 자동 이동한 지역명 — 안내 토스트가 이 값의 **전이**에 반응한다. 이동이 없었으면 null */
  movedAreaName: string | null;
  /**
   * 자동 이동한 지역 중심 — 2차 대기 중 탭을 떠났다 돌아온 재마운트에서 카메라를 되돌린다
   * (§6 A6, 모바일 고유). 복원하지 않으면 재진입 카메라(현위치)로 2차가 나간다.
   */
  movedCenter: LatLng | null;
  /** 2차 요청이 예약됐지만 아직 발사되지 않았는가 — 재마운트에도 예약이 살아남는다 */
  secondaryPending: boolean;
  /** 제출했지만 1km 축척 정규화를 기다리는 중인가 — 즉시 로딩 표시의 근거 (웹 D11) */
  normalizePending: boolean;
  /**
   * 2차 발사가 서버 10초 창을 계산하는 기준 시각(ms). 1차 mutate에 찍히고 1차 응답이
   * 도착하면(`startSecondaryRequest`) 그 시각으로 다시 찍힌다 — 앱의 JS→와이어 지연이
   * 커서 mutate 기준으로는 창을 못 넘긴다 (재작업 2, `startSecondaryRequest` JSDoc).
   */
  requestedAt: number | null;
}

export interface AiRouteStore {
  getState: () => AiRouteState;
  subscribe: (listener: () => void) => () => void;
  setText: (text: string) => void;
  /**
   * 제출 직후 축척 정규화 대기 시작 (웹 D11) — 즉시 로딩 화면이지만 요청은 아직 안 나갔다.
   * `requestedAt`을 여기서 기록하지 않는 이유: 그러면 정규화 대기가 서버 10초 창을
   * 잡아먹어 2차가 조기 발사되고 14429가 난다.
   */
  startNormalize: () => void;
  /**
   * 1차 요청 시작 — 이전 결과·안내·선택·에러와 **사이클 플래그 전부**를 먼저 비운다
   * (로딩 중 잔상 0). 돌려주는 요청 토큰은 응답 게시 전 `isCurrentRequest`로 대조한다.
   */
  startRequest: (originSent?: boolean) => number;
  /**
   * 자동 이동 확정 + 2차 요청 예약 — 1차 결과는 게시하지 않고 로딩을 유지한다 (웹 D5).
   * 요청 토큰은 올리지 않는다: 사이클은 그대로이고 예약을 얹을 뿐이다.
   *
   * **`requestedAt`을 여기서 다시 찍는다** — 2차 대기의 기준점이 1차 mutate 시점이 아니라
   * **1차 응답 도착 시각**이다. 웹은 브라우저 keep-alive라 JS→와이어 지연이 작아 mutate
   * 기준으로도 창을 넘겼지만, 앱은 매 요청 새 TLS 커넥션을 열어 그 지연이 1초에 달해
   * 여유 500ms를 먹고 2차가 서버 10초 창 안에 도착했다(실기 와이어 간격 9.62s → 14429).
   * 응답 도착은 서버가 1차를 받은 시각보다 반드시 뒤라, 여기서 재면 창 밖이 보장된다.
   * `SECONDARY_MIN_INTERVAL_MS`·`secondaryDelayMs`는 웹 parity 그대로 두고 앵커만 옮겼다.
   */
  startSecondaryRequest: (areaName: string, center: LatLng) => void;
  /**
   * 예약된 2차를 실제로 발사한 시점 — 재발사를 막고 출발지 재판정 결과를 반영한다.
   * 현재 요청 토큰을 그대로 돌려준다(2차도 같은 사이클이라 스테일 판정 키가 같다).
   */
  markSecondarySent: (originSent: boolean) => number;
  /**
   * 요청을 보내지 못한 채 대기를 끝낸다 (§12) — 정착 상한이 만료됐는데 뷰포트가 서버
   * 상한을 넘어 확정 400이 되는 경로. 쏘면 400, 안 쏘면 영구 로딩이라 **명시적 안내로
   * 종결**해 사용자가 다시 누를 수 있게 한다.
   */
  abortPending: (notice: RouteErrorNotice) => void;
  /**
   * 토큰이 현재 요청인가 — dismissResult·reset·새 startRequest 뒤에 도착한 응답은 스테일라
   * 게시하지 않는다(뒤로가기로 대기에 돌아왔는데 결과로 되튀거나, 이전 응답이 최신을 덮는 것을
   * 막는다). auth-store의 sessionGeneration과 같은 세대 대조다
   */
  isCurrentRequest: (token: number | undefined) => boolean;
  succeed: (points: RoutePointDto[], notice: string | null) => void;
  fail: (notice: RouteErrorNotice) => void;
  selectOrder: (order: number | null) => void;
  /** 결과 모드 ← / Android 뒤로가기 — 결과·에러·선택을 비우고 대기로, text 유지 */
  dismissResult: () => void;
  /** 전부 초기화 — text까지 비운다. featureDisabled는 세션 플래그라 남긴다 */
  reset: () => void;
  /**
   * 로컬 세션 종료(로그아웃·계정 삭제, `endLocalSession`) 전용 — `reset()` + featureDisabled까지
   * 지운다. 14503은 "이 세션 동안"의 신호라 다음 세션은 서버에 다시 물어야 한다 (codex 재리뷰 P2)
   */
  resetForSessionEnd: () => void;
}

/** 요청 사이클 플래그 초기값 — startRequest·startNormalize·dismissResult·reset이 공유한다 */
const clearedCycle = (): Pick<
  AiRouteState,
  | "autoMoved"
  | "originSent"
  | "movedAreaName"
  | "movedCenter"
  | "secondaryPending"
  | "normalizePending"
> => ({
  autoMoved: false,
  originSent: false,
  movedAreaName: null,
  movedCenter: null,
  secondaryPending: false,
  normalizePending: false,
});

/** 결과·선택·에러가 비워진 상태 — startRequest·dismissResult·reset이 공유한다 (매번 새 배열) */
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

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 아래 단일 인스턴스를 쓴다 */
export const createAiRouteStore = (): AiRouteStore => {
  let state: AiRouteState = {
    text: "",
    featureDisabled: false,
    requestedAt: null,
    ...cleared(),
    ...clearedCycle(),
  };
  /** 요청 세대 — startRequest마다 증가, dismissResult·reset이 진행 중 요청을 무효화한다 */
  let requestToken = 0;
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
    // 정규화 대기도 새 사이클이라 이전 결과를 먼저 비운다 — 잔상이 로딩 중에 남지 않는다
    startNormalize: () =>
      set({
        ...cleared(),
        ...clearedCycle(),
        status: "loading",
        normalizePending: true,
      }),
    startRequest: (originSent = false) => {
      requestToken += 1;
      set({
        ...cleared(),
        ...clearedCycle(),
        status: "loading",
        originSent,
        requestedAt: Date.now(),
      });
      return requestToken;
    },
    startSecondaryRequest: (areaName, center) =>
      set({
        status: "loading",
        autoMoved: true,
        movedAreaName: areaName,
        movedCenter: center,
        secondaryPending: true,
        requestedAt: Date.now(),
      }),
    markSecondarySent: (originSent) => {
      set({ secondaryPending: false, originSent });
      return requestToken;
    },
    // 두 대기를 함께 푼다 — 예약이 남으면 같은 뷰포트로 재발사된다
    abortPending: (notice) =>
      set({
        status: "error",
        errorNotice: notice,
        normalizePending: false,
        secondaryPending: false,
      }),
    isCurrentRequest: (token) => token === requestToken,
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
    dismissResult: () => {
      requestToken += 1;
      set({ ...cleared(), ...clearedCycle() });
    },
    reset: () => {
      requestToken += 1;
      set({ ...cleared(), ...clearedCycle(), text: "", requestedAt: null });
    },
    resetForSessionEnd: () => {
      requestToken += 1;
      set({
        ...cleared(),
        ...clearedCycle(),
        text: "",
        requestedAt: null,
        featureDisabled: false,
      });
    },
  };
};

/** 앱 전역 단일 인스턴스 — 화면 재진입에도 유지되는 세션 상태 */
export const aiRouteStore = createAiRouteStore();

/** 화면 구독 훅 — 재마운트를 가로질러 모듈 상태를 읽는다 */
export const useAiRouteState = (): AiRouteState =>
  useSyncExternalStore(aiRouteStore.subscribe, aiRouteStore.getState);

import { useSyncExternalStore } from "react";
import type { VideoVisibility } from "../../video-actions/model/video-menu";
import { SELECT_FAILURE_MESSAGES } from "./analysis-copy";
import type { EventUploadTarget } from "./event-upload-target";
import {
  clampSegment,
  createInitialSelection,
  fromServerHighlights,
  getSelectedSegment,
  selectAi,
  selectManual,
  type HighlightSelectionState,
  type HighlightSuggestion,
  type Segment,
} from "./highlight-selection";
import {
  createOrchestration,
  type OrchestrationState,
  type UploadStage,
} from "./upload-orchestration";
import {
  getStepAfterAnalysis,
  resolveAnalysisFailure,
  type UploadStep,
} from "./upload-wizard";

/**
 * 업로드 플로우 공유 스토어 (MSG-302~305 → MSG-424 확장) — 라우트 4개
 * (/upload → analyzing → highlight → preview)가 단일 인스턴스로 상태를 잇는다.
 * search-store 선례(모듈 스코프 팩토리 + useSyncExternalStore 구독 훅)를 따르며,
 * 라우터·플랫폼 API를 참조하지 않는다 (RN 경계 규칙 — 내비게이션은 화면이 콜백으로 수행).
 *
 * MSG-424에서 **스텝 전이와 실패 분기 판정을 전부 이 스토어로 끌어왔다.** 모바일에는
 * 컴포넌트 렌더 테스트 인프라가 없어(vitest.config 주석) 화면 전이의 회귀 안전망이
 * 실기 검증뿐이기 때문이다(스펙 R7) — 화면은 스토어가 정한 스텝으로 이동만 한다.
 */

export interface UploadVideo {
  uri: string;
  /** 초 단위 길이 — picker가 못 주면 null (304 길이 뱃지는 "0:42" 폴백) */
  durationSec: number | null;
  /** presign `extension` 판정용 — picker가 안 주면 uri·MIME에서 파생 (pick-result) */
  fileName: string;
  /** presign `contentLength` — picker가 안 주면 null(선택 단계에서 거부) */
  fileSize: number | null;
  /** presign `contentType`·S3 PUT 헤더 — 없으면 video/mp4 폴백 */
  mimeType: string | null;
}

/** 화면에 표시하는 AI 추천 행의 상한 — 서버가 더 줘도 앞에서 자른다 (기준 8) */
export const MAX_SUGGESTION_ROWS = 3;

/** 단계열을 구동하는 두 갈래 — 선분석(원본 업로드)과 확정(게시) */
export type UploadFlowLane = "analysis" | "confirm";

export interface UploadFlowState {
  /** 현재 스텝 = 현재 라우트 */
  step: UploadStep;
  /** 갤러리/카메라로 확보한 영상 */
  video: UploadVideo | null;
  /** 서버 선분석 추천 (최대 3개, 배열 순서 = 우선순위) */
  suggestions: HighlightSuggestion[];
  /** 선택 상태 — 분석 완료 전에는 null */
  selection: HighlightSelectionState | null;
  /** 분석 서버 오류·네트워크 실패로 진입한 직접 지정 폴백 (기준 32) */
  manualFallback: boolean;
  /** 선분석 준비 단계(presign·원본 PUT) 실패 — 분석 화면의 재시도 표시 (기준 31) */
  analysisFailureStage: UploadStage | null;
  /** 파일 자체 문제로 선택 화면에 복귀한 사유 (기준 33) */
  selectFailureMessage: string | null;
  /** 선분석 오케스트레이션 — 원본 S3 업로드 산출물 */
  analysis: OrchestrationState;
  /** 확정 오케스트레이션 — 게시 업로드 산출물 */
  confirm: OrchestrationState;
  /**
   * 발사 중인 단계열 (기준 35) — **동기 중복 발사 가드**. 영속 대상이 아니다:
   * 업로드 중 강제 종료된 잠금이 살아남으면 재실행이 영구히 막힌다.
   */
  inFlight: UploadFlowLane | null;
  /**
   * 행사 귀속 업로드 대상 (MSG-560 D11) — null이면 일반(좌표 귀속) 업로드다.
   * **영속 대상이다**: 콜드 스타트 재개가 일반 업로드로 둔갑해 뷰포트 좌표에 오귀속되는
   * 경로를 봉쇄한다. 일반 진입점(바텀 내비 카메라·격자 상세)은 진입 시 명시로 비운다.
   */
  eventTarget: EventUploadTarget | null;
  /**
   * 게시 공개 범위 (MSG-572 D1·D2) — 초기 PUBLIC. **영속 대상이다**(콜드 스타트 복원).
   * 파일 교체(`startAnalysis`)·플로우 내부 복귀는 유지하고 완료 `reset()`만 되돌린다 —
   * 파일을 바꿨다고 조용히 PUBLIC으로 돌아가면 나만 보기로 올리려던 영상이 전체 공개된다
   * (웹 PR #99 결정 준용). 행사 귀속 업로드는 DTO에 필드가 없어 이 값을 쓰지 않는다.
   */
  visibility: VideoVisibility;
}

/** AsyncStorage에 남기는 진행 상태 (기준 36) — 실패 표기는 전이 상태라 제외한다 */
export interface PersistedUploadFlow {
  step: UploadStep;
  video: UploadVideo | null;
  suggestions: HighlightSuggestion[];
  selection: HighlightSelectionState | null;
  manualFallback: boolean;
  analysis: OrchestrationState;
  confirm: OrchestrationState;
  eventTarget: EventUploadTarget | null;
  visibility: VideoVisibility;
}

const initialState = (): UploadFlowState => ({
  step: "select",
  video: null,
  suggestions: [],
  selection: null,
  manualFallback: false,
  analysisFailureStage: null,
  selectFailureMessage: null,
  analysis: createOrchestration(),
  confirm: createOrchestration(),
  inFlight: null,
  eventTarget: null,
  visibility: "PUBLIC",
});

/** 선택 영상의 실측 길이 — 없으면 0 (사전 검증이 null을 걸러 실제로는 도달하지 않는다) */
const durationOf = (state: UploadFlowState): number =>
  state.video?.durationSec ?? 0;

export interface UploadFlowStore {
  getState: () => UploadFlowState;
  subscribe: (listener: () => void) => () => void;
  /** 영상 확보 → 분석 스텝. 이전 흐름 산출물(추천·선택·presign·PUT)을 전부 버린다 (기준 1) */
  startAnalysis: (video: UploadVideo) => void;
  /** 분석 성공 — 추천 파생·초기 선택·다음 스텝 판정을 한 번에 (기준 6·8·9) */
  completeAnalysis: (highlights: number[][] | null | undefined) => void;
  /** 준비 단계 실패 — 분석 화면에 단계 표시, 스텝 유지 (기준 31) */
  failAnalysisStage: (stage: UploadStage) => void;
  /** 실패 표기만 해제 — 성공한 단계의 산출물은 보존해 재시도가 건너뛴다 (기준 31) */
  retryAnalysis: () => void;
  /** 분석 확정 실패 — developCode로 복귀 지점 판정 (기준 32·33) */
  failAnalysis: (developCode?: number) => void;
  /** 추천 행 선택 (기준 13) */
  selectSuggestion: (suggestion: HighlightSuggestion) => void;
  /** 직접 구간 지정·갱신 (기준 13·15) */
  selectManualSegment: (segment: Segment) => void;
  /** 미리보기 전진 (기준 18) */
  goPreview: () => void;
  /** 미리보기 → 하이라이트. 확정 산출물을 버린다 — 옛 s3Key로 확정되는 정합성 버그 차단 (기준 22) */
  backToHighlight: () => void;
  /** 선택 화면 복귀 — 하이라이트 [이전 단계로]·분석 실패 [이전으로] */
  backToSelect: () => void;
  /**
   * 발사 잠금 획득 (기준 35) — 이미 발사 중이면 false를 돌려주고 아무것도 바꾸지 않는다.
   * **동기다**: 같은 틱에 도착한 두 번째 탭이 이 판정을 보려면 React 리렌더를 기다릴 수 없다.
   */
  beginFlight: (lane: UploadFlowLane) => boolean;
  /** 발사 잠금 해제 — 성공·실패 양쪽에서 호출된다 (뮤테이션 onSettled) */
  endFlight: () => void;
  /** 업로드 진입 모드 지정 (MSG-560 D11) — 행사 진입은 대상을, 일반 진입은 null을 준다 */
  setEventTarget: (target: EventUploadTarget | null) => void;
  /** 게시 공개 범위 선택 (MSG-572) — 미리보기 카드의 라디오가 호출한다 */
  setVisibility: (visibility: VideoVisibility) => void;
  /** 오케스트레이션 진행 기록 (api 계층이 단계 성공/실패마다 호출) */
  setAnalysisFlow: (state: OrchestrationState) => void;
  setConfirmFlow: (state: OrchestrationState) => void;
  /** 영속 스냅숏 만들기 (기준 36) */
  toPersisted: () => PersistedUploadFlow;
  /** 재수화 — null(진행 없음·저장소 실패)이면 초기 상태 유지 (기준 36·37) */
  hydrate: (persisted: PersistedUploadFlow | null) => void;
  /** 완료 후 초기화 — 재진입 시 잔재 없음 (기준 29) */
  reset: () => void;
}

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 아래 단일 인스턴스를 쓴다 */
export const createUploadFlowStore = (): UploadFlowStore => {
  let state = initialState();
  const listeners = new Set<() => void>();

  const setState = (patch: Partial<UploadFlowState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  /** 새 흐름 시작 시 버려야 하는 것들 — 이전 파일의 presign·PUT 산출물 재사용 방지 */
  const clearedFlow = () => ({
    // 진행을 버리는 전이는 잠금도 함께 푼다 — 해제를 놓쳐도 플로우가 영구히 잠기지 않는다
    inFlight: null,
    suggestions: [],
    selection: null,
    manualFallback: false,
    analysisFailureStage: null,
    analysis: createOrchestration(),
    confirm: createOrchestration(),
  });

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    startAnalysis: (video) =>
      setState({
        ...clearedFlow(),
        step: "analyzing",
        video,
        selectFailureMessage: null,
      }),

    completeAnalysis: (highlights) => {
      const duration = durationOf(state);
      // 서버 명세상 최대 3구간이지만 계약에 기대지 않고 FE에서도 자른다 (기준 8)
      const suggestions = fromServerHighlights(highlights, duration).slice(
        0,
        MAX_SUGGESTION_ROWS,
      );
      if (getStepAfterAnalysis(highlights) === "preview") {
        // 추천 없음(5초 이하 등) — 원본 앞부분을 상한(28초)으로 자른 구간으로 바로 미리보기
        setState({
          step: "preview",
          suggestions: [],
          manualFallback: false,
          analysisFailureStage: null,
          selection: selectManual(
            createInitialSelection(duration, []),
            clampSegment({ start: 0, end: duration }, duration),
          ),
        });
        return;
      }
      setState({
        step: "highlight",
        suggestions,
        manualFallback: false,
        analysisFailureStage: null,
        selection: createInitialSelection(duration, suggestions),
      });
    },

    failAnalysisStage: (stage) => setState({ analysisFailureStage: stage }),
    retryAnalysis: () => setState({ analysisFailureStage: null }),

    failAnalysis: (developCode) => {
      const failure = resolveAnalysisFailure(developCode);
      if (failure.step === "select") {
        setState({
          ...clearedFlow(),
          step: "select",
          video: null,
          selectFailureMessage: SELECT_FAILURE_MESSAGES[failure.kind],
        });
        return;
      }
      // 3502·네트워크 등 — 선택 화면으로 튕기지 않고 직접 지정 폴백 (기준 32)
      const duration = durationOf(state);
      setState({
        step: "highlight",
        suggestions: [],
        manualFallback: true,
        analysisFailureStage: null,
        selection: createInitialSelection(duration, []),
      });
    },

    selectSuggestion: (suggestion) => {
      if (state.selection === null) return;
      setState({ selection: selectAi(state.selection, suggestion) });
    },
    selectManualSegment: (segment) => {
      if (state.selection === null) return;
      setState({ selection: selectManual(state.selection, segment) });
    },

    goPreview: () => setState({ step: "preview" }),
    backToHighlight: () =>
      setState({
        step: "highlight",
        confirm: createOrchestration(),
        inFlight: null,
      }),
    backToSelect: () =>
      setState({
        ...clearedFlow(),
        step: "select",
        video: null,
        selectFailureMessage: null,
      }),

    beginFlight: (lane) => {
      if (state.inFlight !== null) return false;
      setState({ inFlight: lane });
      return true;
    },
    endFlight: () => setState({ inFlight: null }),
    setEventTarget: (eventTarget) => setState({ eventTarget }),
    setVisibility: (visibility) => setState({ visibility }),

    setAnalysisFlow: (analysis) => setState({ analysis }),
    setConfirmFlow: (confirm) => setState({ confirm }),

    toPersisted: () => ({
      step: state.step,
      video: state.video,
      suggestions: state.suggestions,
      selection: state.selection,
      manualFallback: state.manualFallback,
      analysis: state.analysis,
      confirm: state.confirm,
      eventTarget: state.eventTarget,
      visibility: state.visibility,
    }),
    hydrate: (persisted) => {
      if (persisted === null) return;
      setState({
        ...persisted,
        analysisFailureStage: null,
        selectFailureMessage: null,
      });
    },

    reset: () => {
      state = initialState();
      listeners.forEach((listener) => listener());
    },
  };
};

/**
 * 영속할 진행이 없는 상태 — 최초 진입, 완료 후 reset, 플로우 이탈이 여기로 수렴한다.
 * 영속 어댑터(upload-flow-persistence)가 이 판정으로 저장소를 비운다 (기준 39).
 */
export const isEmptyUploadFlow = (state: UploadFlowState): boolean =>
  state.step === "select" && state.video === null;

/** 선택된 구간 — 선택 상태가 없으면(분석 전) null */
export const selectSelectedSegment = (
  state: UploadFlowState,
): Segment | null =>
  state.selection === null ? null : getSelectedSegment(state.selection);

/** 앱 전역 단일 인스턴스 — 라우트가 바뀌어도 플로우 상태 유지 (영속은 upload-flow-persistence) */
export const uploadFlowStore = createUploadFlowStore();

/**
 * 일반(좌표 귀속) 업로드 진입 (MSG-560 D11) — 행사 귀속 모드를 **명시 해제**하고 이동한다.
 * 진입점(바텀 내비 카메라·격자 상세)마다 해제를 기억하는 대신 규칙을 한 곳에 둔다
 * (웹 `openModal`이 매 진입에 대상을 명시 세팅하는 것과 같은 취지). 라우터는 주입받는다.
 */
export const enterGeneralUpload = (navigate: () => void): void => {
  uploadFlowStore.setEventTarget(null);
  navigate();
};

/** 플로우 상태 구독 훅 — 업로드 화면들이 공용으로 사용 */
export const useUploadFlow = (): UploadFlowState =>
  useSyncExternalStore(uploadFlowStore.subscribe, uploadFlowStore.getState);

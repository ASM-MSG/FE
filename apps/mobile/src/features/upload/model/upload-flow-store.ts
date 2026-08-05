import { useSyncExternalStore } from "react";
import { MOCK_SEGMENTS, type HighlightSegment } from "./mock-segments";

/**
 * 업로드 플로우 공유 스토어 (MSG-302~305) — 라우트 4개(/upload → highlight → blur →
 * preview)가 단일 인스턴스로 상태를 잇는다. search-store 선례(모듈 스코프 팩토리 +
 * useSyncExternalStore 구독 훅)를 따르며, 라우터·플랫폼 API를 참조하지 않는다
 * (RN 경계 규칙 — 내비게이션은 화면이 콜백으로 수행).
 */

export interface UploadVideo {
  uri: string;
  /** 초 단위 길이 — picker가 못 주면 null (304 길이 뱃지는 "0:42" 폴백) */
  durationSec: number | null;
}

export interface UploadFlowState {
  /** 302에서 갤러리/카메라로 확보한 영상 */
  video: UploadVideo | null;
  /** 302 제목 입력 (AC 3) */
  title: string;
  /** 303 선택 구간 — 기본값은 mock 첫 구간 (303 AC 6) */
  selectedSegmentId: string;
}

const initialState = (): UploadFlowState => ({
  video: null,
  title: "",
  selectedSegmentId: MOCK_SEGMENTS[0].id,
});

export interface UploadFlowStore {
  getState: () => UploadFlowState;
  subscribe: (listener: () => void) => () => void;
  /** 제목 입력 반영 (302 AC 3) */
  setTitle: (title: string) => void;
  /** 영상 확보 — 저장과 함께 선택 구간을 첫 구간으로 초기화 (302 AC 10) */
  setVideo: (video: UploadVideo) => void;
  /** 단일 선택 전이 — 새 선택이 기존 선택을 대체 (303 AC 7) */
  selectSegment: (segmentId: string) => void;
  /** 게시 완료 후 초기화 — 재진입 시 잔재 없음 (305 AC 7) */
  reset: () => void;
}

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 아래 단일 인스턴스를 쓴다 */
export const createUploadFlowStore = (): UploadFlowStore => {
  let state = initialState();
  const listeners = new Set<() => void>();

  const setState = (next: UploadFlowState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTitle: (title) => setState({ ...state, title }),
    setVideo: (video) =>
      setState({ ...state, video, selectedSegmentId: MOCK_SEGMENTS[0].id }),
    selectSegment: (segmentId) =>
      setState({ ...state, selectedSegmentId: segmentId }),
    reset: () => setState(initialState()),
  };
};

/** 선택 구간 해석 — 305 요약 카드가 시간·사유를 표시 (305 AC 3). 미일치 시 첫 구간 폴백 */
export const selectSelectedSegment = (
  state: UploadFlowState,
): HighlightSegment =>
  MOCK_SEGMENTS.find((segment) => segment.id === state.selectedSegmentId) ??
  MOCK_SEGMENTS[0];

/** 앱 전역 단일 인스턴스 — 라우트가 바뀌어도 플로우 상태 유지 (비영속) */
export const uploadFlowStore = createUploadFlowStore();

/** 플로우 상태 구독 훅 — 화면 4개가 공용으로 사용 */
export const useUploadFlow = (): UploadFlowState =>
  useSyncExternalStore(uploadFlowStore.subscribe, uploadFlowStore.getState);

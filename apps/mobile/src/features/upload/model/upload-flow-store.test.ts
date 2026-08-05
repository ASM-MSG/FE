import { describe, expect, it, vi } from "vitest";
import { MOCK_SEGMENTS } from "./mock-segments";
import {
  createUploadFlowStore,
  selectSelectedSegment,
} from "./upload-flow-store";

/**
 * 업로드 플로우 공유 스토어 — MSG-302~305가 한 인스턴스로 잇는 상태.
 * 테스트는 팩토리(createUploadFlowStore)로 격리 인스턴스를 만든다 (search-store 관례).
 */

/** 기대 초기 상태 — 최초 진입(303 AC 6)과 게시 후 reset(305 AC 7)이 공유하는 단정 */
const expectedInitialState = () => ({
  video: null,
  title: "",
  selectedSegmentId: MOCK_SEGMENTS[0].id,
});

describe("upload-flow-store (MSG-302 AC 3·10, MSG-303 AC 6·7, MSG-305 AC 3·7)", () => {
  it("초기 상태: 영상 없음·제목 빈 문자열·첫 번째 구간이 기본 선택이다 (303 AC 6)", () => {
    const store = createUploadFlowStore();
    expect(store.getState()).toEqual(expectedInitialState());
  });

  it("setTitle: 제목 Input에 입력한 값이 스토어 title에 반영된다 (302 AC 3)", () => {
    const store = createUploadFlowStore();
    store.setTitle("서면 골목 맛집 브이로그");
    expect(store.getState().title).toBe("서면 골목 맛집 브이로그");
  });

  it("setVideo: 영상 확보 시 video(uri·durationSec)가 저장되고 selectedSegmentId가 mock 첫 구간으로 초기화된다 (302 AC 10)", () => {
    const store = createUploadFlowStore();
    store.selectSegment(MOCK_SEGMENTS[2].id);
    store.setVideo({ uri: "file:///video.mp4", durationSec: 42 });
    expect(store.getState().video).toEqual({
      uri: "file:///video.mp4",
      durationSec: 42,
    });
    expect(store.getState().selectedSegmentId).toBe(MOCK_SEGMENTS[0].id);
  });

  it("selectSegment: 탭한 구간만 선택되고 기존 선택은 해제된다 — 단일 선택 전이 (303 AC 7)", () => {
    const store = createUploadFlowStore();
    store.selectSegment(MOCK_SEGMENTS[1].id);
    expect(store.getState().selectedSegmentId).toBe(MOCK_SEGMENTS[1].id);
    store.selectSegment(MOCK_SEGMENTS[2].id);
    expect(store.getState().selectedSegmentId).toBe(MOCK_SEGMENTS[2].id);
  });

  it("selectSelectedSegment: 선택된 구간의 시간 범위·사유를 해석한다 — 303에서 고른 구간이 305에 보인다 (305 AC 3)", () => {
    const store = createUploadFlowStore();
    store.selectSegment(MOCK_SEGMENTS[2].id);
    const segment = selectSelectedSegment(store.getState());
    expect(segment.timeRange).toBe("0:21 – 0:26");
    expect(segment.reason).toBe("조회수 예측 상위");
  });

  it("selectSelectedSegment: 알 수 없는 id는 첫 구간으로 폴백한다 (305 구현 계획 — 첫 구간 폴백)", () => {
    const segment = selectSelectedSegment({
      video: null,
      title: "",
      selectedSegmentId: "unknown-id",
    });
    expect(segment).toBe(MOCK_SEGMENTS[0]);
  });

  it("reset: 게시 후 초기 상태로 돌아간다 — 재진입 시 제목 비어 있음·첫 구간 선택 (305 AC 7)", () => {
    const store = createUploadFlowStore();
    store.setTitle("제목");
    store.setVideo({ uri: "file:///video.mp4", durationSec: 30 });
    store.selectSegment(MOCK_SEGMENTS[2].id);
    store.reset();
    expect(store.getState()).toEqual(expectedInitialState());
  });

  it("상태 변경 시 구독자에게 통지되고, 해지 후에는 통지받지 않는다 (useSyncExternalStore 계약)", () => {
    const store = createUploadFlowStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setTitle("한 번");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setTitle("두 번");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

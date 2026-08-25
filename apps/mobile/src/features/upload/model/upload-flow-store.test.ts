import { describe, expect, it, vi } from "vitest";
import { getSelectedSegment } from "./highlight-selection";
import {
  createUploadFlowStore,
  isEmptyUploadFlow,
  MAX_SUGGESTION_ROWS,
  selectSelectedSegment,
  type UploadFlowStore,
  type UploadVideo,
} from "./upload-flow-store";

/**
 * 업로드 플로우 공유 스토어 — 라우트 4개(/upload → analyzing → highlight → preview)가
 * 한 인스턴스로 잇는 상태. 화면 전이·실패 분기 판정을 최대한 이 스토어로 밀어내
 * 모바일에 없는 컴포넌트 렌더 테스트의 공백을 메운다(스펙 R7 완화).
 * 테스트는 팩토리(createUploadFlowStore)로 격리 인스턴스를 만든다 (search-store 관례).
 */
const video: UploadVideo = {
  uri: "file:///clip.mp4",
  durationSec: 42,
  fileName: "clip.mp4",
  fileSize: 12 * 1024 * 1024,
  mimeType: "video/mp4",
};

const analyzing = (): UploadFlowStore => {
  const store = createUploadFlowStore();
  store.startAnalysis(video);
  return store;
};

describe("startAnalysis — 영상 확보 시 분석 스텝으로 전이한다 (기준 1)", () => {
  it("영상을 확보하면 스텝이 'analyzing'이 되고 이전 흐름 산출물이 버려진다 (기준 1)", () => {
    const store = createUploadFlowStore();
    store.setConfirmFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "old",
        expiresInSec: 300,
        issuedAtMs: 0,
      },
      s3PutDone: true,
    });

    store.startAnalysis(video);

    expect(store.getState().step).toBe("analyzing");
    expect(store.getState().video).toEqual(video);
    expect(store.getState().confirm).toEqual({
      presign: null,
      s3PutDone: false,
    });
    expect(store.getState().suggestions).toEqual([]);
  });
});

describe("completeAnalysis — 분석 성공 후 자동 전환 (기준 6·8·9·10)", () => {
  it("추천이 있으면 하이라이트 스텝으로 가고 첫 추천이 선택된 상태로 열린다 (기준 6·9·10)", () => {
    const store = analyzing();

    store.completeAnalysis([
      [3, 8],
      [14, 19],
    ]);

    const state = store.getState();
    expect(state.step).toBe("highlight");
    expect(state.selection?.mode).toBe("ai");
    expect(state.selection?.selectedAi?.id).toBe(state.suggestions[0].id);
    expect(getSelectedSegment(state.selection!)).toEqual({ start: 3, end: 8 });
  });

  it("서버가 4개 이상을 줘도 앞 3개만 남긴다 — FE 방어 슬라이스 (기준 8)", () => {
    const store = analyzing();

    store.completeAnalysis([
      [3, 8],
      [10, 15],
      [17, 22],
      [24, 29],
      [31, 36],
    ]);

    expect(MAX_SUGGESTION_ROWS).toBe(3);
    expect(store.getState().suggestions).toHaveLength(3);
    expect(store.getState().suggestions.map((s) => s.start)).toEqual([
      3, 10, 17,
    ]);
  });

  it("추천이 없으면(빈 배열·null) 하이라이트를 건너뛰고 미리보기로 간다 (기준 6)", () => {
    const store = analyzing();

    store.completeAnalysis([]);

    expect(store.getState().step).toBe("preview");
    expect(store.getState().selection?.mode).toBe("manual");
  });

  it("추천 없이 미리보기로 갈 때 선택 구간은 원본 앞부분을 상한(28초)으로 자른 구간이다 (기준 25 전제)", () => {
    const store = analyzing();

    store.completeAnalysis(null);

    expect(selectSelectedSegment(store.getState())).toEqual({
      start: 0,
      end: 28,
    });
  });
});

describe("분석 실패 분기 (기준 31·32·33)", () => {
  it("준비 단계(presign·PUT) 실패는 분석 화면에 단계로 남고 스텝이 바뀌지 않는다 (기준 31)", () => {
    const store = analyzing();

    store.failAnalysisStage("s3put");

    expect(store.getState().step).toBe("analyzing");
    expect(store.getState().analysisFailureStage).toBe("s3put");
  });

  it("재시도는 실패 표기만 지우고 성공한 단계의 산출물은 보존한다 (기준 31)", () => {
    const store = analyzing();
    store.setAnalysisFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "kept",
        expiresInSec: 300,
        issuedAtMs: 0,
      },
      s3PutDone: true,
    });
    store.failAnalysisStage("finalize");

    store.retryAnalysis();

    expect(store.getState().analysisFailureStage).toBeNull();
    expect(store.getState().analysis.s3PutDone).toBe(true);
    expect(store.getState().analysis.presign?.s3Key).toBe("kept");
  });

  it("분석 서버 오류(3502)·네트워크 실패는 선택 화면으로 튕기지 않고 직접 지정 폴백으로 간다 (기준 32)", () => {
    const store = analyzing();

    store.failAnalysis(3502);

    const state = store.getState();
    expect(state.step).toBe("highlight");
    expect(state.manualFallback).toBe(true);
    expect(state.suggestions).toEqual([]);
    expect(state.selection?.mode).toBe("manual");
    expect(state.video).toEqual(video);
  });

  it("파일 자체 문제(3426)는 선택 화면으로 복귀하고 사유 문구를 남긴다 (기준 33)", () => {
    const store = analyzing();

    store.failAnalysis(3426);

    const state = store.getState();
    expect(state.step).toBe("select");
    expect(state.video).toBeNull();
    expect(state.selectFailureMessage).toContain("분석할 수 없는");
  });

  it("180초 초과(3425)·크기 초과(3413)도 선택 화면 복귀 사유를 남긴다 (기준 33)", () => {
    const tooLong = analyzing();
    tooLong.failAnalysis(3425);
    const tooLarge = analyzing();
    tooLarge.failAnalysis(3413);

    expect(tooLong.getState().selectFailureMessage).toContain("180초");
    expect(tooLarge.getState().selectFailureMessage).toContain("500MB");
  });
});

describe("선택 전이 (기준 13)", () => {
  it("추천 행을 고르면 AI 모드로, 슬라이더를 움직이면 직접 지정 모드로 단일 전이한다 (기준 12·13)", () => {
    const store = analyzing();
    store.completeAnalysis([
      [3, 8],
      [14, 19],
    ]);

    store.selectSuggestion(store.getState().suggestions[1]);
    expect(store.getState().selection?.mode).toBe("ai");
    expect(selectSelectedSegment(store.getState())).toEqual({
      start: 14,
      end: 19,
    });

    store.selectManualSegment({ start: 20, end: 30 });
    expect(store.getState().selection?.mode).toBe("manual");
    expect(store.getState().selection?.selectedAi).toBeNull();
    expect(selectSelectedSegment(store.getState())).toEqual({
      start: 20,
      end: 30,
    });
  });
});

describe("backToHighlight — 미리보기에서 되돌아가기 (기준 22)", () => {
  it("하이라이트로 되돌아가면 진행된 presign·S3 PUT 산출물이 초기화된다 (기준 22)", () => {
    const store = analyzing();
    store.completeAnalysis([[3, 8]]);
    store.goPreview();
    store.setConfirmFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "stale",
        expiresInSec: 300,
        issuedAtMs: 0,
      },
      s3PutDone: true,
    });

    store.backToHighlight();

    expect(store.getState().step).toBe("highlight");
    expect(store.getState().confirm).toEqual({
      presign: null,
      s3PutDone: false,
    });
  });

  it("선분석 산출물(원본 S3 업로드)은 유지된다 — 되돌아간다고 원본을 다시 올리지 않는다 (기준 22)", () => {
    const store = analyzing();
    store.setAnalysisFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "source",
        expiresInSec: 300,
        issuedAtMs: 0,
      },
      s3PutDone: true,
    });
    store.completeAnalysis([[3, 8]]);
    store.goPreview();

    store.backToHighlight();

    expect(store.getState().analysis.presign?.s3Key).toBe("source");
  });
});

describe("reset — 완료 후 초기화 (기준 29)", () => {
  it("초기 상태로 돌아간다 — 카메라 버튼 재진입 시 잔재 없음 (기준 29)", () => {
    const store = analyzing();
    store.completeAnalysis([[3, 8]]);
    store.goPreview();

    store.reset();

    expect(store.getState()).toEqual(createUploadFlowStore().getState());
    expect(store.getState().step).toBe("select");
    expect(store.getState().video).toBeNull();
  });
});

describe("beginFlight·endFlight — 같은 틱 중복 발사 차단 (기준 35)", () => {
  /**
   * 재검증 2차에서 실기 프록시로 잡힌 결함의 재현: `[업로드하기]` 연타가 확정 체인을 두 번
   * 완주시켜 서버에 영상이 2건 생성됐다(videoId 287+288 / 289+290).
   * 원인은 가드가 `confirm.isPending`(비동기 React 상태) 하나뿐이라 **같은 틱의 두 번째
   * 탭 시점에는 아직 false**였던 것이다. 그래서 이 테스트는 리렌더 없이 같은 틱에서 두 번
   * 발사한다 — 비동기 상태 가드로는 통과하지 못하는 형태여야 의미가 있다.
   */
  const launchTwiceInOneTick = (
    store: UploadFlowStore,
    lane: "analysis" | "confirm",
  ) => {
    const fired: string[] = [];
    const publish = () => {
      if (!store.beginFlight(lane)) return;
      fired.push(lane);
    };

    publish();
    publish();

    return fired;
  };

  it("같은 틱에 [업로드하기]를 두 번 눌러도 확정은 한 번만 발사된다 (기준 35)", () => {
    const store = analyzing();

    expect(launchTwiceInOneTick(store, "confirm")).toEqual(["confirm"]);
  });

  it("같은 틱에 [다시 시도]를 두 번 눌러도 선분석은 한 번만 발사된다 — 고아 S3 객체 방지 (기준 35)", () => {
    const store = analyzing();

    expect(launchTwiceInOneTick(store, "analysis")).toEqual(["analysis"]);
  });

  it("발사가 끝나면(성공·실패 모두) 다음 발사가 다시 가능하다 — 실패 후 재시도가 막히지 않게 (기준 31·34)", () => {
    const store = analyzing();
    expect(store.beginFlight("confirm")).toBe(true);

    store.endFlight();

    expect(store.beginFlight("confirm")).toBe(true);
  });

  it("진행 상태를 버리는 전이는 발사 잠금도 함께 푼다 — 해제를 놓쳐도 플로우가 영구히 잠기지 않게 (기준 29·35)", () => {
    const started = analyzing();
    started.beginFlight("analysis");
    const reset = analyzing();
    reset.beginFlight("confirm");

    started.startAnalysis(video);
    reset.reset();

    expect(started.beginFlight("analysis")).toBe(true);
    expect(reset.beginFlight("confirm")).toBe(true);
  });

  it("단계 진행 기록이 발사 잠금을 지우지 않는다 — 흐름 도중 오케스트레이션이 갱신돼도 연타 차단이 유지된다 (기준 35)", () => {
    const store = analyzing();
    expect(store.beginFlight("confirm")).toBe(true);

    // withFlowProgress가 단계마다 부르는 경로 (codex 2회차 P1-1)
    store.setConfirmFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "k",
        expiresInSec: 600,
        issuedAtMs: 0,
      },
      s3PutDone: false,
    });
    store.setConfirmFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "k",
        expiresInSec: 600,
        issuedAtMs: 0,
      },
      s3PutDone: true,
    });

    expect(store.beginFlight("confirm")).toBe(false);
  });

  it("발사 잠금은 영속되지 않는다 — 업로드 중 강제 종료가 재실행을 영구히 막으면 안 된다 (기준 35·36)", () => {
    const store = analyzing();
    store.beginFlight("confirm");

    const restored = createUploadFlowStore();
    restored.hydrate(store.toPersisted());

    expect(restored.beginFlight("confirm")).toBe(true);
  });
});

describe("isEmptyUploadFlow — 영속 값 제거 트리거 (기준 39)", () => {
  it("완료 후 reset·플로우 이탈이 '진행 없음'으로 판정된다 — 영속 어댑터가 이때 저장소를 비운다 (기준 39)", () => {
    const store = analyzing();
    expect(isEmptyUploadFlow(store.getState())).toBe(false);

    store.reset();

    expect(isEmptyUploadFlow(store.getState())).toBe(true);
  });

  it("선택 화면으로 되돌아간 상태도 '진행 없음'이다 — 영상을 버렸으므로 이어갈 것이 없다 (기준 39)", () => {
    const store = analyzing();

    store.backToSelect();

    expect(isEmptyUploadFlow(store.getState())).toBe(true);
  });

  it("진행 중인 스텝은 '진행 없음'이 아니다 — 저장이 지워지면 복원이 불가능해진다 (기준 36)", () => {
    const store = analyzing();
    store.completeAnalysis([[3, 8]]);
    store.goPreview();

    expect(isEmptyUploadFlow(store.getState())).toBe(false);
  });
});

describe("hydrate — 영속 값 재수화 (기준 36)", () => {
  it("저장된 스텝·영상·추천·선택·오케스트레이션이 그대로 복원된다 (기준 36)", () => {
    const source = analyzing();
    source.completeAnalysis([[3, 8]]);
    source.selectManualSegment({ start: 10, end: 20 });
    source.goPreview();
    source.setConfirmFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "k",
        expiresInSec: 300,
        issuedAtMs: 12,
      },
      s3PutDone: true,
    });
    const snapshot = source.toPersisted();

    const restored = createUploadFlowStore();
    restored.hydrate(snapshot);

    expect(restored.getState().step).toBe("preview");
    expect(restored.getState().video).toEqual(video);
    expect(restored.getState().suggestions).toEqual(
      source.getState().suggestions,
    );
    expect(selectSelectedSegment(restored.getState())).toEqual({
      start: 10,
      end: 20,
    });
    expect(restored.getState().confirm.s3PutDone).toBe(true);
  });

  it("진행 없음(null)을 재수화하면 초기 상태를 유지한다 — 저장소 실패 폴백 (기준 37)", () => {
    const store = createUploadFlowStore();

    store.hydrate(null);

    expect(store.getState()).toEqual(createUploadFlowStore().getState());
  });
});

describe("구독 계약", () => {
  it("상태 변경 시 구독자에게 통지되고, 해지 후에는 통지받지 않는다 (useSyncExternalStore 계약)", () => {
    const store = createUploadFlowStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.beginFlight("analysis");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.endFlight();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

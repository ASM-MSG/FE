import { describe, expect, it } from "vitest";
import { backRouteFromPreview, resumeRouteForFlow } from "./upload-flow-resume";
import { createUploadFlowStore, type UploadVideo } from "./upload-flow-store";

/**
 * 기준 36 재작업: 저장된 스텝을 **읽어 그 화면으로 돌아가는** 부분.
 * 검증에서 상태 복원(video·presign·s3PutDone)은 통과했으나 앱이 콜드 스타트 시 늘 `/home`으로
 * 떠서 "같은 스텝으로 복원된다"가 성립하지 않았다 — 저장된 `step`의 소비처가 없었다.
 * 이 순수 매핑이 그 소비처이고, 배선은 `upload-flow-persistence`·`app/index.tsx`가 한다.
 */
const video: UploadVideo = {
  uri: "file:///clip.mp4",
  durationSec: 42,
  fileName: "clip.mp4",
  fileSize: 664_290,
  mimeType: "video/mp4",
};

/** 지정 스텝까지 진행시킨 실제 스토어의 영속 스냅숏 */
const snapshotAt = (step: "analyzing" | "highlight" | "preview") => {
  const store = createUploadFlowStore();
  store.startAnalysis(video);
  if (step === "analyzing") return store.toPersisted();
  store.completeAnalysis([[3, 8]]);
  if (step === "highlight") return store.toPersisted();
  store.goPreview();
  return store.toPersisted();
};

describe("resumeRouteForFlow — 콜드 스타트 시 이어갈 화면 (기준 36)", () => {
  it("분석 중이던 진행은 분석 화면으로 이어진다 (기준 36)", () => {
    expect(resumeRouteForFlow(snapshotAt("analyzing"))).toBe(
      "/upload/analyzing",
    );
  });

  it("추천 선택 중이던 진행은 하이라이트 화면으로 이어진다 (기준 36)", () => {
    expect(resumeRouteForFlow(snapshotAt("highlight"))).toBe(
      "/upload/highlight",
    );
  });

  it("미리보기까지 온 진행은 미리보기 화면으로 이어진다 (기준 36)", () => {
    expect(resumeRouteForFlow(snapshotAt("preview"))).toBe("/upload/preview");
  });

  it("진행이 없으면(null) 이어갈 화면도 없다 — 평소대로 지도 홈으로 부팅한다 (기준 36)", () => {
    expect(resumeRouteForFlow(null)).toBeNull();
  });

  it("선택 화면 상태는 이어갈 진행이 아니다 — 영상을 고르기 전이다 (기준 36·39)", () => {
    const store = createUploadFlowStore();

    expect(resumeRouteForFlow(store.toPersisted())).toBeNull();
  });

  it("영상 없이 스텝만 남은 잔존 값은 이어가지 않는다 — 저장소 형상 검증이 스텝만 보기 때문 (기준 37)", () => {
    const orphan = { ...snapshotAt("preview"), video: null };

    expect(resumeRouteForFlow(orphan)).toBeNull();
  });
});

/**
 * codex 리뷰 P1: 미리보기 `[이전 단계로]`가 **스택 이력에 의존**해 `router.back()`을 부르면,
 * 콜드 스타트로 복원된 흐름에서는 스택이 `[/home, /upload/preview]`뿐이라 하이라이트를
 * 건너뛰고 **홈으로 나가버린다**(스토어는 highlight로 전이시켜 놓은 채로).
 * 복귀 지점은 스택이 아니라 **흐름 상태**가 정해야 한다 — 그래야 정상 진입과 복원 진입이 같다.
 */
describe("backRouteFromPreview — 미리보기에서 되돌아갈 화면 (기준 22)", () => {
  it("콜드 스타트로 복원된 미리보기에서도 하이라이트 화면으로 돌아간다 — 스택에 하이라이트가 없어도 (기준 22·36)", () => {
    const source = createUploadFlowStore();
    source.startAnalysis(video);
    source.completeAnalysis([[3, 8]]);
    source.goPreview();
    const restored = createUploadFlowStore();
    restored.hydrate(source.toPersisted());

    expect(backRouteFromPreview(restored.getState())).toBe("/upload/highlight");
  });

  it("추천을 받아 하이라이트를 거친 흐름은 하이라이트로 돌아간다 (기준 22)", () => {
    const store = createUploadFlowStore();
    store.startAnalysis(video);
    store.completeAnalysis([[3, 8]]);
    store.goPreview();

    expect(backRouteFromPreview(store.getState())).toBe("/upload/highlight");
  });

  it("분석 실패로 직접 지정 폴백에 들어온 흐름도 하이라이트로 돌아간다 (기준 22·32)", () => {
    const store = createUploadFlowStore();
    store.startAnalysis(video);
    store.failAnalysis(3502);
    store.goPreview();

    expect(backRouteFromPreview(store.getState())).toBe("/upload/highlight");
  });

  it("추천이 없어 하이라이트를 건너뛴 흐름은 선택 화면으로 돌아간다 — 돌아갈 하이라이트가 없다 (기준 22)", () => {
    const store = createUploadFlowStore();
    store.startAnalysis(video);
    store.completeAnalysis([]);

    expect(backRouteFromPreview(store.getState())).toBe("/upload");
  });
});

/**
 * codex 리뷰 3회차 P2: 하드웨어 백이 화면의 `goBack`을 우회하면 사용자는 이전 화면을 보는데
 * 영속 스텝은 `preview`로 남고 확정 오케스트레이션도 유지된다 — 재시작이 예기치 않게
 * 미리보기로 재개되고 낡은 확정 진행을 재사용한다. 이탈 정리가 그 재개를 없애는지 고정한다.
 * (백 핸들러 등록 자체는 화면 레이어라 실기 검증 몫이다.)
 */
describe("이탈 정리 후 재개 — 하드웨어 백이 goBack을 거쳐야 하는 이유 (기준 22·36)", () => {
  const previewFlow = () => {
    const store = createUploadFlowStore();
    store.startAnalysis(video);
    store.completeAnalysis([[3, 8]]);
    store.goPreview();
    store.setConfirmFlow({
      presign: {
        uploadUrl: "https://s3",
        s3Key: "stale",
        expiresInSec: 600,
        issuedAtMs: 0,
      },
      s3PutDone: true,
    });
    return store;
  };

  it("정리 없이 이탈하면 재개가 미리보기로 돌아온다 — 하드웨어 백이 우회하던 상태 (기준 36)", () => {
    const store = previewFlow();

    expect(resumeRouteForFlow(store.toPersisted())).toBe("/upload/preview");
  });

  it("하이라이트로 되돌리는 정리를 거치면 재개도 하이라이트로 간다 (기준 22·36)", () => {
    const store = previewFlow();

    store.backToHighlight();

    expect(resumeRouteForFlow(store.toPersisted())).toBe("/upload/highlight");
    expect(store.getState().confirm).toEqual({
      presign: null,
      s3PutDone: false,
    });
  });

  it("선택 화면으로 되돌리는 정리를 거치면 이어갈 진행이 없다 (기준 22·36·39)", () => {
    const store = previewFlow();

    store.backToSelect();

    expect(resumeRouteForFlow(store.toPersisted())).toBeNull();
  });
});

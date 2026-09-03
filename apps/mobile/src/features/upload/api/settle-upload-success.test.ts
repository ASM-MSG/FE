import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadVideo } from "../model/upload-flow-store";

/**
 * codex 리뷰 3회차 P1: 완료 오버레이가 떠 있는 동안 앱이 종료되면 스토어에는 여전히
 * `step: "preview"`와 `confirm: {presign, s3PutDone: true}`가 남는다. 다음 실행이 그 화면으로
 * 재개되고 게시가 다시 활성화되는데, 오케스트레이션은 PUT까지 끝난 상태라 **finalize만 다시
 * 쏴 중복 영상이 생긴다.**
 *
 * 2회차에서 닫은 "확정 응답을 못 본 채 종료" 창과는 다른 문제다 — 이건 **응답을 이미 받은**
 * 뒤라 클라이언트가 닫을 수 있다. 성공 정산이 재개 가능한 진행을 없애는지 여기서 고정한다.
 * (완료 화면 표시는 화면 로컬 상태라 정산과 무관하게 유지된다.)
 */
const API_BASE = "https://api.test.local";

const video: UploadVideo = {
  uri: "file:///clip.mp4",
  durationSec: 42,
  fileName: "clip.mp4",
  fileSize: 664_290,
  mimeType: "video/mp4",
};

/** 확정 직전 상태 — presign·S3 PUT까지 끝나 finalize만 남은 진행 */
const primeConfirmedFlow = () => {
  uploadFlowStore.reset();
  uploadFlowStore.startAnalysis(video);
  uploadFlowStore.completeAnalysis([[3, 8]]);
  uploadFlowStore.goPreview();
  uploadFlowStore.setConfirmFlow({
    presign: {
      uploadUrl: "https://bucket.s3.example.com/key",
      s3Key: "videos/clip.mp4",
      expiresInSec: 600,
      issuedAtMs: Date.now(),
    },
    s3PutDone: true,
  });
};

/**
 * 정산 대상 모듈은 생성 SDK(=EXPO_PUBLIC_API_BASE_URL 가드)를 정적으로 끌고 와 동적 import가
 * 필요하다. **스토어도 같은 모듈 그래프에서 가져와야 한다** — resetModules 뒤에 정적 import를
 * 섞으면 서로 다른 싱글턴 인스턴스를 보게 되어 테스트가 아무것도 관찰하지 못한다.
 */
type MutationsModule = typeof import("./use-upload-mutations");
type StoreModule = typeof import("../model/upload-flow-store");
type ResumeModule = typeof import("../model/upload-flow-resume");
type OrchestrationModule = typeof import("../model/upload-orchestration");
type ProcessingModule = typeof import("../model/processing-persistence");

let settleUploadSuccess: MutationsModule["settleUploadSuccess"];
let uploadFlowStore: StoreModule["uploadFlowStore"];
let createUploadFlowStore: StoreModule["createUploadFlowStore"];
let isEmptyUploadFlow: StoreModule["isEmptyUploadFlow"];
let resumeRouteForFlow: ResumeModule["resumeRouteForFlow"];
let nextStage: OrchestrationModule["nextStage"];
let processingStore: ProcessingModule["processingStore"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  ({ settleUploadSuccess } = await import("./use-upload-mutations"));
  ({ uploadFlowStore, createUploadFlowStore, isEmptyUploadFlow } =
    await import("../model/upload-flow-store"));
  ({ resumeRouteForFlow } = await import("../model/upload-flow-resume"));
  ({ nextStage } = await import("../model/upload-orchestration"));
  ({ processingStore } = await import("../model/processing-persistence"));
});

afterEach(() => {
  uploadFlowStore.reset();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const uploaded = { videoId: 295, gridId: "16858_11420" };

describe("settleUploadSuccess — 게시 성공 정산 (기준 28·29·35)", () => {
  it("성공 응답을 받으면 이어갈 진행이 남지 않는다 — 완료 화면 표시 중 종료돼도 재개가 미리보기로 가지 않는다 (기준 29)", () => {
    primeConfirmedFlow();
    expect(resumeRouteForFlow(uploadFlowStore.toPersisted())).toBe(
      "/upload/preview",
    );

    settleUploadSuccess(new QueryClient(), uploaded);

    expect(resumeRouteForFlow(uploadFlowStore.toPersisted())).toBeNull();
  });

  it("성공 후 저장된 스냅숏으로는 재개해도 확정이 곧바로 발사되지 않는다 — 중복 게시 차단 (기준 35)", () => {
    primeConfirmedFlow();
    // 정산 전에는 finalize만 남은 상태다 — 이 상태로 재개하면 게시가 반복된다
    expect(nextStage(uploadFlowStore.getState().confirm, Date.now())).toBe(
      "finalize",
    );

    settleUploadSuccess(new QueryClient(), uploaded);

    expect(nextStage(uploadFlowStore.getState().confirm, Date.now())).not.toBe(
      "finalize",
    );
  });

  it("성공 정산이 영속 값 제거로 이어진다 — 저장소가 비워지는 조건을 만족한다 (기준 39)", () => {
    primeConfirmedFlow();

    settleUploadSuccess(new QueryClient(), uploaded);

    expect(isEmptyUploadFlow(uploadFlowStore.getState())).toBe(true);
  });

  it("격자 쿼리 무효화는 그대로 발사된다 — 정산에 정리가 더해져도 기존 계약이 유지된다 (기준 28)", () => {
    primeConfirmedFlow();
    const queryClient = new QueryClient();
    const invalidated = vi.spyOn(queryClient, "invalidateQueries");

    settleUploadSuccess(queryClient, uploaded);

    expect(invalidated.mock.calls.length).toBeGreaterThanOrEqual(7);
  });

  it("정산 후 상태가 새 스토어의 초기 상태와 같다 — 카메라 재진입 시 잔재 없음 (기준 29)", () => {
    primeConfirmedFlow();

    settleUploadSuccess(new QueryClient(), uploaded);

    expect(uploadFlowStore.getState()).toEqual(
      createUploadFlowStore().getState(),
    );
  });
});

/**
 * MSG-429 기준 8 — 확정 성공은 블러 처리 대기 등록의 **유일한 지점**이다.
 * 바로 다음 줄의 `reset()`이 플로우를 비우므로 videoId를 아는 마지막 순간이고, 여기서
 * 빠지면 완료를 감지할 방법이 사라져 "알림으로 알려드릴게요"가 거짓말이 된다.
 */
describe("settleUploadSuccess — 블러 처리 대기 등록 (MSG-429 기준 8)", () => {
  it("확정 성공한 videoId를 대기 목록에 남긴다", async () => {
    primeConfirmedFlow();

    settleUploadSuccess(new QueryClient(), uploaded, () => 1_700_000);

    // track은 저장소 왕복이라 비동기다 — 완료 화면 표시를 막지 않으려 기다리지 않는다
    await vi.waitFor(() =>
      expect(processingStore.getPending()).toEqual([
        { videoId: uploaded.videoId, startedAtMs: 1_700_000 },
      ]),
    );
  });
});

/**
 * AC 9 (D12): 행사 귀속 확정이 성공하면 기존 격자 무효화에 더해 **그 위치의 영상 목록**과
 * **행사 위치 목록**(videoCount)을 무효화한다 — 올린 영상이 위치 상세에 바로 보인다.
 */
describe("settleUploadSuccess — 행사 확정 무효화 확장 (AC 9·D12)", () => {
  const event = { occurrenceId: 5, locationId: 11 };

  /** 무효화 호출에 실린 생성 쿼리 키의 식별자(`_id`)들 */
  const invalidatedIds = (calls: unknown[][]): (string | undefined)[] =>
    calls.flatMap((call) => {
      const filters = call[0] as { queryKey?: { _id?: string }[] } | undefined;
      return (filters?.queryKey ?? []).map((key) => key._id);
    });

  it("행사 대상이 있으면 위치 영상 목록·위치 목록을 추가로 무효화한다", () => {
    primeConfirmedFlow();
    const queryClient = new QueryClient();
    const invalidated = vi.spyOn(queryClient, "invalidateQueries");

    settleUploadSuccess(queryClient, uploaded, Date.now, event);

    const ids = invalidatedIds(invalidated.mock.calls);
    expect(ids).toContain("getLocationVideos");
    expect(ids).toContain("getLocations");
  });

  it("일반 업로드는 행사 키를 무효화하지 않는다 — 기본값 = 기존 동작", () => {
    primeConfirmedFlow();
    const queryClient = new QueryClient();
    const invalidated = vi.spyOn(queryClient, "invalidateQueries");

    settleUploadSuccess(queryClient, uploaded);

    const ids = invalidatedIds(invalidated.mock.calls);
    expect(ids).not.toContain("getLocationVideos");
    expect(ids).not.toContain("getLocations");
  });
});

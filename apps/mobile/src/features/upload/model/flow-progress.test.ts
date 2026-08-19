import { describe, expect, it } from "vitest";
import { withFlowProgress } from "./flow-progress";
import {
  createOrchestration,
  runUploadFlow,
  type OrchestrationState,
  type PresignInfo,
  type UploadFlowEffects,
} from "./upload-orchestration";

/**
 * codex 리뷰 2회차 P1-1: `runUploadFlow`는 단계별 진행을 **함수 지역 변수**에 들고 있다가
 * 반환/throw할 때 한 번만 밖으로 내보낸다. 그래서 presign이나 S3 PUT이 끝난 뒤 흐름이 끝나기
 * **전에** 앱이 종료되면 그 진행이 어디에도 기록되지 않고, 콜드 스타트 재개가 **이미 끝난
 * 단계를 다시 실행한다**(기준 31·34·36의 "재시도가 성공 단계를 건너뛴다" 계약이 프로세스
 * 재시작에서 깨진다).
 *
 * 프로세스 종료는 catch 블록도 실행시키지 않으므로, 이 테스트는 **에러 핸들러가 준 상태를
 * 쓰지 않는다** — 오직 진행 중 기록된 값만으로 재개한다. 그것이 실제 콜드 스타트와 같은 조건이다.
 */
const PRESIGN = {
  uploadUrl: "https://bucket.s3.example.com/key?sig=abc",
  s3Key: "videos/clip.mp4",
  expiresInSec: 600,
};

/** 호출 순서를 기록하는 이펙트 — finalize에서 '앱 종료'를 흉내 낼 수 있다 */
const trackingEffects = (
  calls: string[],
  options: { dieAtFinalize?: boolean } = {},
): UploadFlowEffects<string> => ({
  presign: async () => {
    calls.push("presign");
    return PRESIGN;
  },
  putToS3: async () => {
    calls.push("s3put");
  },
  finalize: async () => {
    calls.push("finalize");
    if (options.dieAtFinalize) throw new Error("앱 종료");
    return "videoId-1";
  },
  now: () => 1000,
});

describe("withFlowProgress — 단계 완료 시점마다 진행 기록 (기준 31·34·36)", () => {
  it("presign이 끝나면 S3 PUT을 시작하기 전에 발급 결과가 기록된다 — 업로드 도중 종료돼도 재발급하지 않는다", async () => {
    const recorded: OrchestrationState[] = [];
    const initial = createOrchestration();

    await runUploadFlow(
      initial,
      withFlowProgress(trackingEffects([]), initial, (state) =>
        recorded.push(state),
      ),
    );

    expect(recorded[0]).toEqual({
      presign: { ...PRESIGN, issuedAtMs: 1000 },
      s3PutDone: false,
    });
  });

  it("S3 PUT이 끝나면 확정을 발사하기 전에 완료가 기록된다 — 응답 대기 중 종료돼도 재업로드하지 않는다", async () => {
    const recorded: OrchestrationState[] = [];
    const initial = createOrchestration();

    await runUploadFlow(
      initial,
      withFlowProgress(trackingEffects([]), initial, (state) =>
        recorded.push(state),
      ),
    );

    expect(recorded.at(-1)).toEqual({
      presign: { ...PRESIGN, issuedAtMs: 1000 },
      s3PutDone: true,
    });
  });

  it("단계를 마친 뒤 앱이 종료돼도 재개가 presign·S3 PUT을 다시 실행하지 않는다 (기준 31·34·36)", async () => {
    // 1차 시도 — finalize에서 프로세스가 죽는다(에러 핸들러가 준 상태는 쓰지 않는다)
    let persisted = createOrchestration();
    const firstCalls: string[] = [];
    await runUploadFlow(
      persisted,
      withFlowProgress(
        trackingEffects(firstCalls, { dieAtFinalize: true }),
        persisted,
        (state) => {
          persisted = state;
        },
      ),
    ).catch(() => {
      /* 프로세스 종료 — 어떤 정리 코드도 돌지 않았다고 본다 */
    });
    expect(firstCalls).toEqual(["presign", "s3put", "finalize"]);

    // 2차 — 콜드 스타트가 기록된 진행으로 재개한다
    const resumedCalls: string[] = [];
    await runUploadFlow(
      persisted,
      withFlowProgress(trackingEffects(resumedCalls), persisted, () => {}),
    );

    expect(resumedCalls).toEqual(["finalize"]);
  });

  it("확정만 남은 상태로 재개해도 기록이 발급 정보를 잃지 않는다 — presign:null·s3PutDone:true는 재개 불가 상태다", async () => {
    const restored: OrchestrationState = {
      presign: { ...PRESIGN, issuedAtMs: 1000 },
      s3PutDone: true,
    };
    const recorded: OrchestrationState[] = [];

    await runUploadFlow(
      restored,
      withFlowProgress(trackingEffects([]), restored, (state) =>
        recorded.push(state),
      ),
    );

    for (const state of recorded) {
      expect(state.presign).not.toBeNull();
    }
  });

  it("주입한 이펙트의 동작과 결과를 바꾸지 않는다 — 기록만 덧붙인다 (보존 단정)", async () => {
    const calls: string[] = [];
    const initial = createOrchestration();

    const { result, state } = await runUploadFlow(
      initial,
      withFlowProgress(trackingEffects(calls), initial, () => {}),
    );

    expect(calls).toEqual(["presign", "s3put", "finalize"]);
    expect(result).toBe("videoId-1");
    expect(state.s3PutDone).toBe(true);
    expect((state.presign as PresignInfo).s3Key).toBe(PRESIGN.s3Key);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  createOrchestration,
  isPresignExpired,
  nextStage,
  runUploadFlow,
  UploadFlowError,
  type OrchestrationState,
  type PresignInfo,
  type UploadStage,
} from "./upload-orchestration";

/**
 * 기준 23: presign → s3put → finalize 단계열이 남은 단계만 실행하고, s3PutDone 이후에는
 * presign 만료와 무관하게 finalize만 남으며, 실패는 단계가 표기된 UploadFlowError로 나온다.
 * 웹 MSG-329 원본과 동등 — 웹 원본은 변수 경로 동적 import (upload-wizard.parity.test.ts 주석).
 */
interface WebOrchestrationModule {
  createOrchestration: typeof createOrchestration;
  isPresignExpired: typeof isPresignExpired;
  nextStage: typeof nextStage;
  runUploadFlow: typeof runUploadFlow;
  UploadFlowError: typeof UploadFlowError;
}
const WEB_ORCHESTRATION_PATH = new URL(
  "../../../../../web/src/features/upload/model/upload-orchestration.ts",
  import.meta.url,
).pathname;
const loadWebOrchestration = (): Promise<WebOrchestrationModule> =>
  import(WEB_ORCHESTRATION_PATH);

const presign = (issuedAtMs: number, expiresInSec = 300): PresignInfo => ({
  uploadUrl: "https://bucket.s3.example.com/key?sig=abc",
  s3Key: "videos/2026/clip.mp4",
  expiresInSec,
  issuedAtMs,
});

/** 판정 입력 전 조합 — presign 없음 / 유효 / 만료 × PUT 완료 여부 */
const STATES: OrchestrationState[] = [
  { presign: null, s3PutDone: false },
  { presign: null, s3PutDone: true },
  { presign: presign(0), s3PutDone: false },
  { presign: presign(0), s3PutDone: true },
];
const NOWS = [0, 299_999, 300_000, 900_000];

describe("nextStage — 남은 단계 판정 (기준 23)", () => {
  it("presign이 없으면 presign부터 시작한다 (기준 23)", () => {
    expect(nextStage(createOrchestration(), 0)).toBe<UploadStage>("presign");
  });

  it("유효한 presign이 있고 PUT 전이면 s3put이다 (기준 23)", () => {
    expect(nextStage({ presign: presign(0), s3PutDone: false }, 1000)).toBe(
      "s3put",
    );
  });

  it("PUT 전에 presign이 만료되면 재발급부터 다시 한다 (기준 23)", () => {
    expect(nextStage({ presign: presign(0), s3PutDone: false }, 300_000)).toBe(
      "presign",
    );
  });

  it("s3PutDone 이후에는 presign이 만료돼도 finalize만 남는다 (기준 23)", () => {
    expect(nextStage({ presign: presign(0), s3PutDone: true }, 900_000)).toBe(
      "finalize",
    );
  });
});

describe("runUploadFlow — 단계열 실행과 재시도 (기준 23·31·34)", () => {
  it("빈 상태에서 presign → s3put → finalize 순으로 전부 실행한다 (기준 23·24)", async () => {
    const order: string[] = [];
    const effects = {
      presign: async () => {
        order.push("presign");
        return { uploadUrl: "https://s3", s3Key: "k", expiresInSec: 300 };
      },
      putToS3: async () => {
        order.push("s3put");
      },
      finalize: async (s3Key: string) => {
        order.push("finalize");
        return { videoId: 1, s3Key };
      },
      now: () => 0,
    };

    const { result, state } = await runUploadFlow(
      createOrchestration(),
      effects,
    );

    expect(order).toEqual(["presign", "s3put", "finalize"]);
    expect(result).toEqual({ videoId: 1, s3Key: "k" });
    expect(state.s3PutDone).toBe(true);
  });

  it("PUT까지 성공한 상태로 재시도하면 finalize만 실행한다 — 성공 단계 건너뛰기 (기준 31·34)", async () => {
    const presignEffect = vi.fn();
    const putEffect = vi.fn();
    const finalize = vi.fn(async () => "ok");

    await runUploadFlow(
      { presign: presign(0), s3PutDone: true },
      {
        presign: presignEffect,
        putToS3: putEffect,
        finalize,
        now: () => 900_000,
      },
    );

    expect(presignEffect).not.toHaveBeenCalled();
    expect(putEffect).not.toHaveBeenCalled();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("실패 시 단계와 진행 상태를 담은 UploadFlowError를 던진다 (기준 23·34)", async () => {
    const cause = new Error("S3 업로드 실패 (HTTP 403)");

    const error = await runUploadFlow(createOrchestration(), {
      presign: async () => ({
        uploadUrl: "https://s3",
        s3Key: "k",
        expiresInSec: 300,
      }),
      putToS3: async () => {
        throw cause;
      },
      finalize: async () => "unreachable",
      now: () => 0,
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(UploadFlowError);
    const flowError = error as UploadFlowError;
    expect(flowError.stage).toBe<UploadStage>("s3put");
    expect(flowError.state.presign?.s3Key).toBe("k");
    expect(flowError.state.s3PutDone).toBe(false);
    expect(flowError.cause).toBe(cause);
  });
});

describe("웹 원본 동등성 (기준 44)", () => {
  it("상태 × 시각 전 조합에서 웹 nextStage·isPresignExpired와 판정이 동일하다 (기준 23)", async () => {
    const web = await loadWebOrchestration();

    for (const state of STATES) {
      for (const now of NOWS) {
        expect(nextStage(state, now)).toBe(web.nextStage(state, now));
        if (state.presign !== null) {
          expect(isPresignExpired(state.presign, now)).toBe(
            web.isPresignExpired(state.presign, now),
          );
        }
      }
    }
  });

  it("웹 runUploadFlow와 같은 단계 순서·같은 실패 단계를 낸다 (기준 23)", async () => {
    const web = await loadWebOrchestration();
    const record = (order: string[]) => ({
      presign: async () => {
        order.push("presign");
        return { uploadUrl: "https://s3", s3Key: "k", expiresInSec: 300 };
      },
      putToS3: async () => {
        order.push("s3put");
        throw new Error("boom");
      },
      finalize: async () => "unreachable",
      now: () => 0,
    });

    const mobileOrder: string[] = [];
    const webOrder: string[] = [];
    const mobileError = await runUploadFlow(
      createOrchestration(),
      record(mobileOrder),
    ).catch((error: unknown) => error);
    const webError = await web
      .runUploadFlow(web.createOrchestration(), record(webOrder))
      .catch((error: unknown) => error);

    expect(mobileOrder).toEqual(webOrder);
    expect((mobileError as UploadFlowError).stage).toBe(
      (webError as UploadFlowError).stage,
    );
  });
});

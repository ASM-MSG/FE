import { describe, expect, it, vi } from "vitest";
import {
  createOrchestration,
  isPresignExpired,
  nextStage,
  runUploadFlow,
  UploadFlowError,
} from "./upload-orchestration";

/**
 * 업로드 오케스트레이션 상태 머신 (B3·B9·B11) — presign → S3 PUT → 확정(선분석/게시 공통)
 * 단계열을 순수 상태 + 주입 이펙트로 구동한다. 재시도 시 성공한 단계는 건너뛰고,
 * presigned URL이 만료면 재발급부터 다시 한다.
 */

const presignResult = (expiresInSec = 600) => ({
  uploadUrl: "https://s3.example.com/put",
  s3Key: "videos/pending/1/key.mp4",
  expiresInSec,
});

const effectsWithLog = (log: string[]) => ({
  presign: vi.fn(async () => {
    log.push("presign");
    return presignResult();
  }),
  putToS3: vi.fn(async () => {
    log.push("s3put");
  }),
  finalize: vi.fn(async (s3Key: string) => {
    log.push("finalize");
    return { s3Key };
  }),
  now: () => 1_000,
});

describe("runUploadFlow — 단계 순서 (B3·B9)", () => {
  it("presign → S3 PUT → 확정 순서로 호출되고 확정 결과를 반환한다", async () => {
    const log: string[] = [];
    const effects = effectsWithLog(log);

    const { result } = await runUploadFlow(createOrchestration(), effects);

    expect(log).toEqual(["presign", "s3put", "finalize"]);
    expect(result).toEqual({ s3Key: "videos/pending/1/key.mp4" });
  });

  it("확정에는 presign이 발급한 s3Key가 그대로 전달된다", async () => {
    const effects = effectsWithLog([]);
    await runUploadFlow(createOrchestration(), effects);
    expect(effects.finalize).toHaveBeenCalledWith("videos/pending/1/key.mp4");
  });
});

describe("runUploadFlow — 단계별 실패 구분과 재시도 스킵 (B11)", () => {
  it("확정 실패 시 stage=finalize로 던지고, 그 상태로 재시도하면 presign·S3 PUT은 재실행하지 않는다", async () => {
    const log: string[] = [];
    const effects = effectsWithLog(log);
    effects.finalize.mockImplementationOnce(async () => {
      log.push("finalize");
      throw new Error("서버 오류");
    });

    const failure = await runUploadFlow(createOrchestration(), effects).catch(
      (e: unknown) => e,
    );
    expect(failure).toBeInstanceOf(UploadFlowError);
    const flowError = failure as UploadFlowError;
    expect(flowError.stage).toBe("finalize");
    expect(log).toEqual(["presign", "s3put", "finalize"]);

    // 재시도 — 보존된 상태에서 확정만 다시 실행한다
    await runUploadFlow(flowError.state, effects);
    expect(log).toEqual(["presign", "s3put", "finalize", "finalize"]);
  });

  it("S3 PUT 실패 후 presign이 아직 유효하면 재시도는 PUT부터 한다", async () => {
    const log: string[] = [];
    const effects = effectsWithLog(log);
    effects.putToS3.mockImplementationOnce(async () => {
      log.push("s3put");
      throw new Error("네트워크 오류");
    });

    const failure = (await runUploadFlow(createOrchestration(), effects).catch(
      (e: unknown) => e,
    )) as UploadFlowError;
    expect(failure.stage).toBe("s3put");

    await runUploadFlow(failure.state, effects);
    expect(log).toEqual(["presign", "s3put", "s3put", "finalize"]);
  });

  it("S3 PUT 완료 전 presign이 만료됐으면 재시도는 재발급부터 다시 한다", async () => {
    const log: string[] = [];
    const effects = effectsWithLog(log);
    effects.presign.mockImplementationOnce(async () => {
      log.push("presign");
      return presignResult(10); // 10초 유효
    });
    effects.putToS3.mockImplementationOnce(async () => {
      log.push("s3put");
      throw new Error("타임아웃");
    });

    const failure = (await runUploadFlow(createOrchestration(), effects).catch(
      (e: unknown) => e,
    )) as UploadFlowError;
    expect(failure.stage).toBe("s3put");

    // 만료 이후 시각으로 재시도 — presign부터 다시
    await runUploadFlow(failure.state, {
      ...effects,
      now: () => 1_000 + 10_000,
    });
    expect(log).toEqual(["presign", "s3put", "presign", "s3put", "finalize"]);
  });

  it("presign 실패는 stage=presign으로 구분된다", async () => {
    const effects = effectsWithLog([]);
    effects.presign.mockRejectedValueOnce(new Error("발급 실패"));

    const failure = (await runUploadFlow(createOrchestration(), effects).catch(
      (e: unknown) => e,
    )) as UploadFlowError;
    expect(failure.stage).toBe("presign");
    expect(effects.putToS3).not.toHaveBeenCalled();
  });

  it("실패 원인은 cause로 보존된다 — 확정 실패의 developCode 분기(B5)가 원본 에러를 읽는다", async () => {
    const effects = effectsWithLog([]);
    const original = new Error("3502");
    effects.finalize.mockRejectedValueOnce(original);

    const failure = (await runUploadFlow(createOrchestration(), effects).catch(
      (e: unknown) => e,
    )) as UploadFlowError;
    expect(failure.cause).toBe(original);
  });
});

describe("nextStage / isPresignExpired — 만료 판정 (B11)", () => {
  it("발급 시각 + expiresInSec 경과 시점부터 만료다", () => {
    const presign = { ...presignResult(60), issuedAtMs: 1_000 };
    expect(isPresignExpired(presign, 1_000 + 59_999)).toBe(false);
    expect(isPresignExpired(presign, 1_000 + 60_000)).toBe(true);
  });

  it("S3 PUT이 이미 완료됐으면 presign 만료와 무관하게 확정 단계다 — s3Key는 만료되지 않는다", () => {
    const state = {
      presign: { ...presignResult(10), issuedAtMs: 0 },
      s3PutDone: true,
    };
    expect(nextStage(state, 999_999)).toBe("finalize");
  });

  it("PUT 미완료 + 만료면 presign 단계, 유효하면 s3put 단계다", () => {
    const state = {
      presign: { ...presignResult(60), issuedAtMs: 0 },
      s3PutDone: false,
    };
    expect(nextStage(state, 60_000)).toBe("presign");
    expect(nextStage(state, 1_000)).toBe("s3put");
  });
});

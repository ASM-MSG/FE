/**
 * 업로드 오케스트레이션 — presign → S3 PUT → 확정 단계열의 순수 상태 머신 (B3·B9·B11).
 * 선분석(확정=highlight-preview)과 게시(확정=POST /api/videos)가 같은 단계열을 공유한다.
 * 플랫폼 API를 참조하지 않는다 — 이펙트(presign/putToS3/finalize)는 주입받아 실행만 한다
 * (RN 재사용 대상). 실패는 단계가 표기된 UploadFlowError로 던지고, 그 안의 state로
 * 재시도하면 성공한 단계는 건너뛴다. presigned URL이 만료면 재발급부터 다시 한다.
 */

/** presign 발급 결과 + 발급 시각 — 만료 판정의 기준점 */
export interface PresignInfo {
  uploadUrl: string;
  s3Key: string;
  /** presigned URL 유효 시간(초) — 서버 응답 그대로 */
  expiresInSec: number;
  /** 발급 완료 시각(ms) — 클라이언트 기준 */
  issuedAtMs: number;
}

/** 업로드 단계 — 실패 표시·재시도 스킵의 단위 (B11) */
export type UploadStage = "presign" | "s3put" | "finalize";

/** 오케스트레이션 상태 — 완료된 단계의 산출물만 기록한다 */
export interface OrchestrationState {
  presign: PresignInfo | null;
  s3PutDone: boolean;
}

export const createOrchestration = (): OrchestrationState => ({
  presign: null,
  s3PutDone: false,
});

/** presigned URL 만료 판정 — 발급 시각 + expiresInSec 경과 시점부터 만료 (B11) */
export const isPresignExpired = (
  presign: PresignInfo,
  nowMs: number,
): boolean => nowMs >= presign.issuedAtMs + presign.expiresInSec * 1000;

/**
 * 다음에 실행할 단계 판정. [B11]
 * S3 PUT이 끝났으면 presign 만료와 무관하게 확정만 남는다(s3Key는 만료되지 않는다).
 * PUT 전인데 presign이 없거나 만료면 재발급부터 다시 한다.
 */
export const nextStage = (
  state: OrchestrationState,
  nowMs: number,
): UploadStage => {
  if (state.s3PutDone) return "finalize";
  if (state.presign === null || isPresignExpired(state.presign, nowMs)) {
    return "presign";
  }
  return "s3put";
};

/** 단계가 표기된 흐름 실패 — state를 보존해 재시도가 성공 단계를 건너뛰게 한다 (B11) */
export class UploadFlowError extends Error {
  readonly stage: UploadStage;
  readonly state: OrchestrationState;

  constructor(stage: UploadStage, state: OrchestrationState, cause: unknown) {
    super(`업로드 흐름 실패 (단계: ${stage})`, { cause });
    this.name = "UploadFlowError";
    this.stage = stage;
    this.state = state;
  }
}

/** 주입 이펙트 — 실제 호출(생성 SDK·전역 fetch)은 api 계층이 구현한다 */
export interface UploadFlowEffects<TResult> {
  presign: () => Promise<Omit<PresignInfo, "issuedAtMs">>;
  putToS3: (presign: PresignInfo) => Promise<void>;
  finalize: (s3Key: string) => Promise<TResult>;
  /** 시각 주입 — 기본 Date.now (테스트·만료 판정용) */
  now?: () => number;
}

/**
 * 단계열 실행 — presign → S3 PUT → 확정 순서로 남은 단계만 실행한다. [B3·B9·B11]
 * 실패 시 해당 단계와 진행 상태를 담은 UploadFlowError를 던진다.
 */
export const runUploadFlow = async <TResult>(
  state: OrchestrationState,
  effects: UploadFlowEffects<TResult>,
): Promise<{ state: OrchestrationState; result: TResult }> => {
  const now = effects.now ?? Date.now;
  let current = state;

  // 단계열은 유한하다(presign→s3put→finalize 최대 3단계) — 각 반복이 단계를 전진시킨다
  for (;;) {
    const stage = nextStage(current, now());
    try {
      if (stage === "presign") {
        const issued = await effects.presign();
        current = { ...current, presign: { ...issued, issuedAtMs: now() } };
      } else if (stage === "s3put") {
        // nextStage가 "s3put"을 돌려준 시점에 presign은 항상 존재한다
        await effects.putToS3(current.presign as PresignInfo);
        current = { ...current, s3PutDone: true };
      } else {
        const result = await effects.finalize(
          (current.presign as PresignInfo).s3Key,
        );
        return { state: current, result };
      }
    } catch (cause) {
      throw new UploadFlowError(stage, current, cause);
    }
  }
};

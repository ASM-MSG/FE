import type {
  OrchestrationState,
  PresignInfo,
  UploadFlowEffects,
} from "./upload-orchestration";

/**
 * 단계 완료 시점마다 진행을 밖으로 흘려보내는 이펙트 데코레이터 (기준 31·34·36).
 *
 * `runUploadFlow`는 단계별 진행을 **함수 지역 변수**에 들고 있다가 반환하거나 throw할 때
 * 한 번만 내보낸다. 그래서 presign이나 S3 PUT이 끝난 뒤 흐름이 끝나기 **전에** 앱이 종료되면
 * 그 진행이 어디에도 남지 않고, 콜드 스타트 재개가 이미 끝난 단계를 다시 실행한다 —
 * "재시도가 성공 단계를 건너뛴다"는 계약이 프로세스 재시작에서만 조용히 깨져 있었다
 * (codex 리뷰 2회차 P1). 프로세스 종료는 catch 블록도 실행시키지 않으므로 에러 핸들러의
 * 상태 보존만으로는 부족하다.
 *
 * `upload-orchestration.ts`는 웹 원본과 **본문이 같아야 하는 포팅 파일**이라 건드리지 않는다.
 * 대신 이펙트 호출 시점이 곧 단계 경계라는 성질을 쓴다:
 * - `putToS3(presign)` 인자 = presign이 방금 확정된 상태 (수 초~수십 초 걸리는 PUT 직전)
 * - `finalize(s3Key)` 호출 = S3 PUT이 방금 끝난 상태 (확정 응답 대기 직전)
 *
 * **남는 창(의도적)**: 확정 요청을 보낸 뒤 응답을 못 본 채 종료되면, 재개는 `finalize`만
 * 다시 실행한다. 서버가 이미 처리했다면 영상이 한 번 더 생길 수 있다 — 클라이언트만으로는
 * 판별할 수 없고 서버 멱등 키가 필요하다(환류 대상). 이 데코레이터가 없애는 것은
 * **재발급·재업로드**(고아 S3 객체·낭비)이고, 확정 재발사 창은 좁히기만 한다.
 */
export const withFlowProgress = <TResult>(
  effects: UploadFlowEffects<TResult>,
  /** 재개 시작 상태 — 확정만 남은 재개에서 발급 정보를 잃지 않도록 기준점으로 삼는다 */
  initial: OrchestrationState,
  record: (state: OrchestrationState) => void,
): UploadFlowEffects<TResult> => {
  let presign: PresignInfo | null = initial.presign;

  return {
    ...effects,
    putToS3: async (issued) => {
      // presign 확정 — 오래 걸리는 PUT에 들어가기 전에 남긴다
      presign = issued;
      record({ presign: issued, s3PutDone: false });
      await effects.putToS3(issued);
    },
    finalize: async (s3Key) => {
      // S3 PUT 완료 — 확정 응답을 기다리기 전에 남긴다
      record({ presign, s3PutDone: true });
      return effects.finalize(s3Key);
    },
  };
};

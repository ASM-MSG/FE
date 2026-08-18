/** 백엔드 공통 응답 봉투 — 생성된 ApiResponseDtoXxx 타입들과 구조적으로 호환 (3필드 전부 필수) */
type ApiEnvelope<T> = {
  developCode: number;
  message: string;
  data: T;
};

/**
 * 응답 봉투에서 data 페이로드만 꺼낸다 — 웹 `shared/api/envelope.ts`의 모바일 복제본이다
 * (수기 모듈은 복제 + parity 테스트로 고정 — envelope.parity.test.ts, 스펙 추정 3).
 * 웹을 import하지 않는 이유: 웹 리팩터링이 모바일 **런타임**에 직결되는 것을 막고,
 * 드리프트는 번들이 아니라 테스트가 먼저 알리게 하기 위함.
 *
 * @example
 * useQuery({ ...getMeOptions(), select: unwrapEnvelope })
 */
export const unwrapEnvelope = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

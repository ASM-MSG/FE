/** 백엔드 공통 응답 봉투 — 생성된 ApiResponseDtoXxx 타입들과 구조적으로 호환 (3필드 전부 필수) */
type ApiEnvelope<T> = {
  developCode: number;
  message: string;
  data: T;
};

/**
 * 응답 봉투에서 data 페이로드만 꺼낸다 — 생성된 queryOptions의 `select`에 조합해
 * 화면 코드가 봉투 계층을 모르게 한다 (MSG-323 수용 기준 6).
 *
 * 봉투 없는 응답(예: logout의 `200: unknown`)은 언랩 비대상 — 타입 수준에서 거부된다.
 *
 * @example
 * useQuery({ ...getCellOptions({ path }), select: unwrapEnvelope })
 */
export const unwrapEnvelope = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

/**
 * 게이트형 쿼리 공통 상태 (MSG-328) — region 훅들의 반환 꼬리가 동형으로 늘어 추출
 * (중복 게이트 검출 — 두 번째 사용처 규칙). 비활성(게이트 false) 쿼리는 영원히
 * pending이라 isPending을 게이트로 눌러준다. 순수 매핑 — 지도 SDK/플랫폼 무의존(RN 경계).
 */
export const gatedQueryStatus = (
  query: {
    isPending: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  },
  active: boolean,
): { isPending: boolean; isError: boolean; retry: () => void } => ({
  isPending: active && query.isPending,
  isError: query.isError,
  retry: () => void query.refetch(),
});

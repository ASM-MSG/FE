/**
 * 게이트형 쿼리 공통 상태 (MSG-425 L13) — 웹 `features/region/model/gated-query-status.ts`
 * 복제본. 비활성(게이트 false) 쿼리는 TanStack Query에서 영원히 pending이라 isPending을
 * 게이트로 눌러준다 — 누르지 않으면 갤러리가 영구 스켈레톤에 갇힌다(웹 codex 리뷰 회귀).
 *
 * 배치: 도메인 무관 쿼리 유틸이라 `shared/api`가 맞다(모바일에는 features/region이 없다).
 * 순수 매핑 — RN·플랫폼 API 무의존. 동등성은 `gated-query-status.parity.test.ts`가 고정한다.
 * 사용처 2곳: `use-region-stat-query`(by-grid)·`use-region-videos-query`(videos).
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

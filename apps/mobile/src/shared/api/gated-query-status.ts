/**
 * 게이트형 쿼리 공통 상태 (MSG-425 L13) — 웹 `features/region/model/gated-query-status.ts`
 * 복제본. 비활성(게이트 false) 쿼리는 TanStack Query에서 영원히 pending이라 isPending을
 * 게이트로 눌러준다 — 누르지 않으면 갤러리가 영구 스켈레톤에 갇힌다(웹 codex 리뷰 회귀).
 *
 * 배치: 도메인 무관 쿼리 유틸이라 `shared/api`가 맞다(모바일에는 features/region이 없다).
 * 순수 매핑 — RN·플랫폼 API 무의존. 동등성은 `gated-query-status.parity.test.ts`가 고정한다.
 * 사용처 2곳: `use-region-stat-query`(by-grid)·`use-region-videos-query`(videos).
 *
 * **주의 — 모바일에 같은 이름의 구현이 하나 더 있다.** MSG-423이 병렬로 만든
 * `features/map-home/model/home-sheet-state.ts`의 `gatedQueryStatus`는 3인자
 * (`query, active, settled`)이고 비활성 쿼리의 `retry`를 no-op으로 막는다. 두 티켓이
 * 웹 원본을 각자 포팅해 웨이브 병합 시점에 갈라진 것이고, 여기(2인자)가 웹 원본과
 * parity를 맞춘 쪽이다. 도감 경로는 두 보강이 없어도 안전하다 — `settled` 축은
 * `region-gallery-view`의 `isPending || !videos.data` 가드가 대신하고, `retry`는
 * `isError`일 때만 노출되므로 비활성 쿼리로 발사되지 않는다. 다만 **셋 중 어느 것을
 * 정본으로 삼을지는 미결이다** — 새 사용처를 붙이기 전에 통합을 먼저 판단할 것.
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

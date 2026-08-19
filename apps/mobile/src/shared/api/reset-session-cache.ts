import type { QueryClient } from "@tanstack/react-query";

/**
 * 세션 전환 캐시 초기화 (MSG-422 재작업 1회차) — 로그인 성공 직후 이전 세션의 응답을 버리고,
 * 화면에 걸려 있는 조회를 새 자격증명으로 다시 태운다.
 *
 * **`queryClient.clear()`를 쓰지 않는다.** clear()는 Query 객체를 캐시에서 제거(destroy)하는데,
 * 그 순간 구독 중이던 옵저버는 파괴된 Query에 묶인 채 남는다 — 재부착은 그 옵저버의 **다음
 * 렌더**(`setOptions`)에서만 일어나기 때문이다. 로그인 이후 재렌더 트리거가 인증 스토어뿐인
 * 컴포넌트(루트 `AppShell`의 동의 게이트)는 그 렌더가 오지 않아 조용히 취소된
 * `pending/fetching` 상태에 영구 고정됐다. 실측 로그(재작업 1회차 계측):
 * `removed(obs:2)` → `added(obs:0)` → `observerAdded(obs:1)` → `success(obs:1)` —
 * 두 옵저버 중 재렌더된 하나만 새 Query로 옮겨 갔다.
 *
 * `resetQueries()`는 Query 객체를 유지한 채 상태만 초기 상태로 되돌리므로 옵저버가 떨어져
 * 나가지 않고, 이어서 활성 옵저버를 재조회시킨다 — "이전 사용자 데이터 폐기 + 화면 갱신"이라는
 * 원래 의도에 정확히 대응하는 API다.
 *
 * 재조회 대상은 활성 옵저버(`enabled !== false`)뿐이라, 로그인 직후 아직 재렌더가 오지 않아
 * `enabled:false`로 남아 있는 게이트 옵저버는 이 호출의 재조회에서 빠질 수 있다. 그래도
 * 결과는 같다 — Query가 초기 상태로 되돌아가 있으므로 뒤늦은 재렌더가 `enabled:true`로 켜는
 * 전이 자체가 조회를 발사한다. clear()와 갈리는 지점이 여기다(파괴된 Query에 남은 옵저버는
 * 그 전이마저 무의미하다). 두 경로 모두 reset-session-cache.test.ts가 고정한다.
 *
 * 로그아웃 경로에는 쓰지 않는다 — 거기서는 재조회가 곧 401이므로 clear()가 맞다.
 */
export const resetSessionCache = (queryClient: QueryClient): Promise<void> =>
  queryClient.resetQueries();

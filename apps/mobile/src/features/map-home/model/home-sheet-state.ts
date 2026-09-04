/**
 * 지도 홈 시트 상태 파생 (MSG-423 요구 6·7) — 순수 함수.
 *
 * 실패 시 목 데이터로 대체하지 않는다는 요구가 이 모듈의 형태에 박혀 있다:
 * 입력이 쿼리 상태 플래그와 카드 개수뿐이라 목 데이터가 들어올 경로 자체가 없고,
 * 실패가 하나라도 있으면 어떤 카드 수에서도 `list`로 떨어지지 않는다 (L7).
 */

/** 시트 표시 상태 — 우선순위 error > loading > empty > list */
export type SheetState = "loading" | "error" | "empty" | "list";

/** 시트가 의존하는 쿼리 하나의 상태 — 게이트(비활성) 쿼리는 isResolved: true로 접어 넘긴다 */
export interface SheetQueryStatus {
  isError: boolean;
  /** 응답이 확정됐는가 — 조회하지 않기로 한(게이트 false) 쿼리도 확정으로 본다 */
  isResolved: boolean;
}

/**
 * 쿼리 상태들 + 카드 개수 → 시트 상태.
 * `error`가 `loading`·`empty`보다 우선한다 — 실패 상태의 0건은 "빈 지역"이 아니다.
 */
export const deriveSheetState = (
  statuses: SheetQueryStatus[],
  cardCount: number,
): SheetState => {
  if (statuses.some((status) => status.isError)) return "error";
  if (!statuses.every((status) => status.isResolved)) return "loading";
  return cardCount === 0 ? "empty" : "list";
};

/**
 * 기본 시트가 의존하는 쿼리 목록 (MSG-571 codex 리뷰 P2-1·재리뷰 P2). 지역 행 탭으로
 * 선택 지역 오버라이드가 걸려 있으면 격자 조회는 그 지역 코드로 직접 가므로 역지오코딩도
 * 뷰포트 점령 조회도 표시의 전제가 아니다 — 둘 다 빼야 무관한 쿼리의 로딩·실패가
 * 선택 지역의 격자 목록을 덮지 않는다(선택 지역은 대개 뷰포트 밖이다). 시트 상태
 * 파생과 재시도가 같은 목록을 써야 하므로 여기서 한 번만 정한다.
 */
export const defaultSheetQueries = (
  queries: Record<"occupied" | "geocode" | "regionGrids", GatedQueryStatus>,
  selectedRegionActive: boolean,
): GatedQueryStatus[] =>
  selectedRegionActive
    ? [queries.regionGrids]
    : [queries.occupied, queries.geocode, queries.regionGrids];

/** 조회 훅이 화면에 내주는 공통 꼬리 — 시트 상태 입력 + 재시도 핸들 (요구 7) */
export interface GatedQueryStatus extends SheetQueryStatus {
  retry: () => void;
}

/**
 * 쿼리 결과 → 시트 상태 입력. 게이트가 닫힌(active=false) 쿼리는 응답이 올 리 없으므로
 * **도착으로 접는다** — 비로그인·행정동 밖처럼 조회하지 않기로 한 상황에서 시트가
 * 영원히 로딩에 머무는 것을 막는다 (웹 `gatedQueryStatus`의 isPending 게이트와 같은 목적).
 *
 * 단 그 접기는 **게이트 판정이 확정됐을 때만** 성립한다. `settled`가 이 둘을 가른다:
 * - `settled: true` — "조회하지 않기로 확정"(비로그인·행정동 밖·뷰포트 확정 후 상한 초과)
 * - `settled: false` — "아직 모른다"(보안 저장소 재수화 전·지도 뷰포트 미확정)
 *
 * 후자를 도착으로 접으면 카드 0건이 `empty`("영상이 없어요")로 새어 나온다 — 무한 로딩을
 * 막으려던 게이트가 정반대의 틀린 상태를 노출하는 것이라, 판정 전에는 `loading`을 유지한다
 * (PR #72 리뷰). 인자를 선택값으로 두지 않는 이유는 호출부마다 판정을 강제하기 위함이다.
 *
 * `retry`도 같은 게이트를 통과해야 한다: TanStack Query의 `refetch()`는 `enabled`를
 * **무시하고** 요청을 보내므로, 시트의 공용 재시도가 세 쿼리를 한꺼번에 부르면
 * `regionCode: ""`(행정동 미확정)나 span 상한을 넘긴 뷰포트 같은 잘못된 요청이 나간다.
 * 비활성 쿼리의 재시도는 no-op이다 (codex 리뷰 P2-1).
 */
export const gatedQueryStatus = (
  query: {
    isError: boolean;
    data: unknown;
    refetch: () => Promise<unknown>;
  },
  active: boolean,
  settled: boolean,
): GatedQueryStatus => ({
  isError: query.isError,
  isResolved: (!active && settled) || query.data !== undefined,
  retry: () => {
    if (active) void query.refetch();
  },
});

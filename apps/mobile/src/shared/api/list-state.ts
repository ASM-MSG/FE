/** 목록 영역의 배타 4상태 — 실패 > 로딩 > 빈 > 목록 */
export type ListState = "loading" | "error" | "empty" | "list";

/**
 * 쿼리 상태 + 항목 수 → 목록 4상태 판정 (MSG-448 report-history 기준 19에서 시작,
 * MSG-570 차단 목록이 두 번째 용례 — 두 feature가 같은 판정을 쓰게 돼 shared로 올린다).
 * 실패가 로딩보다 우선한다 — 재시도 왕복 중에 실패 안내와 [다시 시도]가 사라졌다
 * 다시 나타나면 사용자가 재시도를 두 번 누르게 된다. 순수 함수 — 플랫폼·react 무의존.
 */
export const resolveListState = (input: {
  isPending: boolean;
  isError: boolean;
  items: readonly unknown[];
}): ListState => {
  if (input.isError) return "error";
  if (input.isPending) return "loading";
  return input.items.length === 0 ? "empty" : "list";
};

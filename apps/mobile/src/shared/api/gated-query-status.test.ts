import { describe, expect, it, vi } from "vitest";
import { gatedQueryStatus } from "./gated-query-status";

const query = (
  overrides?: Partial<{ isPending: boolean; isError: boolean }>,
) => ({
  isPending: true,
  isError: false,
  refetch: vi.fn(() => Promise.resolve(undefined)),
  ...overrides,
});

/**
 * L13: `gatedQueryStatus(query, active)`가 `active === false`일 때 `isPending`을 false로
 * 눌러 비활성 쿼리의 영구 pending을 막는다. `enabled: false` 쿼리는 TanStack Query에서
 * 영원히 pending 상태라, 누르지 않으면 갤러리가 스켈레톤에 갇힌다(웹 codex 리뷰 회귀).
 */
describe("gatedQueryStatus — 게이트형 쿼리 상태 매핑 (L13)", () => {
  it("비활성 쿼리의 isPending은 false로 눌린다 (L13)", () => {
    expect(gatedQueryStatus(query(), false).isPending).toBe(false);
  });

  it("활성 쿼리의 isPending은 그대로 전달된다 (L13)", () => {
    expect(gatedQueryStatus(query(), true).isPending).toBe(true);
    expect(gatedQueryStatus(query({ isPending: false }), true).isPending).toBe(
      false,
    );
  });

  it("isError는 게이트와 무관하게 그대로 전달된다 (L13)", () => {
    expect(gatedQueryStatus(query({ isError: true }), false).isError).toBe(
      true,
    );
    expect(gatedQueryStatus(query({ isError: true }), true).isError).toBe(true);
  });

  it("retry는 그 쿼리의 refetch를 호출한다 (L13)", () => {
    const target = query();

    gatedQueryStatus(target, true).retry();

    expect(target.refetch).toHaveBeenCalledTimes(1);
  });
});

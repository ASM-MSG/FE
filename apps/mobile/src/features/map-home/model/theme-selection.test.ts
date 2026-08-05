import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSelectedTheme,
  setSelectedTheme,
  subscribeSelectedTheme,
} from "./theme-selection";

/**
 * AC 4: 테마 선택 후 다른 탭에 갔다 홈으로 복귀하면 검색어·테마 강조·테마 시트
 * 콘텐츠가 유지된다 — 루트 Stack + router.navigate 구조에서 홈 스크린이 탭 왕복마다
 * 재마운트되므로(검증 리포트 실측), 테마 상태는 화면 useState가 아니라 feature 로컬
 * 모듈 스코프에 보관되어야 한다 (스펙 확정 4, 2026-08-05 수정).
 * 재마운트 = 구독 해제(언마운트) 후 새 구독(마운트)으로 재현한다.
 */
describe("AC 4 테마 선택 모듈 상태 (theme-selection)", () => {
  beforeEach(() => {
    // 테스트 간 격리 — 리셋 경로는 프로덕션과 동일한 setSelectedTheme(null) (AC 2·3)
    setSelectedTheme(null);
  });

  it("테마 선택 후 재마운트(구독 해제→재구독)를 가로질러 상태가 유지된다", () => {
    const firstMount = vi.fn();
    const unsubscribe = subscribeSelectedTheme(firstMount);
    setSelectedTheme("festival");
    unsubscribe(); // 탭 전환 → 홈 스크린 언마운트

    const remount = vi.fn();
    const cleanup = subscribeSelectedTheme(remount); // 홈 복귀 → 재마운트
    expect(getSelectedTheme()).toBe("festival");
    cleanup();
  });

  it("null로 리셋(X·< 전체 복귀)하면 모듈에 테마가 남지 않는다 (AC 2·3)", () => {
    setSelectedTheme("hot");
    setSelectedTheme(null);
    expect(getSelectedTheme()).toBeNull();
  });

  it("상태 변경 시 구독자에게 알리고, 해제된 구독자에게는 알리지 않는다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSelectedTheme(listener);

    setSelectedTheme("popup");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSelectedTheme()).toBe("popup");

    unsubscribe();
    setSelectedTheme("route");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

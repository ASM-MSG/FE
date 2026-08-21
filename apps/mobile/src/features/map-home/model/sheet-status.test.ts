import { describe, expect, it } from "vitest";
import { deriveSheetState, gatedQueryStatus } from "./home-sheet-state";

/**
 * A8·A9 (MSG-427): 칩별 시트 5종이 전부 `deriveSheetState`/`gatedQueryStatus`를 통과한다.
 * - A8 — 조회 실패 상태에서는 어떤 카드 수에서도 `list`가 나오지 않는다. 데이터 렌더
 *   분기(`list`)에 도달할 경로가 실패 상태에는 없으므로 목 대체 표시가 구성상 불가능하다.
 * - A9 — 비로그인·행정동 미확정 등 게이트가 닫힌 쿼리는 발사되지 않고, 게이트 판정이
 *   확정(`settled`)되면 도착으로 접혀 시트가 영원히 로딩에 머물지 않는다.
 *
 * 두 함수는 MSG-423 산출물이라 이 파일은 **회귀 방지 보존 단정**이다 (RED 대상 아님) —
 * 이 티켓이 신설한 시트 4종이 같은 계약을 타는 것을 고정하는 것이 목적이다.
 */
const settledOk = { isError: false, isResolved: true };
const settledFail = { isError: true, isResolved: true };
const pending = { isError: false, isResolved: false };

describe("A8 — 실패 분기에 데이터 렌더 경로가 없다", () => {
  it("어떤 카드 수에서도 실패가 하나라도 있으면 list가 아니다", () => {
    for (const cardCount of [0, 1, 20]) {
      expect(deriveSheetState([settledOk, settledFail], cardCount)).toBe(
        "error",
      );
      expect(deriveSheetState([settledFail, pending], cardCount)).toBe("error");
    }
  });

  it("실패가 없어야만 목록·빈 상태로 갈라진다", () => {
    expect(deriveSheetState([settledOk], 3)).toBe("list");
    expect(deriveSheetState([settledOk], 0)).toBe("empty");
    expect(deriveSheetState([pending], 3)).toBe("loading");
  });
});

describe("A9 — 게이트가 닫힌 쿼리는 발사되지 않고 로딩에 갇히지 않는다", () => {
  const query = {
    isError: false,
    data: undefined,
    refetch: () => Promise.resolve(),
  };

  it("게이트가 닫히고 판정이 확정되면 도착으로 접는다", () => {
    expect(gatedQueryStatus(query, false, true).isResolved).toBe(true);
  });

  it("판정 전(비로그인 재수화 전·뷰포트 미확정)에는 로딩을 유지한다", () => {
    expect(gatedQueryStatus(query, false, false).isResolved).toBe(false);
  });

  it("비활성 쿼리의 재시도는 no-op이다 — 잘못된 요청을 내보내지 않는다", () => {
    let calls = 0;
    const spied = {
      isError: false,
      data: undefined,
      refetch: () => {
        calls += 1;
        return Promise.resolve();
      },
    };

    gatedQueryStatus(spied, false, true).retry();
    expect(calls).toBe(0);

    gatedQueryStatus(spied, true, true).retry();
    expect(calls).toBe(1);
  });
});

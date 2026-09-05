import { describe, expect, it, vi } from "vitest";
import {
  defaultSheetQueries,
  deriveSheetState,
  gatedQueryStatus,
  type SheetQueryStatus,
} from "./home-sheet-state";

/**
 * L6·L7: 시트 상태 파생 — 요구 6·7(로딩·빈·실패 상태, 목 폴백 금지).
 * 우선순위는 error > loading > empty > list다.
 */
const pending: SheetQueryStatus = { isError: false, isResolved: false };
const resolved: SheetQueryStatus = { isError: false, isResolved: true };
const failed: SheetQueryStatus = { isError: true, isResolved: false };

describe("deriveSheetState — 시트 4상태 파생 (L6)", () => {
  it("하나라도 미도착이면 loading을 반환한다", () => {
    expect(deriveSheetState([resolved, resolved, pending], 3)).toBe("loading");
    expect(deriveSheetState([pending, pending, pending], 0)).toBe("loading");
  });

  it("전건 도착 ∧ 카드 0건이면 empty를 반환한다", () => {
    expect(deriveSheetState([resolved, resolved, resolved], 0)).toBe("empty");
  });

  it("전건 도착 ∧ 카드 1건 이상이면 list를 반환한다", () => {
    expect(deriveSheetState([resolved, resolved, resolved], 1)).toBe("list");
    expect(deriveSheetState([resolved, resolved, resolved], 20)).toBe("list");
  });

  it("하나라도 실패하면 error를 반환한다", () => {
    expect(deriveSheetState([failed, resolved, resolved], 3)).toBe("error");
  });

  it("error가 loading보다 우선한다 — 실패와 미도착이 섞여도 error다", () => {
    expect(deriveSheetState([failed, pending, pending], 0)).toBe("error");
  });

  it("error가 empty보다 우선한다 — 실패 상태의 0건은 빈 상태가 아니다", () => {
    expect(deriveSheetState([failed, resolved, resolved], 0)).toBe("error");
  });
});

describe("deriveSheetState — 실패 시 목 폴백 금지 (L7)", () => {
  /** 실패 표본 전건: 어느 쿼리가 실패하든, 카드 수가 얼마든 list로 떨어지지 않는다 */
  const failureSamples: SheetQueryStatus[][] = [
    [failed, resolved, resolved],
    [resolved, failed, resolved],
    [resolved, resolved, failed],
    [failed, failed, failed],
    [failed, pending, resolved],
  ];

  it("실패 입력 전건에서 절대 list를 반환하지 않는다 — 카드가 남아 있어도 error다", () => {
    for (const statuses of failureSamples) {
      for (const cardCount of [0, 1, 20]) {
        expect(deriveSheetState(statuses, cardCount)).toBe("error");
      }
    }
  });
});

describe("gatedQueryStatus — 게이트형 쿼리 상태 접기 (L6)", () => {
  const query = (over: { isError?: boolean; data?: unknown } = {}) => ({
    isError: false,
    data: undefined as unknown,
    refetch: vi.fn(async () => undefined),
    ...over,
  });

  it("판정이 끝난 뒤 게이트가 닫힌 쿼리는 데이터가 없어도 도착으로 접는다 — 비로그인·행정동 밖에서 시트가 영원히 로딩에 머물지 않는다", () => {
    expect(gatedQueryStatus(query(), false, true).isResolved).toBe(true);
  });

  it("활성 쿼리는 응답이 오기 전까지 미도착이다", () => {
    expect(gatedQueryStatus(query(), true, true).isResolved).toBe(false);
    expect(
      gatedQueryStatus(query({ data: { grids: [] } }), true, true).isResolved,
    ).toBe(true);
  });

  it("실패는 게이트와 무관하게 그대로 전달된다", () => {
    expect(gatedQueryStatus(query({ isError: true }), true, true).isError).toBe(
      true,
    );
    expect(
      gatedQueryStatus(query({ isError: true }), false, true).isError,
    ).toBe(true);
  });

  it("retry는 그 쿼리를 다시 조회한다 (요구 7)", () => {
    const target = query();

    gatedQueryStatus(target, true, true).retry();

    expect(target.refetch).toHaveBeenCalledTimes(1);
  });

  it("게이트가 닫힌 쿼리는 재시도해도 요청이 나가지 않는다 — refetch는 enabled를 무시하므로 여기서 막는다 (codex 리뷰 P2-1)", () => {
    const target = query();

    gatedQueryStatus(target, false, true).retry();

    expect(target.refetch).not.toHaveBeenCalled();
  });

  it("아직 판정 전(settled=false)인 쿼리는 미도착이다 — '조회하지 않기로 확정'과 구분한다 (PR #72 리뷰)", () => {
    expect(gatedQueryStatus(query(), false, false).isResolved).toBe(false);
  });

  it("데이터가 이미 있으면 settled와 무관하게 도착이다", () => {
    const arrived = query({ data: { grids: [] } });

    expect(gatedQueryStatus(arrived, false, false).isResolved).toBe(true);
    expect(gatedQueryStatus(arrived, true, false).isResolved).toBe(true);
  });
});

describe("미판정 상태가 빈 상태로 새지 않는다 (PR #72 리뷰 — 경로 ①·②)", () => {
  const pendingQuery = {
    isError: false,
    data: undefined as unknown,
    refetch: vi.fn(async () => undefined),
  };

  it("세 쿼리가 전부 미판정이고 카드 0건이면 empty가 아니라 loading이다", () => {
    // 콜드 스타트 첫 프레임: 보안 저장소 재수화 전(hydrated=false) 이거나
    // 지도 뷰포트 미확정(viewport=null)이라 세 게이트가 전부 닫혀 있다
    const statuses = [
      gatedQueryStatus(pendingQuery, false, false),
      gatedQueryStatus(pendingQuery, false, false),
      gatedQueryStatus(pendingQuery, false, false),
    ];

    expect(deriveSheetState(statuses, 0)).toBe("loading");
  });

  it("판정이 끝나고도 조회 대상이 없으면 그때는 empty다 — 로딩이 영원히 걸리지 않는다", () => {
    const statuses = [
      gatedQueryStatus(pendingQuery, false, true),
      gatedQueryStatus(pendingQuery, false, true),
      gatedQueryStatus(pendingQuery, false, true),
    ];

    expect(deriveSheetState(statuses, 0)).toBe("empty");
  });
});

describe("defaultSheetQueries — 선택 지역 오버라이드 중에는 geocode·occupied를 시트 상태에서 뺀다 (MSG-571 codex 리뷰 P2-1·재리뷰 P2)", () => {
  const withRetry = (status: SheetQueryStatus) => ({
    ...status,
    retry: vi.fn(),
  });
  const queries = () => ({
    occupied: withRetry(resolved),
    geocode: withRetry(failed),
    regionGrids: withRetry(resolved),
  });

  it("geocode 실패 + selectedRegion 있음 + grids 성공 → list — 선택 지역 격자는 역지오코딩 없이 표시된다", () => {
    expect(deriveSheetState(defaultSheetQueries(queries(), true), 3)).toBe(
      "list",
    );
  });

  it("뷰포트 occupied 실패/로딩 + selectedRegion 있음 + grids 성공 → list — 뷰포트 밖 지역은 점령 조회와 무관하다 (재리뷰 P2)", () => {
    const failedOccupied = { ...queries(), occupied: withRetry(failed) };
    expect(deriveSheetState(defaultSheetQueries(failedOccupied, true), 3)).toBe(
      "list",
    );
    const pendingOccupied = { ...queries(), occupied: withRetry(pending) };
    expect(
      deriveSheetState(defaultSheetQueries(pendingOccupied, true), 3),
    ).toBe("list");
  });

  it("selectedRegion이 없으면 geocode 실패가 그대로 error다 — 기존 동작 보존", () => {
    expect(deriveSheetState(defaultSheetQueries(queries(), false), 3)).toBe(
      "error",
    );
  });

  it("재시도도 같은 목록을 따른다 — 선택 지역 활성 중 geocode·occupied 재시도는 표시의 전제가 아니다", () => {
    const target = queries();

    for (const query of defaultSheetQueries(target, true)) query.retry();

    expect(target.geocode.retry).not.toHaveBeenCalled();
    expect(target.occupied.retry).not.toHaveBeenCalled();
    expect(target.regionGrids.retry).toHaveBeenCalledTimes(1);
  });
});

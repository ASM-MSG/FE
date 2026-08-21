import { keepPreviousData } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ApiResponseDtoOccupiedGridPageResponseDto } from "@/shared/api/generated";
import { occupiedGridOf } from "@/test/occupied-grids";
import {
  MAP_QUERY_STALE_TIME,
  entityQueryPolicy,
  mapQueryPolicy,
} from "./map-query-policy";
import {
  MAX_GRID_PAGES,
  flattenGridPages,
  nextGridsPageParam,
} from "./use-occupied-grids-query";

const page = (
  gridIds: string[],
  nextCursor: string | null,
): ApiResponseDtoOccupiedGridPageResponseDto => ({
  developCode: 1000,
  message: "성공",
  data: { grids: gridIds.map(occupiedGridOf), nextCursor },
});

describe("점령 격자 커서 페이지네이션 (MSG-325 기준 4)", () => {
  it("nextCursor가 있으면 그 값을 다음 페이지 파라미터로 넘긴다", () => {
    expect(nextGridsPageParam(page(["1_1"], "CURSOR_2"), [])).toBe("CURSOR_2");
  });

  it("nextCursor가 null이면 마지막 페이지 — 더 요청하지 않는다", () => {
    expect(nextGridsPageParam(page(["1_1"], null), [])).toBeUndefined();
  });

  it("페이지 상한에 도달하면 nextCursor가 남아 있어도 멈춘다 — 무한 루프 방지", () => {
    const collected = Array.from({ length: MAX_GRID_PAGES }, () =>
      page(["1_1"], "MORE"),
    );

    expect(
      nextGridsPageParam(page(["1_1"], "MORE"), collected),
    ).toBeUndefined();
    expect(
      nextGridsPageParam(page(["1_1"], "MORE"), collected.slice(0, -1)),
    ).toBe("MORE");
  });

  it("페이지들을 순서대로 이어붙여 단일 격자 목록으로 만든다", () => {
    const flat = flattenGridPages([
      page(["1_1", "1_2"], "C"),
      page(["2_1"], null),
    ]);

    expect(flat.map((g) => g.gridId)).toEqual(["1_1", "1_2", "2_1"]);
  });

  it("페이지가 없거나 빈 응답이면 빈 목록이다 (점령 격자 0건)", () => {
    expect(flattenGridPages(undefined)).toEqual([]);
    expect(flattenGridPages([page([], null)])).toEqual([]);
  });
});

describe("지도 계열 쿼리 정책 (MSG-325 기준 9)", () => {
  it("전역 기본(30초)보다 짧은 staleTime을 상수로 명시한다", () => {
    expect(MAP_QUERY_STALE_TIME).toBe(5_000);
    expect(MAP_QUERY_STALE_TIME).toBeLessThan(30_000);
    expect(mapQueryPolicy.staleTime).toBe(MAP_QUERY_STALE_TIME);
  });

  it("재조회 중 직전 데이터를 유지한다 — 지도 이동 시 오버레이 깜빡임 방지", () => {
    expect(mapQueryPolicy.placeholderData).toBe(keepPreviousData);
  });

  it("단일 엔티티 조회 정책에는 placeholderData가 없다 — 키가 다른 격자를 가리키면 직전 상세가 남는다 (리뷰 반영)", () => {
    expect(entityQueryPolicy.staleTime).toBe(MAP_QUERY_STALE_TIME);
    expect("placeholderData" in entityQueryPolicy).toBe(false);
  });
});

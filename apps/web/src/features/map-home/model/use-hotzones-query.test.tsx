import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeGridId, type Bounds } from "@/entities/cell";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { occupiedGridOf } from "@/test/occupied-grids";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useHotZoneCells, useHotZones } from "./use-hotzones-query";

/**
 * 핫구역 훅 (MSG-325 기준 14) — 응답 격자를 테마 셀 형태로 옮긴다.
 * 오버레이 파이프라인(buildHomeOverlayCells)이 center를 다시 encodeGridId하므로,
 * 여기서 만든 center가 원래 gridId로 되돌아와야 강조·빗금 판정이 어긋나지 않는다.
 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.16, lng: 129.06 },
};

// 공용 fetch 스텁(@/test/stub-fetch) — 수신 요청 목록으로 발사 여부를 단정한다.
// 핫구역 항목은 점령 격자 픽스처(occupiedGridOf)에 score만 얹는다 — 훅은 gridId만 읽는다
const stubHotZones = (gridIds: string[]) =>
  stubFetch(async () =>
    envelopeResponse({
      hotZones: gridIds.map((gridId) => ({
        ...occupiedGridOf(gridId),
        score: 12,
      })),
    }),
  );

// 기존 성공 경로는 로그인 전제로 고정 — 비로그인 경로는 아래 익명 케이스가 따로 단정한다
// (MSG-454로 익명 조회 허용 — MSG-463에서 게이트 해제)
beforeEach(signInForTest);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

// MSG-357 재기준화: 응답 gridId를 구 스텝 하드코딩 값 대신 서면 좌표에서 현행 체계로 파생한다
const SEOMYEON_GRID_IDS = [
  encodeGridId({ lat: 35.1579, lng: 129.0594 }),
  encodeGridId({ lat: 35.1589, lng: 129.0614 }),
];

describe("useHotZoneCells", () => {
  it("응답 격자의 center를 다시 인코딩하면 원래 gridId로 돌아온다 — 오버레이 id 체계와 일치", async () => {
    stubHotZones(SEOMYEON_GRID_IDS);

    const { result } = renderHook(() => useHotZoneCells(SEOMYEON_VIEWPORT), {
      wrapper,
    });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((c) => c.id)).toEqual(SEOMYEON_GRID_IDS);
    for (const cell of result.current) {
      expect(encodeGridId(cell.center)).toBe(cell.id);
    }
  });

  it("데이터가 그대로면 리렌더에도 같은 배열 참조다 — 소비처 useMemo(themeCells) 무효화 방지 (리뷰 반영)", async () => {
    stubHotZones(SEOMYEON_GRID_IDS);

    const { result, rerender } = renderHook(
      () => useHotZoneCells(SEOMYEON_VIEWPORT),
      { wrapper },
    );

    await waitFor(() => expect(result.current).toHaveLength(2));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("빈 목록 응답이면 빈 배열이다 — 상위 K·임계 판정에서 걸러지면 정상 경로다", async () => {
    stubHotZones([]);

    const { result } = renderHook(() => useHotZoneCells(SEOMYEON_VIEWPORT), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toEqual([]);
  });

  it("요청 대상이 아닌 뷰포트(null)에서는 조회하지 않고 빈 배열이다", async () => {
    const received = stubHotZones([SEOMYEON_GRID_IDS[0]]);

    const { result } = renderHook(() => useHotZoneCells(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toEqual([]);
    expect(received).toHaveLength(0);
  });

  it("비로그인에서도 조회해 지도 위 핫구역 셀을 준다 — MSG-454로 익명 조회 허용 (AC 8)", async () => {
    stubHotZones(SEOMYEON_GRID_IDS);
    signOutForTest();

    const { result } = renderHook(() => useHotZoneCells(SEOMYEON_VIEWPORT), {
      wrapper,
    });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((c) => c.id)).toEqual(SEOMYEON_GRID_IDS);
  });
});

describe("useHotZones", () => {
  it("비로그인에서도 조회해 동 요약 소재(핫구역 원본)를 준다 — MSG-454로 익명 조회 허용 (AC 8)", async () => {
    stubHotZones(SEOMYEON_GRID_IDS);
    signOutForTest();

    const { result } = renderHook(() => useHotZones(SEOMYEON_VIEWPORT), {
      wrapper,
    });

    await waitFor(() => expect(result.current.zones).toHaveLength(2));
    expect(result.current.isPending).toBe(false);
  });
});

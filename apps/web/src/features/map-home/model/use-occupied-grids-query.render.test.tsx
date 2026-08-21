import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useOccupiedGridsQuery } from "./use-occupied-grids-query";

/**
 * 점령 격자 훅의 **실제 요청 형태** 단정 (MSG-325 브라우저 검증 환류).
 * 순수 헬퍼 테스트만으로는 훅이 조립하는 쿼리스트링을 볼 수 없어, 첫 페이지 요청에
 * 빈 `cursor=`가 실려 서버가 400을 주는 결함을 놓쳤다 — 실요청을 직접 단정한다.
 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.16, lng: 129.06 },
};

// 공용 fetch 스텁(@/test/stub-fetch) — 수신 요청 목록으로 발사 여부·요청 형태를 단정한다
const stubGrids = () =>
  stubFetch(async () => envelopeResponse({ grids: [], nextCursor: null }));

// 점령 격자 조회는 보호 API다 (MSG-328 익명 401 실측) — 기존 요청 형태 단정은 로그인 전제로 고정
beforeEach(signInForTest);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useOccupiedGridsQuery — 실요청 형태", () => {
  it("첫 페이지 요청에 cursor 파라미터를 싣지 않는다 — 빈 cursor는 서버가 400으로 거부한다", async () => {
    const received = stubGrids();

    renderHook(() => useOccupiedGridsQuery(SEOMYEON_VIEWPORT), { wrapper });

    await waitFor(() => expect(received.length).toBeGreaterThan(0));
    const url = new URL(received[0].request.url);
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.get("swLat")).toBe("35.15");
    expect(url.searchParams.get("neLng")).toBe("129.06");
  });

  it("요청 대상이 아닌 뷰포트(null)에서는 아무 요청도 보내지 않는다", async () => {
    const received = stubGrids();

    renderHook(() => useOccupiedGridsQuery(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
  });

  it("비로그인이면 아무 요청도 보내지 않고(401 재발사 방지), 로그인 전환 시 다시 활성화된다 (사용자 버그 리포트 + 점령 오버레이 복귀 회귀 가드)", async () => {
    const received = stubGrids();
    signOutForTest();
    renderHook(() => useOccupiedGridsQuery(SEOMYEON_VIEWPORT), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);

    act(signInForTest);

    await waitFor(() => expect(received.length).toBeGreaterThan(0));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useGridNamesQuery } from "./use-grid-names-query";

/**
 * 격자 표시명 일괄 조회 훅 (MSG-395 AC 23 → MSG-474 비로그인 게이트).
 * 데이터원 `GET /api/grids/{gridId}`가 사용자별 API(익명 401 실측 2026-08-26 MSG-474)라
 * 비로그인은 발사하지 않는다 — 코스 스팟 행은 "이름 없는 경유 지점" 폴백으로 렌더된다.
 */
const SEOMYEON = "39064_112221";
const JEONPO = "39065_112223";

const stubCellNames = () =>
  stubFetch(async (request) => {
    const gridId = new URL(request.url).pathname.split("/")[3];
    return envelopeResponse({
      gridId,
      occupied: false,
      videoCount: 0,
      zoneName: gridId === SEOMYEON ? "서면" : "전포",
      zoneCell: "A-14",
      regionName: null,
    });
  });

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useGridNamesQuery", () => {
  it("로그인이면 격자별로 이름을 조회해 표시명 맵을 만든다 (보존 단정)", async () => {
    signInForTest();
    const received = stubCellNames();

    const { result } = renderHook(() => useGridNamesQuery([SEOMYEON, JEONPO]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(received).toHaveLength(2);
    expect(result.current.names.get(SEOMYEON)).toBe("서면 A-14");
    expect(result.current.names.get(JEONPO)).toBe("전포 A-14");
  });

  it("비로그인이면 grids/{id}를 발사하지 않는다 — 401 스팸 방지 (MSG-474 AC 14 계열)", async () => {
    signOutForTest();
    const received = stubCellNames();

    const { result } = renderHook(() => useGridNamesQuery([SEOMYEON, JEONPO]), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.names.size).toBe(0);
    // 발사하지 않은 조회를 로딩으로 위장하지 않는다 — 스팟 행은 즉시 폴백으로 그린다
    expect(result.current.isPending).toBe(false);
  });
});

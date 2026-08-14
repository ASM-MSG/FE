import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useCollectedGridsQuery } from "./use-collected-grids-query";

const collectedGrid = (gridId: string) => ({
  gridId,
  gridY: 0,
  gridX: 0,
  firstCollectedAt: "2026-08-12T09:00:00",
  lastUploadedAt: "2026-08-13T09:00:00",
  videoCount: 1,
  coverVideoId: null,
  coverThumbnailUrl: null,
  regionName: "부전동",
  zoneName: "부전",
  zoneCell: "B-07",
});

beforeEach(signInForTest);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useCollectedGridsQuery — 내 수집 격자 (AC 3·28)", () => {
  it("응답 격자 id를 집합으로 준다 — 미션 진행도 교집합의 입력 (AC 3)", async () => {
    stubFetch(async () =>
      envelopeResponse([
        collectedGrid("16858_11420"),
        collectedGrid("16860_11421"),
      ]),
    );

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await waitFor(() => expect(result.current.gridIds.size).toBe(2));
    expect(result.current.gridIds.has("16858_11420")).toBe(true);
    expect(result.current.gridIds.has("없는격자")).toBe(false);
  });

  it("진행도 판정을 위해 격자 중심 좌표를 함께 준다 (AC 3)", async () => {
    stubFetch(async () => envelopeResponse([collectedGrid("16858_11420")]));

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await waitFor(() => expect(result.current.collected).toHaveLength(1));
    expect(result.current.collected[0].center.lat).toBeGreaterThan(30);
    expect(result.current.collected[0].center.lng).toBeGreaterThan(120);
  });

  it("격자 상세가 점령 시작일을 읽을 수 있게 원본도 함께 준다 (AC 11)", async () => {
    stubFetch(async () => envelopeResponse([collectedGrid("16858_11420")]));

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await waitFor(() => expect(result.current.grids).toHaveLength(1));
    expect(result.current.grids[0].firstCollectedAt).toBe(
      "2026-08-12T09:00:00",
    );
  });

  it("비로그인이면 조회하지 않고 빈 집합이다 (AC 28)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse([collectedGrid("16858_11420")]),
    );
    signOutForTest();

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.gridIds.size).toBe(0);
    expect(received).toHaveLength(0);
  });
});

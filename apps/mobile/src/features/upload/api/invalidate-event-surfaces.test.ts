import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Module = typeof import("./invalidate-event-surfaces");
let invalidateEventSurfaces: Module["invalidateEventSurfaces"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.example.test");
  vi.resetModules();
  ({ invalidateEventSurfaces } = await import("./invalidate-event-surfaces"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** 무효화 호출에 실린 키의 첫 원소(생성 키 파라미터)들 */
const invalidatedKeys = (calls: unknown[][]) =>
  calls.map((call) => {
    const filters = call[0] as { queryKey: Record<string, unknown>[] };
    return filters.queryKey[0];
  });

describe("invalidateEventSurfaces — 행사 표면 무효화 (D12 · codex P1)", () => {
  it("확정 직후(대상 있음)는 그 회차·그 위치 키로 정확 무효화한다", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateEventSurfaces(queryClient, { occurrenceId: 5, locationId: 11 });

    const keys = invalidatedKeys(spy.mock.calls);
    expect(keys.map((k) => k._id)).toEqual([
      "getLocationVideos",
      "getLocations",
    ]);
    expect(keys[0]).toMatchObject({
      path: { occurrenceId: 5, locationId: 11 },
      _infinite: true,
    });
    expect(keys[1]).toMatchObject({ path: { occurrenceId: 5 } });
  });

  it("블러 READY(대상 없음)는 _id만 남긴 부분 키로 전 위치를 무효화한다 — path를 싣지 않는다", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateEventSurfaces(queryClient, null);

    expect(invalidatedKeys(spy.mock.calls)).toEqual([
      { _id: "getLocationVideos" },
      { _id: "getLocations" },
    ]);
  });
});

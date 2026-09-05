import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invalidatedIds } from "../../../test/query-key-ids";

/**
 * AC 9 (MSG-567): 확정 시점과 READY 시점이 **같은 집합**을 무효화해야 한다 — 어느 한쪽에만
 * 있는 화면은 READY가 돼도 영영 갱신되지 않는다(웹 QA 실측 구멍). 집합을 `_id`로 고정한다.
 * 생성 키 팩토리는 client-config(env 가드)를 정적으로 끌고 오므로 env 뒤 동적 import.
 */
type Module = typeof import("./invalidate-upload-surfaces");
let invalidateUploadSurfaces: Module["invalidateUploadSurfaces"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
  vi.resetModules();
  ({ invalidateUploadSurfaces } = await import("./invalidate-upload-surfaces"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const GRID_IDS = [
  "getOccupiedInViewport",
  "getOccupiedAggregatesInViewport",
  "getCell",
  "getGridGlobalVideos",
  "getGridVideos",
  "getStatByGrid",
  "getUploadHistory",
];

describe("invalidateUploadSurfaces — 업로드가 바꾼 화면 집합 (AC 9)", () => {
  it("일반 업로드: 단건 재생 + 격자 7종 + 도감 동 영상 목록을 무효화하고 행사 키는 없다", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateUploadSurfaces(queryClient, {
      videoId: 7,
      gridId: "grid-9",
      event: null,
    });

    const ids = invalidatedIds(spy.mock.calls);
    expect(ids).toEqual(
      expect.arrayContaining(["getPlayback", "getRegionVideos", ...GRID_IDS]),
    );
    expect(ids).not.toContain("getLocationVideos");
    expect(ids).not.toContain("getLocations");
    // 잔디 이력은 invalidateGridQueries가 이미 포함 — 중복 호출하지 않는다
    expect(ids.filter((id) => id === "getUploadHistory")).toHaveLength(1);
  });

  it("행사 귀속 업로드: 위치 영상 목록·위치 목록을 **정확 키**로 추가 무효화한다", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateUploadSurfaces(queryClient, {
      videoId: 7,
      gridId: "grid-9",
      event: { occurrenceId: 5, locationId: 11 },
    });

    const eventKeys = spy.mock.calls
      .map(
        (call) =>
          (call[0] as { queryKey: Record<string, unknown>[] }).queryKey[0],
      )
      .filter(
        (key) => key._id === "getLocationVideos" || key._id === "getLocations",
      );
    expect(eventKeys).toHaveLength(2);
    for (const key of eventKeys) expect(key).toHaveProperty("path");
  });

  it("단건 재생 키는 그 videoId로 정확 무효화, 도감 동 목록은 regionCode와 무관한 부분 키다", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateUploadSurfaces(queryClient, {
      videoId: 7,
      gridId: "grid-9",
      event: null,
    });

    const keys = spy.mock.calls.map(
      (call) =>
        (call[0] as { queryKey: Record<string, unknown>[] }).queryKey[0],
    );
    expect(keys.find((key) => key._id === "getPlayback")).toMatchObject({
      path: { videoId: 7 },
    });
    expect(keys.find((key) => key._id === "getRegionVideos")).toEqual({
      _id: "getRegionVideos",
    });
  });
});

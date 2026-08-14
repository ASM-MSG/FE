import { describe, expect, it } from "vitest";
import type { CollectedVideo } from "@/entities/dex";
import { groupVideosByGrid } from "./gallery-groups";

const video = (over: Partial<CollectedVideo>): CollectedVideo => ({
  videoId: 1,
  gridId: "39064_112221",
  durationSec: 24,
  createdAt: "2026-08-10T09:00:00Z",
  thumbnailUrl: null,
  zoneName: "서면",
  zoneCell: "A-02",
  ...over,
});

describe("groupVideosByGrid — 동 갤러리를 격자 그룹으로 나눈다 (기준 12)", () => {
  it("같은 격자의 영상을 한 그룹으로 묶고 그룹 라벨을 zoneName+zoneCell로 만든다", () => {
    const groups = groupVideosByGrid(
      [
        video({ videoId: 1, gridId: "g1" }),
        video({ videoId: 2, gridId: "g1" }),
      ],
      "부전제1동",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("서면 A-02");
    expect(groups[0]?.videos.map((v) => v.videoId)).toEqual([1, 2]);
  });

  it("구역 밖 격자(zoneName null)는 상위 행정동 이름을 라벨로 쓴다 (경계)", () => {
    const groups = groupVideosByGrid(
      [video({ gridId: "g1", zoneName: null, zoneCell: null })],
      "부전제1동",
    );

    expect(groups[0]?.label).toBe("부전제1동");
  });

  it("그룹은 그 격자의 최신 영상 순으로, 그룹 안 영상도 최신순으로 정렬한다", () => {
    const groups = groupVideosByGrid(
      [
        video({
          videoId: 1,
          gridId: "old",
          createdAt: "2026-08-01T00:00:00Z",
        }),
        video({
          videoId: 2,
          gridId: "new",
          createdAt: "2026-08-05T00:00:00Z",
        }),
        video({
          videoId: 3,
          gridId: "new",
          createdAt: "2026-08-12T00:00:00Z",
        }),
      ],
      "부전제1동",
    );

    expect(groups.map((g) => g.gridId)).toEqual(["new", "old"]);
    expect(groups[0]?.videos.map((v) => v.videoId)).toEqual([3, 2]);
  });

  it("영상이 없으면 빈 그룹 목록이다 (경계)", () => {
    expect(groupVideosByGrid([], "부전제1동")).toEqual([]);
  });
});

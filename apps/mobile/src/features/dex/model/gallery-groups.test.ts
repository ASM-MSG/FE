import { describe, expect, it } from "vitest";
import type { CollectedVideo } from "../../../entities/dex/model/dex";
import { groupVideosByGrid } from "./gallery-groups";

const video = (
  videoId: number,
  gridId: string,
  createdAt: string,
  zone: { zoneName: string | null; zoneCell: string | null } = {
    zoneName: "서면",
    zoneCell: "A-02",
  },
): CollectedVideo => ({
  videoId,
  gridId,
  durationSec: 47,
  createdAt,
  thumbnailUrl: null,
  ...zone,
});

/**
 * L5: `groupVideosByGrid(videos, regionLabel)`가 `gridId`별 그룹을 만든다 —
 * 그룹 내 `createdAt` 내림차순(동률 `videoId` 오름차순), 그룹 순서는 그 격자의
 * 최신 영상 시각 내림차순(동률 `gridId` 오름차순), 원본 배열 불변.
 */
describe("groupVideosByGrid — 동 갤러리 격자 그룹 파생 (L5)", () => {
  it("같은 gridId의 영상이 한 그룹으로 묶인다 (L5)", () => {
    const videos = [
      video(1, "g1", "2026-08-19T10:00:00+09:00"),
      video(2, "g2", "2026-08-19T09:00:00+09:00"),
      video(3, "g1", "2026-08-19T08:00:00+09:00"),
    ];

    const groups = groupVideosByGrid(videos, "부전2동");

    expect(groups.map((g) => g.gridId)).toEqual(["g1", "g2"]);
    expect(groups[0].videos.map((v) => v.videoId)).toEqual([1, 3]);
  });

  it("그룹 내 영상은 createdAt 내림차순, 동률이면 videoId 오름차순이다 (L5)", () => {
    const videos = [
      video(9, "g1", "2026-08-19T08:00:00+09:00"),
      video(3, "g1", "2026-08-19T08:00:00+09:00"),
      video(5, "g1", "2026-08-19T10:00:00+09:00"),
    ];

    const [group] = groupVideosByGrid(videos, "부전2동");

    expect(group.videos.map((v) => v.videoId)).toEqual([5, 3, 9]);
  });

  it("그룹 순서는 격자 최신 영상 시각 내림차순, 동률이면 gridId 오름차순이다 (L5)", () => {
    const videos = [
      video(1, "gB", "2026-08-19T08:00:00+09:00"),
      video(2, "gA", "2026-08-19T08:00:00+09:00"),
      video(3, "gC", "2026-08-19T12:00:00+09:00"),
    ];

    const groups = groupVideosByGrid(videos, "부전2동");

    expect(groups.map((g) => g.gridId)).toEqual(["gC", "gA", "gB"]);
  });

  it("그룹 라벨은 zoneName+zoneCell, 구역 밖이면 동 이름 폴백이다 (L5·L6)", () => {
    const videos = [
      video(1, "g1", "2026-08-19T10:00:00+09:00"),
      video(2, "g2", "2026-08-19T09:00:00+09:00", {
        zoneName: null,
        zoneCell: null,
      }),
    ];

    const groups = groupVideosByGrid(videos, "부전2동");

    expect(groups.map((g) => g.label)).toEqual(["서면 A-02", "부전2동"]);
  });

  it("원본 배열은 변형되지 않는다 (L5)", () => {
    const videos = [
      video(1, "g1", "2026-08-19T08:00:00+09:00"),
      video(2, "g1", "2026-08-19T10:00:00+09:00"),
    ];

    groupVideosByGrid(videos, "부전2동");

    expect(videos.map((v) => v.videoId)).toEqual([1, 2]);
  });

  it("빈 입력은 빈 그룹 목록이다 (L5 경계)", () => {
    expect(groupVideosByGrid([], "부전2동")).toEqual([]);
  });
});

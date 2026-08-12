import { describe, expect, it } from "vitest";
import type {
  GridGlobalVideoResponseDto,
  GridVideoResponseDto,
} from "@/shared/api/generated";
import {
  mergeFeedItems,
  toFeedItemFromGlobal,
  toFeedItemFromMine,
} from "./grid-videos";

/**
 * 격자 영상 목록 매핑·병합 (MSG-326 기준 1~3).
 * DTO 2종(전역 GridGlobalVideoResponseDto · 내 영상 GridVideoResponseDto)을
 * 피드 항목(FeedVideo + mine)으로 정규화하고 MSG-277 정렬 관례(내 영상 앞)로 병합한다.
 */

const GLOBAL_DTO: GridGlobalVideoResponseDto = {
  videoId: 1042,
  thumbnailUrl: "https://cdn.example/thumb-1042.jpg",
  durationSec: 27,
  viewCount: 1400,
  recordedAt: "2026-07-31T18:03:11",
  nickname: "minji_b",
};

const MINE_DTO: GridVideoResponseDto = {
  videoId: 301,
  thumbnailUrl: null,
  processingStatus: "ENCODING",
  durationSec: 22,
  createdAt: "2026-08-10T09:12:00",
};

describe("toFeedItemFromGlobal — 전역 목록 항목 매핑 (기준 1)", () => {
  it("uploaderHandle은 @+nickname, 표시 시각은 recordedAt, mine=false다", () => {
    const item = toFeedItemFromGlobal(GLOBAL_DTO);

    expect(item.videoId).toBe(1042);
    expect(item.uploaderHandle).toBe("@minji_b");
    expect(item.recordedAt).toBe("2026-07-31T18:03:11");
    expect(item.mine).toBe(false);
    expect(item.thumbnailUrl).toBe("https://cdn.example/thumb-1042.jpg");
    expect(item.viewCount).toBe(1400);
    expect(item.durationSec).toBe(27);
  });
});

describe("toFeedItemFromMine — 내 영상 항목 매핑 (기준 2)", () => {
  it("mine=true, 표시 시각은 createdAt, thumbnailUrl null·processingStatus 보존, viewCount는 null이다", () => {
    const item = toFeedItemFromMine(MINE_DTO);

    expect(item.videoId).toBe(301);
    expect(item.mine).toBe(true);
    expect(item.recordedAt).toBe("2026-08-10T09:12:00");
    expect(item.thumbnailUrl).toBeNull();
    expect(item.processingStatus).toBe("ENCODING");
    expect(item.viewCount).toBeNull();
  });
});

describe("mergeFeedItems — 병합 규칙 (기준 3, MSG-277 정렬 관례)", () => {
  it("내 영상이 앞이고, 전역 목록에서 내 영상과 같은 videoId는 중복 제거된다", () => {
    const mine = [
      toFeedItemFromMine(MINE_DTO),
      toFeedItemFromMine({ ...MINE_DTO, videoId: 1042 }),
    ];
    const global = [
      toFeedItemFromGlobal(GLOBAL_DTO), // videoId 1042 — 내 영상과 중복
      toFeedItemFromGlobal({ ...GLOBAL_DTO, videoId: 2001 }),
    ];

    const merged = mergeFeedItems(mine, global);

    expect(merged.map((v) => v.videoId)).toEqual([301, 1042, 2001]);
    expect(merged.map((v) => v.mine)).toEqual([true, true, false]);
  });

  it("중복이 없으면 내 영상 뒤에 전역 순서 그대로 이어 붙인다", () => {
    const mine = [toFeedItemFromMine(MINE_DTO)];
    const global = [
      toFeedItemFromGlobal(GLOBAL_DTO),
      toFeedItemFromGlobal({ ...GLOBAL_DTO, videoId: 2001 }),
    ];

    expect(mergeFeedItems(mine, global).map((v) => v.videoId)).toEqual([
      301, 1042, 2001,
    ]);
  });
});

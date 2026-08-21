import { describe, expect, it } from "vitest";
import type {
  GridGlobalVideoResponseDto,
  GridVideoResponseDto,
} from "../../../shared/api/sdk";
import {
  mergeFeedItems,
  toFeedItemFromGlobal,
  toFeedItemFromMine,
  videoOwnerLabel,
} from "./grid-videos";

/**
 * 격자·미션 영상 피드 매핑·병합이 웹 원본과 같다 (MSG-427) — 전역/내 영상 DTO 2종을
 * 한 `GridFeedItem`으로 정규화하고, 내 영상을 앞에 두고 videoId 중복을 제거한다.
 * 웹의 목 전용 잔여 필드(`videoSrc`·`title`)는 옮기지 않는다 — 모바일은 목이 없다.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/grid-videos.ts",
  import.meta.url,
).pathname;

interface WebGridVideos {
  toFeedItemFromGlobal: typeof toFeedItemFromGlobal;
  toFeedItemFromMine: typeof toFeedItemFromMine;
  mergeFeedItems: typeof mergeFeedItems;
  videoOwnerLabel: typeof videoOwnerLabel;
}

const loadWeb = (): Promise<WebGridVideos> => import(WEB_PATH);

const GLOBAL: GridGlobalVideoResponseDto[] = [
  {
    videoId: 1,
    thumbnailUrl: "https://cdn.test/1.jpg",
    durationSec: 42,
    viewCount: 214,
    recordedAt: "2026-08-18T21:00:00",
    nickname: "seomyeon",
  } as GridGlobalVideoResponseDto,
  {
    videoId: 2,
    thumbnailUrl: "https://cdn.test/2.jpg",
    durationSec: 12,
    viewCount: 0,
    recordedAt: "2026-08-17T09:00:00",
    nickname: "bujeon",
  } as GridGlobalVideoResponseDto,
];
const MINE: GridVideoResponseDto[] = [
  {
    videoId: 2,
    thumbnailUrl: null,
    durationSec: 12,
    createdAt: "2026-08-17T09:00:00",
    processingStatus: "ENCODING",
  } as GridVideoResponseDto,
];

describe("grid-videos 웹 원본 동등성", () => {
  it("전역·내 영상 DTO를 하나의 피드 항목으로 정규화한다", () => {
    expect(toFeedItemFromGlobal(GLOBAL[0])).toEqual({
      videoId: 1,
      thumbnailUrl: "https://cdn.test/1.jpg",
      durationSec: 42,
      viewCount: 214,
      recordedAt: "2026-08-18T21:00:00",
      uploaderHandle: "@seomyeon",
      mine: false,
    });
    expect(toFeedItemFromMine(MINE[0]).viewCount).toBeNull();
    expect(toFeedItemFromMine(MINE[0]).mine).toBe(true);
  });

  it("내 영상이 앞에 오고 전역의 같은 videoId는 제거된다", () => {
    const merged = mergeFeedItems(
      MINE.map(toFeedItemFromMine),
      GLOBAL.map(toFeedItemFromGlobal),
    );

    expect(merged.map((item) => item.videoId)).toEqual([2, 1]);
    expect(merged[0].mine).toBe(true);
  });

  it("표본 전건에서 웹 원본과 같은 항목·병합·소유 라벨을 낸다", async () => {
    const web = await loadWeb();

    for (const dto of GLOBAL) {
      expect(toFeedItemFromGlobal(dto)).toEqual(web.toFeedItemFromGlobal(dto));
    }
    for (const dto of MINE) {
      expect(toFeedItemFromMine(dto)).toEqual(web.toFeedItemFromMine(dto));
    }

    const mine = MINE.map(toFeedItemFromMine);
    const global = GLOBAL.map(toFeedItemFromGlobal);
    expect(mergeFeedItems(mine, global)).toEqual(
      web.mergeFeedItems(mine, global),
    );

    for (const item of [...mine, ...global]) {
      expect(videoOwnerLabel(item, item.mine)).toBe(
        web.videoOwnerLabel(item, item.mine),
      );
    }
  });
});

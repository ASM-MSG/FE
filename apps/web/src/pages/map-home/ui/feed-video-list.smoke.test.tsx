import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GridFeedItem } from "@/features/map-home/model/grid-videos";
import { FeedVideoList } from "./FeedVideoList";

/**
 * 피드 카드 나열 접근성 이름 스모크 (PR #51 리뷰 반영 2차).
 * 실 API는 영상 제목이 없어 소유 메타를 붙여도 같은 날 내 영상·같은 업로더의
 * 같은 상대시간끼리는 이름이 겹친다 — 목록 순번으로 카드별 유일성을 보장한다.
 */

/** 같은 날 올린 내 영상 2개 — 제목·메타가 동일해 순번 없이는 이름이 겹치는 최악 케이스 */
const SAME_DAY_MINE: GridFeedItem[] = [301, 302].map((videoId) => ({
  videoId,
  thumbnailUrl: null,
  durationSec: 5,
  viewCount: null,
  recordedAt: "2026-08-09T10:00:00",
  processingStatus: "READY",
  mine: true,
}));

describe("피드 카드 나열 — 접근성 이름 유일성", () => {
  afterEach(() => {
    cleanup();
  });

  it("제목 없는 동일 메타 영상들도 카드 접근성 이름이 서로 다르다 (순번 구분자)", () => {
    render(<FeedVideoList items={SAME_DAY_MINE} onVideoSelect={() => {}} />);

    const names = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));

    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    // 순번이 앞에 붙고 제목 폴백·소유 메타는 유지된다
    expect(names[0]).toBe("1. 영상 재생 · 내 영상 · 8월 9일");
    expect(names[1]).toBe("2. 영상 재생 · 내 영상 · 8월 9일");
  });

  it("같은 제목의 영상들끼리도 접근성 이름이 서로 다르다 — 제목 보유 경로도 순번 포함", () => {
    const sameTitle = SAME_DAY_MINE.map((item) => ({
      ...item,
      title: "표본 영상",
      videoSrc: "/videos/sample.mp4",
    }));
    render(<FeedVideoList items={sameTitle} onVideoSelect={() => {}} />);

    const names = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));

    expect(new Set(names).size).toBe(2);
    expect(names[0]).toBe("1. 표본 영상 재생 · 내 영상 · 8월 9일");
  });
});

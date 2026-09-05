import { describe, expect, it } from "vitest";
import type { EventLocationVideoResponseDto } from "../../../shared/api/sdk";
import { toEventVideoCardViews } from "./event-video-card";

/**
 * AC 2 (D5): 위치 영상 카드 뷰 파생 — 길이 배지 `0:05` · `♥ N · 댓글 M` · 상대시간 ·
 * 접근명 `행사 영상 재생 — {상대시간}`. DTO에 제목·닉네임·조회수가 없다(웹 카드 규칙).
 */
const NOW = new Date("2026-09-02T12:00:00+09:00");

const video = (
  over: Partial<EventLocationVideoResponseDto> = {},
): EventLocationVideoResponseDto => ({
  videoId: 240347,
  thumbnailUrl: "https://img.test/240347.jpg",
  durationSec: 5,
  createdAt: "2026-09-02T11:58:00+09:00",
  helpfulCount: 1,
  commentCount: 2,
  ...over,
});

describe("toEventVideoCardViews — 위치 영상 카드 뷰 (AC 2)", () => {
  it("실데이터 1건(240347, 5초, ♥1 댓글2)을 카드 재료로 접는다", () => {
    expect(toEventVideoCardViews([video()], NOW)).toEqual([
      {
        videoId: 240347,
        thumbnailUrl: "https://img.test/240347.jpg",
        durationLabel: "0:05",
        countsLine: "♥ 1 · 댓글 2",
        timeLabel: "2분 전",
        accessibilityLabel: "행사 영상 재생 — 2분 전",
      },
    ]);
  });

  it("서버 응답 순서(최신순)를 그대로 유지한다", () => {
    const views = toEventVideoCardViews(
      [video({ videoId: 3 }), video({ videoId: 2 }), video({ videoId: 1 })],
      NOW,
    );

    expect(views.map((view) => view.videoId)).toEqual([3, 2, 1]);
  });

  it("빈 목록은 빈 배열이다", () => {
    expect(toEventVideoCardViews([], NOW)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  EVENT_VIDEO_DETAIL,
  eventComment,
} from "../../../test/event-video-fixture";
import {
  appendComment,
  eventVideoInteraction,
  removeCommentsByAuthor,
  seedHelpful,
} from "./event-video-cache";

/**
 * AC 4·6·7 (MSG-562 D6·D7·D9): 뮤테이션 응답을 상세 캐시에 접는 순수 seed 2종 + 잠금 파생.
 * 웹은 `use-event-video-mutations.ts` 내부 비공개 갱신 함수라 모바일에서 분리해 고정한다.
 */
describe("seedHelpful — 도움돼요 응답 seed (AC 4)", () => {
  it("응답의 helpfulCount·helpfulByMe만 바꾸고 나머지 상세는 그대로다", () => {
    const seeded = seedHelpful(EVENT_VIDEO_DETAIL, {
      helpfulCount: 2,
      helpfulByMe: true,
    });

    expect(seeded).toEqual({
      ...EVENT_VIDEO_DETAIL,
      helpfulCount: 2,
      helpfulByMe: true,
    });
    expect(seeded.comments).toBe(EVENT_VIDEO_DETAIL.comments);
  });
});

describe("appendComment — 작성 응답 seed (AC 6)", () => {
  it("새 댓글을 첫 페이지 맨 아래에 붙이고 commentCount를 +1 한다", () => {
    const created = eventComment(3, { content: "MSG-562 검증" });

    const seeded = appendComment(EVENT_VIDEO_DETAIL, created);

    expect(seeded.commentCount).toBe(3);
    expect(seeded.comments.comments.map((c) => c.commentId)).toEqual([1, 2, 3]);
    expect(seeded.comments.hasNext).toBe(false);
  });

  it("같은 commentId가 이미 있으면 두 번 붙이지 않고 commentCount도 그대로다 (중복 방어)", () => {
    const seeded = appendComment(EVENT_VIDEO_DETAIL, eventComment(2));

    expect(seeded.comments.comments.map((c) => c.commentId)).toEqual([1, 2]);
    expect(seeded.commentCount).toBe(EVENT_VIDEO_DETAIL.commentCount);
  });
});

describe("removeCommentsByAuthor — 댓글 작성자 차단 seed (MSG-570 기준 11)", () => {
  it("그 authorId의 댓글만 첫 페이지에서 빠지고 commentCount는 그대로다 — 서버도 줄이지 않는다", () => {
    const detail = {
      ...EVENT_VIDEO_DETAIL,
      commentCount: 3,
      comments: {
        ...EVENT_VIDEO_DETAIL.comments,
        comments: [
          eventComment(1, { authorId: 7 }),
          eventComment(2, { authorId: 99 }),
          eventComment(3, { authorId: 7 }),
        ],
      },
    };

    const seeded = removeCommentsByAuthor(detail, 7);

    expect(seeded.comments.comments.map((c) => c.commentId)).toEqual([2]);
    expect(seeded.commentCount).toBe(3);
    expect(seeded.comments.hasNext).toBe(detail.comments.hasNext);
  });

  it("그 작성자의 댓글이 없으면 상세가 그대로다 (경계)", () => {
    expect(removeCommentsByAuthor(EVENT_VIDEO_DETAIL, 99)).toEqual(
      EVENT_VIDEO_DETAIL,
    );
  });
});

describe("eventVideoInteraction — interactionLocked 파생 (AC 7)", () => {
  it("잠금이 아니면 도움돼요·입력이 활성이고 placeholder는 입력 안내다", () => {
    expect(eventVideoInteraction(EVENT_VIDEO_DETAIL)).toEqual({
      helpfulDisabled: false,
      inputDisabled: false,
      placeholder: "댓글을 입력해주세요",
    });
  });

  it("interactionLocked=true면 도움돼요·입력·전송이 비활성이고 잠금 placeholder다", () => {
    expect(
      eventVideoInteraction({ ...EVENT_VIDEO_DETAIL, interactionLocked: true }),
    ).toEqual({
      helpfulDisabled: true,
      inputDisabled: true,
      placeholder: "종료된 행사라 댓글을 남길 수 없어요",
    });
  });
});

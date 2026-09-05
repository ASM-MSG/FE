import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { eventComment as comment } from "@/test/event-video-fixture";
import {
  canSubmitComment,
  eventInteractionErrorMessage,
  eventVideoMetaLine,
  eventVideoTitle,
  mergeCommentPages,
  nextCommentsCursor,
  PLAYBACK_RATE_OPTIONS,
  playbackRateLabel,
  trimmedCommentContent,
} from "./event-video-view";

describe("eventVideoTitle — 제목 폴백 zone>행정동>위치명>영상 (AC 4)", () => {
  it("구역 안 영상은 zone 라벨('광안리 H-6')이 제목이다", () => {
    expect(
      eventVideoTitle({
        zoneName: "광안리",
        zoneCell: "H-6",
        regionName: "민락동",
        locationName: "광안리 피카츄 퍼레이드",
      }),
    ).toBe("광안리 H-6");
  });

  it("구역 밖이면 행정동명으로 폴백한다", () => {
    expect(
      eventVideoTitle({
        zoneName: null,
        zoneCell: null,
        regionName: "민락동",
        locationName: "광안리 피카츄 퍼레이드",
      }),
    ).toBe("민락동");
  });

  it("행정동 무귀속이면 위치명으로 폴백한다", () => {
    expect(
      eventVideoTitle({
        zoneName: null,
        zoneCell: null,
        regionName: null,
        locationName: "광안리 피카츄 퍼레이드",
      }),
    ).toBe("광안리 피카츄 퍼레이드");
  });

  it("위치명마저 비면 '영상'이다 (경계)", () => {
    expect(
      eventVideoTitle({
        zoneName: null,
        zoneCell: null,
        regionName: null,
        locationName: "  ",
      }),
    ).toBe("영상");
  });
});

describe("eventVideoMetaLine — '@닉네임 · 상대시간' 한 줄 (AC 4)", () => {
  it("업로더 닉네임과 업로드 상대시간을 합친다", () => {
    const now = new Date("2026-08-31T03:02:00.000Z");

    expect(
      eventVideoMetaLine("강정만두", "2026-08-31T03:00:00.000Z", now),
    ).toBe("@강정만두 · 2분 전");
  });
});

describe("canSubmitComment — 댓글 입력 판정 trim 1~500자 (AC 8)", () => {
  it("공백뿐인 입력은 전송 불가다", () => {
    expect(canSubmitComment("   ")).toBe(false);
  });

  it("trim 후 1자 이상이면 전송 가능하다", () => {
    expect(canSubmitComment(" 좋아요! ")).toBe(true);
  });

  it("trim 후 500자는 가능, 501자는 불가다 (경계)", () => {
    expect(canSubmitComment("가".repeat(500))).toBe(true);
    expect(canSubmitComment("가".repeat(501))).toBe(false);
  });

  it("trimmedCommentContent가 전송 본문(trim)을 만든다", () => {
    expect(trimmedCommentContent(" 좋아요! ")).toBe("좋아요!");
  });
});

describe("mergeCommentPages — 페이지 병합 append + 중복 commentId 방어 (AC 7)", () => {
  it("첫 페이지 뒤에 추가 페이지 댓글이 순서대로 붙는다", () => {
    const merged = mergeCommentPages(
      { comments: [comment(1), comment(2)], hasNext: true, nextCursor: "C1" },
      [{ comments: [comment(3)], hasNext: false, nextCursor: null }],
    );

    expect(merged.map((c) => c.commentId)).toEqual([1, 2, 3]);
  });

  it("중복 commentId는 첫 등장만 남는다 (seed 후 재수신 방어)", () => {
    const merged = mergeCommentPages(
      { comments: [comment(1), comment(9)], hasNext: true, nextCursor: "C1" },
      [
        {
          comments: [comment(2), comment(9)],
          hasNext: false,
          nextCursor: null,
        },
      ],
    );

    expect(merged.map((c) => c.commentId)).toEqual([1, 9, 2]);
  });

  it("첫 페이지 미도착이면 빈 목록이다 (경계)", () => {
    expect(mergeCommentPages(undefined, [])).toEqual([]);
  });
});

describe("nextCommentsCursor — 다음 페이지 커서 판정 (AC 7)", () => {
  it("마지막 수신 페이지가 hasNext면 그 nextCursor다", () => {
    expect(
      nextCommentsCursor(
        { comments: [comment(1)], hasNext: true, nextCursor: "C1" },
        [{ comments: [comment(2)], hasNext: true, nextCursor: "C2" }],
      ),
    ).toBe("C2");
  });

  it("hasNext=false면 null — '더 보기' 미노출 신호다", () => {
    expect(
      nextCommentsCursor(
        { comments: [comment(1)], hasNext: false, nextCursor: null },
        [],
      ),
    ).toBeNull();
  });

  it("첫 페이지 미도착이면 null이다 (경계)", () => {
    expect(nextCommentsCursor(undefined, [])).toBeNull();
  });
});

describe("eventInteractionErrorMessage — 에러→사용자 언어 문구 (AC 9)", () => {
  it("13422(아카이브 행사)는 종료 안내로 분기한다", () => {
    const message = eventInteractionErrorMessage(
      new ApiError("archived", { status: 409, developCode: 13422 }),
    );

    expect(message).toContain("종료된 행사");
  });

  it("13406(비노출 영상)은 볼 수 없는 영상 안내다", () => {
    const message = eventInteractionErrorMessage(
      new ApiError("gone", { status: 404, developCode: 13406 }),
    );

    expect(message).toContain("볼 수 없는 영상");
  });

  it("그 외 실패는 공통 재시도 안내다", () => {
    expect(eventInteractionErrorMessage(new Error("boom"))).toBe(
      "요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
    );
  });
});

describe("재생 유틸리티 — 속도 옵션 (AC 13)", () => {
  it("옵션은 0.5/1/1.25/1.5/2x 5종이다", () => {
    expect(PLAYBACK_RATE_OPTIONS).toEqual([0.5, 1, 1.25, 1.5, 2]);
  });

  it("라벨은 'Nx' 표기다", () => {
    expect(playbackRateLabel(0.5)).toBe("0.5x");
    expect(playbackRateLabel(1.25)).toBe("1.25x");
  });
});

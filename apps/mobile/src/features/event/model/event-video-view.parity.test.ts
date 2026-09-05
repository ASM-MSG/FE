import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/api-error";
import type { EventVideoCommentPageResponseDto } from "../../../shared/api/sdk";
import {
  EVENT_VIDEO_DETAIL,
  eventComment,
} from "../../../test/event-video-fixture";
import {
  canSubmitComment,
  eventInteractionErrorMessage,
  eventVideoMetaLine,
  eventVideoTitle,
  mergeCommentPages,
  nextCommentsCursor,
  trimmedCommentContent,
} from "./event-video-view";

/**
 * AC 3·5·6·8 (MSG-562): 영상 상세 표시 파생 7함수가 웹 원본(`event-video-view.ts`)과
 * 동등하다 — 제목 폴백·메타 줄·댓글 판정·페이지 병합·커서·실패 문구.
 * `nextCommentsCursor`는 웹의 `.at(-1)`을 인덱스 접근으로 바꿨으므로 출력 동일성이 곧 증거다.
 */
const webPath = (rel: string) =>
  new URL(`../../../../../web/src/${rel}`, import.meta.url).pathname;

const loadWeb = (): Promise<{
  eventVideoTitle: typeof eventVideoTitle;
  eventVideoMetaLine: typeof eventVideoMetaLine;
  trimmedCommentContent: typeof trimmedCommentContent;
  canSubmitComment: typeof canSubmitComment;
  mergeCommentPages: typeof mergeCommentPages;
  nextCommentsCursor: typeof nextCommentsCursor;
  eventInteractionErrorMessage: typeof eventInteractionErrorMessage;
}> => import(webPath("features/event/model/event-video-view.ts"));

/** 웹 ApiError는 다른 클래스 — 웹 함수에는 웹 인스턴스를 넘겨야 instanceof 분기가 같다 */
const loadWebApiError = (): Promise<{ ApiError: typeof ApiError }> =>
  import(webPath("shared/api/api-error.ts"));

const page = (
  ids: number[],
  hasNext: boolean,
  nextCursor: string | null,
): EventVideoCommentPageResponseDto => ({
  comments: ids.map((id) => eventComment(id)),
  hasNext,
  nextCursor,
});

describe("eventVideoTitle 웹 원본 동등성 (AC 3)", () => {
  it("zone 라벨 > 행정동명 > 위치명 > `영상` 폴백이 웹과 같다", async () => {
    const web = await loadWeb();
    const cases = [
      EVENT_VIDEO_DETAIL,
      { ...EVENT_VIDEO_DETAIL, zoneName: null, zoneCell: null },
      {
        ...EVENT_VIDEO_DETAIL,
        zoneName: null,
        zoneCell: null,
        regionName: null,
      },
      {
        ...EVENT_VIDEO_DETAIL,
        zoneName: null,
        zoneCell: null,
        regionName: null,
        locationName: "  ",
      },
    ];

    for (const detail of cases) {
      expect(eventVideoTitle(detail)).toBe(web.eventVideoTitle(detail));
    }
    expect(cases.map(eventVideoTitle)).toEqual([
      "전포 I-2",
      "부산광역시 부산진구 전포1동",
      "서면 목데이터 포토존",
      "영상",
    ]);
  });
});

describe("eventVideoMetaLine 웹 원본 동등성 (AC 3)", () => {
  it("`@닉네임 · 상대시간`(createdAt 기준)이 웹과 같다", async () => {
    const web = await loadWeb();
    const now = new Date("2026-09-03T12:00:00Z");

    expect(
      eventVideoMetaLine("강정만두", EVENT_VIDEO_DETAIL.createdAt, now),
    ).toBe(
      web.eventVideoMetaLine("강정만두", EVENT_VIDEO_DETAIL.createdAt, now),
    );
    expect(
      eventVideoMetaLine("강정만두", EVENT_VIDEO_DETAIL.createdAt, now),
    ).toBe("@강정만두 · 2일 전");
  });
});

describe("댓글 전송 판정 웹 원본 동등성 (AC 6)", () => {
  it("trim 후 1~500자만 전송 가능 — 빈 입력·공백·501자는 불가", async () => {
    const web = await loadWeb();
    const inputs = [
      "",
      "   ",
      "a",
      " 좋아요 ",
      "x".repeat(500),
      "x".repeat(501),
      ` ${"x".repeat(500)} `,
    ];

    for (const raw of inputs) {
      expect(trimmedCommentContent(raw)).toBe(web.trimmedCommentContent(raw));
      expect(canSubmitComment(raw)).toBe(web.canSubmitComment(raw));
    }
    expect(inputs.map(canSubmitComment)).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(trimmedCommentContent(" 좋아요 ")).toBe("좋아요");
  });
});

describe("mergeCommentPages 웹 원본 동등성 (AC 5)", () => {
  it("첫 페이지 뒤에 추가 페이지를 잇고 중복 commentId는 첫 등장만 남긴다", async () => {
    const web = await loadWeb();
    const cases: Array<
      [
        EventVideoCommentPageResponseDto | undefined,
        EventVideoCommentPageResponseDto[],
      ]
    > = [
      [undefined, []],
      [page([1, 2], false, null), []],
      [page([1, 2], true, "c1"), [page([2, 3], false, null)]],
    ];

    for (const [first, extra] of cases) {
      expect(mergeCommentPages(first, extra)).toEqual(
        web.mergeCommentPages(first, extra),
      );
    }
    expect(
      mergeCommentPages(...cases[2]).map((comment) => comment.commentId),
    ).toEqual([1, 2, 3]);
    expect(mergeCommentPages(undefined, [])).toEqual([]);
  });
});

describe("nextCommentsCursor 웹 원본 동등성 (AC 5)", () => {
  it("마지막 수신 페이지 기준 — hasNext면 커서, 아니면 null", async () => {
    const web = await loadWeb();
    const cases: Array<
      [
        EventVideoCommentPageResponseDto | undefined,
        EventVideoCommentPageResponseDto[],
      ]
    > = [
      [undefined, []],
      [page([1], false, null), []],
      [page([1], true, "c1"), []],
      [page([1], true, "c1"), [page([2], true, "c2")]],
      [page([1], true, "c1"), [page([2], true, "c2"), page([3], false, null)]],
    ];

    for (const [first, extra] of cases) {
      expect(nextCommentsCursor(first, extra)).toBe(
        web.nextCommentsCursor(first, extra),
      );
    }
    expect(
      cases.map(([first, extra]) => nextCommentsCursor(first, extra)),
    ).toEqual([null, null, "c1", "c2", null]);
  });
});

describe("eventInteractionErrorMessage 웹 원본 동등성 (AC 8)", () => {
  it("13422·13406·기타·비ApiError 4분기의 문구가 웹과 같다", async () => {
    const web = await loadWeb();
    const { ApiError: WebApiError } = await loadWebApiError();
    const codes = [13422, 13406, 9999, undefined];

    for (const developCode of codes) {
      expect(
        eventInteractionErrorMessage(new ApiError("x", { developCode })),
      ).toBe(
        web.eventInteractionErrorMessage(new WebApiError("x", { developCode })),
      );
    }
    expect(eventInteractionErrorMessage(new Error("network"))).toBe(
      web.eventInteractionErrorMessage(new Error("network")),
    );
    expect(
      codes.map((developCode) =>
        eventInteractionErrorMessage(new ApiError("x", { developCode })),
      ),
    ).toEqual([
      "종료된 행사라 더 이상 참여할 수 없어요",
      "더 이상 볼 수 없는 영상이에요",
      "요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
      "요청에 실패했어요. 잠시 후 다시 시도해 주세요.",
    ]);
  });
});

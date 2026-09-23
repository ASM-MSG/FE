import { describe, expect, it } from "vitest";
import type { InfiniteQuerySurface } from "../../../shared/api/infinite-list";
import {
  inboxItem as item,
  inboxPage as page,
} from "../../../test/inbox-fixture";
import {
  decrementUnread,
  flattenInboxPages,
  formatInboxTime,
  hasUnread,
  inboxResult,
  isUnreadInPages,
  markAllReadInPages,
  markReadInPages,
  nextInboxPageParam,
  unreadHint,
  type InboxData,
  type InboxPage,
} from "./inbox";

/** 템플릿 ① 순수 로직 — 알림함 커서·평탄화·낙관 읽음·배지 문구 (MSG-602 L1~L5) */

const data = (pages: InboxPage[]): InboxData => ({
  pages,
  pageParams: pages.map((_, index) => (index === 0 ? {} : index)),
});

describe("nextInboxPageParam (L1)", () => {
  it("hasNext=false면 undefined로 중단한다", () => {
    expect(nextInboxPageParam(page([item(1)], false, 1))).toBeUndefined();
  });
  it("hasNext=true면 서버 nextCursor를 그대로 넘긴다", () => {
    expect(nextInboxPageParam(page([item(1)], true, 1))).toBe(1);
  });
});

describe("flattenInboxPages (L2)", () => {
  it("페이지 순서대로 이어붙이고 정렬·중복 제거는 하지 않는다", () => {
    const flat = flattenInboxPages([page([item(5), item(4)]), page([item(3)])]);
    expect(flat.map((n) => n.notificationId)).toEqual([5, 4, 3]);
  });
  it("미도착이면 빈 배열", () => {
    expect(flattenInboxPages(undefined)).toEqual([]);
  });
});

describe("inboxResult (L3)", () => {
  const base: InfiniteQuerySurface<InboxPage> = {
    data: undefined,
    isPending: false,
    isError: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
  };
  const loaded = {
    data: data([page([item(1)])]),
    isError: true,
    isFetchNextPageError: true,
  };
  const result = (overrides: Partial<typeof base>) =>
    inboxResult({ ...base, ...overrides });

  it("첫 페이지 실패만 isError — 이어받기 실패는 loadMoreFailed로 분리된다", () => {
    expect(result({ isError: true })).toMatchObject({
      isError: true,
      loadMoreFailed: false,
    });
    expect(result(loaded)).toMatchObject({
      isError: false,
      loadMoreFailed: true,
      items: [item(1)],
    });
  });
  it("이어받기 재시도 중에는 로더가 실패 안내보다 우선한다", () => {
    expect(result({ ...loaded, isFetchingNextPage: true })).toMatchObject({
      isLoadingMore: true,
      loadMoreFailed: false,
    });
  });
});

describe("markReadInPages / markAllReadInPages (L4)", () => {
  it("해당 id만 read=true로 바꾸고 원본은 건드리지 않는다", () => {
    const before = data([page([item(2), item(1)], true, 1), page([item(0)])]);
    const after = markReadInPages(before, 1);

    expect(flattenInboxPages(after?.pages).map((n) => n.read)).toEqual([
      false,
      true,
      false,
    ]);
    expect(flattenInboxPages(before.pages).map((n) => n.read)).toEqual([
      false,
      false,
      false,
    ]);
    // 페이지 봉투·커서는 그대로
    expect(after?.pages[0].data.hasNext).toBe(true);
    expect(after?.pageParams).toEqual(before.pageParams);
  });
  it("모두 읽음은 전부 true, 캐시가 없으면 undefined 그대로", () => {
    const after = markAllReadInPages(data([page([item(2), item(1, true)])]));
    expect(flattenInboxPages(after?.pages).every((n) => n.read)).toBe(true);
    expect(markAllReadInPages(undefined)).toBeUndefined();
  });
  it("isUnreadInPages — 캐시에서 그 알림이 아직 안읽음인지", () => {
    const cached = data([page([item(2), item(1, true)])]);
    expect(isUnreadInPages(cached, 2)).toBe(true);
    expect(isUnreadInPages(cached, 1)).toBe(false);
    expect(isUnreadInPages(undefined, 2)).toBe(false);
  });
});

describe("배지 문구·감산 (L5)", () => {
  it("0이거나 미도착이면 문구 없음 — PRD FR-6", () => {
    expect(unreadHint(0)).toBeUndefined();
    expect(unreadHint(undefined)).toBeUndefined();
    expect(hasUnread(0)).toBe(false);
  });
  it("1 이상이면 '새 알림 N개'", () => {
    expect(unreadHint(3)).toBe("새 알림 3개");
    expect(hasUnread(3)).toBe(true);
  });
  it("감산은 0 아래로 내려가지 않는다", () => {
    expect(decrementUnread(1)).toBe(0);
    expect(decrementUnread(0)).toBe(0);
  });
});

describe("formatInboxTime", () => {
  it("마커 없는 UTC createdAt을 UTC로 읽어 상대 시간을 만든다", () => {
    const now = new Date("2026-09-23T07:05:00Z");
    expect(formatInboxTime("2026-09-23T07:00:00", now)).toBe("5분 전");
  });
});

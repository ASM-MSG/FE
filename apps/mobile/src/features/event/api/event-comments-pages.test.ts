import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";
import { eventComment } from "../../../test/event-video-fixture";

/**
 * AC 5 (MSG-562 D5): `더 보기` 이어받기 — `GET /api/event-videos/{videoId}/comments?cursor=`를
 * fetchQuery(retry 없음)로 받아 봉투를 벗긴 페이지를 돌려주고, 실패는 즉시 거부한다.
 * 훅(`useEventCommentsPages`)의 로컬 축적·영상 교체 리셋은 순수 `mergeCommentPages`·
 * `nextCommentsCursor`(parity)와 이 fetch 경로로 덮는다.
 */
const loadFetch = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
  vi.resetModules();
  const { fetchCommentsPage } = await import("./use-event-comments-pages");
  // 기본 retry(3회)가 살아 있는 클라이언트 — 실패 케이스가 1회 요청으로 끝나야 retry:false가 증명된다
  return { fetchCommentsPage, queryClient: new QueryClient() };
};

const stubFetch = (route: (request: Request) => Response) => {
  const received: Array<{ method: string; pathname: string; search: string }> =
    [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      received.push({
        method: input.method,
        pathname: url.pathname,
        search: url.search,
      });
      return route(input);
    }),
  );
  return received;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("fetchCommentsPage — 댓글 커서 이어받기 (AC 5)", () => {
  it("커서를 실어 GET /comments를 부르고 봉투를 벗긴 페이지를 돌려준다", async () => {
    const { fetchCommentsPage, queryClient } = await loadFetch();
    const page = {
      comments: [eventComment(21)],
      hasNext: false,
      nextCursor: null,
    };
    const received = stubFetch(() => envelopeResponse(page));

    const result = await fetchCommentsPage(queryClient, 240347, "c1");

    expect(result).toEqual(page);
    expect(received).toEqual([
      {
        method: "GET",
        pathname: "/api/event-videos/240347/comments",
        search: "?cursor=c1",
      },
    ]);
  });

  it("실패하면 재시도 없이 즉시 거부한다 — 받은 목록 유지는 호출부 몫", async () => {
    const { fetchCommentsPage, queryClient } = await loadFetch();
    const received = stubFetch(() => errorEnvelope(9999, "서버 오류", 500));

    await expect(
      fetchCommentsPage(queryClient, 240347, "c1"),
    ).rejects.toMatchObject({ developCode: 9999 });

    expect(received).toHaveLength(1);
  });
});

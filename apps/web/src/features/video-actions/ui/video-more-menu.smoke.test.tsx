import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import type { VideoActionTarget } from "../model/video-menu";
import { VideoMoreMenu } from "./VideoMoreMenu";

/**
 * 영상 더보기 메뉴 스모크 — mine 분기(AC 9)·현재값 ✓·같은 값 미발사(AC 2)·
 * 삭제 확인 모달 흐름(AC 3~5)의 화면 계약만 고정한다.
 * PATCH·DELETE의 URL·body 값 판정은 use-video-mutations 훅 테스트가 촘촘히 덮는다.
 */

/** Radix 포퍼(DropdownMenu.Content)가 jsdom에 없는 ResizeObserver를 요구한다 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const TARGET: VideoActionTarget = {
  videoId: 7,
  gridId: "39064_112221",
  thumbnailUrl: null,
  durationSec: 84,
  createdAt: "2026-08-14T00:00:00Z",
  zoneName: "서면",
  zoneCell: "A-02",
};

const PLAYBACK = {
  videoId: 7,
  playbackUrl: null,
  thumbnailUrl: null,
  gridId: "39064_112221",
  durationSec: 84,
  processingStatus: "READY",
  visibility: "PUBLIC",
  status: "ACTIVE",
  viewCount: 3,
  recordedAt: "2026-08-14T00:00:00Z",
  expiresInSec: null,
  zoneName: "서면",
  zoneCell: "A-02",
  regionName: "부전제1동",
  highlights: null,
};

/** 단건 재생 조회(공개 범위 확보)만 성공으로 응답하고, 나머지는 route에 위임한다 */
const stubMenuFetch = (
  route?: (request: Request) => Response | Promise<Response>,
): ReceivedRequest[] =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/api/videos/7") {
      return envelopeResponse(PLAYBACK);
    }
    return route ? route(request) : envelopeResponse(null);
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const renderMenu = (mine: boolean) =>
  render(
    <VideoMoreMenu target={TARGET} mine={mine}>
      <button type="button" aria-label="영상 더보기">
        ⋯
      </button>
    </VideoMoreMenu>,
    { wrapper },
  );

/** Radix DropdownMenu 트리거는 pointerdown으로 열린다 */
const openMenu = () => {
  fireEvent.pointerDown(screen.getByRole("button", { name: "영상 더보기" }));
};

/** 삭제 확인 모달까지 진입하는 공통 경로 */
const openDeleteDialog = async () => {
  openMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "영상 삭제" }));
  return screen.findByRole("dialog", { name: "영상을 삭제할까요?" });
};

describe("영상 더보기 메뉴", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("내 영상 메뉴는 공개 범위(전체 공개·나만 보기)·영상 삭제를 노출하고 신고하기는 없다 (AC 1·9)", async () => {
    stubMenuFetch();
    renderMenu(true);

    openMenu();

    expect(
      await screen.findByRole("menuitemcheckbox", { name: "전체 공개" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("menuitemcheckbox", { name: "나만 보기" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "영상 삭제" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "신고하기" })).toBeNull();
  });

  it("타인 영상 메뉴는 신고하기만 노출한다 — 자기 영상 신고 400 예방 (AC 9)", async () => {
    stubMenuFetch();
    renderMenu(false);

    openMenu();

    expect(
      await screen.findByRole("menuitem", { name: "신고하기" }),
    ).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "영상 삭제" })).toBeNull();
    expect(screen.queryByText("공개 범위")).toBeNull();
  });

  it("메뉴 오픈 시 단건 조회의 visibility로 현재값에 ✓가 표시된다 (AC 2)", async () => {
    stubMenuFetch();
    renderMenu(true);

    openMenu();

    const publicItem = await screen.findByRole("menuitemcheckbox", {
      name: "전체 공개",
    });
    await waitFor(() =>
      expect(publicItem.getAttribute("aria-checked")).toBe("true"),
    );
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "나만 보기" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("현재값과 같은 항목 선택은 요청을 발사하지 않고 메뉴만 닫힌다 (AC 2, 추정 5)", async () => {
    const received = stubMenuFetch();
    renderMenu(true);
    openMenu();
    const publicItem = await screen.findByRole("menuitemcheckbox", {
      name: "전체 공개",
    });
    await waitFor(() =>
      expect(publicItem.getAttribute("aria-checked")).toBe("true"),
    );

    fireEvent.click(publicItem);

    await waitFor(() =>
      expect(
        screen.queryByRole("menuitemcheckbox", { name: "전체 공개" }),
      ).toBeNull(),
    );
    expect(received.filter((r) => r.request.method === "PATCH")).toHaveLength(
      0,
    );
  });

  it("다른 공개 범위 선택 시 PATCH가 발사된다 (AC 2)", async () => {
    const received = stubMenuFetch();
    renderMenu(true);
    openMenu();
    const publicItem = await screen.findByRole("menuitemcheckbox", {
      name: "전체 공개",
    });
    await waitFor(() =>
      expect(publicItem.getAttribute("aria-checked")).toBe("true"),
    );

    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "나만 보기" }),
    );

    await waitFor(() =>
      expect(received.filter((r) => r.request.method === "PATCH")).toHaveLength(
        1,
      ),
    );
  });

  it("영상 삭제 선택 시 확인 모달이 열린다 — 제목·비가역 안내·대상 카드 (AC 3)", async () => {
    stubMenuFetch();
    renderMenu(true);

    const dialog = await openDeleteDialog();

    expect(dialog).toBeTruthy();
    expect(screen.getByText(/삭제하면 되돌릴 수 없어요/)).toBeTruthy();
    expect(await screen.findByText("서면 A-02 · 1:24")).toBeTruthy();
  });

  it("취소는 요청 없이 모달만 닫는다 (AC 3)", async () => {
    const received = stubMenuFetch();
    renderMenu(true);
    await openDeleteDialog();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "영상을 삭제할까요?" }),
      ).toBeNull(),
    );
    expect(received.filter((r) => r.request.method === "DELETE")).toHaveLength(
      0,
    );
  });

  it("삭제 확정 시 DELETE가 발사되고 성공하면 모달이 닫힌다 (AC 4)", async () => {
    // 삭제 성공 후속(미니 패널 닫기·캐시 정리)의 값 판정은 use-video-mutations 훅 테스트가 덮는다
    const received = stubMenuFetch();
    renderMenu(true);
    await openDeleteDialog();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "영상을 삭제할까요?" }),
      ).toBeNull(),
    );
    expect(received.filter((r) => r.request.method === "DELETE")).toHaveLength(
      1,
    );
  });

  it("삭제 실패 시 에러 토스트가 표시되고 모달이 닫히지 않는다 (AC 5)", async () => {
    stubMenuFetch((request) =>
      request.method === "DELETE"
        ? new Response(
            JSON.stringify({ developCode: 9999, message: "서버 오류" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          )
        : envelopeResponse(null),
    );
    renderMenu(true);
    await openDeleteDialog();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByText(/영상을 삭제하지 못했어요/)).toBeTruthy();
    expect(
      screen.getByRole("dialog", { name: "영상을 삭제할까요?" }),
    ).toBeTruthy();
  });
});

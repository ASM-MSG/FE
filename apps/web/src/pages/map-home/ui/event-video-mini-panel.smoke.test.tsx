import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import type { EventVideoDetailResponseDto } from "@/shared/api/generated/types.gen";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { EVENT_VIDEO_DETAIL, eventComment } from "@/test/event-video-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { EventVideoMiniPanel } from "./EventVideoMiniPanel";

/**
 * 행사 영상 미니 패널 스모크 (MSG-520 AC 1·4~10·13) — 상세 렌더·도움돼요 토글·
 * 비로그인 게이트·댓글 작성/더 보기·실패 토스트·잠금·유틸리티 메뉴의 화면 계약을
 * 고정한다. 제목 폴백·병합·에러 문구 값은 event-video-view 순수 테스트가,
 * seed·무효화 계약은 use-event-video-mutations 훅 테스트가 촘촘히 덮는다.
 */

/** Radix 포퍼(DropdownMenu.Content)가 jsdom에 없는 ResizeObserver를 요구한다 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom은 HTMLMediaElement.play를 구현하지 않아 자동재생 시도가 콘솔 노이즈를 남긴다
beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

/** 상세 GET + 상호작용 엔드포인트 라우터 — 기본은 성공 응답 */
const stubPanelFetch = (
  detail: EventVideoDetailResponseDto = EVENT_VIDEO_DETAIL,
  route?: (request: Request) => Response | Promise<Response> | null,
): ReceivedRequest[] =>
  stubFetch(async (request) => {
    const routed = route ? await route(request) : null;
    if (routed !== null && routed !== undefined) return routed;
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/api/event-videos/42") {
      return envelopeResponse(detail);
    }
    return envelopeResponse(null);
  });

const renderPanel = (onClose = () => {}) =>
  renderWithProviders(<EventVideoMiniPanel videoId={42} onClose={onClose} />);

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  signInForTest();
  useLoginModalStore.setState({ open: false });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("행사 영상 미니 패널 (MSG-520)", () => {
  it("상세가 오면 playbackUrl video·제목·메타·pill·댓글 첫 페이지가 뜬다 — 조회수는 미표시 (AC 1·4·5·7)", async () => {
    stubPanelFetch();

    const { container } = renderPanel();

    expect(
      await screen.findByRole("heading", { name: "광안리 H-6" }),
    ).toBeTruthy();
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe(
      "https://cdn.example.com/event-42.mp4",
    );
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(screen.getByText(/@전포골목대장/)).toBeTruthy();
    // 도움돼요만 버튼(aria-pressed) — "댓글 N" pill은 표시 전용 (추정 3)
    expect(
      screen.getByRole("button", { name: "도움돼요 18", pressed: false }),
    ).toBeTruthy();
    expect(screen.getByText("댓글 2")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /댓글 2/ })).toBeNull();
    expect(screen.getByText("현장 분위기 최고 1")).toBeTruthy();
    expect(screen.getByText("현장 분위기 최고 2")).toBeTruthy();
    // 조회수 미표시 — 상세 DTO에 viewCount 부재 (스펙 오탐 방지 ①)
    expect(screen.queryByText(/조회/)).toBeNull();
  });

  it("닫기 버튼이 onClose를 부르고, 열릴 때 포커스가 닫기 버튼에 온다 (AC 3)", async () => {
    stubPanelFetch();
    const onClose = vi.fn();

    renderPanel(onClose);

    const closeButton = screen.getByRole("button", { name: "미니 패널 닫기" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("로그인 상태 도움돼요 클릭은 응답 helpfulCount·helpfulByMe가 버튼에 반영된다 — 비낙관 (AC 5)", async () => {
    stubPanelFetch(EVENT_VIDEO_DETAIL, (request) => {
      const { pathname } = new URL(request.url);
      if (request.method === "PUT" && pathname.endsWith("/helpful")) {
        return envelopeResponse({ helpfulCount: 19, helpfulByMe: true });
      }
      return null;
    });
    renderPanel();
    const helpful = await screen.findByRole("button", { name: "도움돼요 18" });

    fireEvent.click(helpful);

    expect(
      await screen.findByRole("button", { name: "도움돼요 19", pressed: true }),
    ).toBeTruthy();
  });

  it("비로그인 도움돼요·댓글 입력 시도는 요청 없이 로그인 모달을 연다 (AC 6)", async () => {
    const received = stubPanelFetch();
    signOutForTest();
    renderPanel();
    const helpful = await screen.findByRole("button", { name: "도움돼요 18" });

    fireEvent.click(helpful);
    fireEvent.focus(screen.getByLabelText("댓글 입력"));

    expect(useLoginModalStore.getState().open).toBe(true);
    expect(
      received.filter((r) =>
        new URL(r.request.url).pathname.endsWith("/helpful"),
      ),
    ).toHaveLength(0);
  });

  it("댓글 작성 성공 시 목록 맨 아래에 붙고 카운트가 늘며 입력이 비워진다 (AC 8)", async () => {
    stubPanelFetch(EVENT_VIDEO_DETAIL, (request) => {
      const { pathname } = new URL(request.url);
      if (request.method === "POST" && pathname.endsWith("/comments")) {
        return envelopeResponse(eventComment(3, { content: "불꽃 미쳤다" }));
      }
      return null;
    });
    renderPanel();
    const input = await screen.findByLabelText("댓글 입력");

    fireEvent.change(input, { target: { value: " 불꽃 미쳤다 " } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(await screen.findByText("불꽃 미쳤다")).toBeTruthy();
    expect(screen.getByText("댓글 3")).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("빈 입력은 전송 버튼이 비활성이다 (AC 8)", async () => {
    stubPanelFetch();
    renderPanel();
    await screen.findByLabelText("댓글 입력");

    const submit = screen.getByRole("button", { name: "등록" });
    expect(submit.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("댓글 입력"), {
      target: { value: "   " },
    });
    expect(submit.hasAttribute("disabled")).toBe(true);
  });

  it("도움돼요 실패(13422)는 종료 행사 안내 토스트가 뜨고 재생 영상은 유지된다 (AC 9)", async () => {
    stubPanelFetch(EVENT_VIDEO_DETAIL, (request) => {
      const { pathname } = new URL(request.url);
      if (request.method === "PUT" && pathname.endsWith("/helpful")) {
        return errorEnvelope(13422, "archived", 409);
      }
      return null;
    });
    const { container } = renderPanel();
    const helpful = await screen.findByRole("button", { name: "도움돼요 18" });

    fireEvent.click(helpful);

    expect(await screen.findByText(/종료된 행사/)).toBeTruthy();
    expect(container.querySelector("video")?.getAttribute("src")).toBe(
      "https://cdn.example.com/event-42.mp4",
    );
  });

  it("interactionLocked면 도움돼요·댓글 입력이 비활성화되고 카운트·댓글은 계속 보인다 (AC 10)", async () => {
    stubPanelFetch({ ...EVENT_VIDEO_DETAIL, interactionLocked: true });
    renderPanel();

    const helpful = await screen.findByRole("button", { name: "도움돼요 18" });
    expect(helpful.hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("댓글 입력").hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByText("현장 분위기 최고 1")).toBeTruthy();
  });

  it("hasNext면 '더 보기'가 getComments 커서로 다음 페이지를 아래에 잇는다 (AC 7)", async () => {
    stubPanelFetch(
      {
        ...EVENT_VIDEO_DETAIL,
        comments: {
          comments: [eventComment(1), eventComment(2)],
          hasNext: true,
          nextCursor: "CUR-1",
        },
      },
      (request) => {
        const url = new URL(request.url);
        if (
          request.method === "GET" &&
          url.pathname.endsWith("/comments") &&
          url.searchParams.get("cursor") === "CUR-1"
        ) {
          return envelopeResponse({
            comments: [eventComment(3)],
            hasNext: false,
            nextCursor: null,
          });
        }
        return null;
      },
    );
    renderPanel();
    const loadMore = await screen.findByRole("button", { name: "더 보기" });

    fireEvent.click(loadMore);

    expect(await screen.findByText("현장 분위기 최고 3")).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull(),
    );
  });

  it("더보기(⋯) 메뉴는 다운로드·재생 속도만 — PIP 미지원(jsdom)은 숨김, 속도 선택이 video.playbackRate에 반영된다 (AC 13)", async () => {
    stubPanelFetch();
    const { container } = renderPanel();
    await screen.findByRole("heading", { name: "광안리 H-6" });

    fireEvent.pointerDown(screen.getByRole("button", { name: "영상 더보기" }));

    const download = await screen.findByRole("menuitem", { name: "다운로드" });
    expect(download.getAttribute("href")).toBe(
      "https://cdn.example.com/event-42.mp4",
    );
    // 소유자 액션 없음 (확정 결정 2) + PIP 미지원 숨김
    expect(screen.queryByRole("menuitem", { name: "영상 삭제" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "신고하기" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "PIP 모드" })).toBeNull();

    fireEvent.click(screen.getByRole("menuitem", { name: /재생 속도/ }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "2x" }));

    await waitFor(() =>
      expect(container.querySelector("video")?.playbackRate).toBe(2),
    );
  });
});

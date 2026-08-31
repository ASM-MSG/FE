import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventLocationSelection } from "@/features/event/model/event-location";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import type { EventLocationVideoResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";
import { EventRoomPanel } from "./EventRoomPanel";

/**
 * 행사방 위치 영상 본문 스모크 (MSG-518 AC 3~9) — 위치 선택 상태의 videos/empty/실패/
 * 로딩 게이트 계약만 고정한다. 문구 파생·커서 로직은 event-location·use-location-videos-query
 * 테스트가, 뒤로가기 2단은 event-room-store 테스트가 커버한다.
 */
const LOCATION: EventLocationSelection = {
  locationId: 4,
  name: "광안리 피카츄 퍼레이드",
  type: "PARADE",
  operatingHours: "19:00~20:00",
  gridCount: 4,
  videoCount: 34,
};

const ROOM = {
  occurrenceId: 7,
  title: "포켓몬 메가페스타 부산",
  status: "LIVE",
} as const;

const video = (
  videoId: number,
  over: Partial<EventLocationVideoResponseDto> = {},
): EventLocationVideoResponseDto => ({
  videoId,
  thumbnailUrl: `https://cdn.example.com/thumb-${videoId}.jpg`,
  durationSec: 24,
  createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  helpfulCount: 18,
  commentCount: 6,
  ...over,
});

const renderRoom = () => {
  useEventRoomStore.getState().open(ROOM);
  useEventRoomStore.getState().selectLocation(LOCATION);
  return renderWithProviders(
    <EventRoomPanel
      room={ROOM}
      onBack={() => useEventRoomStore.getState().back()}
    />,
  );
};

beforeEach(() => {
  useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("행사방 위치 영상 본문 (MSG-518)", () => {
  it("위치를 고르면 위치 헤더(유형·이름·메타)와 격자 안내, 현장 영상 카드가 뜬다 (AC 3·4·5)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        videos: [video(1)],
        hasNext: false,
        nextCursor: null,
      }),
    );

    renderRoom();

    expect(
      await screen.findByRole("heading", { name: "광안리 피카츄 퍼레이드" }),
    ).toBeTruthy();
    expect(screen.getByText("퍼레이드")).toBeTruthy();
    expect(screen.getByText("영상 34 · 19:00~20:00")).toBeTruthy();
    expect(screen.getByText("이 위치의 행사 격자 4개")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "광안리 현장 영상" }),
    ).toBeTruthy();
    expect(screen.getByText("♥ 18 · 댓글 6")).toBeTruthy();
    expect(screen.getByText("0:24")).toBeTruthy();
    expect(screen.getByText("2분 전")).toBeTruthy();
  });

  it("카드는 클릭 대상이 아니다 — 버튼은 뒤로가기·업로드 CTA뿐 (AC 6, 추정 2)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        videos: [video(1)],
        hasNext: false,
        nextCursor: null,
      }),
    );

    renderRoom();
    await screen.findByText("♥ 18 · 댓글 6");

    expect(
      screen
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label") ?? b.textContent),
    ).toEqual(["뒤로가기", "+ 영상 올리기"]);
  });

  it("hasNext면 더 보기가 다음 페이지 카드를 이어 붙인다 (AC 10)", async () => {
    stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null)
        return envelopeResponse({
          videos: [video(1)],
          hasNext: true,
          nextCursor: "CUR-1",
        });
      return envelopeResponse({
        videos: [video(2, { durationSec: 41 })],
        hasNext: false,
        nextCursor: null,
      });
    });

    renderRoom();
    await screen.findByText("0:24");

    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));

    expect(await screen.findByText("0:41")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull();
  });

  it("첫 페이지 영상 0개면 빈 상태 카드와 첫 영상 올리기 CTA가 뜬다 (AC 7)", async () => {
    stubFetch(async () =>
      envelopeResponse({ videos: [], hasNext: false, nextCursor: null }),
    );

    renderRoom();

    expect(
      await screen.findByText("아직 이 위치에 올라온 영상이 없어요"),
    ).toBeTruthy();
    expect(screen.getByText("현장 영상을 가장 먼저 남겨보세요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "첫 영상 올리기" })).toBeTruthy();
  });

  it("조회 실패면 재시도 안내가 뜨고 클릭이 재조회한다 (AC 8)", async () => {
    let fail = true;
    stubFetch(async () => {
      if (fail) {
        fail = false;
        return new Response("boom", { status: 500 });
      }
      return envelopeResponse({
        videos: [video(1)],
        hasNext: false,
        nextCursor: null,
      });
    });

    renderRoom();
    const retry = await screen.findByRole("button", { name: "다시 시도" });

    fireEvent.click(retry);

    expect(await screen.findByText("♥ 18 · 댓글 6")).toBeTruthy();
  });

  it("첫 페이지 로딩 동안 부분 렌더 없이 로더만 뜬다 (AC 9)", async () => {
    stubFetch(() => new Promise<Response>(() => {}));

    renderRoom();

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "광안리 피카츄 퍼레이드" }),
    ).toBeNull();
  });

  it("위치 미선택(개요)이면 기존 자리표시가 그대로다 — MSG-517 소유 영역 무변경 (AC 14)", async () => {
    stubFetch(async () =>
      envelopeResponse({ videos: [], hasNext: false, nextCursor: null }),
    );
    useEventRoomStore.getState().open(ROOM);

    renderWithProviders(
      <EventRoomPanel
        room={ROOM}
        onBack={() => useEventRoomStore.getState().back()}
      />,
    );

    expect(screen.getByText("행사 정보를 준비 중이에요")).toBeTruthy();
  });

  it("Escape가 뒤로가기와 같은 2단을 탄다 — 위치 해제 후 행사방 닫기 (추정 5)", async () => {
    stubFetch(async () =>
      envelopeResponse({ videos: [], hasNext: false, nextCursor: null }),
    );

    renderRoom();
    await screen.findByText("아직 이 위치에 올라온 영상이 없어요");

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useEventRoomStore.getState().location).toBeNull();
    expect(useEventRoomStore.getState().room?.occurrenceId).toBe(7);
  });
});

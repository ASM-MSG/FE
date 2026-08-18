import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectedVideo } from "@/entities/dex";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { GalleryVideoCard } from "./GalleryVideoCard";

/**
 * 갤러리 영상 카드 스모크 — "재생 버튼 + onSelect"(MSG-327 보존)와
 * "더보기(⋯)는 메뉴만 열고 재생을 트리거하지 않는다"(MSG-411 AC 1) 계약만 고정한다.
 * 메뉴 내부 동작(공개 전환·삭제)은 video-more-menu 스모크·훅 테스트가 덮는다.
 */

/** Radix 포퍼(DropdownMenu.Content)가 jsdom에 없는 ResizeObserver를 요구한다 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const VIDEO: CollectedVideo = {
  videoId: 7,
  gridId: "39064_112221",
  thumbnailUrl: null,
  durationSec: 84,
  createdAt: "2026-08-14T00:00:00Z",
  zoneName: "서면",
  zoneCell: "A-02",
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("갤러리 영상 카드 더보기 (AC 1)", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    stubFetch(() => envelopeResponse(null));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("더보기(⋯) 클릭은 메뉴를 열고 카드 재생(onSelect)을 트리거하지 않는다 (AC 1)", async () => {
    const onSelect = vi.fn();
    render(
      <GalleryVideoCard
        video={VIDEO}
        seq={4}
        isNew={false}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "영상 더보기" }));

    expect(
      await screen.findByRole("menuitem", { name: "영상 삭제" }),
    ).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("카드 본문 클릭은 여전히 onSelect를 호출한다 — 기존 재생 계약 보존 (AC 1)", () => {
    const onSelect = vi.fn();
    render(
      <GalleryVideoCard
        video={VIDEO}
        seq={4}
        isNew={false}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: /수집/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

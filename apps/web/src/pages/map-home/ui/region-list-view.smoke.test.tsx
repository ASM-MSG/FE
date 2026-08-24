import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { RegionListView } from "./RegionListView";

/**
 * 전체 지역 리스트 뷰 스모크 (MSG-463 AC 1·2·4·5·6) — 무한 스크롤 사용자 흐름을 고정한다.
 * 검증 승격 사유: 브라우저 실검증이 로그인 전제(RegionPanel 게이트) + 서버 explore 익명
 * 401로 막혀, 커서 이어받기 흐름의 화면 반쪽을 재검증 가능한 자산으로 남긴다.
 * jsdom에는 IntersectionObserver가 없어 수동 발화 목으로 sentinel 노출을 재현한다.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const region = (regionCode: string, regionName: string) => ({
  regionCode,
  regionName,
  gridCount: 3,
});

const PAGE_1 = {
  items: [region("2644056000", "부전제1동"), region("2644057000", "부전제2동")],
  hasNext: true,
  nextCursor: "CUR-1",
};
const PAGE_2 = {
  items: [region("2644058000", "전포제1동")],
  hasNext: false,
  nextCursor: null,
};

/** jsdom 부재 IntersectionObserver 목 — intersect()로 관찰 중인 콜백을 수동 발화한다 */
let ioCallbacks: IntersectionObserverCallback[];
const intersect = () => {
  for (const callback of ioCallbacks)
    callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      // 콜백 단정에 observer 인스턴스는 쓰이지 않는다
      null as unknown as IntersectionObserver,
    );
};

beforeEach(() => {
  ioCallbacks = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      private readonly callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        ioCallbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        ioCallbacks = ioCallbacks.filter((cb) => cb !== this.callback);
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderList = () =>
  render(<RegionListView onSelect={vi.fn()} />, { wrapper });

describe("전체 지역 리스트 — 무한 스크롤 (MSG-463)", () => {
  it("첫 페이지가 커서 없이 1회 요청으로 렌더된다 (AC 1)", async () => {
    const received = stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null) return envelopeResponse(PAGE_1);
      return new Response("bad cursor", { status: 400 });
    });

    renderList();

    expect(await screen.findByText("부전제1동")).toBeTruthy();
    expect(screen.getByText("부전제2동")).toBeTruthy();
    expect(received).toHaveLength(1);
  });

  it("sentinel 노출 시 다음 페이지를 이어 붙이고, 로딩 중 기존 목록과 하단 로딩 표시가 함께 보인다 (AC 2·5)", async () => {
    let releasePage2: (response: Response) => void = () => {};
    stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null) return envelopeResponse(PAGE_1);
      if (cursor === "CUR-1")
        return new Promise<Response>((resolve) => {
          releasePage2 = resolve;
        });
      return new Response("bad cursor", { status: 400 });
    });

    renderList();
    await screen.findByText("부전제1동");

    intersect();

    // 이어받는 동안: 하단 로딩 표시 + 이미 렌더된 목록 유지 (AC 5)
    expect(
      await screen.findByRole("status", { name: "다음 지역 불러오는 중" }),
    ).toBeTruthy();
    expect(screen.getByText("부전제1동")).toBeTruthy();
    expect(screen.queryByText("전포제1동")).toBeNull();

    releasePage2(envelopeResponse(PAGE_2));

    // 완료 후: 기존 목록 뒤에 이어 붙고 로딩 표시는 사라진다 (AC 2)
    expect(await screen.findByText("전포제1동")).toBeTruthy();
    expect(screen.getByText("부전제1동")).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "다음 지역 불러오는 중" }),
    ).toBeNull();
  });

  it("마지막 페이지(hasNext=false) 후에는 sentinel이 사라져 추가 요청이 없다 (AC 4)", async () => {
    const received = stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null) return envelopeResponse(PAGE_1);
      if (cursor === "CUR-1") return envelopeResponse(PAGE_2);
      return new Response("bad cursor", { status: 400 });
    });

    renderList();
    await screen.findByText("부전제1동");
    intersect();
    await screen.findByText("전포제1동");

    // 마지막 페이지 도달 후 관찰 재발화 — 요청이 더 나가지 않는다
    intersect();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(2);
  });

  it("이어받기 실패 시 받은 목록은 유지된 채 하단 실패 안내가 뜨고, 재시도로 재개된다 (AC 6)", async () => {
    let failNext = true;
    stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null) return envelopeResponse(PAGE_1);
      if (failNext) {
        failNext = false;
        return new Response("boom", { status: 500 });
      }
      return envelopeResponse(PAGE_2);
    });

    renderList();
    await screen.findByText("부전제1동");

    intersect();

    expect(
      await screen.findByText("다음 지역을 불러오지 못했어요"),
    ).toBeTruthy();
    // 받은 목록은 사라지지 않고, 전체 실패 안내로 대체되지도 않는다
    expect(screen.getByText("부전제1동")).toBeTruthy();
    expect(screen.queryByText("지역 목록을 불러오지 못했어요")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("전포제1동")).toBeTruthy();
    expect(screen.queryByText("다음 지역을 불러오지 못했어요")).toBeNull();
  });
});
